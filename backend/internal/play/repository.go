package play

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds a database-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// GetRecording retrieves a single recording by ID.
func (r *PGRepository) GetRecording(ctx context.Context, id uuid.UUID) (*Recording, error) {
	rec := &Recording{}
	err := r.db.QueryRow(ctx, `
		SELECT id, match_id, league_id, tournament_id, source_type, source_device_id,
		       video_url, mux_asset_id, mux_playback_id, title, description, thumbnail_url,
		       duration_seconds, resolution, file_size_bytes, status, processing_progress,
		       error_message, visibility, is_premium, price_cents, views_count, likes_count,
		       published_at, uploaded_by, home_score, away_score, created_at, updated_at
		FROM public.match_recordings
		WHERE id = $1
	`, id).Scan(
		&rec.ID, &rec.MatchID, &rec.LeagueID, &rec.TournamentID, &rec.SourceType, &rec.SourceDeviceID,
		&rec.VideoURL, &rec.MuxAssetID, &rec.MuxPlaybackID, &rec.Title, &rec.Description, &rec.ThumbnailURL,
		&rec.DurationSeconds, &rec.Resolution, &rec.FileSizeBytes, &rec.Status, &rec.ProcessingProgress,
		&rec.ErrorMessage, &rec.Visibility, &rec.IsPremium, &rec.PriceCents, &rec.ViewsCount, &rec.LikesCount,
		&rec.PublishedAt, &rec.UploadedBy, &rec.HomeScore, &rec.AwayScore, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query recording: %w", err)
	}
	return rec, nil
}

// ListRecordings retrieves paginated recordings matching filters.
func (r *PGRepository) ListRecordings(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
	if opts == nil {
		opts = &ListRecordingsOpts{Limit: 20}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}

	// One WHERE clause feeds both the page and the total so they never drift.
	where, args := recordingFilters(opts)
	n := len(args)
	query := `
		SELECT id, match_id, league_id, tournament_id, source_type, source_device_id,
		       video_url, mux_asset_id, mux_playback_id, title, description, thumbnail_url,
		       duration_seconds, resolution, file_size_bytes, status, processing_progress,
		       error_message, visibility, is_premium, price_cents, views_count, likes_count,
		       published_at, uploaded_by, home_score, away_score, created_at, updated_at
		FROM public.match_recordings` + where + fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, n+1, n+2)

	rows, err := r.db.Query(ctx, query, append(args, opts.Limit, opts.Offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("query recordings: %w", err)
	}
	defer rows.Close()

	var recordings []*Recording
	for rows.Next() {
		rec := &Recording{}
		err := rows.Scan(
			&rec.ID, &rec.MatchID, &rec.LeagueID, &rec.TournamentID, &rec.SourceType, &rec.SourceDeviceID,
			&rec.VideoURL, &rec.MuxAssetID, &rec.MuxPlaybackID, &rec.Title, &rec.Description, &rec.ThumbnailURL,
			&rec.DurationSeconds, &rec.Resolution, &rec.FileSizeBytes, &rec.Status, &rec.ProcessingProgress,
			&rec.ErrorMessage, &rec.Visibility, &rec.IsPremium, &rec.PriceCents, &rec.ViewsCount, &rec.LikesCount,
			&rec.PublishedAt, &rec.UploadedBy, &rec.HomeScore, &rec.AwayScore, &rec.CreatedAt, &rec.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan recording: %w", err)
		}
		recordings = append(recordings, rec)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate recordings: %w", err)
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.match_recordings`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count recordings: %w", err)
	}
	return recordings, total, nil
}

// recordingFilters builds a parameterized WHERE clause from the options.
func recordingFilters(opts *ListRecordingsOpts) (string, []any) {
	var conds []string
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		conds = append(conds, fmt.Sprintf(cond, len(args)))
	}
	if opts.LeagueID != nil {
		add("league_id = $%d", *opts.LeagueID)
	}
	if opts.Status != "" {
		add("status = $%d", opts.Status)
	}
	if opts.Visibility != "" {
		add("visibility = $%d", opts.Visibility)
	}
	if opts.TeamID != nil {
		add("match_id IN (SELECT id FROM public.matches WHERE home_team_id = $%[1]d OR away_team_id = $%[1]d)", *opts.TeamID)
	}
	if q := strings.TrimSpace(opts.Query); q != "" {
		add(`(title ILIKE $%[1]d ESCAPE '\' OR description ILIKE $%[1]d ESCAPE '\')`, "%"+escapeLike(q)+"%")
	}
	if len(conds) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

// escapeLike escapes LIKE wildcards so user text matches literally.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

// CreateRecording inserts a new recording.
func (r *PGRepository) CreateRecording(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error) {
	rec := &Recording{}
	sourceType := req.SourceType
	if sourceType == "" {
		sourceType = "manual"
	}

	err := r.db.QueryRow(ctx, `
		INSERT INTO public.match_recordings
		(match_id, league_id, tournament_id, title, description, source_type, source_device_id,
		 status, visibility, uploaded_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
		RETURNING id, match_id, league_id, tournament_id, source_type, source_device_id,
		          video_url, mux_asset_id, mux_playback_id, title, description, thumbnail_url,
		          duration_seconds, resolution, file_size_bytes, status, processing_progress,
		          error_message, visibility, is_premium, price_cents, views_count, likes_count,
		          published_at, uploaded_by, home_score, away_score, created_at, updated_at
	`, req.MatchID, req.LeagueID, req.TournamentID, req.Title, req.Description, sourceType,
		req.SourceDevice, "pending", "public", uploadedBy).Scan(
		&rec.ID, &rec.MatchID, &rec.LeagueID, &rec.TournamentID, &rec.SourceType, &rec.SourceDeviceID,
		&rec.VideoURL, &rec.MuxAssetID, &rec.MuxPlaybackID, &rec.Title, &rec.Description, &rec.ThumbnailURL,
		&rec.DurationSeconds, &rec.Resolution, &rec.FileSizeBytes, &rec.Status, &rec.ProcessingProgress,
		&rec.ErrorMessage, &rec.Visibility, &rec.IsPremium, &rec.PriceCents, &rec.ViewsCount, &rec.LikesCount,
		&rec.PublishedAt, &rec.UploadedBy, &rec.HomeScore, &rec.AwayScore, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert recording: %w", err)
	}
	return rec, nil
}

// UpdateRecording updates specific fields of a recording (whitelisted).
func (r *PGRepository) UpdateRecording(ctx context.Context, id uuid.UUID, req *UpdateRecordingRequest) (*Recording, error) {
	var query strings.Builder
	var args []interface{}

	query.WriteString(`UPDATE public.match_recordings SET `)

	first := true
	argCount := 1

	// Whitelist only allowed fields
	if req.Title != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`title = $%d`, argCount))
		args = append(args, *req.Title)
		argCount++
		first = false
	}

	if req.Description != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`description = $%d`, argCount))
		args = append(args, *req.Description)
		argCount++
		first = false
	}

	if req.ThumbnailURL != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`thumbnail_url = $%d`, argCount))
		args = append(args, *req.ThumbnailURL)
		argCount++
		first = false
	}

	if req.Visibility != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`visibility = $%d`, argCount))
		args = append(args, *req.Visibility)
		argCount++
		first = false
	}

	if req.IsPremium != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`is_premium = $%d`, argCount))
		args = append(args, *req.IsPremium)
		argCount++
		first = false
	}

	if req.PriceCents != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`price_cents = $%d`, argCount))
		args = append(args, *req.PriceCents)
		argCount++
		first = false
	}

	if req.HomeScore != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`home_score = $%d`, argCount))
		args = append(args, *req.HomeScore)
		argCount++
		first = false
	}

	if req.AwayScore != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`away_score = $%d`, argCount))
		args = append(args, *req.AwayScore)
		argCount++
		first = false
	}

	if req.PublishedAt != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`published_at = $%d`, argCount))
		args = append(args, *req.PublishedAt)
		argCount++
		first = false
	}

	// If no fields to update, just fetch current
	if first {
		return r.GetRecording(ctx, id)
	}

	query.WriteString(fmt.Sprintf(`, updated_at = NOW() WHERE id = $%d RETURNING `, argCount))
	args = append(args, id)
	query.WriteString(`id, match_id, league_id, tournament_id, source_type, source_device_id,
	       video_url, mux_asset_id, mux_playback_id, title, description, thumbnail_url,
	       duration_seconds, resolution, file_size_bytes, status, processing_progress,
	       error_message, visibility, is_premium, price_cents, views_count, likes_count,
	       published_at, uploaded_by, home_score, away_score, created_at, updated_at`)

	rec := &Recording{}
	err := r.db.QueryRow(ctx, query.String(), args...).Scan(
		&rec.ID, &rec.MatchID, &rec.LeagueID, &rec.TournamentID, &rec.SourceType, &rec.SourceDeviceID,
		&rec.VideoURL, &rec.MuxAssetID, &rec.MuxPlaybackID, &rec.Title, &rec.Description, &rec.ThumbnailURL,
		&rec.DurationSeconds, &rec.Resolution, &rec.FileSizeBytes, &rec.Status, &rec.ProcessingProgress,
		&rec.ErrorMessage, &rec.Visibility, &rec.IsPremium, &rec.PriceCents, &rec.ViewsCount, &rec.LikesCount,
		&rec.PublishedAt, &rec.UploadedBy, &rec.HomeScore, &rec.AwayScore, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("update recording: %w", err)
	}
	return rec, nil
}

// DeleteRecording removes a recording.
func (r *PGRepository) DeleteRecording(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM public.match_recordings WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete recording: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil // Already deleted or never existed
	}
	return nil
}

// clipSortColumns whitelists the columns clients may sort clips by. Never
// interpolate a client-provided identifier into SQL without this map.
var clipSortColumns = map[string]string{
	"created_at":   "created_at",
	"views_count":  "views_count",
	"likes_count":  "likes_count",
	"match_minute": "match_minute",
}

// clipOrderBy builds a safe ORDER BY clause, falling back to newest first.
func clipOrderBy(sortBy, sortOrder string) string {
	col, ok := clipSortColumns[sortBy]
	if !ok {
		col = "created_at"
	}
	dir := "DESC"
	if sortOrder == "asc" {
		dir = "ASC"
	}
	return " ORDER BY " + col + " " + dir
}

// GetClip retrieves a single clip by ID.
func (r *PGRepository) GetClip(ctx context.Context, id uuid.UUID) (*Clip, error) {
	clip := &Clip{}
	err := r.db.QueryRow(ctx, `
		SELECT id, recording_id, match_id, league_id, clip_type, clip_url, mux_asset_id,
		       mux_playback_id, thumbnail_url, start_time_seconds, end_time_seconds,
		       duration_seconds, title, description, match_minute, player_id, team_id,
		       ai_generated, ai_confidence, views_count, likes_count, is_featured, created_by, created_at
		FROM public.video_clips
		WHERE id = $1
	`, id).Scan(
		&clip.ID, &clip.RecordingID, &clip.MatchID, &clip.LeagueID, &clip.ClipType, &clip.ClipURL,
		&clip.MuxAssetID, &clip.MuxPlaybackID, &clip.ThumbnailURL, &clip.StartSeconds, &clip.EndSeconds,
		&clip.DurationSeconds, &clip.Title, &clip.Description, &clip.MatchMinute, &clip.PlayerID, &clip.TeamID,
		&clip.AIGenerated, &clip.AIConfidence, &clip.ViewsCount, &clip.LikesCount, &clip.IsFeatured,
		&clip.CreatedBy, &clip.CreatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query clip: %w", err)
	}
	return clip, nil
}

// ListClips retrieves paginated clips matching filters.
func (r *PGRepository) ListClips(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error) {
	if opts == nil {
		opts = &ListClipsOpts{Limit: 20, SortBy: "created_at", SortOrder: "desc"}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}
	if opts.SortBy == "" {
		opts.SortBy = "created_at"
	}
	if opts.SortOrder == "" {
		opts.SortOrder = "desc"
	}

	var query strings.Builder
	var args []interface{}
	argCount := 1

	query.WriteString(`
		SELECT id, recording_id, match_id, league_id, clip_type, clip_url, mux_asset_id,
		       mux_playback_id, thumbnail_url, start_time_seconds, end_time_seconds,
		       duration_seconds, title, description, match_minute, player_id, team_id,
		       ai_generated, ai_confidence, views_count, likes_count, is_featured, created_by, created_at
		FROM public.video_clips
		WHERE 1=1
	`)

	if opts.RecordingID != nil {
		query.WriteString(fmt.Sprintf(` AND recording_id = $%d`, argCount))
		args = append(args, *opts.RecordingID)
		argCount++
	}
	if opts.MatchID != nil {
		query.WriteString(fmt.Sprintf(` AND match_id = $%d`, argCount))
		args = append(args, *opts.MatchID)
		argCount++
	}
	if opts.LeagueID != nil {
		query.WriteString(fmt.Sprintf(` AND league_id = $%d`, argCount))
		args = append(args, *opts.LeagueID)
		argCount++
	}
	if opts.TeamID != nil {
		query.WriteString(fmt.Sprintf(` AND team_id = $%d`, argCount))
		args = append(args, *opts.TeamID)
		argCount++
	}
	if opts.ClipType != nil {
		query.WriteString(fmt.Sprintf(` AND clip_type = $%d`, argCount))
		args = append(args, *opts.ClipType)
		argCount++
	}
	if opts.IsFeatured {
		query.WriteString(fmt.Sprintf(` AND is_featured = true`))
	}

	query.WriteString(clipOrderBy(opts.SortBy, opts.SortOrder))
	query.WriteString(fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argCount, argCount+1))
	args = append(args, opts.Limit, opts.Offset)

	rows, err := r.db.Query(ctx, query.String(), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query clips: %w", err)
	}
	defer rows.Close()

	var clips []*Clip
	for rows.Next() {
		clip := &Clip{}
		err := rows.Scan(
			&clip.ID, &clip.RecordingID, &clip.MatchID, &clip.LeagueID, &clip.ClipType, &clip.ClipURL,
			&clip.MuxAssetID, &clip.MuxPlaybackID, &clip.ThumbnailURL, &clip.StartSeconds, &clip.EndSeconds,
			&clip.DurationSeconds, &clip.Title, &clip.Description, &clip.MatchMinute, &clip.PlayerID, &clip.TeamID,
			&clip.AIGenerated, &clip.AIConfidence, &clip.ViewsCount, &clip.LikesCount, &clip.IsFeatured,
			&clip.CreatedBy, &clip.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM public.video_clips WHERE 1=1`
	countArgs := []interface{}{}
	countArgCount := 1

	if opts.RecordingID != nil {
		countQuery += fmt.Sprintf(` AND recording_id = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.RecordingID)
		countArgCount++
	}
	if opts.MatchID != nil {
		countQuery += fmt.Sprintf(` AND match_id = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.MatchID)
		countArgCount++
	}
	if opts.LeagueID != nil {
		countQuery += fmt.Sprintf(` AND league_id = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.LeagueID)
		countArgCount++
	}
	if opts.TeamID != nil {
		countQuery += fmt.Sprintf(` AND team_id = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.TeamID)
		countArgCount++
	}
	if opts.ClipType != nil {
		countQuery += fmt.Sprintf(` AND clip_type = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.ClipType)
		countArgCount++
	}
	if opts.IsFeatured {
		countQuery += ` AND is_featured = true`
	}

	var count int64
	err = r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&count)
	if err != nil {
		return nil, 0, fmt.Errorf("count clips: %w", err)
	}

	return clips, count, nil
}

// CreateClip inserts a new clip.
func (r *PGRepository) CreateClip(ctx context.Context, req *ClipRequest, createdBy uuid.UUID) (*Clip, error) {
	clip := &Clip{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.video_clips
		(recording_id, match_id, league_id, clip_type, title, description, start_time_seconds,
		 end_time_seconds, match_minute, player_id, team_id, ai_generated, ai_confidence,
		 created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
		RETURNING id, recording_id, match_id, league_id, clip_type, clip_url, mux_asset_id,
		          mux_playback_id, thumbnail_url, start_time_seconds, end_time_seconds,
		          duration_seconds, title, description, match_minute, player_id, team_id,
		          ai_generated, ai_confidence, views_count, likes_count, is_featured, created_by, created_at
	`, req.RecordingID, req.MatchID, req.LeagueID, req.ClipType, req.Title, req.Description,
		req.StartSeconds, req.EndSeconds, req.MatchMinute, req.PlayerID, req.TeamID,
		req.AIGenerated, req.AIConfidence, createdBy).Scan(
		&clip.ID, &clip.RecordingID, &clip.MatchID, &clip.LeagueID, &clip.ClipType, &clip.ClipURL,
		&clip.MuxAssetID, &clip.MuxPlaybackID, &clip.ThumbnailURL, &clip.StartSeconds, &clip.EndSeconds,
		&clip.DurationSeconds, &clip.Title, &clip.Description, &clip.MatchMinute, &clip.PlayerID, &clip.TeamID,
		&clip.AIGenerated, &clip.AIConfidence, &clip.ViewsCount, &clip.LikesCount, &clip.IsFeatured,
		&clip.CreatedBy, &clip.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert clip: %w", err)
	}
	return clip, nil
}

// DeleteClip removes a clip.
func (r *PGRepository) DeleteClip(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM public.video_clips WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete clip: %w", err)
	}
	return nil
}

// GetStream retrieves a single stream by ID.
func (r *PGRepository) GetStream(ctx context.Context, id uuid.UUID) (*Stream, error) {
	stream := &Stream{}
	err := r.db.QueryRow(ctx, `
		SELECT id, match_id, league_id, mux_live_stream_id, mux_stream_key, mux_playback_id,
		       recording_id, recording_asset_id, recording_playback_id, recording_ready,
		       title, description, thumbnail_url, status, source_type, is_pay_per_view,
		       price_cents, current_viewers, scheduled_start, actual_start, ended_at,
		       broadcaster_id, created_at
		FROM public.live_streams
		WHERE id = $1
	`, id).Scan(
		&stream.ID, &stream.MatchID, &stream.LeagueID, &stream.MuxLiveStreamID, &stream.MuxStreamKey, &stream.MuxPlaybackID,
		&stream.RecordingID, &stream.RecordingAssetID, &stream.RecordingPlaybackID, &stream.RecordingReady,
		&stream.Title, &stream.Description, &stream.ThumbnailURL, &stream.Status, &stream.SourceType, &stream.IsPayPerView,
		&stream.PriceCents, &stream.CurrentViewers, &stream.ScheduledStart, &stream.ActualStart, &stream.EndedAt,
		&stream.BroadcasterID, &stream.CreatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query stream: %w", err)
	}
	return stream, nil
}

// ListStreams retrieves paginated streams matching filters.
func (r *PGRepository) ListStreams(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error) {
	if opts == nil {
		opts = &ListStreamsOpts{Limit: 20}
	}
	if opts.Limit == 0 || opts.Limit > 100 {
		opts.Limit = 100
	}

	var query strings.Builder
	var args []interface{}
	argCount := 1

	query.WriteString(`
		SELECT id, match_id, league_id, mux_live_stream_id, mux_stream_key, mux_playback_id,
		       recording_id, recording_asset_id, recording_playback_id, recording_ready,
		       title, description, thumbnail_url, status, source_type, is_pay_per_view,
		       price_cents, current_viewers, scheduled_start, actual_start, ended_at,
		       broadcaster_id, created_at
		FROM public.live_streams
		WHERE 1=1
	`)

	if opts.LeagueID != nil {
		query.WriteString(fmt.Sprintf(` AND league_id = $%d`, argCount))
		args = append(args, *opts.LeagueID)
		argCount++
	}

	if opts.Status != "" {
		query.WriteString(fmt.Sprintf(` AND status = $%d`, argCount))
		args = append(args, opts.Status)
		argCount++
	} else if opts.Upcoming {
		query.WriteString(fmt.Sprintf(` AND status IN ('idle', 'connecting') AND scheduled_start > NOW()`))
	}

	query.WriteString(` ORDER BY scheduled_start ASC`)
	query.WriteString(fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argCount, argCount+1))
	args = append(args, opts.Limit, opts.Offset)

	rows, err := r.db.Query(ctx, query.String(), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query streams: %w", err)
	}
	defer rows.Close()

	var streams []*Stream
	for rows.Next() {
		stream := &Stream{}
		err := rows.Scan(
			&stream.ID, &stream.MatchID, &stream.LeagueID, &stream.MuxLiveStreamID, &stream.MuxStreamKey, &stream.MuxPlaybackID,
			&stream.RecordingID, &stream.RecordingAssetID, &stream.RecordingPlaybackID, &stream.RecordingReady,
			&stream.Title, &stream.Description, &stream.ThumbnailURL, &stream.Status, &stream.SourceType, &stream.IsPayPerView,
			&stream.PriceCents, &stream.CurrentViewers, &stream.ScheduledStart, &stream.ActualStart, &stream.EndedAt,
			&stream.BroadcasterID, &stream.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan stream: %w", err)
		}
		streams = append(streams, stream)
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM public.live_streams WHERE 1=1`
	countArgs := []interface{}{}
	countArgCount := 1

	if opts.LeagueID != nil {
		countQuery += fmt.Sprintf(` AND league_id = $%d`, countArgCount)
		countArgs = append(countArgs, *opts.LeagueID)
		countArgCount++
	}
	if opts.Status != "" {
		countQuery += fmt.Sprintf(` AND status = $%d`, countArgCount)
		countArgs = append(countArgs, opts.Status)
		countArgCount++
	} else if opts.Upcoming {
		countQuery += ` AND status IN ('idle', 'connecting') AND scheduled_start > NOW()`
	}

	var count int64
	err = r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&count)
	if err != nil {
		return nil, 0, fmt.Errorf("count streams: %w", err)
	}

	return streams, count, nil
}

// CreateStream inserts a new stream.
func (r *PGRepository) CreateStream(ctx context.Context, req *StreamRequest, broadcasterID uuid.UUID) (*Stream, error) {
	stream := &Stream{}
	sourceType := req.SourceType
	if sourceType == "" {
		sourceType = "xbotgo"
	}

	err := r.db.QueryRow(ctx, `
		INSERT INTO public.live_streams
		(match_id, league_id, title, description, source_type, is_pay_per_view, price_cents,
		 scheduled_start, broadcaster_id, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'idle', NOW())
		RETURNING id, match_id, league_id, mux_live_stream_id, mux_stream_key, mux_playback_id,
		          recording_id, recording_asset_id, recording_playback_id, recording_ready,
		          title, description, thumbnail_url, status, source_type, is_pay_per_view,
		          price_cents, current_viewers, scheduled_start, actual_start, ended_at,
		          broadcaster_id, created_at
	`, req.MatchID, req.LeagueID, req.Title, req.Description, sourceType, req.IsPayPerView,
		req.PriceCents, req.ScheduledStart, broadcasterID).Scan(
		&stream.ID, &stream.MatchID, &stream.LeagueID, &stream.MuxLiveStreamID, &stream.MuxStreamKey, &stream.MuxPlaybackID,
		&stream.RecordingID, &stream.RecordingAssetID, &stream.RecordingPlaybackID, &stream.RecordingReady,
		&stream.Title, &stream.Description, &stream.ThumbnailURL, &stream.Status, &stream.SourceType, &stream.IsPayPerView,
		&stream.PriceCents, &stream.CurrentViewers, &stream.ScheduledStart, &stream.ActualStart, &stream.EndedAt,
		&stream.BroadcasterID, &stream.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert stream: %w", err)
	}
	return stream, nil
}

// UpdateStream updates specific fields of a stream.
func (r *PGRepository) UpdateStream(ctx context.Context, id uuid.UUID, req *UpdateStreamRequest) (*Stream, error) {
	var query strings.Builder
	var args []interface{}

	query.WriteString(`UPDATE public.live_streams SET `)

	first := true
	argCount := 1

	// Whitelist only allowed fields
	if req.Title != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`title = $%d`, argCount))
		args = append(args, *req.Title)
		argCount++
		first = false
	}

	if req.Description != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`description = $%d`, argCount))
		args = append(args, *req.Description)
		argCount++
		first = false
	}

	if req.Status != nil {
		if !first {
			query.WriteString(`, `)
		}
		query.WriteString(fmt.Sprintf(`status = $%d`, argCount))
		args = append(args, *req.Status)
		argCount++
		first = false
	}

	// If no fields to update, just fetch current
	if first {
		return r.GetStream(ctx, id)
	}

	query.WriteString(fmt.Sprintf(` WHERE id = $%d RETURNING `, argCount))
	args = append(args, id)
	query.WriteString(`id, match_id, league_id, mux_live_stream_id, mux_stream_key, mux_playback_id,
	       recording_id, recording_asset_id, recording_playback_id, recording_ready,
	       title, description, thumbnail_url, status, source_type, is_pay_per_view,
	       price_cents, current_viewers, scheduled_start, actual_start, ended_at,
	       broadcaster_id, created_at`)

	stream := &Stream{}
	err := r.db.QueryRow(ctx, query.String(), args...).Scan(
		&stream.ID, &stream.MatchID, &stream.LeagueID, &stream.MuxLiveStreamID, &stream.MuxStreamKey, &stream.MuxPlaybackID,
		&stream.RecordingID, &stream.RecordingAssetID, &stream.RecordingPlaybackID, &stream.RecordingReady,
		&stream.Title, &stream.Description, &stream.ThumbnailURL, &stream.Status, &stream.SourceType, &stream.IsPayPerView,
		&stream.PriceCents, &stream.CurrentViewers, &stream.ScheduledStart, &stream.ActualStart, &stream.EndedAt,
		&stream.BroadcasterID, &stream.CreatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("update stream: %w", err)
	}
	return stream, nil
}

// DeleteStream removes a stream.
func (r *PGRepository) DeleteStream(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM public.live_streams WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete stream: %w", err)
	}
	return nil
}

// UpdateRecordingFromMuxUpload updates a recording with upload ID → asset ID mapping.
func (r *PGRepository) UpdateRecordingFromMuxUpload(ctx context.Context, uploadID, muxAssetID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.match_recordings
		SET mux_asset_id = $2, status = 'processing', updated_at = NOW()
		WHERE mux_asset_id = $1
	`, uploadID, muxAssetID)
	return err
}

// UpdateRecordingFromMuxAsset updates a recording with Mux asset details.
func (r *PGRepository) UpdateRecordingFromMuxAsset(ctx context.Context, assetID, playbackID string, duration int, resolution string) error {
	thumbnailURL := ""
	if playbackID != "" {
		thumbnailURL = fmt.Sprintf("https://image.mux.com/%s/thumbnail.jpg?time=10&width=640", playbackID)
	}

	_, err := r.db.Exec(ctx, `
		UPDATE public.match_recordings
		SET mux_playback_id = $2, status = 'ready', duration_seconds = $3,
		    resolution = $4, thumbnail_url = $5, published_at = NOW(), updated_at = NOW()
		WHERE mux_asset_id = $1
	`, assetID, playbackID, duration, resolution, thumbnailURL)
	return err
}

// UpdateRecordingError marks a recording as failed with an error message.
func (r *PGRepository) UpdateRecordingError(ctx context.Context, assetID, errMsg string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.match_recordings
		SET status = 'failed', error_message = $2, updated_at = NOW()
		WHERE mux_asset_id = $1
	`, assetID, errMsg)
	return err
}

// SetStreamRecording implements Repository (Mux video.asset.live_stream_completed).
func (r *PGRepository) SetStreamRecording(ctx context.Context, muxStreamID, assetID, playbackID string, duration float64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.live_streams
		SET recording_asset_id = $2, recording_playback_id = NULLIF($3, ''), recording_duration = $4,
		    recording_ready = ($3 <> '')
		WHERE mux_live_stream_id = $1`, muxStreamID, assetID, playbackID, duration)
	if err != nil {
		return fmt.Errorf("set stream recording: %w", err)
	}
	return nil
}

// UpdateStreamFromMuxLive updates a stream from Mux live stream events.
func (r *PGRepository) UpdateStreamFromMuxLive(ctx context.Context, streamID, newStatus string) error {
	// live_streams has no updated_at column; actual_start/ended_at are only
	// set once so repeated webhook deliveries stay idempotent.
	var q string
	switch newStatus {
	case "live":
		q = `UPDATE public.live_streams SET status = $2, actual_start = COALESCE(actual_start, NOW()) WHERE mux_live_stream_id = $1`
	case "ended":
		q = `UPDATE public.live_streams SET status = $2, ended_at = COALESCE(ended_at, NOW()) WHERE mux_live_stream_id = $1`
	default:
		return nil
	}
	if _, err := r.db.Exec(ctx, q, streamID, newStatus); err != nil {
		return fmt.Errorf("update stream from mux: %w", err)
	}
	return nil
}

// AttachRecordingContext implements Repository with one query for all
// recordings (no N+1).
func (r *PGRepository) AttachRecordingContext(ctx context.Context, recs []*Recording) error {
	ids := make([]uuid.UUID, 0, len(recs))
	for _, rec := range recs {
		ids = append(ids, rec.ID)
	}
	if len(ids) == 0 {
		return nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT mr.id, ht.id, ht.name, ht.logo, at.id, at.name, at.logo, l.id, l.name, l.slug
		FROM public.match_recordings mr
		LEFT JOIN public.matches m ON m.id = mr.match_id
		LEFT JOIN public.teams ht ON ht.id = m.home_team_id
		LEFT JOIN public.teams at ON at.id = m.away_team_id
		LEFT JOIN public.leagues l ON l.id = mr.league_id
		WHERE mr.id = ANY($1)`, ids)
	if err != nil {
		return fmt.Errorf("recording context: %w", err)
	}
	defer rows.Close()
	byID := make(map[uuid.UUID]*Recording, len(recs))
	for _, rec := range recs {
		byID[rec.ID] = rec
	}
	for rows.Next() {
		var id uuid.UUID
		var hID, aID, lID *uuid.UUID
		var hName, aName, lName, lSlug *string
		var hLogo, aLogo *string
		if err := rows.Scan(&id, &hID, &hName, &hLogo, &aID, &aName, &aLogo, &lID, &lName, &lSlug); err != nil {
			return fmt.Errorf("scan recording context: %w", err)
		}
		rec := byID[id]
		if rec == nil {
			continue
		}
		if hID != nil && hName != nil {
			rec.HomeTeam = &TeamRef{ID: *hID, Name: *hName, Logo: hLogo}
		}
		if aID != nil && aName != nil {
			rec.AwayTeam = &TeamRef{ID: *aID, Name: *aName, Logo: aLogo}
		}
		if lID != nil && lName != nil && lSlug != nil {
			rec.League = &LeagueRef{ID: *lID, Name: *lName, Slug: *lSlug}
		}
	}
	return rows.Err()
}
