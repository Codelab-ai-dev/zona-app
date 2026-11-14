//go:build integration

package directory

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func newTestUser(t *testing.T, pool *pgxpool.Pool, role string, leagueID *uuid.UUID) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	id := uuid.New()
	// The auth.users trigger creates the public.users row with role 'public'.
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, id, id.String()+"@test.local"); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.users SET role = $2, league_id = $3, name = 'Dir Test' WHERE id = $1`, id, role, leagueID); err != nil {
		t.Fatal(err)
	}
	return id
}

func ids(users []User) map[uuid.UUID]bool {
	m := map[uuid.UUID]bool{}
	for _, u := range users {
		m[u.ID] = true
	}
	return m
}

// A league admin's directory covers every league they administer
// (leagues.admin_id), whatever users.league_id says, and nothing else (#63).
func TestListUsersLeagueAdminScope(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	a := testdb.Seed(t, pool)
	b := testdb.Seed(t, pool)
	foreign := testdb.Seed(t, pool) // a league of someone else
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatal(err)
		}
	}
	// The same admin runs leagues A and B; their profile points nowhere.
	exec(`UPDATE public.leagues SET admin_id = $2 WHERE id = $1`, b.LeagueID, a.LeagueAdminID)
	exec(`UPDATE public.users SET league_id = NULL WHERE id = $1`, a.LeagueAdminID)

	// B's team owner has no users.league_id: found through teams.owner_id.
	exec(`UPDATE public.users SET league_id = NULL WHERE id = $1`, b.TeamOwnerID)
	// A plain user scoped to league A by users.league_id.
	member := newTestUser(t, pool, "public", &a.LeagueID)

	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: a.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	users, err := svc.ListUsers(ctx, admin, &ListUsersRequest{Limit: 100})
	if err != nil {
		t.Fatalf("ListUsers: %v", err)
	}
	got := ids(users)
	for name, id := range map[string]uuid.UUID{"A owner": a.TeamOwnerID, "B owner (league_id NULL)": b.TeamOwnerID, "A member": member} {
		if !got[id] {
			t.Errorf("%s missing from the directory", name)
		}
	}
	for name, id := range map[string]uuid.UUID{"foreign admin": foreign.LeagueAdminID, "foreign owner": foreign.TeamOwnerID} {
		if got[id] {
			t.Errorf("%s leaked into the directory", name)
		}
	}

	t.Run("role filter runs before paging", func(t *testing.T) {
		owner := string(auth.RoleTeamOwner)
		page, err := svc.ListUsers(ctx, admin, &ListUsersRequest{Role: &owner, Limit: 2})
		if err != nil {
			t.Fatal(err)
		}
		if len(page) != 2 {
			t.Fatalf("got %d owners on a page of 2, want 2", len(page))
		}
		for _, u := range page {
			if u.Role != owner {
				t.Errorf("role filter let %s through", u.Role)
			}
		}
	})

	t.Run("admin without leagues gets an empty list", func(t *testing.T) {
		lonely := newTestUser(t, pool, "league_admin", nil)
		users, err := svc.ListUsers(ctx, auth.Principal{UserID: lonely, Role: auth.RoleLeagueAdmin, IsActive: true}, &ListUsersRequest{Limit: 50})
		if err != nil {
			t.Fatal(err)
		}
		if len(users) != 0 {
			t.Fatalf("got %d users", len(users))
		}
	})

	t.Run("per-league endpoint includes owners without league_id", func(t *testing.T) {
		users, err := svc.ListLeagueUsers(ctx, admin, b.LeagueID, "", 50, 0)
		if err != nil {
			t.Fatal(err)
		}
		if got := ids(users); !got[b.TeamOwnerID] || got[a.TeamOwnerID] {
			t.Fatalf("league B users = %v", got)
		}
		if _, err := svc.ListLeagueUsers(ctx, admin, foreign.LeagueID, "", 50, 0); err == nil {
			t.Fatal("admin listed a foreign league")
		}
	})
}
