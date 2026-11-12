package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGProfileLoader loads principals from public.users.
type PGProfileLoader struct {
	db database.Querier
}

// NewPGProfileLoader builds a ProfileLoader backed by PostgreSQL.
func NewPGProfileLoader(db database.Querier) *PGProfileLoader {
	return &PGProfileLoader{db: db}
}

// LoadPrincipal implements ProfileLoader.
func (l *PGProfileLoader) LoadPrincipal(ctx context.Context, userID uuid.UUID) (Principal, error) {
	const q = `
		SELECT id, email, COALESCE(role, 'public'), league_id, team_id, COALESCE(is_active, true)
		FROM public.users
		WHERE id = $1`

	var p Principal
	var role string
	err := l.db.QueryRow(ctx, q, userID).Scan(&p.UserID, &p.Email, &role, &p.LeagueID, &p.TeamID, &p.IsActive)
	if database.IsNoRows(err) {
		return Principal{}, ErrProfileNotFound
	}
	if err != nil {
		return Principal{}, fmt.Errorf("load principal: %w", err)
	}
	p.Role = Role(role)
	return p, nil
}
