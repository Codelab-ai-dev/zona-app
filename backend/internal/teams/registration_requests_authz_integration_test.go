//go:build integration

package teams

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Registration requests carry player PII (birth date): only whoever manages
// the team may list them, whatever the caller's role (#60).
func TestTeamRegistrationRequestsAuthorization(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool) // a second league
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatal(err)
		}
	}
	insertPendingRequest(t, ctx, f, exec, "Menor Registrado", 30)
	exec(`UPDATE public.player_registration_requests SET birth_date = '2012-03-04' WHERE team_id = $1`, f.HomeTeamID)

	// The away team of the same league now belongs to someone else.
	sameLeagueOwner := other.TeamOwnerID
	exec(`UPDATE public.teams SET owner_id = $2 WHERE id = $1`, f.AwayTeamID, sameLeagueOwner)

	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	as := func(id uuid.UUID, role auth.Role) auth.Principal {
		return auth.Principal{UserID: id, Role: role, IsActive: true}
	}

	cases := []struct {
		name   string
		caller auth.Principal
		team   uuid.UUID
		want   int
	}{
		{"team owner", as(f.TeamOwnerID, auth.RoleTeamOwner), f.HomeTeamID, http.StatusOK},
		{"league admin of the team", as(f.LeagueAdminID, auth.RoleLeagueAdmin), f.HomeTeamID, http.StatusOK},
		{"super admin", as(uuid.New(), auth.RoleSuperAdmin), f.HomeTeamID, http.StatusOK},

		{"public user", as(uuid.New(), auth.RolePublic), f.HomeTeamID, http.StatusForbidden},
		{"admin of another league", as(other.LeagueAdminID, auth.RoleLeagueAdmin), f.HomeTeamID, http.StatusForbidden},
		{"owner of another team, same league", as(sameLeagueOwner, auth.RoleTeamOwner), f.HomeTeamID, http.StatusForbidden},
		{"owner of a team in another league", as(other.TeamOwnerID, auth.RoleTeamOwner), f.HomeTeamID, http.StatusForbidden},
		{"public user, unknown team", as(uuid.New(), auth.RolePublic), uuid.New(), http.StatusNotFound},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			reqs, err := svc.GetTeamPlayerRegistrationRequests(ctx, c.caller, c.team, 50, 0)
			if got := statusOf(err); got != c.want {
				t.Fatalf("status = %d (%v), want %d", got, err, c.want)
			}
			if c.want != http.StatusOK {
				if reqs != nil {
					t.Fatalf("denied caller got %d requests", len(reqs))
				}
				return
			}
			if len(reqs) != 1 || reqs[0].PlayerName != "Menor Registrado" {
				t.Fatalf("requests = %+v", reqs)
			}
		})
	}
}
