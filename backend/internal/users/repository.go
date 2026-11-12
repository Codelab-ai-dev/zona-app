package users

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with pgx. Every query is parameterized.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds a PostgreSQL-backed repository.
func NewPGRepository(db database.Querier) *PGRepository { return &PGRepository{db: db} }

// GetByID returns httpx.ErrNotFound when the user does not exist.
func (r *PGRepository) GetByID(ctx context.Context, id uuid.UUID) (Profile, error) {
	const q = `
		SELECT id, name, email, phone, COALESCE(role::text, 'public'), league_id, team_id,
		       COALESCE(is_active, true), created_at
		FROM public.users
		WHERE id = $1`

	var p Profile
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.Email, &p.Phone, &p.Role, &p.LeagueID, &p.TeamID, &p.IsActive, &p.CreatedAt,
	)
	if database.IsNoRows(err) {
		return Profile{}, httpx.ErrNotFound
	}
	if err != nil {
		return Profile{}, fmt.Errorf("get user %s: %w", id, err)
	}
	return p, nil
}
