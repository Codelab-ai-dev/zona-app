// Package attendance records and streams player attendance for matches via QR codes or facial recognition.
package attendance

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// QRAttendance is a player attendance record via QR scan.
type QRAttendance struct {
	ID               uuid.UUID `json:"id"`
	PlayerID         uuid.UUID `json:"player_id"`
	MatchID          uuid.UUID `json:"match_id"`
	RecognitionMode  string    `json:"recognition_mode"` // "quick"
	ConfidenceScore  float64   `json:"confidence_score"`
	SimilarityScore  float64   `json:"similarity_score"`
	PhotoPath        *string   `json:"photo_path,omitempty"`
	DeviceInfo       *string   `json:"device_info,omitempty"`
	LocationData     *string   `json:"location_data,omitempty"`
	FaceQualityScore *float64  `json:"face_quality_score,omitempty"`
	ProcessingTimeMs *int      `json:"processing_time_ms,omitempty"`
	CacheHit         bool      `json:"cache_hit"`
	OperatorID       *string   `json:"operator_id,omitempty"`
	LocalTimestamp   time.Time `json:"local_timestamp"`
	SyncStatus       string    `json:"sync_status"` // "synced", "pending", "failed"
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// FacialAttendance is a player attendance record via facial recognition.
type FacialAttendance struct {
	ID               uuid.UUID `json:"id"`
	PlayerID         uuid.UUID `json:"player_id"`
	MatchID          uuid.UUID `json:"match_id"`
	RecognitionMode  string    `json:"recognition_mode"` // "quick", "verified"
	ConfidenceScore  float64   `json:"confidence_score"`
	SimilarityScore  float64   `json:"similarity_score"`
	PhotoPath        *string   `json:"photo_path,omitempty"`
	DeviceInfo       *string   `json:"device_info,omitempty"`
	LocationData     *string   `json:"location_data,omitempty"`
	FaceQualityScore *float64  `json:"face_quality_score,omitempty"`
	ProcessingTimeMs *int      `json:"processing_time_ms,omitempty"`
	CacheHit         bool      `json:"cache_hit"`
	OperatorID       *string   `json:"operator_id,omitempty"`
	LocalTimestamp   time.Time `json:"local_timestamp"`
	ServerTimestamp  time.Time `json:"server_timestamp"`
	SyncStatus       string    `json:"sync_status"` // "synced", "pending", "failed"
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// AttendanceRecord is the combined view of all attendance for a match.
type AttendanceRecord struct {
	PlayerID        uuid.UUID `json:"player_id"`
	PlayerName      string    `json:"player_name"`
	JerseyNumber    *int      `json:"jersey_number,omitempty"`
	RecognitionMode string    `json:"recognition_mode"`
	ConfidenceScore float64   `json:"confidence_score"`
	SimilarityScore float64   `json:"similarity_score"`
	Timestamp       time.Time `json:"timestamp"`
	Source          string    `json:"source"` // "qr" or "facial"
}

// TodayMatch is a match a scanned player can check in to.
type TodayMatch struct {
	MatchID           uuid.UUID `json:"match_id"`
	TournamentID      uuid.UUID `json:"tournament_id"`
	MatchTime         *string   `json:"match_time,omitempty"`
	Status            string    `json:"status"`
	HomeTeamName      string    `json:"home_team_name"`
	AwayTeamName      string    `json:"away_team_name"`
	FieldNumber       *int      `json:"field_number,omitempty"`
	AlreadyRegistered bool      `json:"already_registered"`
}

// RecordQRAttendanceRequest is the payload to record QR attendance.
type RecordQRAttendanceRequest struct {
	PlayerID         uuid.UUID `json:"player_id"`
	RecognitionMode  string    `json:"recognition_mode"` // default "quick"
	ConfidenceScore  float64   `json:"confidence_score"`
	SimilarityScore  float64   `json:"similarity_score"`
	PhotoPath        *string   `json:"photo_path,omitempty"`
	DeviceInfo       *string   `json:"device_info,omitempty"`
	LocationData     *string   `json:"location_data,omitempty"`
	FaceQualityScore *float64  `json:"face_quality_score,omitempty"`
	ProcessingTimeMs *int      `json:"processing_time_ms,omitempty"`
	OperatorID       *string   `json:"operator_id,omitempty"`
	LocalTimestamp   time.Time `json:"local_timestamp"`
}

// Validate checks the request for errors.
func (r *RecordQRAttendanceRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerID == uuid.Nil {
		errs["player_id"] = "requerido"
	}
	if r.RecognitionMode == "" {
		r.RecognitionMode = "quick"
	} else if r.RecognitionMode != "quick" {
		errs["recognition_mode"] = "debe ser 'quick'"
	}
	if r.ConfidenceScore < 0 || r.ConfidenceScore > 1 {
		errs["confidence_score"] = "debe estar entre 0 y 1"
	}
	if r.SimilarityScore < 0 || r.SimilarityScore > 1 {
		errs["similarity_score"] = "debe estar entre 0 y 1"
	}
	if r.LocalTimestamp.IsZero() {
		errs["local_timestamp"] = "requerido"
	}
	return errs
}

// RecordFacialAttendanceRequest is the payload to record facial recognition attendance.
type RecordFacialAttendanceRequest struct {
	PlayerID         uuid.UUID `json:"player_id"`
	RecognitionMode  string    `json:"recognition_mode"` // "quick", "verified"
	ConfidenceScore  float64   `json:"confidence_score"`
	SimilarityScore  float64   `json:"similarity_score"`
	FaceEmbedding    []float64 `json:"face_embedding,omitempty"` // 512-element vector from mobile app
	PhotoPath        *string   `json:"photo_path,omitempty"`
	DeviceInfo       *string   `json:"device_info,omitempty"`
	LocationData     *string   `json:"location_data,omitempty"`
	FaceQualityScore *float64  `json:"face_quality_score,omitempty"`
	ProcessingTimeMs *int      `json:"processing_time_ms,omitempty"`
	OperatorID       *string   `json:"operator_id,omitempty"`
	LocalTimestamp   time.Time `json:"local_timestamp"`
}

// Validate checks the request for errors.
func (r *RecordFacialAttendanceRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerID == uuid.Nil {
		errs["player_id"] = "requerido"
	}
	if r.RecognitionMode != "quick" && r.RecognitionMode != "verified" {
		errs["recognition_mode"] = "debe ser 'quick' o 'verified'"
	}
	if r.ConfidenceScore < 0 || r.ConfidenceScore > 1 {
		errs["confidence_score"] = "debe estar entre 0 y 1"
	}
	if r.SimilarityScore < 0 || r.SimilarityScore > 1 {
		errs["similarity_score"] = "debe estar entre 0 y 1"
	}
	if r.LocalTimestamp.IsZero() {
		errs["local_timestamp"] = "requerido"
	}
	// Validate embedding: must be exactly 512 elements, all finite
	if len(r.FaceEmbedding) != 512 {
		errs["face_embedding"] = "debe tener exactamente 512 elementos"
	} else {
		for _, v := range r.FaceEmbedding {
			if !isFinite(v) {
				errs["face_embedding"] = "valor no finito en embedding"
				break
			}
		}
	}
	return errs
}

// isFinite checks if a float64 is finite (not NaN or Inf).
func isFinite(f float64) bool {
	return f == f && f != f+1 && f != f-1 // NaN != NaN, and Inf == Inf±1
}

// ListAttendanceRequest is the payload to list attendance.
type ListAttendanceRequest struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// Validate checks the request for errors.
func (r *ListAttendanceRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Limit < 1 || r.Limit > 100 {
		errs["limit"] = "debe estar entre 1 y 100"
	}
	if r.Offset < 0 {
		errs["offset"] = "debe ser >= 0"
	}
	return errs
}

// AttendanceStream holds connection state for SSE streaming.
type AttendanceStream struct {
	MatchID uuid.UUID
	Ch      chan AttendanceRecord
	Done    chan struct{}
}

// Repository is the persistence contract the service depends on.
type Repository interface {
	// RecordQRAttendance inserts a QR attendance record, checking for duplicates.
	RecordQRAttendance(ctx context.Context, matchID uuid.UUID, req *RecordQRAttendanceRequest) (QRAttendance, error)

	// RecordFacialAttendance inserts a facial attendance record, finding best player match by embedding similarity.
	RecordFacialAttendance(ctx context.Context, matchID uuid.UUID, req *RecordFacialAttendanceRequest) (FacialAttendance, error)

	// ListAttendance returns all attendance records for a match, paginated.
	ListAttendance(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]AttendanceRecord, error)

	// StreamAttendance polls the database every 2s for new attendance in a match, sends to chan, stops on ctx cancel.
	StreamAttendance(ctx context.Context, matchID uuid.UUID, ch chan AttendanceRecord) error

	// PlayerLeague returns the league of a player's team (httpx.ErrNotFound if none).
	PlayerLeague(ctx context.Context, playerID uuid.UUID) (uuid.UUID, error)

	// PlayerMatchesOn lists the player's team matches on a date that can still
	// take attendance (scheduled or in progress).
	PlayerMatchesOn(ctx context.Context, playerID uuid.UUID, date time.Time) ([]TodayMatch, error)

	// GetMatchLeague fetches the league_id for a match (for auth checks).
	GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error)

	// GetMatchStatus fetches the status of a match to check if it's finished.
	GetMatchStatus(ctx context.Context, matchID uuid.UUID) (string, error)

	// CheckPlayerInMatch checks if a player belongs to one of the teams in a match.
	CheckPlayerInMatch(ctx context.Context, playerID, matchID uuid.UUID) (bool, error)
}
