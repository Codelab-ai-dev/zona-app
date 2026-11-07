//go:build integration

package authz_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGChecker(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	c := authz.NewPGChecker(pool)
	ctx := context.Background()

	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner}
	super := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}

	tests := []struct {
		name  string
		check func() error
		want  error
	}{
		{"admin manages own league", func() error { return c.CanManageLeague(ctx, admin, f.LeagueID) }, nil},
		{"admin cannot manage other league", func() error { return c.CanManageLeague(ctx, admin, other.LeagueID) }, httpx.ErrForbidden},
		{"owner cannot manage league", func() error { return c.CanManageLeague(ctx, owner, f.LeagueID) }, httpx.ErrForbidden},
		{"admin manages tournament", func() error { return c.CanManageTournament(ctx, admin, f.TournamentID) }, nil},
		{"admin manages match", func() error { return c.CanManageMatch(ctx, admin, f.MatchID) }, nil},
		{"admin cannot manage other match", func() error { return c.CanManageMatch(ctx, admin, other.MatchID) }, httpx.ErrForbidden},
		{"owner manages own team", func() error { return c.CanManageTeam(ctx, owner, f.HomeTeamID) }, nil},
		{"owner cannot manage other team", func() error { return c.CanManageTeam(ctx, owner, other.HomeTeamID) }, httpx.ErrForbidden},
		{"league admin manages team in league", func() error { return c.CanManageTeam(ctx, admin, f.AwayTeamID) }, nil},
		{"owner manages own player", func() error { return c.CanManagePlayer(ctx, owner, f.HomePlayerID) }, nil},
		{"owner cannot manage other player", func() error { return c.CanManagePlayer(ctx, owner, other.HomePlayerID) }, httpx.ErrForbidden},
		{"super admin manages anything", func() error { return c.CanManageTeam(ctx, super, other.HomeTeamID) }, nil},
		{"missing resource is 404 even for super admin", func() error { return c.CanManageLeague(ctx, super, uuid.New()) }, httpx.ErrNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.check()
			if tt.want == nil && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.want != nil && !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
		})
	}
}
