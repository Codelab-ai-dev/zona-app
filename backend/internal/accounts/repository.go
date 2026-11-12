package accounts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with pgx. All queries are parameterized.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds a PostgreSQL-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// CreateUser upserts a user into public.users. The DB trigger on auth.users
// creates an initial row with role='public'; this upsert updates it with the
// provided role, name, league_id, team_id.
func (r *PGRepository) CreateUser(ctx context.Context, user User) error {
	// One statement: when the user gets a team they also become its owner.
	const q = `
		WITH u AS (
		INSERT INTO public.users (id, name, email, phone, role, league_id, team_id, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			phone = EXCLUDED.phone,
			role = EXCLUDED.role,
			league_id = EXCLUDED.league_id,
			team_id = EXCLUDED.team_id,
			is_active = EXCLUDED.is_active,
			updated_at = now()
		RETURNING id)
		UPDATE public.teams SET owner_id = (SELECT id FROM u), updated_at = now()
		WHERE $7::uuid IS NOT NULL AND id = $7 AND league_id = $6`

	now := time.Now()
	_, err := r.db.Exec(ctx, q,
		user.ID, user.Name, user.Email, user.Phone, user.Role, user.LeagueID, user.TeamID, user.IsActive, now)

	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	return nil
}

// UpdateUser updates a user's fields. Returns the updated User.
func (r *PGRepository) UpdateUser(ctx context.Context, userID uuid.UUID, updates UpdateUserRequest) (User, error) {
	// Build dynamic UPDATE query
	var setClauses []string
	var args []any
	argIdx := 1

	if updates.Email != nil && *updates.Email != "" {
		setClauses = append(setClauses, fmt.Sprintf("email = $%d", argIdx))
		args = append(args, *updates.Email)
		argIdx++
	}

	if updates.Name != nil && *updates.Name != "" {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *updates.Name)
		argIdx++
	}

	if updates.Phone != nil {
		setClauses = append(setClauses, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, *updates.Phone)
		argIdx++
	}

	if updates.Role != nil && *updates.Role != "" {
		setClauses = append(setClauses, fmt.Sprintf("role = $%d", argIdx))
		args = append(args, *updates.Role)
		argIdx++
	}

	if updates.IsActive != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *updates.IsActive)
		argIdx++
	}

	if len(setClauses) == 0 {
		// No updates, just fetch current state
		return r.GetByID(ctx, userID)
	}

	// Add updated_at and userID to args
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now())
	argIdx++

	args = append(args, userID)

	q := fmt.Sprintf(`
		UPDATE public.users
		SET %s
		WHERE id = $%d
		RETURNING id, name, email, phone, role, league_id, team_id, is_active, created_at`,
		strings.Join(setClauses, ", "), argIdx)

	var u User
	err := r.db.QueryRow(ctx, q, args...).Scan(
		&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.LeagueID, &u.TeamID, &u.IsActive, &u.CreatedAt)

	if database.IsNoRows(err) {
		return User{}, httpx.ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("update user: %w", err)
	}

	return u, nil
}

// GetByID retrieves a user by ID.
func (r *PGRepository) GetByID(ctx context.Context, userID uuid.UUID) (User, error) {
	const q = `
		SELECT id, name, email, phone, role, league_id, team_id, is_active, created_at
		FROM public.users
		WHERE id = $1`

	var u User
	err := r.db.QueryRow(ctx, q, userID).Scan(
		&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.LeagueID, &u.TeamID, &u.IsActive, &u.CreatedAt)

	if database.IsNoRows(err) {
		return User{}, httpx.ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("get user: %w", err)
	}

	return u, nil
}

// TeamLeague returns the league of a team.
func (r *PGRepository) TeamLeague(ctx context.Context, teamID uuid.UUID) (uuid.UUID, error) {
	var leagueID uuid.UUID
	err := r.db.QueryRow(ctx, `SELECT league_id FROM public.teams WHERE id = $1`, teamID).Scan(&leagueID)
	if database.IsNoRows(err) {
		return uuid.Nil, httpx.ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("team league: %w", err)
	}
	return leagueID, nil
}
