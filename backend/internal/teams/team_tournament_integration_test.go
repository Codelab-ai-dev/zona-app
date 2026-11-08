//go:build integration

package teams

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestChangeTeamTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	second := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO public.tournaments (id, name, league_id, start_date, end_date) VALUES ($1, 'Clausura', $2, current_date, current_date + 30)`, second, f.LeagueID); err != nil {
		t.Fatal(err)
	}

	if _, err := svc.UpdateTeam(ctx, owner, f.HomeTeamID, UpdateTeamRequest{TournamentID: &second}); err == nil {
		t.Fatal("team owner moved the team to another tournament")
	}
	if _, err := svc.UpdateTeam(ctx, admin, f.HomeTeamID, UpdateTeamRequest{TournamentID: &other.TournamentID}); statusOf(err) != 422 {
		t.Fatalf("tournament of another league: got %v, want 422", err)
	}
	team, err := svc.UpdateTeam(ctx, admin, f.HomeTeamID, UpdateTeamRequest{TournamentID: &second})
	if err != nil || team.TournamentID == nil || *team.TournamentID != second {
		t.Fatalf("move: %+v %v", team.TournamentID, err)
	}
	team, err = svc.UpdateTeam(ctx, admin, f.HomeTeamID, UpdateTeamRequest{TournamentID: &uuid.Nil})
	if err != nil || team.TournamentID != nil {
		t.Fatalf("clear: %+v %v", team.TournamentID, err)
	}
	// Owners can still edit the rest of their team.
	name := "RENOMBRADO"
	if _, err := svc.UpdateTeam(ctx, owner, f.HomeTeamID, UpdateTeamRequest{Name: &name}); err != nil {
		t.Fatalf("owner rename: %v", err)
	}
}
