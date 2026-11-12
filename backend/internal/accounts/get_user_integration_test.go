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

func TestGetUserFollowsEditRules(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), NewLocalIdentityProvider(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}

	u, err := svc.GetUser(ctx, admin, f.TeamOwnerID)
	if err != nil || u.ID != f.TeamOwnerID {
		t.Fatalf("league admin reading own team owner: %+v %v", u, err)
	}
	for name, tc := range map[string]struct {
		caller auth.Principal
		target uuid.UUID
	}{
		"owner of another league": {admin, other.TeamOwnerID},
		"another league admin":    {admin, other.LeagueAdminID},
		"team owner caller":       {owner, f.TeamOwnerID},
	} {
		_, err := svc.GetUser(ctx, tc.caller, tc.target)
		if !errors.Is(err, httpx.ErrForbidden) {
			t.Errorf("%s: got %v, want forbidden", name, err)
		}
	}
}
