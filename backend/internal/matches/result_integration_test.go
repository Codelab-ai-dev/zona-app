//go:build integration

package matches

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

// TestPostResultFeedsPlayerStats: scorers and discipline come from the
// result's events (own goals excluded), and a corrected result replaces them.
func TestPostResultFeedsPlayerStats(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	assistant := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO public.players (id, name, team_id, position, jersey_number) VALUES ($1, 'Asistente', $2, 'Medio', 8)`,
		assistant, f.HomeTeamID); err != nil {
		t.Fatal(err)
	}
	own := "own_goal"
	req := PostMatchResultRequest{
		HomeScore: 3, AwayScore: 0,
		Goals: []PostGoalRequest{
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10, AssistPlayerID: &assistant},
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 20},
			{PlayerID: assistant, TeamID: f.HomeTeamID, Minute: 30, GoalType: &own},
		},
		Cards: []PostCardRequest{{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, CardType: "yellow", Minute: 40}},
	}
	if err := svc.PostResult(ctx, admin, f.MatchID, req); err != nil {
		t.Fatalf("PostResult: %v", err)
	}
	stats := func(player uuid.UUID) (g, a, y int) {
		t.Helper()
		err := pool.QueryRow(ctx, `SELECT COALESCE(sum(goals),0), COALESCE(sum(assists),0), COALESCE(sum(yellow_cards),0)
			FROM public.player_stats WHERE match_id = $1 AND player_id = $2`, f.MatchID, player).Scan(&g, &a, &y)
		if err != nil {
			t.Fatal(err)
		}
		return
	}
	if g, a, y := stats(f.HomePlayerID); g != 2 || a != 0 || y != 1 {
		t.Fatalf("scorer = %d goals %d assists %d yellow", g, a, y)
	}
	if g, a, _ := stats(assistant); g != 0 || a != 1 {
		t.Fatalf("assistant = %d goals %d assists (own goal must not count)", g, a)
	}
	var events int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.match_goals WHERE match_id = $1`, f.MatchID).Scan(&events)
	if events != 3 {
		t.Fatalf("goal events = %d, want 3 (no legacy duplicates)", events)
	}

	// Corrected result without the assistant: their row disappears.
	req.HomeScore, req.Goals, req.Cards = 1, req.Goals[1:2], nil
	if err := svc.PostResult(ctx, admin, f.MatchID, req); err != nil {
		t.Fatalf("second PostResult: %v", err)
	}
	if g, _, y := stats(f.HomePlayerID); g != 1 || y != 0 {
		t.Fatalf("after correction = %d goals %d yellow", g, y)
	}
	var rows int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.player_stats WHERE match_id = $1 AND player_id = $2`, f.MatchID, assistant).Scan(&rows)
	if rows != 0 {
		t.Fatalf("assistant rows = %d, want 0", rows)
	}
}

func TestUpdateStatus(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	stranger := auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	if err := svc.UpdateStatus(ctx, admin, f.MatchID, UpdateStatusRequest{Status: "in_progress"}); err != nil {
		t.Fatalf("start: %v", err)
	}
	if err := svc.UpdateStatus(ctx, stranger, f.MatchID, UpdateStatusRequest{Status: "cancelled"}); err == nil {
		t.Fatal("stranger changed the status")
	}
	if err := svc.UpdateStatus(ctx, admin, f.MatchID, UpdateStatusRequest{Status: "finished"}); err == nil {
		t.Fatal("finished accepted without a result")
	}
	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 0, AwayScore: 0}); err != nil {
		t.Fatal(err)
	}
	var e *httpx.Error
	if err := svc.UpdateStatus(ctx, admin, f.MatchID, UpdateStatusRequest{Status: "cancelled"}); !errors.As(err, &e) || e.Status != 409 {
		t.Fatalf("finished match: got %v, want 409", err)
	}
	if err := svc.UpdateStatus(ctx, admin, uuid.New(), UpdateStatusRequest{Status: "cancelled"}); err == nil {
		t.Fatal("unknown match accepted")
	}
}
