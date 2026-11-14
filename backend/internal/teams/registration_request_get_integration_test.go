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

// A caller who may not see a registration request gets 403, not a 500 (#61).
func TestGetPlayerRegistrationRequestStatus(t *testing.T) {
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
	reqID := insertPendingRequest(t, ctx, f, exec, "Solicitud Única", 31)

	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	as := func(id uuid.UUID, role auth.Role) auth.Principal {
		return auth.Principal{UserID: id, Role: role, IsActive: true}
	}

	cases := []struct {
		name   string
		caller auth.Principal
		req    uuid.UUID
		want   int
	}{
		{"team owner", as(f.TeamOwnerID, auth.RoleTeamOwner), reqID, http.StatusOK},
		{"league admin", as(f.LeagueAdminID, auth.RoleLeagueAdmin), reqID, http.StatusOK},
		{"super admin", as(uuid.New(), auth.RoleSuperAdmin), reqID, http.StatusOK},

		{"public user", as(uuid.New(), auth.RolePublic), reqID, http.StatusForbidden},
		{"admin of another league", as(other.LeagueAdminID, auth.RoleLeagueAdmin), reqID, http.StatusForbidden},
		{"owner of a team in another league", as(other.TeamOwnerID, auth.RoleTeamOwner), reqID, http.StatusForbidden},
		{"unknown request", as(f.TeamOwnerID, auth.RoleTeamOwner), uuid.New(), http.StatusNotFound},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := svc.GetPlayerRegistrationRequest(ctx, c.caller, c.req)
			if status := statusOf(err); status != c.want {
				t.Fatalf("status = %d (%v), want %d", status, err, c.want)
			}
			if c.want == http.StatusOK && got.PlayerName != "Solicitud Única" {
				t.Fatalf("request = %+v", got)
			}
			if c.want != http.StatusOK && got.PlayerName != "" {
				t.Fatalf("denied caller got data: %+v", got)
			}
		})
	}
}
