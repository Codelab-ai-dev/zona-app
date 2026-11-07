//go:build integration

package teams

import (
	"context"
	"testing"
	"time"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// TestRegistrationApprovalCreatesPlayer runs the whole flow against the real
// schema: owner requests, league admin approves, player appears atomically.
func TestRegistrationApprovalCreatesPlayer(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `UPDATE public.tournaments SET registration_open = true, max_players = 2 WHERE id = $1`, f.TournamentID); err != nil {
		t.Fatal(err)
	}
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	birth := httpx.NewDate(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC))

	req, err := svc.RequestPlayerRegistration(ctx, owner, f.HomeTeamID, f.TournamentID,
		CreatePlayerRegistrationRequestRequest{PlayerName: "Nuevo", PlayerPosition: "Defensa", JerseyNumber: 4, BirthDate: &birth})
	if err != nil {
		t.Fatalf("RequestPlayerRegistration: %v", err)
	}

	approved, err := svc.ReviewPlayerRegistration(ctx, admin, req.ID, "approved", nil)
	if err != nil {
		t.Fatalf("ReviewPlayerRegistration: %v", err)
	}
	if approved.Status != "approved" {
		t.Fatalf("status = %q, want approved", approved.Status)
	}

	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.players WHERE team_id = $1 AND jersey_number = 4 AND name = 'Nuevo'`, f.HomeTeamID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("approved player rows = %d, want 1", n)
	}

	// The team now has 2 players (seed + approved) and max_players = 2.
	if _, err := svc.RequestPlayerRegistration(ctx, owner, f.HomeTeamID, f.TournamentID,
		CreatePlayerRegistrationRequestRequest{PlayerName: "Otro", PlayerPosition: "Defensa", JerseyNumber: 5, BirthDate: &birth}); err == nil {
		t.Fatal("request over max_players should be rejected")
	}
}
