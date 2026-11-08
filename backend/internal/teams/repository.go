package teams

import (
	"context"
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

// GetTeamByID returns httpx.ErrNotFound when the team does not exist.
func (r *PGRepository) GetTeamByID(ctx context.Context, teamID uuid.UUID) (Team, error) {
	const q = `
		SELECT id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name
		FROM public.teams
		WHERE id = $1`

	var t Team
	err := r.db.QueryRow(ctx, q, teamID).Scan(
		&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
		&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
		&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
		&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
	)
	if database.IsNoRows(err) {
		return Team{}, httpx.ErrNotFound
	}
	if err != nil {
		return Team{}, fmt.Errorf("get team: %w", err)
	}
	return t, nil
}

// GetTeamsByLeague returns all teams in a league, ordered by creation date.
func (r *PGRepository) GetTeamsByLeague(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]Team, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name
		FROM public.teams
		WHERE league_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, q, leagueID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query teams by league: %w", err)
	}
	defer rows.Close()

	var teams []Team
	for rows.Next() {
		var t Team
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
			&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
			&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
			&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
		); err != nil {
			return nil, fmt.Errorf("scan team: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teams: %w", err)
	}
	return teams, nil
}

// GetTeamsByOwner returns all active teams owned by a user.
func (r *PGRepository) GetTeamsByOwner(ctx context.Context, ownerID uuid.UUID, limit, offset int) ([]Team, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name
		FROM public.teams
		WHERE owner_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, q, ownerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query teams by owner: %w", err)
	}
	defer rows.Close()

	var teams []Team
	for rows.Next() {
		var t Team
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
			&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
			&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
			&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
		); err != nil {
			return nil, fmt.Errorf("scan team: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teams: %w", err)
	}
	return teams, nil
}

// CreateTeam inserts a new team and returns it with created_at/updated_at timestamps.
func (r *PGRepository) CreateTeam(ctx context.Context, t Team) (Team, error) {
	const q = `
		INSERT INTO public.teams (name, slug, league_id, tournament_id, owner_id, logo, description, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(ctx, q, t.Name, t.Slug, t.LeagueID, t.TournamentID, t.OwnerID, t.Logo, t.Description, t.IsActive).
		Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return Team{}, fmt.Errorf("create team: %w", err)
	}
	return t, nil
}

// UpdateTeam updates team fields and returns the updated team.
func (r *PGRepository) UpdateTeam(ctx context.Context, teamID uuid.UUID, req UpdateTeamRequest) (Team, error) {
	// Build dynamic UPDATE query (only update non-nil fields)
	query := "UPDATE public.teams SET "
	args := []interface{}{teamID}
	argIndex := 2

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argIndex)
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Logo != nil {
		query += fmt.Sprintf("logo = $%d, ", argIndex)
		args = append(args, *req.Logo)
		argIndex++
	}
	if req.Description != nil {
		query += fmt.Sprintf("description = $%d, ", argIndex)
		args = append(args, *req.Description)
		argIndex++
	}
	if req.GroupName != nil {
		query += fmt.Sprintf("group_name = $%d, ", argIndex)
		args = append(args, *req.GroupName)
		argIndex++
	}
	if req.HomePrimaryColor != nil {
		query += fmt.Sprintf("home_primary_color = $%d, ", argIndex)
		args = append(args, *req.HomePrimaryColor)
		argIndex++
	}
	if req.HomeSecondaryColor != nil {
		query += fmt.Sprintf("home_secondary_color = $%d, ", argIndex)
		args = append(args, *req.HomeSecondaryColor)
		argIndex++
	}
	if req.HomeAccentColor != nil {
		query += fmt.Sprintf("home_accent_color = $%d, ", argIndex)
		args = append(args, *req.HomeAccentColor)
		argIndex++
	}
	if req.AwayPrimaryColor != nil {
		query += fmt.Sprintf("away_primary_color = $%d, ", argIndex)
		args = append(args, *req.AwayPrimaryColor)
		argIndex++
	}
	if req.AwaySecondaryColor != nil {
		query += fmt.Sprintf("away_secondary_color = $%d, ", argIndex)
		args = append(args, *req.AwaySecondaryColor)
		argIndex++
	}
	if req.AwayAccentColor != nil {
		query += fmt.Sprintf("away_accent_color = $%d, ", argIndex)
		args = append(args, *req.AwayAccentColor)
		argIndex++
	}
	if req.Alt1ShortsColor != nil {
		query += fmt.Sprintf("alt1_shorts_color = $%d, ", argIndex)
		args = append(args, *req.Alt1ShortsColor)
		argIndex++
	}
	if req.Alt2ShortsColor != nil {
		query += fmt.Sprintf("alt2_shorts_color = $%d, ", argIndex)
		args = append(args, *req.Alt2ShortsColor)
		argIndex++
	}

	if req.TournamentID != nil {
		var tid *uuid.UUID
		if *req.TournamentID != uuid.Nil {
			tid = req.TournamentID
		}
		query += fmt.Sprintf("tournament_id = $%d, ", argIndex)
		args = append(args, tid)
		argIndex++
	}

	// Always update updated_at
	query += fmt.Sprintf("updated_at = now() WHERE id = $1 ")
	query += `RETURNING id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name`

	var t Team
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
		&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
		&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
		&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
	)
	if database.IsNoRows(err) {
		return Team{}, httpx.ErrNotFound
	}
	if err != nil {
		return Team{}, fmt.Errorf("update team: %w", err)
	}
	return t, nil
}

// ActivateTeam sets is_active to true.
func (r *PGRepository) ActivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error) {
	const q = `UPDATE public.teams SET is_active = true, updated_at = now() WHERE id = $1
		RETURNING id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name`

	var t Team
	err := r.db.QueryRow(ctx, q, teamID).Scan(
		&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
		&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
		&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
		&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
	)
	if database.IsNoRows(err) {
		return Team{}, httpx.ErrNotFound
	}
	if err != nil {
		return Team{}, fmt.Errorf("activate team: %w", err)
	}
	return t, nil
}

// DeactivateTeam sets is_active to false.
func (r *PGRepository) DeactivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error) {
	const q = `UPDATE public.teams SET is_active = false, updated_at = now() WHERE id = $1
		RETURNING id, name, slug, league_id, tournament_id, owner_id, logo, description, is_active,
		       created_at, updated_at, home_primary_color, home_secondary_color, home_accent_color,
		       away_primary_color, away_secondary_color, away_accent_color, alt1_shorts_color,
		       alt2_shorts_color, group_name`

	var t Team
	err := r.db.QueryRow(ctx, q, teamID).Scan(
		&t.ID, &t.Name, &t.Slug, &t.LeagueID, &t.TournamentID, &t.OwnerID, &t.Logo, &t.Description,
		&t.IsActive, &t.CreatedAt, &t.UpdatedAt, &t.HomePrimaryColor, &t.HomeSecondaryColor,
		&t.HomeAccentColor, &t.AwayPrimaryColor, &t.AwaySecondaryColor, &t.AwayAccentColor,
		&t.Alt1ShortsColor, &t.Alt2ShortsColor, &t.GroupName,
	)
	if database.IsNoRows(err) {
		return Team{}, httpx.ErrNotFound
	}
	if err != nil {
		return Team{}, fmt.Errorf("deactivate team: %w", err)
	}
	return t, nil
}

// GetPlayerByID returns httpx.ErrNotFound when the player does not exist.
func (r *PGRepository) GetPlayerByID(ctx context.Context, playerID uuid.UUID) (Player, error) {
	const q = `
		SELECT id, name, team_id, position, jersey_number, photo, birth_date, is_active,
		       created_at, updated_at, enrollment_status, id_verified
		FROM public.players
		WHERE id = $1`

	var p Player
	err := r.db.QueryRow(ctx, q, playerID).Scan(
		&p.ID, &p.Name, &p.TeamID, &p.Position, &p.JerseyNumber, &p.Photo, &p.BirthDate,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified,
	)
	if database.IsNoRows(err) {
		return Player{}, httpx.ErrNotFound
	}
	if err != nil {
		return Player{}, fmt.Errorf("get player: %w", err)
	}
	return p, nil
}

// GetPlayersByTeam returns all active players on a team, ordered by jersey number.
func (r *PGRepository) GetPlayersByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]Player, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, name, team_id, position, jersey_number, photo, birth_date, is_active,
		       created_at, updated_at, enrollment_status, id_verified
		FROM public.players
		WHERE team_id = $1 AND is_active = true
		ORDER BY jersey_number ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, q, teamID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query players by team: %w", err)
	}
	defer rows.Close()

	var players []Player
	for rows.Next() {
		var p Player
		if err := rows.Scan(
			&p.ID, &p.Name, &p.TeamID, &p.Position, &p.JerseyNumber, &p.Photo, &p.BirthDate,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified,
		); err != nil {
			return nil, fmt.Errorf("scan player: %w", err)
		}
		players = append(players, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate players: %w", err)
	}
	return players, nil
}

// CreatePlayer inserts a new player.
func (r *PGRepository) CreatePlayer(ctx context.Context, p Player) (Player, error) {
	return r.createPlayerWithQuerier(ctx, r.db, p)
}

// CreatePlayerTx inserts a new player using a provided Querier (for transactional use).
func (r *PGRepository) CreatePlayerTx(ctx context.Context, q database.Querier, p Player) (Player, error) {
	return r.createPlayerWithQuerier(ctx, q, p)
}

// createPlayerWithQuerier is the internal implementation.
func (r *PGRepository) createPlayerWithQuerier(ctx context.Context, q database.Querier, p Player) (Player, error) {
	const stmt = `
		INSERT INTO public.players (name, team_id, position, jersey_number, photo, birth_date, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at, enrollment_status, id_verified`

	err := q.QueryRow(ctx, stmt, p.Name, p.TeamID, p.Position, p.JerseyNumber, p.Photo, p.BirthDate, p.IsActive).
		Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified)
	if database.IsUniqueViolation(err) {
		return Player{}, httpx.ErrConflict
	}
	if err != nil {
		return Player{}, fmt.Errorf("create player: %w", err)
	}
	return p, nil
}

// UpdatePlayer updates player fields and returns the updated player.
func (r *PGRepository) UpdatePlayer(ctx context.Context, playerID uuid.UUID, req UpdatePlayerRequest) (Player, error) {
	query := "UPDATE public.players SET "
	args := []interface{}{playerID}
	argIndex := 2

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argIndex)
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Position != nil {
		query += fmt.Sprintf("position = $%d, ", argIndex)
		args = append(args, *req.Position)
		argIndex++
	}
	if req.JerseyNumber != nil {
		query += fmt.Sprintf("jersey_number = $%d, ", argIndex)
		args = append(args, *req.JerseyNumber)
		argIndex++
	}
	if req.Photo != nil {
		query += fmt.Sprintf("photo = $%d, ", argIndex)
		args = append(args, *req.Photo)
		argIndex++
	}
	if req.BirthDate != nil {
		query += fmt.Sprintf("birth_date = $%d, ", argIndex)
		args = append(args, *req.BirthDate)
		argIndex++
	}

	query += "updated_at = now() WHERE id = $1 "
	query += `RETURNING id, name, team_id, position, jersey_number, photo, birth_date, is_active,
		       created_at, updated_at, enrollment_status, id_verified`

	var p Player
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&p.ID, &p.Name, &p.TeamID, &p.Position, &p.JerseyNumber, &p.Photo, &p.BirthDate,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified,
	)
	if database.IsNoRows(err) {
		return Player{}, httpx.ErrNotFound
	}
	if err != nil {
		return Player{}, fmt.Errorf("update player: %w", err)
	}
	return p, nil
}

// DeactivatePlayer sets is_active to false.
func (r *PGRepository) DeactivatePlayer(ctx context.Context, playerID uuid.UUID) (Player, error) {
	const q = `UPDATE public.players SET is_active = false, updated_at = now() WHERE id = $1
		RETURNING id, name, team_id, position, jersey_number, photo, birth_date, is_active,
		       created_at, updated_at, enrollment_status, id_verified`

	var p Player
	err := r.db.QueryRow(ctx, q, playerID).Scan(
		&p.ID, &p.Name, &p.TeamID, &p.Position, &p.JerseyNumber, &p.Photo, &p.BirthDate,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified,
	)
	if database.IsNoRows(err) {
		return Player{}, httpx.ErrNotFound
	}
	if err != nil {
		return Player{}, fmt.Errorf("deactivate player: %w", err)
	}
	return p, nil
}

// GetCoachingStaffByID returns httpx.ErrNotFound when not found.
func (r *PGRepository) GetCoachingStaffByID(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error) {
	const q = `
		SELECT id, team_id, name, role, photo, birth_date, cedula, is_active, created_at, updated_at
		FROM public.coaching_staff
		WHERE id = $1`

	var s CoachingStaff
	err := r.db.QueryRow(ctx, q, staffID).Scan(
		&s.ID, &s.TeamID, &s.Name, &s.Role, &s.Photo, &s.BirthDate, &s.Cedula, &s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return CoachingStaff{}, httpx.ErrNotFound
	}
	if err != nil {
		return CoachingStaff{}, fmt.Errorf("get coaching staff: %w", err)
	}
	return s, nil
}

// GetCoachingStaffByTeam returns all active coaching staff on a team.
func (r *PGRepository) GetCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]CoachingStaff, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, team_id, name, role, photo, birth_date, cedula, is_active, created_at, updated_at
		FROM public.coaching_staff
		WHERE team_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, q, teamID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query coaching staff by team: %w", err)
	}
	defer rows.Close()

	var staff []CoachingStaff
	for rows.Next() {
		var s CoachingStaff
		if err := rows.Scan(
			&s.ID, &s.TeamID, &s.Name, &s.Role, &s.Photo, &s.BirthDate, &s.Cedula, &s.IsActive, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan coaching staff: %w", err)
		}
		staff = append(staff, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate coaching staff: %w", err)
	}
	return staff, nil
}

// CreateCoachingStaff inserts a new coaching staff member.
func (r *PGRepository) CreateCoachingStaff(ctx context.Context, s CoachingStaff) (CoachingStaff, error) {
	const q = `
		INSERT INTO public.coaching_staff (id, team_id, name, role, photo, birth_date, cedula, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(ctx, q, s.ID, s.TeamID, s.Name, s.Role, s.Photo, s.BirthDate, s.Cedula, s.IsActive).
		Scan(&s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return CoachingStaff{}, fmt.Errorf("create coaching staff: %w", err)
	}
	return s, nil
}

// UpdateCoachingStaff updates coaching staff fields.
func (r *PGRepository) UpdateCoachingStaff(ctx context.Context, staffID uuid.UUID, req UpdateCoachingStaffRequest) (CoachingStaff, error) {
	query := "UPDATE public.coaching_staff SET "
	args := []interface{}{staffID}
	argIndex := 2

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argIndex)
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Role != nil {
		query += fmt.Sprintf("role = $%d, ", argIndex)
		args = append(args, *req.Role)
		argIndex++
	}
	if req.Photo != nil {
		query += fmt.Sprintf("photo = $%d, ", argIndex)
		args = append(args, *req.Photo)
		argIndex++
	}
	if req.BirthDate != nil {
		query += fmt.Sprintf("birth_date = $%d, ", argIndex)
		args = append(args, *req.BirthDate)
		argIndex++
	}
	if req.Cedula != nil {
		query += fmt.Sprintf("cedula = $%d, ", argIndex)
		args = append(args, *req.Cedula)
		argIndex++
	}
	if req.IsActive != nil {
		query += fmt.Sprintf("is_active = $%d, ", argIndex)
		args = append(args, *req.IsActive)
		argIndex++
	}

	query += "updated_at = now() WHERE id = $1 "
	query += `RETURNING id, team_id, name, role, photo, birth_date, cedula, is_active, created_at, updated_at`

	var s CoachingStaff
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&s.ID, &s.TeamID, &s.Name, &s.Role, &s.Photo, &s.BirthDate, &s.Cedula, &s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return CoachingStaff{}, httpx.ErrNotFound
	}
	if err != nil {
		return CoachingStaff{}, fmt.Errorf("update coaching staff: %w", err)
	}
	return s, nil
}

// DeactivateCoachingStaff sets is_active to false.
func (r *PGRepository) DeactivateCoachingStaff(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error) {
	const q = `UPDATE public.coaching_staff SET is_active = false, updated_at = now() WHERE id = $1
		RETURNING id, team_id, name, role, photo, birth_date, cedula, is_active, created_at, updated_at`

	var s CoachingStaff
	err := r.db.QueryRow(ctx, q, staffID).Scan(
		&s.ID, &s.TeamID, &s.Name, &s.Role, &s.Photo, &s.BirthDate, &s.Cedula, &s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return CoachingStaff{}, httpx.ErrNotFound
	}
	if err != nil {
		return CoachingStaff{}, fmt.Errorf("deactivate coaching staff: %w", err)
	}
	return s, nil
}

// GetPlayerRegistrationRequestByID returns httpx.ErrNotFound when not found.
func (r *PGRepository) GetPlayerRegistrationRequestByID(ctx context.Context, reqID uuid.UUID) (PlayerRegistrationRequest, error) {
	const q = `
		SELECT id, team_id, tournament_id, player_name, player_position, jersey_number, birth_date,
		       reason, status, requested_by, reviewed_by, review_notes, created_at, updated_at, reviewed_at
		FROM public.player_registration_requests
		WHERE id = $1`

	var req PlayerRegistrationRequest
	err := r.db.QueryRow(ctx, q, reqID).Scan(
		&req.ID, &req.TeamID, &req.TournamentID, &req.PlayerName, &req.PlayerPosition, &req.JerseyNumber,
		&req.BirthDate, &req.Reason, &req.Status, &req.RequestedBy, &req.ReviewedBy, &req.ReviewNotes,
		&req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
	)
	if database.IsNoRows(err) {
		return PlayerRegistrationRequest{}, httpx.ErrNotFound
	}
	if err != nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("get player registration request: %w", err)
	}
	return req, nil
}

// GetPlayerRegistrationRequestsByTeam returns all registration requests for a team.
func (r *PGRepository) GetPlayerRegistrationRequestsByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]PlayerRegistrationRequest, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, team_id, tournament_id, player_name, player_position, jersey_number, birth_date,
		       reason, status, requested_by, reviewed_by, review_notes, created_at, updated_at, reviewed_at
		FROM public.player_registration_requests
		WHERE team_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, q, teamID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query registration requests by team: %w", err)
	}
	defer rows.Close()

	var requests []PlayerRegistrationRequest
	for rows.Next() {
		var req PlayerRegistrationRequest
		if err := rows.Scan(
			&req.ID, &req.TeamID, &req.TournamentID, &req.PlayerName, &req.PlayerPosition, &req.JerseyNumber,
			&req.BirthDate, &req.Reason, &req.Status, &req.RequestedBy, &req.ReviewedBy, &req.ReviewNotes,
			&req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, fmt.Errorf("scan registration request: %w", err)
		}
		requests = append(requests, req)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate registration requests: %w", err)
	}
	return requests, nil
}

// GetPlayerRegistrationRequestsByTournament returns all pending registration requests for a tournament (for league admins).
func (r *PGRepository) GetPlayerRegistrationRequestsByTournament(ctx context.Context, tournamentID uuid.UUID, status string, limit, offset int) ([]PlayerRegistrationRequest, error) {
	if limit > 200 {
		limit = 200
	}
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const q = `
		SELECT id, team_id, tournament_id, player_name, player_position, jersey_number, birth_date,
		       reason, status, requested_by, reviewed_by, review_notes, created_at, updated_at, reviewed_at
		FROM public.player_registration_requests
		WHERE tournament_id = $1 AND status = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := r.db.Query(ctx, q, tournamentID, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query registration requests by tournament: %w", err)
	}
	defer rows.Close()

	var requests []PlayerRegistrationRequest
	for rows.Next() {
		var req PlayerRegistrationRequest
		if err := rows.Scan(
			&req.ID, &req.TeamID, &req.TournamentID, &req.PlayerName, &req.PlayerPosition, &req.JerseyNumber,
			&req.BirthDate, &req.Reason, &req.Status, &req.RequestedBy, &req.ReviewedBy, &req.ReviewNotes,
			&req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, fmt.Errorf("scan registration request: %w", err)
		}
		requests = append(requests, req)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate registration requests: %w", err)
	}
	return requests, nil
}

// CreatePlayerRegistrationRequest inserts a new registration request.
func (r *PGRepository) CreatePlayerRegistrationRequest(ctx context.Context, req PlayerRegistrationRequest) (PlayerRegistrationRequest, error) {
	const q = `
		INSERT INTO public.player_registration_requests (id, team_id, tournament_id, player_name, player_position,
		                                                   jersey_number, birth_date, reason, requested_by, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(ctx, q, req.ID, req.TeamID, req.TournamentID, req.PlayerName, req.PlayerPosition,
		req.JerseyNumber, req.BirthDate, req.Reason, req.RequestedBy).
		Scan(&req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("create registration request: %w", err)
	}
	req.Status = "pending"
	return req, nil
}

// ReviewPlayerRegistrationRequest updates a registration request with approval/rejection.
func (r *PGRepository) ReviewPlayerRegistrationRequest(ctx context.Context, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	return r.reviewPlayerRegistrationRequestWithQuerier(ctx, r.db, reqID, status, reviewedBy, notes)
}

// errRequestAlreadyReviewed is returned when a request is no longer pending.
var errRequestAlreadyReviewed = &httpx.Error{Status: 409, Code: "conflict", Message: "La solicitud ya fue revisada"}

// ReviewPlayerRegistrationRequestTx updates a registration request using a provided Querier (for transactional use).
func (r *PGRepository) ReviewPlayerRegistrationRequestTx(ctx context.Context, q database.Querier, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	return r.reviewPlayerRegistrationRequestWithQuerier(ctx, q, reqID, status, reviewedBy, notes)
}

// reviewPlayerRegistrationRequestWithQuerier is the internal implementation.
func (r *PGRepository) reviewPlayerRegistrationRequestWithQuerier(ctx context.Context, q database.Querier, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	const stmt = `
		UPDATE public.player_registration_requests
		SET status = $2, reviewed_by = $3, review_notes = $4, reviewed_at = now(), updated_at = now()
		WHERE id = $1 AND status = 'pending'
		RETURNING id, team_id, tournament_id, player_name, player_position, jersey_number, birth_date,
		       reason, status, requested_by, reviewed_by, review_notes, created_at, updated_at, reviewed_at`

	var req PlayerRegistrationRequest
	err := q.QueryRow(ctx, stmt, reqID, status, reviewedBy, notes).Scan(
		&req.ID, &req.TeamID, &req.TournamentID, &req.PlayerName, &req.PlayerPosition, &req.JerseyNumber,
		&req.BirthDate, &req.Reason, &req.Status, &req.RequestedBy, &req.ReviewedBy, &req.ReviewNotes,
		&req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
	)
	if database.IsNoRows(err) {
		// Unknown, or already reviewed by a concurrent request (the
		// status condition makes a double approval impossible).
		return PlayerRegistrationRequest{}, errRequestAlreadyReviewed
	}
	if err != nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("review registration request: %w", err)
	}
	return req, nil
}

// CountPlayersByTeam returns the number of active players on a team.
func (r *PGRepository) CountPlayersByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.players WHERE team_id = $1 AND is_active = true`, teamID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count players: %w", err)
	}
	return count, nil
}

// CountCoachingStaffByTeam returns the number of active coaching staff on a team.
func (r *PGRepository) CountCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM public.coaching_staff WHERE team_id = $1 AND is_active = true`, teamID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count coaching staff: %w", err)
	}
	return count, nil
}

// GetTournamentByID returns tournament info needed for validation.
func (r *PGRepository) GetTournamentByID(ctx context.Context, tournamentID uuid.UUID) (Tournament, error) {
	const q = `
		SELECT id, league_id, registration_open, max_players, max_coaching_staff,
		       age_validation_enabled, min_age, max_age, age_reference_date,
		       age_exception_count, age_exception_min_age, age_exception_max_age
		FROM public.tournaments
		WHERE id = $1`

	var t Tournament
	err := r.db.QueryRow(ctx, q, tournamentID).Scan(
		&t.ID, &t.LeagueID, &t.RegistrationOpen, &t.MaxPlayers, &t.MaxCoachingStaff,
		&t.AgeValidationEnabled, &t.MinAge, &t.MaxAge, &t.AgeReferenceDate,
		&t.AgeExceptionCount, &t.AgeExceptionMinAge, &t.AgeExceptionMaxAge,
	)
	if database.IsNoRows(err) {
		return Tournament{}, httpx.ErrNotFound
	}
	if err != nil {
		return Tournament{}, fmt.Errorf("get tournament: %w", err)
	}
	return t, nil
}

// CountPendingPlayerRegistrationsByTeamTournament counts pending requests for a team in a tournament.
func (r *PGRepository) CountPendingPlayerRegistrationsByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM public.player_registration_requests
		WHERE team_id = $1 AND tournament_id = $2 AND status = 'pending'`,
		teamID, tournamentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count pending requests: %w", err)
	}
	return count, nil
}

// CountPlayersByTeamTournament counts active players on a team in a tournament.
func (r *PGRepository) CountPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(p.id)
		FROM public.players p
		JOIN public.teams t ON p.team_id = t.id
		WHERE p.team_id = $1 AND t.tournament_id = $2 AND p.is_active = true`,
		teamID, tournamentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count players by team tournament: %w", err)
	}
	return count, nil
}

// CountExceptionPlayersByTeamTournament counts players in exception age ranges.
func (r *PGRepository) CountExceptionPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	var count int
	const q = `
		SELECT COUNT(p.id)
		FROM public.players p
		JOIN public.teams t ON p.team_id = t.id
		JOIN public.tournaments tr ON t.tournament_id = tr.id
		WHERE p.team_id = $1
		  AND t.tournament_id = $2
		  AND p.is_active = true
		  AND p.birth_date IS NOT NULL
		  AND tr.age_validation_enabled = true
		  AND (EXTRACT(YEAR FROM age(tr.age_reference_date::date, p.birth_date))::int >= COALESCE(tr.age_exception_min_age, 0))
		  AND (COALESCE(tr.age_exception_max_age, 999) IS NULL OR EXTRACT(YEAR FROM age(tr.age_reference_date::date, p.birth_date))::int <= tr.age_exception_max_age)`
	err := r.db.QueryRow(ctx, q, teamID, tournamentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count exception players: %w", err)
	}
	return count, nil
}

// GetPlayersByLeague returns all active players in a league's tournament, limited to limit.
func (r *PGRepository) GetPlayersByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Player, error) {
	if limit <= 0 || limit > 200 {
		limit = 200
	}

	const q = `
		SELECT p.id, p.name, p.team_id, p.position, p.jersey_number, p.photo, p.birth_date,
		       p.is_active, p.created_at, p.updated_at, p.enrollment_status, p.id_verified
		FROM public.players p
		JOIN public.teams t ON p.team_id = t.id
		WHERE t.league_id = $1 AND p.is_active = true
		LIMIT $2`

	rows, err := r.db.Query(ctx, q, leagueID, limit)
	if err != nil {
		return nil, fmt.Errorf("query players by league: %w", err)
	}
	defer rows.Close()

	var players []Player
	for rows.Next() {
		var p Player
		if err := rows.Scan(
			&p.ID, &p.Name, &p.TeamID, &p.Position, &p.JerseyNumber, &p.Photo, &p.BirthDate,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.EnrollmentStatus, &p.IDVerified,
		); err != nil {
			return nil, fmt.Errorf("scan player: %w", err)
		}
		players = append(players, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate players: %w", err)
	}
	return players, nil
}
