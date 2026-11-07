//go:build integration

package matches

import (
	"context"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// TestPostResultIsIdempotent re-posts a result through the real triggers:
// goals/cards must reflect the last payload and the red-card trigger must
// leave exactly one suspension.
func TestPostResultIsIdempotent(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	first := PostMatchResultRequest{
		HomeScore: 2, AwayScore: 0,
		Goals: []PostGoalRequest{
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10},
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 20},
		},
		Cards: []PostCardRequest{{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, CardType: "red", Minute: 80}},
	}
	second := first
	second.HomeScore = 1
	second.Goals = first.Goals[:1]

	if err := svc.PostResult(ctx, admin, f.MatchID, first); err != nil {
		t.Fatalf("first PostResult: %v", err)
	}
	if err := svc.PostResult(ctx, admin, f.MatchID, second); err != nil {
		t.Fatalf("second PostResult: %v", err)
	}

	count := func(q string) int {
		t.Helper()
		var n int
		if err := pool.QueryRow(ctx, q, f.MatchID).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if n := count(`SELECT count(*) FROM public.match_goals WHERE match_id = $1`); n != 1 {
		t.Errorf("goals = %d, want 1 (second payload)", n)
	}
	if n := count(`SELECT count(*) FROM public.match_cards WHERE match_id = $1`); n != 1 {
		t.Errorf("cards = %d, want 1", n)
	}
	if n := count(`SELECT count(*) FROM public.player_suspensions WHERE match_id = $1`); n != 1 {
		t.Errorf("suspensions = %d, want exactly 1", n)
	}
	if n := count(`SELECT home_score FROM public.matches WHERE id = $1`); n != 1 {
		t.Errorf("home_score = %d, want 1", n)
	}
}
