// Package play manages video recordings, clips, and live streams (Zona Play).
package play

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Recording represents a match video recording.
type Recording struct {
	ID                 uuid.UUID  `json:"id"`
	MatchID            *uuid.UUID `json:"match_id,omitempty"`
	LeagueID           *uuid.UUID `json:"league_id,omitempty"`
	TournamentID       *uuid.UUID `json:"tournament_id,omitempty"`
	SourceType         string     `json:"source_type"`
	SourceDeviceID     *string    `json:"source_device_id,omitempty"`
	VideoURL           *string    `json:"video_url,omitempty"`
	MuxAssetID         *string    `json:"mux_asset_id,omitempty"`
	MuxPlaybackID      *string    `json:"mux_playback_id,omitempty"`
	Title              string     `json:"title"`
	Description        *string    `json:"description,omitempty"`
	ThumbnailURL       *string    `json:"thumbnail_url,omitempty"`
	DurationSeconds    *int       `json:"duration_seconds,omitempty"`
	Resolution         *string    `json:"resolution,omitempty"`
	FileSizeBytes      *int64     `json:"file_size_bytes,omitempty"`
	Status             string     `json:"status"`
	ProcessingProgress int        `json:"processing_progress"`
	ErrorMessage       *string    `json:"error_message,omitempty"`
	Visibility         string     `json:"visibility"`
	IsPremium          bool       `json:"is_premium"`
	PriceCents         *int       `json:"price_cents,omitempty"`
	ViewsCount         int        `json:"views_count"`
	LikesCount         int        `json:"likes_count"`
	PublishedAt        *time.Time `json:"published_at,omitempty"`
	UploadedBy         uuid.UUID  `json:"uploaded_by"`
	HomeScore          *int       `json:"home_score,omitempty"`
	AwayScore          *int       `json:"away_score,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// RecordingRequest is used for creating recordings.
type RecordingRequest struct {
	MatchID      *uuid.UUID `json:"match_id"`
	LeagueID     *uuid.UUID `json:"league_id"`
	TournamentID *uuid.UUID `json:"tournament_id"`
	Title        string     `json:"title"`
	Description  *string    `json:"description"`
	SourceType   string     `json:"source_type"`
	SourceDevice *string    `json:"source_device_id"`
}

// Validate returns validation errors for RecordingRequest.
func (r RecordingRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Title == "" {
		errs["title"] = "Title is required"
	}
	if len(r.Title) > 255 {
		errs["title"] = "Title must be at most 255 characters"
	}
	if r.Description != nil && len(*r.Description) > 2000 {
		errs["description"] = "Description must be at most 2000 characters"
	}
	if r.SourceType != "" && !isValidSourceType(r.SourceType) {
		errs["source_type"] = "Invalid source type"
	}
	return errs
}

// UpdateRecordingRequest is used for updating recordings (whitelisted fields only).
type UpdateRecordingRequest struct {
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	ThumbnailURL *string    `json:"thumbnail_url"`
	Visibility   *string    `json:"visibility"`
	IsPremium    *bool      `json:"is_premium"`
	PriceCents   *int       `json:"price_cents"`
	HomeScore    *int       `json:"home_score"`
	AwayScore    *int       `json:"away_score"`
	PublishedAt  *time.Time `json:"published_at"`
}

// Validate returns validation errors for UpdateRecordingRequest.
func (r UpdateRecordingRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Title != nil && (len(*r.Title) == 0 || len(*r.Title) > 255) {
		errs["title"] = "Title must be 1-255 characters"
	}
	if r.Description != nil && len(*r.Description) > 2000 {
		errs["description"] = "Description must be at most 2000 characters"
	}
	if r.Visibility != nil && !isValidVisibility(*r.Visibility) {
		errs["visibility"] = "Invalid visibility"
	}
	return errs
}

func isValidVisibility(v string) bool {
	for _, val := range []string{"public", "private", "unlisted", "premium"} {
		if v == val {
			return true
		}
	}
	return false
}

// isValidStreamSourceType mirrors live_streams_source_type_check.
func isValidStreamSourceType(st string) bool {
	for _, v := range []string{"xbotgo", "obs", "mobile", "web"} {
		if st == v {
			return true
		}
	}
	return false
}

// isValidSourceType mirrors match_recordings_source_type_check.
func isValidSourceType(st string) bool {
	for _, v := range []string{"manual", "xbotgo", "stream_archive"} {
		if st == v {
			return true
		}
	}
	return false
}

// Clip represents a video clip extracted from a recording.
type Clip struct {
	ID              uuid.UUID  `json:"id"`
	RecordingID     *uuid.UUID `json:"recording_id,omitempty"`
	MatchID         *uuid.UUID `json:"match_id,omitempty"`
	LeagueID        *uuid.UUID `json:"league_id,omitempty"`
	ClipType        *string    `json:"clip_type,omitempty"`
	ClipURL         *string    `json:"clip_url,omitempty"`
	MuxAssetID      *string    `json:"mux_asset_id,omitempty"`
	MuxPlaybackID   *string    `json:"mux_playback_id,omitempty"`
	ThumbnailURL    *string    `json:"thumbnail_url,omitempty"`
	StartSeconds    float64    `json:"start_time_seconds"`
	EndSeconds      float64    `json:"end_time_seconds"`
	DurationSeconds float64    `json:"duration_seconds"`
	Title           string     `json:"title"`
	Description     *string    `json:"description,omitempty"`
	MatchMinute     *int       `json:"match_minute,omitempty"`
	PlayerID        *uuid.UUID `json:"player_id,omitempty"`
	TeamID          *uuid.UUID `json:"team_id,omitempty"`
	AIGenerated     bool       `json:"ai_generated"`
	AIConfidence    *float64   `json:"ai_confidence,omitempty"`
	ViewsCount      int        `json:"views_count"`
	LikesCount      int        `json:"likes_count"`
	IsFeatured      bool       `json:"is_featured"`
	CreatedBy       uuid.UUID  `json:"created_by"`
	CreatedAt       time.Time  `json:"created_at"`
}

// ClipRequest is used for creating/updating clips.
type ClipRequest struct {
	RecordingID  *uuid.UUID `json:"recording_id"`
	MatchID      *uuid.UUID `json:"match_id"`
	LeagueID     *uuid.UUID `json:"league_id"`
	ClipType     *string    `json:"clip_type"`
	Title        string     `json:"title"`
	Description  *string    `json:"description"`
	StartSeconds float64    `json:"start_time_seconds"`
	EndSeconds   float64    `json:"end_time_seconds"`
	MatchMinute  *int       `json:"match_minute"`
	PlayerID     *uuid.UUID `json:"player_id"`
	TeamID       *uuid.UUID `json:"team_id"`
	AIGenerated  bool       `json:"ai_generated"`
	AIConfidence *float64   `json:"ai_confidence"`
}

// Validate returns validation errors for ClipRequest.
func (c ClipRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if c.Title == "" {
		errs["title"] = "Title is required"
	}
	if len(c.Title) > 255 {
		errs["title"] = "Title must be at most 255 characters"
	}
	if c.StartSeconds < 0 {
		errs["start_time_seconds"] = "Start time must be non-negative"
	}
	if c.EndSeconds < 0 {
		errs["end_time_seconds"] = "End time must be non-negative"
	}
	if c.EndSeconds <= c.StartSeconds {
		errs["end_time_seconds"] = "End time must be after start time"
	}
	if c.ClipType != nil && !isValidClipType(*c.ClipType) {
		errs["clip_type"] = "Invalid clip type"
	}
	return errs
}

func isValidClipType(ct string) bool {
	for _, v := range []string{"goal", "save", "yellow_card", "red_card", "penalty", "highlight", "custom", "ai_generated"} {
		if ct == v {
			return true
		}
	}
	return false
}

// Stream represents a live stream.
type Stream struct {
	ID                  uuid.UUID  `json:"id"`
	MatchID             *uuid.UUID `json:"match_id,omitempty"`
	LeagueID            *uuid.UUID `json:"league_id,omitempty"`
	MuxLiveStreamID     *string    `json:"mux_live_stream_id,omitempty"`
	MuxStreamKey        *string    `json:"mux_stream_key,omitempty"`
	MuxPlaybackID       *string    `json:"mux_playback_id,omitempty"`
	RecordingID         *uuid.UUID `json:"recording_id,omitempty"`
	RecordingAssetID    *string    `json:"recording_asset_id,omitempty"`
	RecordingPlaybackID *string    `json:"recording_playback_id,omitempty"`
	RecordingReady      bool       `json:"recording_ready"`
	Title               string     `json:"title"`
	Description         *string    `json:"description,omitempty"`
	ThumbnailURL        *string    `json:"thumbnail_url,omitempty"`
	Status              string     `json:"status"`
	SourceType          string     `json:"source_type"`
	IsPayPerView        bool       `json:"is_pay_per_view"`
	PriceCents          *int       `json:"price_cents,omitempty"`
	CurrentViewers      int        `json:"current_viewers"`
	ScheduledStart      *time.Time `json:"scheduled_start,omitempty"`
	ActualStart         *time.Time `json:"actual_start,omitempty"`
	EndedAt             *time.Time `json:"ended_at,omitempty"`
	BroadcasterID       uuid.UUID  `json:"broadcaster_id"`
	CreatedAt           time.Time  `json:"created_at"`
}

// StreamRequest is used for creating streams.
type StreamRequest struct {
	MatchID        *uuid.UUID `json:"match_id"`
	LeagueID       *uuid.UUID `json:"league_id"`
	Title          string     `json:"title"`
	Description    *string    `json:"description"`
	SourceType     string     `json:"source_type"`
	IsPayPerView   bool       `json:"is_pay_per_view"`
	PriceCents     *int       `json:"price_cents"`
	ScheduledStart *time.Time `json:"scheduled_start"`
}

// Validate returns validation errors for StreamRequest.
func (s StreamRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if s.Title == "" {
		errs["title"] = "Title is required"
	}
	if len(s.Title) > 255 {
		errs["title"] = "Title must be at most 255 characters"
	}
	if !isValidStreamSourceType(s.SourceType) {
		errs["source_type"] = "Invalid source type"
	}
	if s.IsPayPerView && (s.PriceCents == nil || *s.PriceCents <= 0) {
		errs["price_cents"] = "Price is required for pay-per-view streams"
	}
	return errs
}

// UpdateStreamRequest is used for updating streams (whitelisted fields only).
type UpdateStreamRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// Validate returns validation errors for UpdateStreamRequest.
func (s UpdateStreamRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if s.Title != nil && (len(*s.Title) == 0 || len(*s.Title) > 255) {
		errs["title"] = "Title must be 1-255 characters"
	}
	if s.Description != nil && len(*s.Description) > 2000 {
		errs["description"] = "Description must be at most 2000 characters"
	}
	if s.Status != nil && !isValidStreamStatus(*s.Status) {
		errs["status"] = "Invalid status"
	}
	return errs
}

func isValidStreamStatus(st string) bool {
	for _, v := range []string{"idle", "connecting", "live", "ended", "failed"} {
		if st == v {
			return true
		}
	}
	return false
}

// DirectUploadResponse is returned when creating a direct upload.
type DirectUploadResponse struct {
	Recording *Recording `json:"recording"`
	Upload    *Upload    `json:"upload"`
}

// Upload represents a Mux direct upload.
type Upload struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// Repository is the persistence contract.
type Repository interface {
	// Recordings
	GetRecording(ctx context.Context, id uuid.UUID) (*Recording, error)
	ListRecordings(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error)
	CreateRecording(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error)
	UpdateRecording(ctx context.Context, id uuid.UUID, req *UpdateRecordingRequest) (*Recording, error)
	DeleteRecording(ctx context.Context, id uuid.UUID) error

	// Clips
	GetClip(ctx context.Context, id uuid.UUID) (*Clip, error)
	ListClips(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error)
	CreateClip(ctx context.Context, req *ClipRequest, createdBy uuid.UUID) (*Clip, error)
	DeleteClip(ctx context.Context, id uuid.UUID) error

	// Streams
	GetStream(ctx context.Context, id uuid.UUID) (*Stream, error)
	ListStreams(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error)
	CreateStream(ctx context.Context, req *StreamRequest, broadcasterID uuid.UUID) (*Stream, error)
	UpdateStream(ctx context.Context, id uuid.UUID, req *UpdateStreamRequest) (*Stream, error)
	DeleteStream(ctx context.Context, id uuid.UUID) error

	// Mux events
	UpdateRecordingFromMuxUpload(ctx context.Context, uploadID string, muxAssetID string) error
	UpdateRecordingFromMuxAsset(ctx context.Context, assetID, playbackID string, duration int, resolution string) error
	UpdateRecordingError(ctx context.Context, assetID string, errMsg string) error
	UpdateStreamFromMuxLive(ctx context.Context, streamID string, newStatus string) error
}

// ListRecordingsOpts filters recordings list.
type ListRecordingsOpts struct {
	LeagueID   *uuid.UUID
	Status     string
	Visibility string
	Limit      int
	Offset     int
}

// ListClipsOpts filters clips list.
type ListClipsOpts struct {
	RecordingID *uuid.UUID
	MatchID     *uuid.UUID
	LeagueID    *uuid.UUID
	TeamID      *uuid.UUID
	ClipType    *string
	IsFeatured  bool
	Limit       int
	Offset      int
	SortBy      string
	SortOrder   string
}

// ListStreamsOpts filters streams list.
type ListStreamsOpts struct {
	LeagueID *uuid.UUID
	Status   string
	Upcoming bool
	Limit    int
	Offset   int
}

// MuxWebhookEvent is parsed from Mux webhook payload.
type MuxWebhookEvent struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// MuxAssetData extracts relevant fields from Mux asset webhook data.
type MuxAssetData struct {
	ID                  string
	UploadID            string
	PlaybackIDs         []map[string]interface{}
	Duration            float64
	MaxStoredResolution string
	Errors              map[string]interface{}
	LiveStreamID        string
}

// VideoProvider is the external Mux API contract.
type VideoProvider interface {
	CreateDirectUpload(ctx context.Context) (uploadID, uploadURL string, err error)
	GetAsset(ctx context.Context, assetID string) (playbackID string, duration int, resolution string, err error)
	DeleteAsset(ctx context.Context, assetID string) error
	CreateLiveStream(ctx context.Context, title string) (streamID, streamKey, playbackID string, err error)
	GetLiveStream(ctx context.Context, streamID string) (status string, err error)
	DeleteLiveStream(ctx context.Context, streamID string) error
}
