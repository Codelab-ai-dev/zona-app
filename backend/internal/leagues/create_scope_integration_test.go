//go:build integration

package leagues

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func newUser(t *testing.T, pool *pgxpool.Pool, role auth.Role) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	id := uuid.New()
	// The auth.users trigger creates the public.users row with role 'public'.
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, id, id.String()+"@test.local"); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.users SET role = $2 WHERE id = $1`, id, string(role)); err != nil {
		t.Fatal(err)
	}
	return id
}

func userLeague(t *testing.T, pool *pgxpool.Pool, id uuid.UUID) *uuid.UUID {
	t.Helper()
	var league *uuid.UUID
	if err := pool.QueryRow(context.Background(), `SELECT league_id FROM public.users WHERE id = $1`, id).Scan(&league); err != nil {
		t.Fatal(err)
	}
	return league
}

// Creating a league gives its admin a users.league_id when they have none,
// which GET /me returns and the Flutter league admin screens need (#62).
func TestCreateLeagueScopesItsAdmin(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	create := func(caller auth.Principal, adminID *uuid.UUID) (League, error) {
		slug := "liga-" + uuid.NewString()[:8]
		return svc.CreateLeague(ctx, caller, &CreateLeagueRequest{Name: "Liga " + slug, Slug: slug, Description: "desc", AdminID: adminID})
	}

	t.Run("league admin's first league becomes their league", func(t *testing.T) {
		adminID := newUser(t, pool, auth.RoleLeagueAdmin)
		admin := auth.Principal{UserID: adminID, Role: auth.RoleLeagueAdmin, IsActive: true}

		first, err := create(admin, nil)
		if err != nil {
			t.Fatal(err)
		}
		if got := userLeague(t, pool, adminID); got == nil || *got != first.ID {
			t.Fatalf("league_id = %v, want %s", got, first.ID)
		}

		// A second league does not move them off the first one.
		if _, err := create(admin, nil); err != nil {
			t.Fatal(err)
		}
		if got := userLeague(t, pool, adminID); got == nil || *got != first.ID {
			t.Fatalf("after second league: league_id = %v, want %s", got, first.ID)
		}
	})

	t.Run("super admin creating for a league admin", func(t *testing.T) {
		superID := newUser(t, pool, auth.RoleSuperAdmin)
		super := auth.Principal{UserID: superID, Role: auth.RoleSuperAdmin, IsActive: true}
		adminID := newUser(t, pool, auth.RoleLeagueAdmin)

		l, err := create(super, &adminID)
		if err != nil {
			t.Fatal(err)
		}
		if got := userLeague(t, pool, adminID); got == nil || *got != l.ID {
			t.Fatalf("assigned admin league_id = %v, want %s", got, l.ID)
		}
		if got := userLeague(t, pool, superID); got != nil {
			t.Fatalf("super admin got league_id %v", got)
		}
	})

	t.Run("super admin creating for themselves keeps no league", func(t *testing.T) {
		superID := newUser(t, pool, auth.RoleSuperAdmin)
		if _, err := create(auth.Principal{UserID: superID, Role: auth.RoleSuperAdmin, IsActive: true}, nil); err != nil {
			t.Fatal(err)
		}
		if got := userLeague(t, pool, superID); got != nil {
			t.Fatalf("super admin got league_id %v", got)
		}
	})

	t.Run("duplicate slug changes nothing", func(t *testing.T) {
		adminID := newUser(t, pool, auth.RoleLeagueAdmin)
		admin := auth.Principal{UserID: adminID, Role: auth.RoleLeagueAdmin, IsActive: true}
		taken := testdb.Seed(t, pool).LeagueSlug

		_, err := svc.CreateLeague(ctx, admin, &CreateLeagueRequest{Name: "Repetida", Slug: taken, Description: "desc"})
		var apiErr *httpx.Error
		if !errors.As(err, &apiErr) || apiErr.Status != http.StatusConflict {
			t.Fatalf("err = %v, want 409", err)
		}
		if got := userLeague(t, pool, adminID); got != nil {
			t.Fatalf("failed creation set league_id %v", got)
		}
	})
}
