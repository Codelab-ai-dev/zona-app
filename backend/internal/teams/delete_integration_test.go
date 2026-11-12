//go:build integration

package teams

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

// Deleting a team removes its players and matches and rebuilds the rivals'
// standings so they lose the points of the deleted matches, keeping manual
// point adjustments. Team owners cannot delete their own team.
func TestDeleteTeam_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	// A third team; the away team beats it 2-0, and beats/loses to home via the seed match.
	third := uuid.New()
	exec(`INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, 'Tercero', $2, $3, $4, $5)`,
		third, "tercero-"+third.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID)
	var other uuid.UUID
	if err := pool.QueryRow(ctx, `INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, round, status)
		VALUES ($1, $2, $3, now(), 2, 'scheduled') RETURNING id`, f.TournamentID, f.AwayTeamID, third).Scan(&other); err != nil {
		t.Fatal(err)
	}
	exec(`UPDATE public.matches SET status = 'finished', home_score = 2, away_score = 1 WHERE id = $1`, f.MatchID) // home wins
	exec(`UPDATE public.matches SET status = 'finished', home_score = 2, away_score = 0 WHERE id = $1`, other)     // away wins
	exec(`UPDATE public.team_stats SET points_adjustment = -1, adjustment_reason = 'sanción' WHERE team_id = $1`, f.AwayTeamID)

	if err := svc.DeleteTeam(ctx, owner, f.HomeTeamID); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("team owner deleting a team: got %v, want forbidden", err)
	}
	if err := svc.DeleteTeam(ctx, admin, f.HomeTeamID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	count := func(q string, args ...any) int {
		t.Helper()
		var n int
		if err := pool.QueryRow(ctx, q, args...).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if n := count(`SELECT count(*) FROM public.players WHERE id = $1`, f.HomePlayerID); n != 0 {
		t.Errorf("players of the deleted team remain: %d", n)
	}
	if n := count(`SELECT count(*) FROM public.matches WHERE id = $1`, f.MatchID); n != 0 {
		t.Errorf("matches of the deleted team remain: %d", n)
	}

	var played, won, lost, gf, ga, adj int
	var reason string
	if err := pool.QueryRow(ctx, `SELECT matches_played, matches_won, matches_lost, goals_for, goals_against,
		points_adjustment, adjustment_reason FROM public.team_stats WHERE team_id = $1 AND tournament_id = $2`,
		f.AwayTeamID, f.TournamentID).Scan(&played, &won, &lost, &gf, &ga, &adj, &reason); err != nil {
		t.Fatal(err)
	}
	if played != 1 || won != 1 || lost != 0 || gf != 2 || ga != 0 {
		t.Errorf("rival standings not rebuilt: played=%d won=%d lost=%d gf=%d ga=%d, want 1/1/0/2/0", played, won, lost, gf, ga)
	}
	if adj != -1 || reason != "sanción" {
		t.Errorf("manual adjustment lost: %d %q", adj, reason)
	}

	if err := svc.DeleteTeam(ctx, admin, f.HomeTeamID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("deleting again: got %v, want not found", err)
	}
}
