//go:build integration

package stats

import (
	"context"
	"errors"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// The tournament's discipline rules: off by default, validated, and only
// for whoever manages the tournament (#82).
func TestDisciplineRules(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	stranger := auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	status := func(err error) int {
		var he *httpx.Error
		if errors.As(err, &he) {
			return he.Status
		}
		if err == nil {
			return 200
		}
		return 500
	}

	got, err := svc.GetDisciplineRules(ctx, admin, f.TournamentID)
	if err != nil || got.YellowAccumulationLimit != nil || got.YellowAccumulationMatches != 1 {
		t.Fatalf("default = %+v (%v), want off", got, err)
	}

	five := 5
	if _, err := svc.SetDisciplineRules(ctx, stranger, f.TournamentID, DisciplineRules{YellowAccumulationLimit: &five, YellowAccumulationMatches: 1}); status(err) != 403 {
		t.Fatalf("other league's admin: %v, want 403", err)
	}
	one := 1
	if _, err := svc.SetDisciplineRules(ctx, admin, f.TournamentID, DisciplineRules{YellowAccumulationLimit: &one, YellowAccumulationMatches: 0}); status(err) != 422 {
		t.Fatalf("invalid rules: %v, want 422", err)
	}
	if _, err := svc.SetDisciplineRules(ctx, admin, f.TournamentID, DisciplineRules{YellowAccumulationLimit: &five, YellowAccumulationMatches: 2}); err != nil {
		t.Fatal(err)
	}
	got, err = svc.GetDisciplineRules(ctx, admin, f.TournamentID)
	if err != nil || got.YellowAccumulationLimit == nil || *got.YellowAccumulationLimit != 5 || got.YellowAccumulationMatches != 2 {
		t.Fatalf("saved = %+v (%v)", got, err)
	}
	if _, err := svc.GetDisciplineRules(ctx, stranger, f.TournamentID); status(err) != 403 {
		t.Fatalf("other league's admin reading: %v, want 403", err)
	}
	// Turning it off again.
	if _, err := svc.SetDisciplineRules(ctx, admin, f.TournamentID, DisciplineRules{YellowAccumulationMatches: 1}); err != nil {
		t.Fatal(err)
	}
}
