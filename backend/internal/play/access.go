package play

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// Play access policy (#39; matrix in docs/architecture/ZONA_PLAY_ACCESO.md).
//
// Metadata (title, teams, score, price) and playback (what lets a player
// load the video: Mux playback IDs, direct URLs and Mux thumbnails, which
// embed the playback ID) are separate. There are no entitlements yet, so
// restricted playback is only for the league's managers:
//
//	                 lists            by ID/link       playback
//	public           everyone         everyone         everyone
//	unlisted         managers         everyone         everyone
//	premium          managers         everyone         managers
//	private          managers         managers (404)   managers
//	not ready        managers         managers (404)   managers
//
// A recording is premium when visibility is "premium" or is_premium is set.
// Clips follow their recording; pay-per-view streams are premium.

func isPremium(r *Recording) bool { return r.IsPremium || r.Visibility == "premium" }

// manages reports whether the caller manages the league (or is a super admin).
func (s *Service) manages(ctx context.Context, caller *auth.Principal, leagueID *uuid.UUID) bool {
	return s.canSeeAllRecordings(ctx, caller, leagueID)
}

// muxThumbnail reports whether a thumbnail URL is served by Mux from a
// playback ID (and so would reveal it).
func muxThumbnail(u *string) bool {
	return u != nil && strings.Contains(*u, "mux.com/")
}

func redactRecording(r *Recording) {
	r.MuxPlaybackID, r.MuxAssetID, r.VideoURL = nil, nil, nil
	if muxThumbnail(r.ThumbnailURL) {
		r.ThumbnailURL = nil
	}
	r.PlaybackRestricted = true
}

func redactClip(c *Clip) {
	c.MuxPlaybackID, c.MuxAssetID, c.ClipURL = nil, nil, nil
	if muxThumbnail(c.ThumbnailURL) {
		c.ThumbnailURL = nil
	}
	c.PlaybackRestricted = true
}

func redactStream(st *Stream) {
	st.MuxPlaybackID, st.MuxLiveStreamID, st.RecordingPlaybackID, st.RecordingAssetID = nil, nil, nil, nil
	if muxThumbnail(st.ThumbnailURL) {
		st.ThumbnailURL = nil
	}
	st.PlaybackRestricted = true
}

// recordingVisible is the by-ID rule: ready and not private, or a manager.
func (s *Service) recordingVisible(ctx context.Context, caller *auth.Principal, rec *Recording) bool {
	return (rec.Status == "ready" && rec.Visibility != "private") || s.manages(ctx, caller, rec.LeagueID)
}

// guardClip applies the clip's recording rules: hidden when the recording
// is hidden from the caller, playback removed when it is premium. Clips
// without a recording are public.
func (s *Service) guardClip(ctx context.Context, caller *auth.Principal, clip *Clip) (visible bool, err error) {
	if clip.RecordingID == nil {
		return true, nil
	}
	rec, err := s.repo.GetRecording(ctx, *clip.RecordingID)
	if err != nil {
		return false, err
	}
	if rec == nil {
		return s.manages(ctx, caller, clip.LeagueID), nil
	}
	if !s.recordingVisible(ctx, caller, rec) {
		return false, nil
	}
	if isPremium(rec) && !s.manages(ctx, caller, rec.LeagueID) {
		redactClip(clip)
	}
	return true, nil
}

func (s *Service) guardStream(ctx context.Context, caller *auth.Principal, st *Stream) {
	if st.IsPayPerView && !s.manages(ctx, caller, st.LeagueID) {
		redactStream(st)
	}
}
