package attendance

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds the attendance repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// RecordQRAttendance inserts a QR attendance record.
func (r *PGRepository) RecordQRAttendance(ctx context.Context, matchID uuid.UUID, req *RecordQRAttendanceRequest) (QRAttendance, error) {
	// Pre-check gives a clean 409; the unique constraint still guards races.
	checkQ := `SELECT EXISTS(SELECT 1 FROM public.asistencias_qr WHERE player_id = $1 AND match_id = $2)`
	var exists bool
	if err := r.db.QueryRow(ctx, checkQ, req.PlayerID, matchID).Scan(&exists); err != nil {
		return QRAttendance{}, fmt.Errorf("check duplicate QR attendance: %w", err)
	}
	if exists {
		return QRAttendance{}, httpx.ErrConflict
	}

	q := `
		INSERT INTO public.asistencias_qr (
			player_id, match_id, recognition_mode, confidence_score, similarity_score,
			photo_path, device_info, location_data, face_quality_score, processing_time_ms,
			operator_id, local_timestamp, sync_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, player_id, match_id, recognition_mode, confidence_score, similarity_score,
			photo_path, device_info, location_data, face_quality_score, processing_time_ms,
			cache_hit, operator_id, local_timestamp, sync_status, created_at, updated_at
	`

	var att QRAttendance
	err := r.db.QueryRow(ctx, q,
		req.PlayerID, matchID, req.RecognitionMode, req.ConfidenceScore, req.SimilarityScore,
		req.PhotoPath, req.DeviceInfo, req.LocationData, req.FaceQualityScore, req.ProcessingTimeMs,
		req.OperatorID, req.LocalTimestamp, "synced",
	).Scan(
		&att.ID, &att.PlayerID, &att.MatchID, &att.RecognitionMode, &att.ConfidenceScore, &att.SimilarityScore,
		&att.PhotoPath, &att.DeviceInfo, &att.LocationData, &att.FaceQualityScore, &att.ProcessingTimeMs,
		&att.CacheHit, &att.OperatorID, &att.LocalTimestamp, &att.SyncStatus, &att.CreatedAt, &att.UpdatedAt,
	)

	if err != nil {
		if isUniqueViolation(err) {
			return QRAttendance{}, httpx.ErrConflict.Wrap(err)
		}
		return QRAttendance{}, fmt.Errorf("record QR attendance: %w", err)
	}

	return att, nil
}

// RecordFacialAttendance inserts a facial attendance record.
func (r *PGRepository) RecordFacialAttendance(ctx context.Context, matchID uuid.UUID, req *RecordFacialAttendanceRequest) (FacialAttendance, error) {
	q := `
		INSERT INTO public.facial_attendance (
			player_id, match_id, recognition_mode, confidence_score, similarity_score,
			photo_path, device_info, location_data, face_quality_score, processing_time_ms,
			operator_id, local_timestamp, sync_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, player_id, match_id, recognition_mode, confidence_score, similarity_score,
			photo_path, device_info, location_data, face_quality_score, processing_time_ms,
			cache_hit, operator_id, local_timestamp, server_timestamp, sync_status, created_at, updated_at
	`

	var att FacialAttendance
	err := r.db.QueryRow(ctx, q,
		req.PlayerID, matchID, req.RecognitionMode, req.ConfidenceScore, req.SimilarityScore,
		req.PhotoPath, req.DeviceInfo, req.LocationData, req.FaceQualityScore, req.ProcessingTimeMs,
		req.OperatorID, req.LocalTimestamp, "synced",
	).Scan(
		&att.ID, &att.PlayerID, &att.MatchID, &att.RecognitionMode, &att.ConfidenceScore, &att.SimilarityScore,
		&att.PhotoPath, &att.DeviceInfo, &att.LocationData, &att.FaceQualityScore, &att.ProcessingTimeMs,
		&att.CacheHit, &att.OperatorID, &att.LocalTimestamp, &att.ServerTimestamp, &att.SyncStatus, &att.CreatedAt, &att.UpdatedAt,
	)

	if err != nil {
		return FacialAttendance{}, fmt.Errorf("record facial attendance: %w", err)
	}

	return att, nil
}

// ListAttendance returns attendance records for a match.
func (r *PGRepository) ListAttendance(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]AttendanceRecord, error) {
	q := `
		SELECT p.id, p.name, p.jersey_number, 'qr' AS source, aq.recognition_mode, aq.confidence_score, aq.similarity_score, aq.local_timestamp AS "timestamp"
		FROM public.asistencias_qr aq
		JOIN public.players p ON p.id = aq.player_id
		WHERE aq.match_id = $1
		UNION ALL
		SELECT p.id, p.name, p.jersey_number, 'facial' AS source, fa.recognition_mode::text, fa.confidence_score, fa.similarity_score, fa.local_timestamp
		FROM public.facial_attendance fa
		JOIN public.players p ON p.id = fa.player_id
		WHERE fa.match_id = $1
		ORDER BY "timestamp" DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, q, matchID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list attendance: %w", err)
	}
	defer rows.Close()

	var records []AttendanceRecord
	for rows.Next() {
		var ar AttendanceRecord
		if err := rows.Scan(&ar.PlayerID, &ar.PlayerName, &ar.JerseyNumber, &ar.Source, &ar.RecognitionMode, &ar.ConfidenceScore, &ar.SimilarityScore, &ar.Timestamp); err != nil {
			return nil, fmt.Errorf("scan attendance: %w", err)
		}
		records = append(records, ar)
	}

	return records, rows.Err()
}

// StreamAttendance polls for attendance updates and sends them on the channel.
func (r *PGRepository) StreamAttendance(ctx context.Context, matchID uuid.UUID, ch chan AttendanceRecord) error {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var lastTimestamp time.Time

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			q := `
				SELECT p.id, p.name, p.jersey_number, 'qr' AS source, aq.recognition_mode, aq.confidence_score, aq.similarity_score, aq.local_timestamp AS "timestamp"
				FROM public.asistencias_qr aq
				JOIN public.players p ON p.id = aq.player_id
				WHERE aq.match_id = $1 AND aq.local_timestamp > $2
				UNION ALL
				SELECT p.id, p.name, p.jersey_number, 'facial' AS source, fa.recognition_mode::text, fa.confidence_score, fa.similarity_score, fa.local_timestamp
				FROM public.facial_attendance fa
				JOIN public.players p ON p.id = fa.player_id
				WHERE fa.match_id = $1 AND fa.local_timestamp > $2
				ORDER BY "timestamp" ASC
			`

			rows, err := r.db.Query(ctx, q, matchID, lastTimestamp)
			if err != nil {
				return fmt.Errorf("stream attendance query: %w", err)
			}

			for rows.Next() {
				var ar AttendanceRecord
				if err := rows.Scan(&ar.PlayerID, &ar.PlayerName, &ar.JerseyNumber, &ar.Source, &ar.RecognitionMode, &ar.ConfidenceScore, &ar.SimilarityScore, &ar.Timestamp); err != nil {
					rows.Close()
					return fmt.Errorf("scan attendance: %w", err)
				}
				lastTimestamp = ar.Timestamp

				select {
				case ch <- ar:
				case <-ctx.Done():
					rows.Close()
					return ctx.Err()
				}
			}
			rows.Close()

			if err != nil {
				return fmt.Errorf("stream attendance: %w", err)
			}
		}
	}
}

// GetMatchLeague fetches the league for a match.
func (r *PGRepository) GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error) {
	q := `
		SELECT t.league_id
		FROM public.matches m
		JOIN public.tournaments t ON t.id = m.tournament_id
		WHERE m.id = $1
	`

	var leagueID uuid.UUID
	err := r.db.QueryRow(ctx, q, matchID).Scan(&leagueID)
	if database.IsNoRows(err) {
		return uuid.Nil, httpx.ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("get match league: %w", err)
	}

	return leagueID, nil
}

// GetMatchStatus fetches the status of a match.
func (r *PGRepository) GetMatchStatus(ctx context.Context, matchID uuid.UUID) (string, error) {
	q := `SELECT status FROM public.matches WHERE id = $1`

	var status string
	err := r.db.QueryRow(ctx, q, matchID).Scan(&status)
	if database.IsNoRows(err) {
		return "", httpx.ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get match status: %w", err)
	}

	return status, nil
}

// CheckPlayerInMatch checks if a player belongs to one of the teams in a match.
func (r *PGRepository) CheckPlayerInMatch(ctx context.Context, playerID, matchID uuid.UUID) (bool, error) {
	q := `
		SELECT EXISTS(
			SELECT 1 FROM public.players p
			WHERE p.id = $1 AND p.team_id IN (
				SELECT home_team_id FROM public.matches WHERE id = $2
				UNION
				SELECT away_team_id FROM public.matches WHERE id = $2
			)
		)
	`

	var exists bool
	err := r.db.QueryRow(ctx, q, playerID, matchID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check player in match: %w", err)
	}

	return exists, nil
}

// isUniqueViolation checks if an error is a unique constraint violation.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return false
}
