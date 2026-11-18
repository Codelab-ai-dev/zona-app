//go:build integration

package matches

import (
	"context"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Through the API: a 1-0 with two home goals is refused and nothing is saved (#84).
func TestPostResultRejectsGoalsAboveScore(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	goal := PostGoalRequest{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10}

	err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 0, Goals: []PostGoalRequest{goal, {PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 20}}})
	if apiStatus(err) != 422 {
		t.Fatalf("2 goals for a 1-0: %v, want 422", err)
	}
	var status string
	var goals int
	if err := pool.QueryRow(ctx, `SELECT status, (SELECT count(*) FROM public.match_goals WHERE match_id = $1) FROM public.matches WHERE id = $1`, f.MatchID).Scan(&status, &goals); err != nil {
		t.Fatal(err)
	}
	if status == "finished" || goals != 0 {
		t.Fatalf("refused result left status %s and %d goals", status, goals)
	}

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 0, Goals: []PostGoalRequest{goal}}); err != nil {
		t.Fatalf("valid 1-0: %v", err)
	}
}
