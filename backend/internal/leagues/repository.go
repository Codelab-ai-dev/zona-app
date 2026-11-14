package leagues

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository creates a database-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// GetLeagueByID fetches a league by ID (any state).
func (r *PGRepository) GetLeagueByID(ctx context.Context, id uuid.UUID) (League, error) {
	var l League
	err := r.db.QueryRow(ctx, `
		SELECT id, name, slug, description, logo, admin_id, is_active, product_mode,
		       features, mode_updated_at, mode_updated_by, created_at, updated_at
		FROM public.leagues WHERE id = $1
	`, id).Scan(&l.ID, &l.Name, &l.Slug, &l.Description, &l.Logo, &l.AdminID, &l.IsActive,
		&l.ProductMode, &l.Features, &l.ModeUpdatedAt, &l.ModeUpdatedBy, &l.CreatedAt, &l.UpdatedAt)
	if database.IsNoRows(err) {
		return League{}, httpx.ErrNotFound.Wrap(fmt.Errorf("league not found"))
	}
	if err != nil {
		return League{}, fmt.Errorf("query league: %w", err)
	}
	return l, nil
}

// GetLeagueBySlug fetches an active league by slug.
func (r *PGRepository) GetLeagueBySlug(ctx context.Context, slug string) (League, error) {
	var l League
	err := r.db.QueryRow(ctx, `
		SELECT id, name, slug, description, logo, admin_id, is_active, product_mode,
		       features, mode_updated_at, mode_updated_by, created_at, updated_at
		FROM public.leagues WHERE slug = $1 AND is_active = true
	`, slug).Scan(&l.ID, &l.Name, &l.Slug, &l.Description, &l.Logo, &l.AdminID, &l.IsActive,
		&l.ProductMode, &l.Features, &l.ModeUpdatedAt, &l.ModeUpdatedBy, &l.CreatedAt, &l.UpdatedAt)
	if database.IsNoRows(err) {
		return League{}, httpx.ErrNotFound.Wrap(fmt.Errorf("league not found"))
	}
	if err != nil {
		return League{}, fmt.Errorf("query league: %w", err)
	}
	return l, nil
}

// ListActiveLeagues fetches active leagues with pagination.
func (r *PGRepository) ListActiveLeagues(ctx context.Context, limit int, offset int) ([]League, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, slug, description, logo, admin_id, is_active, product_mode,
		       features, mode_updated_at, mode_updated_by, created_at, updated_at
		FROM public.leagues WHERE is_active = true
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query leagues: %w", err)
	}
	defer rows.Close()

	var leagues []League
	for rows.Next() {
		var l League
		if err := rows.Scan(&l.ID, &l.Name, &l.Slug, &l.Description, &l.Logo, &l.AdminID, &l.IsActive,
			&l.ProductMode, &l.Features, &l.ModeUpdatedAt, &l.ModeUpdatedBy, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan league: %w", err)
		}
		leagues = append(leagues, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate leagues: %w", err)
	}

	// Get total count
	var total int
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.leagues WHERE is_active = true`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count leagues: %w", err)
	}

	return leagues, total, nil
}

// ListAllLeagues fetches all leagues (including inactive) with pagination.
func (r *PGRepository) ListAllLeagues(ctx context.Context, limit int, offset int) ([]League, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, slug, description, logo, admin_id, is_active, product_mode,
		       features, mode_updated_at, mode_updated_by, created_at, updated_at
		FROM public.leagues
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query leagues: %w", err)
	}
	defer rows.Close()

	var leagues []League
	for rows.Next() {
		var l League
		if err := rows.Scan(&l.ID, &l.Name, &l.Slug, &l.Description, &l.Logo, &l.AdminID, &l.IsActive,
			&l.ProductMode, &l.Features, &l.ModeUpdatedAt, &l.ModeUpdatedBy, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan league: %w", err)
		}
		leagues = append(leagues, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate leagues: %w", err)
	}

	// Get total count
	var total int
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.leagues`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count leagues: %w", err)
	}

	return leagues, total, nil
}

// CreateLeague inserts a new league and returns its ID.
func (r *PGRepository) CreateLeague(ctx context.Context, l *League) (uuid.UUID, error) {
	var id uuid.UUID
	// The admin's users.league_id is what GET /me returns and what the Flutter
	// league admin screens read. Fill it in the same statement when the admin
	// has none yet; an admin who already has a league keeps it (#62).
	err := r.db.QueryRow(ctx, `
		WITH league AS (
			INSERT INTO public.leagues (name, slug, description, logo, admin_id, is_active, product_mode, features)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, admin_id
		), scoped AS (
			UPDATE public.users u
			SET league_id = league.id, updated_at = now()
			FROM league
			WHERE u.id = league.admin_id AND u.league_id IS NULL AND u.role = 'league_admin'
		)
		SELECT id FROM league
	`, l.Name, l.Slug, l.Description, l.Logo, l.AdminID, l.IsActive, l.ProductMode, l.Features).Scan(&id)
	if err != nil {
		if database.IsUniqueViolation(err) {
			return uuid.Nil, httpx.ErrConflict.Wrap(err)
		}
		return uuid.Nil, fmt.Errorf("insert league: %w", err)
	}
	return id, nil
}

// UpdateLeague updates an existing league.
func (r *PGRepository) UpdateLeague(ctx context.Context, l *League) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.leagues
		SET name = $1, slug = $2, description = $3, logo = $4, is_active = $5, updated_at = now()
		WHERE id = $6
	`, l.Name, l.Slug, l.Description, l.Logo, l.IsActive, l.ID)
	if err != nil {
		if database.IsUniqueViolation(err) {
			return httpx.ErrConflict.Wrap(err)
		}
		return fmt.Errorf("update league: %w", err)
	}
	return nil
}

// UpdateLeagueProductMode updates product_mode and features (super admin only).
func (r *PGRepository) UpdateLeagueProductMode(ctx context.Context, leagueID uuid.UUID, productMode string, features json.RawMessage, updatedBy uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.leagues
		SET product_mode = $1, features = $2, mode_updated_at = now(), mode_updated_by = $3, updated_at = now()
		WHERE id = $4
	`, productMode, features, updatedBy, leagueID)
	if err != nil {
		return fmt.Errorf("update league product mode: %w", err)
	}
	return nil
}

// GetTournamentByID fetches a tournament by ID.
func (r *PGRepository) GetTournamentByID(ctx context.Context, id uuid.UUID) (Tournament, error) {
	var t Tournament
	err := r.db.QueryRow(ctx, `
		SELECT id, name, league_id, TO_CHAR(start_date, 'YYYY-MM-DD'), TO_CHAR(end_date, 'YYYY-MM-DD'), is_active, max_players, registration_open,
		       max_coaching_staff, tournament_format, number_of_groups, teams_advancing_per_group,
		       rounds_per_season, has_third_place_match, age_validation_enabled, min_age, max_age,
		       TO_CHAR(age_reference_date, 'YYYY-MM-DD'), age_exception_count, age_exception_min_age, age_exception_max_age,
		       id_document_required, created_at, updated_at
		FROM public.tournaments WHERE id = $1
	`, id).Scan(&t.ID, &t.Name, &t.LeagueID, &t.StartDate, &t.EndDate, &t.IsActive, &t.MaxPlayers,
		&t.RegistrationOpen, &t.MaxCoachingStaff, &t.TournamentFormat, &t.NumberOfGroups,
		&t.TeamsAdvancingPerGroup, &t.RoundsPerSeason, &t.HasThirdPlaceMatch,
		&t.AgeValidationEnabled, &t.MinAge, &t.MaxAge, &t.AgeReferenceDate, &t.AgeExceptionCount,
		&t.AgeExceptionMinAge, &t.AgeExceptionMaxAge, &t.IDDocumentRequired, &t.CreatedAt, &t.UpdatedAt)
	if database.IsNoRows(err) {
		return Tournament{}, httpx.ErrNotFound.Wrap(fmt.Errorf("tournament not found"))
	}
	if err != nil {
		return Tournament{}, fmt.Errorf("query tournament: %w", err)
	}
	return t, nil
}

// ListTournamentsByLeague fetches tournaments for a league with pagination.
func (r *PGRepository) ListTournamentsByLeague(ctx context.Context, leagueID uuid.UUID, limit int, offset int) ([]Tournament, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, league_id, TO_CHAR(start_date, 'YYYY-MM-DD'), TO_CHAR(end_date, 'YYYY-MM-DD'), is_active, max_players, registration_open,
		       max_coaching_staff, tournament_format, number_of_groups, teams_advancing_per_group,
		       rounds_per_season, has_third_place_match, age_validation_enabled, min_age, max_age,
		       TO_CHAR(age_reference_date, 'YYYY-MM-DD'), age_exception_count, age_exception_min_age, age_exception_max_age,
		       id_document_required, created_at, updated_at
		FROM public.tournaments WHERE league_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, leagueID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query tournaments: %w", err)
	}
	defer rows.Close()

	var tournaments []Tournament
	for rows.Next() {
		var t Tournament
		if err := rows.Scan(&t.ID, &t.Name, &t.LeagueID, &t.StartDate, &t.EndDate, &t.IsActive, &t.MaxPlayers,
			&t.RegistrationOpen, &t.MaxCoachingStaff, &t.TournamentFormat, &t.NumberOfGroups,
			&t.TeamsAdvancingPerGroup, &t.RoundsPerSeason, &t.HasThirdPlaceMatch,
			&t.AgeValidationEnabled, &t.MinAge, &t.MaxAge, &t.AgeReferenceDate, &t.AgeExceptionCount,
			&t.AgeExceptionMinAge, &t.AgeExceptionMaxAge, &t.IDDocumentRequired, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan tournament: %w", err)
		}
		tournaments = append(tournaments, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate tournaments: %w", err)
	}

	// Get total count
	var total int
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.tournaments WHERE league_id = $1`, leagueID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count tournaments: %w", err)
	}

	return tournaments, total, nil
}

// CreateTournament inserts a new tournament and returns its ID.
func (r *PGRepository) CreateTournament(ctx context.Context, t *Tournament) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `
		INSERT INTO public.tournaments
		(name, league_id, start_date, end_date, is_active, max_players, registration_open,
		 max_coaching_staff, tournament_format, number_of_groups, teams_advancing_per_group,
		 rounds_per_season, has_third_place_match, age_validation_enabled, min_age, max_age,
		 age_reference_date, age_exception_count, age_exception_min_age, age_exception_max_age,
		 id_document_required)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING id
	`, t.Name, t.LeagueID, t.StartDate, t.EndDate, t.IsActive, t.MaxPlayers, t.RegistrationOpen,
		t.MaxCoachingStaff, t.TournamentFormat, t.NumberOfGroups, t.TeamsAdvancingPerGroup,
		t.RoundsPerSeason, t.HasThirdPlaceMatch, t.AgeValidationEnabled, t.MinAge, t.MaxAge,
		t.AgeReferenceDate, t.AgeExceptionCount, t.AgeExceptionMinAge, t.AgeExceptionMaxAge,
		t.IDDocumentRequired).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert tournament: %w", err)
	}
	return id, nil
}

// UpdateTournament updates an existing tournament.
// DeleteTournament permanently deletes a tournament. Its matches (with
// goals, cards and player stats), standings and registration requests
// cascade; teams, suspensions and finance rows keep existing unlinked.
func (r *PGRepository) DeleteTournament(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM public.tournaments WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete tournament: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return httpx.ErrNotFound
	}
	return nil
}

func (r *PGRepository) UpdateTournament(ctx context.Context, t *Tournament) error {
	_, err := r.db.Exec(ctx, `
		UPDATE public.tournaments
		SET name = $1, start_date = $2, end_date = $3, is_active = $4, max_players = $5,
		    registration_open = $6, max_coaching_staff = $7, tournament_format = $8,
		    number_of_groups = $9, teams_advancing_per_group = $10, rounds_per_season = $11,
		    has_third_place_match = $12, age_validation_enabled = $13, min_age = $14, max_age = $15,
		    age_reference_date = $16, age_exception_count = $17, age_exception_min_age = $18,
		    age_exception_max_age = $19, id_document_required = $20, updated_at = now()
		WHERE id = $21
	`, t.Name, t.StartDate, t.EndDate, t.IsActive, t.MaxPlayers, t.RegistrationOpen,
		t.MaxCoachingStaff, t.TournamentFormat, t.NumberOfGroups, t.TeamsAdvancingPerGroup,
		t.RoundsPerSeason, t.HasThirdPlaceMatch, t.AgeValidationEnabled, t.MinAge, t.MaxAge,
		t.AgeReferenceDate, t.AgeExceptionCount, t.AgeExceptionMinAge, t.AgeExceptionMaxAge,
		t.IDDocumentRequired, t.ID)
	if err != nil {
		return fmt.Errorf("update tournament: %w", err)
	}
	return nil
}

// ListLeaguesByAdmin returns every league (active or not) administered by
// adminID, oldest first. A league admin manages few leagues, so no paging.
func (r *PGRepository) ListLeaguesByAdmin(ctx context.Context, adminID uuid.UUID) ([]League, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, slug, description, logo, admin_id, is_active, product_mode,
		       features, mode_updated_at, mode_updated_by, created_at, updated_at
		FROM public.leagues
		WHERE admin_id = $1
		ORDER BY created_at
		LIMIT 100`, adminID)
	if err != nil {
		return nil, fmt.Errorf("query leagues by admin: %w", err)
	}
	defer rows.Close()
	var leagues []League
	for rows.Next() {
		var l League
		if err := rows.Scan(&l.ID, &l.Name, &l.Slug, &l.Description, &l.Logo, &l.AdminID, &l.IsActive,
			&l.ProductMode, &l.Features, &l.ModeUpdatedAt, &l.ModeUpdatedBy, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan league: %w", err)
		}
		leagues = append(leagues, l)
	}
	return leagues, rows.Err()
}
