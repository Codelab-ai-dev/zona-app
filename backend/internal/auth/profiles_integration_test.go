//go:build integration

package auth_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGProfileLoader(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	loader := auth.NewPGProfileLoader(pool)
	ctx := context.Background()

	p, err := loader.LoadPrincipal(ctx, f.TeamOwnerID)
	if err != nil {
		t.Fatalf("LoadPrincipal: %v", err)
	}
	if p.Role != auth.RoleTeamOwner || p.LeagueID == nil || *p.LeagueID != f.LeagueID || !p.IsActive {
		t.Fatalf("unexpected principal: %+v", p)
	}

	if _, err := loader.LoadPrincipal(ctx, uuid.New()); !errors.Is(err, auth.ErrProfileNotFound) {
		t.Fatalf("missing profile err = %v, want ErrProfileNotFound", err)
	}
}
