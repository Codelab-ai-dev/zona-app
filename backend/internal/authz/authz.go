// Package authz centralizes resource-level authorization. It replaces the
// Supabase RLS policies: every write in the API must go through one of these
// checks (or an explicit role check) before touching the database.
//
// Rules (mirroring the legacy RLS policies):
//   - super_admin can manage everything.
//   - A league is managed by leagues.admin_id.
//   - A tournament/match belongs to a league; its league admin manages it.
//   - A team is managed by teams.owner_id or by its league admin.
//   - A player is managed by whoever manages the player's team.
package authz

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Checker answers "may this principal manage resource X?".
// Each method returns nil when allowed, httpx.ErrForbidden when not, and
// httpx.ErrNotFound when the resource does not exist.
type Checker interface {
	CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error
	CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error
	CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error
	CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error
	CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error
}

// PGChecker implements Checker with PostgreSQL lookups.
type PGChecker struct {
	db database.Querier
}

// NewPGChecker builds a database-backed Checker.
func NewPGChecker(db database.Querier) *PGChecker { return &PGChecker{db: db} }

// CanManageLeague implements Checker.
func (c *PGChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	return c.check(ctx, p, `SELECT admin_id = $2 FROM public.leagues WHERE id = $1`, leagueID)
}

// CanManageTournament implements Checker.
func (c *PGChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return c.check(ctx, p, `
		SELECT l.admin_id = $2
		FROM public.tournaments t JOIN public.leagues l ON l.id = t.league_id
		WHERE t.id = $1`, tournamentID)
}

// CanManageMatch implements Checker.
func (c *PGChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	return c.check(ctx, p, `
		SELECT l.admin_id = $2
		FROM public.matches m
		JOIN public.tournaments t ON t.id = m.tournament_id
		JOIN public.leagues l ON l.id = t.league_id
		WHERE m.id = $1`, matchID)
}

// CanManageTeam implements Checker.
func (c *PGChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return c.check(ctx, p, `
		SELECT tm.owner_id = $2 OR l.admin_id = $2
		FROM public.teams tm JOIN public.leagues l ON l.id = tm.league_id
		WHERE tm.id = $1`, teamID)
}

// CanManagePlayer implements Checker.
func (c *PGChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return c.check(ctx, p, `
		SELECT tm.owner_id = $2 OR l.admin_id = $2
		FROM public.players pl
		JOIN public.teams tm ON tm.id = pl.team_id
		JOIN public.leagues l ON l.id = tm.league_id
		WHERE pl.id = $1`, playerID)
}

// check runs a query returning a single boolean "is owner" column.
// Super admins still require the resource to exist (404 beats 200 on ghosts).
func (c *PGChecker) check(ctx context.Context, p auth.Principal, query string, resourceID uuid.UUID) error {
	var allowed *bool
	err := c.db.QueryRow(ctx, query, resourceID, p.UserID).Scan(&allowed)
	if database.IsNoRows(err) {
		return httpx.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("authz check: %w", err)
	}
	if p.IsSuperAdmin() || (allowed != nil && *allowed) {
		return nil
	}
	return httpx.ErrForbidden
}
