package play

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business logic and authorization.
type Service struct {
	repo     Repository
	provider VideoProvider
	authz    authz.Checker
}

// NewService builds the play service.
func NewService(repo Repository, provider VideoProvider, authz authz.Checker) *Service {
	return &Service{repo: repo, provider: provider, authz: authz}
}

// GetRecording retrieves a recording by ID. Public and unlisted (link
// sharing) videos that are ready are open to everyone; private or not yet
// ready ones only to the league's managers (404 otherwise, so their
// existence isn't revealed).
func (s *Service) GetRecording(ctx context.Context, caller *auth.Principal, id uuid.UUID) (*Recording, error) {
	rec, err := s.repo.GetRecording(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, httpx.ErrNotFound
	}
	openToAll := rec.Status == "ready" && rec.Visibility != "private"
	if !openToAll && !s.canSeeAllRecordings(ctx, caller, rec.LeagueID) {
		return nil, httpx.ErrNotFound
	}
	if err := s.repo.AttachRecordingContext(ctx, []*Recording{rec}); err != nil {
		return nil, err
	}
	if isPremium(rec) && !s.manages(ctx, caller, rec.LeagueID) {
		redactRecording(rec) // metadata yes, playback no (#39)
	}
	return rec, nil
}

// ListRecordings lists recordings (public reads allowed).
func (s *Service) ListRecordings(ctx context.Context, caller *auth.Principal, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
	if opts == nil {
		opts = &ListRecordingsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	// Only managers of the requested league (or super admins) may list
	// private or unfinished recordings; everyone else gets public+ready,
	// whatever filters they sent.
	manager := s.canSeeAllRecordings(ctx, caller, opts.LeagueID)
	if !manager {
		opts.Visibility = "public"
		opts.Status = "ready"
	}
	recs, total, err := s.repo.ListRecordings(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	if err := s.repo.AttachRecordingContext(ctx, recs); err != nil {
		return nil, 0, err
	}
	if !manager {
		for _, r := range recs {
			if isPremium(r) {
				redactRecording(r) // public listing of is_premium videos (#39)
			}
		}
	}
	return recs, total, nil
}

func (s *Service) canSeeAllRecordings(ctx context.Context, caller *auth.Principal, leagueID *uuid.UUID) bool {
	if caller == nil {
		return false
	}
	if caller.IsSuperAdmin() {
		return true
	}
	return leagueID != nil && s.authz.CanManageLeague(ctx, *caller, *leagueID) == nil
}

// CreateRecording creates a new recording (auth + authz required).
func (s *Service) CreateRecording(ctx context.Context, caller auth.Principal, req *RecordingRequest) (*Recording, error) {
	// League must be specified for authorization
	if req.LeagueID == nil {
		return nil, httpx.Validation(map[string]string{"league_id": "league_id is required"})
	}

	if err := s.authz.CanManageLeague(ctx, caller, *req.LeagueID); err != nil {
		return nil, err
	}
	if err := s.checkRefs(ctx, *req.LeagueID, Refs{TournamentID: req.TournamentID, MatchID: req.MatchID}); err != nil {
		return nil, err
	}

	rec, err := s.repo.CreateRecording(ctx, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("create recording: %w", err)
	}

	return rec, nil
}

// UpdateRecording updates a recording (auth + authz required).
func (s *Service) UpdateRecording(ctx context.Context, caller auth.Principal, id uuid.UUID, req *UpdateRecordingRequest) (*Recording, error) {
	// Get the recording to authorize
	rec, err := s.repo.GetRecording(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, httpx.ErrNotFound
	}

	if err := s.authorizeLeague(ctx, caller, rec.LeagueID); err != nil {
		return nil, err
	}

	updated, err := s.repo.UpdateRecording(ctx, id, req)
	if err != nil {
		return nil, fmt.Errorf("update recording: %w", err)
	}
	if updated == nil {
		return nil, httpx.ErrNotFound
	}

	return updated, nil
}

// DeleteRecording removes a recording (auth + authz required).
func (s *Service) DeleteRecording(ctx context.Context, caller auth.Principal, id uuid.UUID) error {
	// Get the recording to authorize
	rec, err := s.repo.GetRecording(ctx, id)
	if err != nil {
		return err
	}
	if rec == nil {
		return httpx.ErrNotFound
	}

	if err := s.authorizeLeague(ctx, caller, rec.LeagueID); err != nil {
		return err
	}

	// Delete from Mux if present
	if rec.MuxAssetID != nil {
		_ = s.provider.DeleteAsset(ctx, *rec.MuxAssetID)
	}

	return s.repo.DeleteRecording(ctx, id)
}

// CreateDirectUpload creates a Mux direct upload session with recording (auth + authz required).
func (s *Service) CreateDirectUpload(ctx context.Context, caller auth.Principal, req *RecordingRequest) (*DirectUploadResponse, error) {
	// Require league_id and validate authorization
	if req.LeagueID == nil {
		return nil, httpx.Validation(map[string]string{"league_id": "league_id is required"})
	}

	if err := s.authz.CanManageLeague(ctx, caller, *req.LeagueID); err != nil {
		return nil, err
	}
	if err := s.checkRefs(ctx, *req.LeagueID, Refs{TournamentID: req.TournamentID, MatchID: req.MatchID}); err != nil {
		return nil, err
	}

	// Create Mux upload session
	uploadID, uploadURL, err := s.provider.CreateDirectUpload(ctx)
	if err != nil {
		return nil, fmt.Errorf("create mux upload: %w", err)
	}

	// Create recording with status 'uploading' and store upload ID
	rec, err := s.repo.CreateRecording(ctx, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("create recording: %w", err)
	}

	return &DirectUploadResponse{
		Recording: rec,
		Upload:    &Upload{ID: uploadID, URL: uploadURL},
	}, nil
}

// RefreshRecordingStatus queries Mux and updates the recording status (auth + authz required).
func (s *Service) RefreshRecordingStatus(ctx context.Context, caller auth.Principal, id uuid.UUID) (*Recording, error) {
	rec, err := s.repo.GetRecording(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, httpx.ErrNotFound
	}

	// Authorize
	if err := s.authorizeLeague(ctx, caller, rec.LeagueID); err != nil {
		return nil, err
	}

	if rec.MuxAssetID == nil {
		return rec, nil // Not yet uploaded
	}

	playbackID, duration, resolution, err := s.provider.GetAsset(ctx, *rec.MuxAssetID)
	if err != nil {
		return nil, fmt.Errorf("get mux asset: %w", err)
	}

	_ = playbackID // Unused but retrieved from Mux (webhook typically updates these)
	_ = duration   // Unused but retrieved from Mux
	_ = resolution // Unused but retrieved from Mux

	// Update the recording (webhook typically handles this)
	updated, err := s.repo.UpdateRecording(ctx, id, &UpdateRecordingRequest{})
	if err != nil {
		return nil, fmt.Errorf("update recording: %w", err)
	}

	return updated, nil
}

// GetClip retrieves a clip by ID under its recording's rules: hidden (404)
// when the recording is hidden from the caller, without playback when it
// is premium (#39).
func (s *Service) GetClip(ctx context.Context, caller *auth.Principal, id uuid.UUID) (*Clip, error) {
	clip, err := s.repo.GetClip(ctx, id)
	if err != nil {
		return nil, err
	}
	if clip == nil {
		return nil, httpx.ErrNotFound
	}
	visible, err := s.guardClip(ctx, caller, clip)
	if err != nil {
		return nil, err
	}
	if !visible {
		return nil, httpx.ErrNotFound
	}
	return clip, nil
}

// ListClips lists clips. Everyone but the league's managers only gets
// clips without a recording or of public, ready, non-premium recordings.
func (s *Service) ListClips(ctx context.Context, caller *auth.Principal, opts *ListClipsOpts) ([]*Clip, int64, error) {
	if opts == nil {
		opts = &ListClipsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	opts.PlayableOnly = !s.manages(ctx, caller, opts.LeagueID)
	return s.repo.ListClips(ctx, opts)
}

// CreateClip creates a new clip (auth + authz required). Its league comes
// from its recording when it has one (the body's league_id must agree),
// otherwise league_id is required; every other reference must belong to
// that league and to the recording's match (#40).
func (s *Service) CreateClip(ctx context.Context, caller auth.Principal, req *ClipRequest) (*Clip, error) {
	leagueID := req.LeagueID
	var recMatch *uuid.UUID
	if req.RecordingID != nil {
		rec, err := s.repo.GetRecording(ctx, *req.RecordingID)
		if err != nil {
			return nil, err
		}
		if rec == nil || rec.LeagueID == nil {
			return nil, httpx.Validation(map[string]string{"recording_id": "no existe o no pertenece a una liga"})
		}
		if leagueID != nil && *leagueID != *rec.LeagueID {
			return nil, httpx.Validation(map[string]string{"league_id": "no coincide con la liga de la grabación"})
		}
		leagueID, recMatch = rec.LeagueID, rec.MatchID
	}
	if leagueID == nil {
		return nil, httpx.Validation(map[string]string{"league_id": "league_id o recording_id es obligatorio"})
	}
	if err := s.authz.CanManageLeague(ctx, caller, *leagueID); err != nil {
		return nil, err
	}
	if recMatch != nil {
		if req.MatchID != nil && *req.MatchID != *recMatch {
			return nil, httpx.Validation(map[string]string{"match_id": "no coincide con el partido de la grabación"})
		}
		req.MatchID = recMatch
	}
	if err := s.checkRefs(ctx, *leagueID, Refs{MatchID: req.MatchID, TeamID: req.TeamID, PlayerID: req.PlayerID}); err != nil {
		return nil, err
	}
	req.LeagueID = leagueID // stored, so later deletes authorize on it

	clip, err := s.repo.CreateClip(ctx, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("create clip: %w", err)
	}

	return clip, nil
}

// DeleteClip removes a clip (auth + authz required).
func (s *Service) DeleteClip(ctx context.Context, caller auth.Principal, id uuid.UUID) error {
	clip, err := s.repo.GetClip(ctx, id)
	if err != nil {
		return err
	}
	if clip == nil {
		return httpx.ErrNotFound
	}

	// The recording's league wins; the clip's own league otherwise.
	leagueID := clip.LeagueID
	if clip.RecordingID != nil {
		rec, err := s.repo.GetRecording(ctx, *clip.RecordingID)
		if err != nil {
			return err
		}
		if rec != nil && rec.LeagueID != nil {
			leagueID = rec.LeagueID
		}
	}

	if err := s.authorizeLeague(ctx, caller, leagueID); err != nil {
		return err
	}

	return s.repo.DeleteClip(ctx, id)
}

// GetStream retrieves a stream by ID (public reads allowed); pay-per-view
// streams come without playback for everyone but the league's managers (#39).
func (s *Service) GetStream(ctx context.Context, caller *auth.Principal, id uuid.UUID) (*Stream, error) {
	stream, err := s.repo.GetStream(ctx, id)
	if err != nil {
		return nil, err
	}
	if stream == nil {
		return nil, httpx.ErrNotFound
	}
	s.guardStream(ctx, caller, stream)
	return stream, nil
}

var errNoStreamKey = &httpx.Error{
	Status:  http.StatusNotFound,
	Code:    httpx.ErrNotFound.Code,
	Message: "Esta transmisión no tiene clave de emisión.",
}

// GetStreamKey returns the broadcast key of a stream to whoever manages its
// league. A stream without a league has no league admin, so only a super
// admin gets its key (#38).
func (s *Service) GetStreamKey(ctx context.Context, caller auth.Principal, id uuid.UUID) (StreamKey, error) {
	stream, err := s.repo.GetStream(ctx, id)
	if err != nil {
		return StreamKey{}, err
	}
	if stream == nil {
		return StreamKey{}, httpx.ErrNotFound
	}
	switch {
	case stream.LeagueID != nil:
		if err := s.authz.CanManageLeague(ctx, caller, *stream.LeagueID); err != nil {
			return StreamKey{}, err
		}
	case !caller.IsSuperAdmin():
		return StreamKey{}, httpx.ErrForbidden
	}
	if stream.MuxStreamKey == nil || *stream.MuxStreamKey == "" {
		return StreamKey{}, errNoStreamKey
	}
	return StreamKey{StreamID: stream.ID, MuxStreamKey: *stream.MuxStreamKey}, nil
}

// ListStreams lists streams (public reads allowed).
func (s *Service) ListStreams(ctx context.Context, caller *auth.Principal, opts *ListStreamsOpts) ([]*Stream, int64, error) {
	if opts == nil {
		opts = &ListStreamsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	streams, total, err := s.repo.ListStreams(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	for _, st := range streams {
		s.guardStream(ctx, caller, st)
	}
	return streams, total, nil
}

// CreateStream creates a new stream (auth + authz required).
func (s *Service) CreateStream(ctx context.Context, caller auth.Principal, req *StreamRequest) (*Stream, error) {
	if req.LeagueID == nil {
		return nil, httpx.Validation(map[string]string{"league_id": "league_id is required"})
	}

	if err := s.authz.CanManageLeague(ctx, caller, *req.LeagueID); err != nil {
		return nil, err
	}

	if err := s.checkRefs(ctx, *req.LeagueID, Refs{MatchID: req.MatchID}); err != nil {
		return nil, err
	}

	stream, err := s.repo.CreateStream(ctx, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("create stream: %w", err)
	}

	return stream, nil
}

// UpdateStream updates a stream (auth + authz required).
func (s *Service) UpdateStream(ctx context.Context, caller auth.Principal, id uuid.UUID, req *UpdateStreamRequest) (*Stream, error) {
	stream, err := s.repo.GetStream(ctx, id)
	if err != nil {
		return nil, err
	}
	if stream == nil {
		return nil, httpx.ErrNotFound
	}

	// Load from DB for authorization, not from request
	if err := s.authorizeLeague(ctx, caller, stream.LeagueID); err != nil {
		return nil, err
	}

	updated, err := s.repo.UpdateStream(ctx, id, req)
	if err != nil {
		return nil, fmt.Errorf("update stream: %w", err)
	}
	if updated == nil {
		return nil, httpx.ErrNotFound
	}

	return updated, nil
}

// DeleteStream removes a stream (auth + authz required).
func (s *Service) DeleteStream(ctx context.Context, caller auth.Principal, id uuid.UUID) error {
	stream, err := s.repo.GetStream(ctx, id)
	if err != nil {
		return err
	}
	if stream == nil {
		return httpx.ErrNotFound
	}

	// Load from DB for authorization, not from request
	if err := s.authorizeLeague(ctx, caller, stream.LeagueID); err != nil {
		return err
	}

	// Delete from Mux if present
	if stream.MuxLiveStreamID != nil {
		_ = s.provider.DeleteLiveStream(ctx, *stream.MuxLiveStreamID)
	}

	return s.repo.DeleteStream(ctx, id)
}

// ProcessMuxWebhook handles webhook events from Mux.
// Returns error if signature verification fails.
func (s *Service) ProcessMuxWebhook(ctx context.Context, signature, body string, webhookSecret string) error {
	// Verify signature: format is "t=<ts>,v1=<hex hmac-sha256 of "<ts>.<raw body>">>"
	if err := verifyMuxSignature(signature, body, webhookSecret); err != nil {
		return err
	}

	// Parse the webhook event
	var event MuxWebhookEvent
	if err := json.Unmarshal([]byte(body), &event); err != nil {
		return nil // Silently ignore malformed webhooks
	}

	// Handle different event types (idempotent)
	switch event.Type {
	case "video.upload.asset_created":
		// Extract upload ID (old mux_asset_id) and asset ID (new)
		if uploadID, ok := event.Data["id"].(string); ok {
			if assetID, ok := event.Data["asset_id"].(string); ok {
				if err := s.repo.UpdateRecordingFromMuxUpload(ctx, uploadID, assetID); err != nil {
					return fmt.Errorf("apply mux event %s: %w", event.Type, err)
				}
			}
		}

	case "video.asset.ready":
		// Asset is ready for playback
		if assetID, ok := event.Data["id"].(string); ok {
			var playbackID, resolution string
			var duration int

			if playbackIDs, ok := event.Data["playback_ids"].([]interface{}); ok && len(playbackIDs) > 0 {
				if pbID, ok := playbackIDs[0].(map[string]interface{}); ok {
					if id, ok := pbID["id"].(string); ok {
						playbackID = id
					}
				}
			}

			if dur, ok := event.Data["duration"].(float64); ok {
				duration = int(dur)
			}

			if res, ok := event.Data["max_stored_resolution"].(string); ok {
				resolution = res
			}
			if resolution == "" {
				resolution = "1080p"
			}

			if err := s.repo.UpdateRecordingFromMuxAsset(ctx, assetID, playbackID, duration, resolution); err != nil {
				return fmt.Errorf("apply mux event %s: %w", event.Type, err)
			}
		}

	case "video.asset.errored":
		// Asset processing failed
		if assetID, ok := event.Data["id"].(string); ok {
			var errMsg string
			if errors, ok := event.Data["errors"].(map[string]interface{}); ok {
				if messages, ok := errors["messages"].([]interface{}); ok && len(messages) > 0 {
					if msg, ok := messages[0].(string); ok {
						errMsg = msg
					}
				}
			}
			if errMsg == "" {
				errMsg = "Unknown error"
			}
			if err := s.repo.UpdateRecordingError(ctx, assetID, errMsg); err != nil {
				return fmt.Errorf("apply mux event %s: %w", event.Type, err)
			}
		}

	case "video.live_stream.active":
		// Live stream is now active
		if streamID, ok := event.Data["id"].(string); ok {
			if err := s.repo.UpdateStreamFromMuxLive(ctx, streamID, "live"); err != nil {
				return fmt.Errorf("apply mux event %s: %w", event.Type, err)
			}
		}

	case "video.asset.live_stream_completed":
		// The replay of a finished live stream is ready.
		assetID, _ := event.Data["id"].(string)
		streamID, _ := event.Data["live_stream_id"].(string)
		if assetID != "" && streamID != "" {
			var playbackID string
			if ids, ok := event.Data["playback_ids"].([]interface{}); ok && len(ids) > 0 {
				if pb, ok := ids[0].(map[string]interface{}); ok {
					playbackID, _ = pb["id"].(string)
				}
			}
			duration, _ := event.Data["duration"].(float64)
			if err := s.repo.SetStreamRecording(ctx, streamID, assetID, playbackID, duration); err != nil {
				return fmt.Errorf("apply mux event %s: %w", event.Type, err)
			}
		}

	case "video.live_stream.idle":
		// Live stream ended
		if streamID, ok := event.Data["id"].(string); ok {
			if err := s.repo.UpdateStreamFromMuxLive(ctx, streamID, "ended"); err != nil {
				return fmt.Errorf("apply mux event %s: %w", event.Type, err)
			}
		}

	default:
		// Unknown event type, no-op
	}

	return nil
}

// verifyMuxSignature validates the Mux webhook signature.
func verifyMuxSignature(header, body, secret string) error {
	return verifyMuxSignatureAt(header, body, secret, time.Now())
}

// muxSignatureTolerance bounds replay of captured webhook deliveries.
const muxSignatureTolerance = 5 * time.Minute

// verifyMuxSignatureAt checks a Mux-Signature header of the form
// "t=<unix seconds>,v1=<hex hmac>[,v1=...]" where the HMAC-SHA256 is computed
// over "<t>.<raw body>". Any matching v1 entry is accepted (Mux sends several
// during secret rotation).
func verifyMuxSignatureAt(header, body, secret string, now time.Time) error {
	if secret == "" {
		// An empty key would make every signature forgeable.
		return httpx.ErrInternal.Wrap(errors.New("mux webhook secret not configured"))
	}

	var ts string
	var sigs []string
	for _, part := range strings.Split(header, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch k {
		case "t":
			ts = v
		case "v1":
			sigs = append(sigs, v)
		}
	}
	if ts == "" || len(sigs) == 0 {
		return httpx.ErrUnauthorized.Wrap(errors.New("malformed Mux-Signature header"))
	}

	unix, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return httpx.ErrUnauthorized.Wrap(fmt.Errorf("invalid signature timestamp: %w", err))
	}
	if age := now.Sub(time.Unix(unix, 0)); age > muxSignatureTolerance || age < -muxSignatureTolerance {
		return httpx.ErrUnauthorized.Wrap(errors.New("signature timestamp outside tolerance"))
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts + "." + body))
	expected := mac.Sum(nil)

	for _, sig := range sigs {
		got, err := hex.DecodeString(sig)
		if err == nil && hmac.Equal(got, expected) {
			return nil
		}
	}
	return httpx.ErrUnauthorized.Wrap(errors.New("signature mismatch"))
}
