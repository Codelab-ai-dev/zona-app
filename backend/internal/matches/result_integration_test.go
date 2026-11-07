//go:build integration

package matches

import (
	"context"
	"testing"

	"github.com/google/uuid"

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

func TestPostResultStoresObservationsInRefereeReport(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	obs := "  Partido sin incidentes  "

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 0, Observations: &obs}); err != nil {
		t.Fatalf("PostResult: %v", err)
	}
	var got string
	if err := pool.QueryRow(ctx, `SELECT general_observations FROM public.match_referee_reports WHERE match_id = $1`, f.MatchID).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != "Partido sin incidentes" {
		t.Fatalf("observations = %q", got)
	}
}

// Regression: once a league had standings, finishing another match failed
// inside the knowledge trigger (format('%+4s') is not valid PostgreSQL).
func TestPostResultForSecondMatchOfLeague(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	var second uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, match_time, round, status)
		VALUES ($1, $2, $3, now(), '20:00', 2, 'scheduled') RETURNING id`,
		f.TournamentID, f.AwayTeamID, f.HomeTeamID).Scan(&second); err != nil {
		t.Fatal(err)
	}

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 0,
		Goals: []PostGoalRequest{{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 5}}}); err != nil {
		t.Fatalf("first match: %v", err)
	}
	if err := svc.PostResult(ctx, admin, second, PostMatchResultRequest{HomeScore: 0, AwayScore: 3,
		Goals: []PostGoalRequest{
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10},
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 20},
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 30},
		}}); err != nil {
		t.Fatalf("second match of the league: %v", err)
	}

	var played int
	if err := pool.QueryRow(ctx, `SELECT matches_played FROM public.team_stats WHERE team_id = $1 AND tournament_id = $2`,
		f.HomeTeamID, f.TournamentID).Scan(&played); err != nil {
		t.Fatal(err)
	}
	if played != 2 {
		t.Errorf("matches_played = %d, want 2", played)
	}
}
