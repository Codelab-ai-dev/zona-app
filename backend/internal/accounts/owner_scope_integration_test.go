//go:build integration

package accounts

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

// A team owner without users.league_id is managed through the teams they
// own: by an admin who runs every one of those leagues, and nobody else (#64).
func TestLeagueAdminManagesOwnersWithoutLeague(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	a := testdb.Seed(t, pool)
	b := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatal(err)
		}
	}
	svc := NewService(NewPGRepository(pool), NewLocalIdentityProvider(pool), authz.NewPGChecker(pool))
	adminA := auth.Principal{UserID: a.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	adminB := auth.Principal{UserID: b.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	rename := func(caller auth.Principal, target uuid.UUID, name string) error {
		_, err := svc.UpdateUser(ctx, caller, target, UpdateUserRequest{Name: &name})
		return err
	}

	// A's owner loses users.league_id but still owns A's teams.
	exec(`UPDATE public.users SET league_id = NULL WHERE id = $1`, a.TeamOwnerID)

	t.Run("admin of the owner's league can read and edit", func(t *testing.T) {
		if _, err := svc.GetUser(ctx, adminA, a.TeamOwnerID); err != nil {
			t.Fatalf("get: %v", err)
		}
		if err := rename(adminA, a.TeamOwnerID, "Dueño Renombrado"); err != nil {
			t.Fatalf("update: %v", err)
		}
	})

	t.Run("admin of another league cannot", func(t *testing.T) {
		if _, err := svc.GetUser(ctx, adminB, a.TeamOwnerID); !errors.Is(err, httpx.ErrForbidden) {
			t.Fatalf("get: %v, want 403", err)
		}
		if err := rename(adminB, a.TeamOwnerID, "Intruso"); !errors.Is(err, httpx.ErrForbidden) {
			t.Fatalf("update: %v, want 403", err)
		}
	})

	t.Run("an owner with league_id keeps the current rule", func(t *testing.T) {
		if err := rename(adminA, b.TeamOwnerID, "Ajeno"); !errors.Is(err, httpx.ErrForbidden) {
			t.Fatalf("admin A on B's owner: %v, want 403", err)
		}
	})

	t.Run("owner with teams in two leagues needs both", func(t *testing.T) {
		// A's owner now also owns B's away team.
		exec(`UPDATE public.teams SET owner_id = $2 WHERE id = $1`, b.AwayTeamID, a.TeamOwnerID)
		for name, admin := range map[string]auth.Principal{"admin A": adminA, "admin B": adminB} {
			if err := rename(admin, a.TeamOwnerID, "Solo una liga"); !errors.Is(err, httpx.ErrForbidden) {
				t.Errorf("%s: %v, want 403", name, err)
			}
		}
		// An admin of both leagues may.
		exec(`UPDATE public.leagues SET admin_id = $2 WHERE id = $1`, b.LeagueID, a.LeagueAdminID)
		if err := rename(adminA, a.TeamOwnerID, "Ambas ligas"); err != nil {
			t.Fatalf("admin of both leagues: %v", err)
		}
	})

	t.Run("users that own no team stay out of reach", func(t *testing.T) {
		lonely := uuid.New()
		exec(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, lonely, lonely.String()+"@test.local")
		exec(`UPDATE public.users SET role = 'team_owner' WHERE id = $1`, lonely)
		if _, err := svc.GetUser(ctx, adminA, lonely); !errors.Is(err, httpx.ErrForbidden) {
			t.Fatalf("get: %v, want 403", err)
		}
	})

}
