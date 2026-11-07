package play

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
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

// GetRecording retrieves a recording by ID (public reads allowed).
func (s *Service) GetRecording(ctx context.Context, id uuid.UUID) (*Recording, error) {
	rec, err := s.repo.GetRecording(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, httpx.ErrNotFound
	}
	return rec, nil
}

// ListRecordings lists recordings (public reads allowed).
func (s *Service) ListRecordings(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
	if opts == nil {
		opts = &ListRecordingsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	return s.repo.ListRecordings(ctx, opts)
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

	if rec.LeagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *rec.LeagueID); err != nil {
			return nil, err
		}
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

	if rec.LeagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *rec.LeagueID); err != nil {
			return err
		}
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
	if rec.LeagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *rec.LeagueID); err != nil {
			return nil, err
		}
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

// GetClip retrieves a clip by ID (public reads allowed).
func (s *Service) GetClip(ctx context.Context, id uuid.UUID) (*Clip, error) {
	clip, err := s.repo.GetClip(ctx, id)
	if err != nil {
		return nil, err
	}
	if clip == nil {
		return nil, httpx.ErrNotFound
	}
	return clip, nil
}

// ListClips lists clips (public reads allowed).
func (s *Service) ListClips(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error) {
	if opts == nil {
		opts = &ListClipsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	return s.repo.ListClips(ctx, opts)
}

// CreateClip creates a new clip (auth + authz required).
func (s *Service) CreateClip(ctx context.Context, caller auth.Principal, req *ClipRequest) (*Clip, error) {
	// Load recording to get league info for authorization
	var leagueID *uuid.UUID
	if req.RecordingID != nil {
		rec, err := s.repo.GetRecording(ctx, *req.RecordingID)
		if err != nil {
			return nil, err
		}
		if rec != nil {
			leagueID = rec.LeagueID
		}
	} else if req.LeagueID != nil {
		leagueID = req.LeagueID
	}

	if leagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *leagueID); err != nil {
			return nil, err
		}
	}

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

	// Load recording to get league info for authorization
	var leagueID *uuid.UUID
	if clip.RecordingID != nil {
		rec, err := s.repo.GetRecording(ctx, *clip.RecordingID)
		if err != nil {
			return err
		}
		if rec != nil {
			leagueID = rec.LeagueID
		}
	} else if clip.LeagueID != nil {
		leagueID = clip.LeagueID
	}

	if leagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *leagueID); err != nil {
			return err
		}
	}

	return s.repo.DeleteClip(ctx, id)
}

// GetStream retrieves a stream by ID (public reads allowed).
func (s *Service) GetStream(ctx context.Context, id uuid.UUID) (*Stream, error) {
	stream, err := s.repo.GetStream(ctx, id)
	if err != nil {
		return nil, err
	}
	if stream == nil {
		return nil, httpx.ErrNotFound
	}
	return stream, nil
}

// ListStreams lists streams (public reads allowed).
func (s *Service) ListStreams(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error) {
	if opts == nil {
		opts = &ListStreamsOpts{}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	return s.repo.ListStreams(ctx, opts)
}

// CreateStream creates a new stream (auth + authz required).
func (s *Service) CreateStream(ctx context.Context, caller auth.Principal, req *StreamRequest) (*Stream, error) {
	if req.LeagueID == nil {
		return nil, httpx.Validation(map[string]string{"league_id": "league_id is required"})
	}

	if err := s.authz.CanManageLeague(ctx, caller, *req.LeagueID); err != nil {
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
	if stream.LeagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *stream.LeagueID); err != nil {
			return nil, err
		}
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
	if stream.LeagueID != nil {
		if err := s.authz.CanManageLeague(ctx, caller, *stream.LeagueID); err != nil {
			return err
		}
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
