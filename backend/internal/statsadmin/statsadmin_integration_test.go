//go:build integration

package statsadmin

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

type env struct {
	t     *testing.T
	ctx   context.Context
	f     testdb.Fixture
	svc   *Service
	admin auth.Principal
}

func setup(t *testing.T) env {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	return env{t: t, ctx: context.Background(), f: f, svc: NewService(pool, authz.NewPGChecker(pool)),
		admin: auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}}
}

func (e env) exec(q string, args ...any) {
	e.t.Helper()
	if _, err := e.svc.pool.Exec(e.ctx, q, args...); err != nil {
		e.t.Fatalf("%s: %v", q, err)
	}
}

func (e env) int(q string, args ...any) int {
	e.t.Helper()
	var n int
	if err := e.svc.pool.QueryRow(e.ctx, q, args...).Scan(&n); err != nil {
		e.t.Fatalf("%s: %v", q, err)
	}
	return n
}

func status(err error) int {
	var apiErr *httpx.Error
	if errors.As(err, &apiErr) {
		return apiErr.Status
	}
	if err == nil {
		return 200
	}
	return 500
}

// Manual goals count in their tournament only, next to match goals.
func TestManualStatsAreTournamentScoped(t *testing.T) {
	e := setup(t)
	other := uuid.New()
	e.exec(`INSERT INTO public.tournaments (id, name, league_id, start_date, end_date) VALUES ($1, 'Otro', $2, current_date, current_date + 30)`, other, e.f.LeagueID)
	e.exec(`INSERT INTO public.player_stats (player_id, match_id, goals) VALUES ($1, $2, 2)`, e.f.HomePlayerID, e.f.MatchID)

	if err := e.svc.SetManualStats(e.ctx, e.admin, e.f.TournamentID, e.f.HomePlayerID, SetManualStatsRequest{Goals: 3, Assists: 1}); err != nil {
		t.Fatal(err)
	}
	if g := e.int(`SELECT goals FROM public.get_top_scorers_by_tournament($1, 10) WHERE player_id = $2`, e.f.TournamentID, e.f.HomePlayerID); g != 5 {
		t.Errorf("tournament goals = %d, want 2 match + 3 manual", g)
	}
	if n := e.int(`SELECT count(*) FROM public.get_top_scorers_by_tournament($1, 10)`, other); n != 0 {
		t.Errorf("other tournament shows %d scorers, want 0", n)
	}
	list, err := e.svc.ListManualStats(e.ctx, e.admin, e.f.TournamentID)
	if err != nil || len(list) != 1 || list[0].Goals != 3 {
		t.Fatalf("list = %+v, %v", list, err)
	}

	// Zeros remove the manual row.
	if err := e.svc.SetManualStats(e.ctx, e.admin, e.f.TournamentID, e.f.HomePlayerID, SetManualStatsRequest{}); err != nil {
		t.Fatal(err)
	}
	if n := e.int(`SELECT count(*) FROM public.player_stats WHERE match_id IS NULL AND player_id = $1`, e.f.HomePlayerID); n != 0 {
		t.Errorf("manual row not removed")
	}
	// A player from another league is rejected.
	if err := e.svc.SetManualStats(e.ctx, e.admin, e.f.TournamentID, uuid.New(), SetManualStatsRequest{Goals: 1}); status(err) != http.StatusUnprocessableEntity {
		t.Errorf("unknown player: got %v, want 422", err)
	}
}

// A standings edit is stored as deltas: it survives rebuilds and new
// results add on top.
func TestStandingsEditSurvivesRebuild(t *testing.T) {
	e := setup(t)
	e.exec(`UPDATE public.matches SET status = 'finished', home_score = 2, away_score = 0 WHERE id = $1`, e.f.MatchID)

	// Home has 1 played, 1 won (2-0). Add 2 earlier matches: 1 draw (1-1), 1 loss (0-3).
	err := e.svc.SetStandings(e.ctx, e.admin, e.f.TournamentID, e.f.HomeTeamID, SetStandingsRequest{
		MatchesPlayed: 3, MatchesWon: 1, MatchesDrawn: 1, MatchesLost: 1, GoalsFor: 3, GoalsAgainst: 4, Reason: "partidos previos"})
	if err != nil {
		t.Fatal(err)
	}
	check := func(when string, played, points, gf int) {
		t.Helper()
		var p, pts, g int
		if err := e.svc.pool.QueryRow(e.ctx, `SELECT matches_played, points, goals_for FROM public.team_stats WHERE team_id = $1 AND tournament_id = $2`,
			e.f.HomeTeamID, e.f.TournamentID).Scan(&p, &pts, &g); err != nil {
			t.Fatal(err)
		}
		if p != played || pts != points || g != gf {
			t.Errorf("%s: played=%d points=%d gf=%d, want %d/%d/%d", when, p, pts, g, played, points, gf)
		}
	}
	check("after edit", 3, 4, 3)
	e.exec(`SELECT public.rebuild_team_stats_for_tournament($1)`, e.f.TournamentID)
	check("after rebuild", 3, 4, 3)

	// A new finished match adds on top (trigger), and a rebuild agrees.
	var next uuid.UUID
	if err := e.svc.pool.QueryRow(e.ctx, `INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, round, status)
		VALUES ($1, $2, $3, now(), 2, 'scheduled') RETURNING id`, e.f.TournamentID, e.f.HomeTeamID, e.f.AwayTeamID).Scan(&next); err != nil {
		t.Fatal(err)
	}
	e.exec(`UPDATE public.matches SET status = 'finished', home_score = 1, away_score = 0 WHERE id = $1`, next)
	check("after new result", 4, 7, 4)
	e.exec(`SELECT public.rebuild_team_stats_for_tournament($1)`, e.f.TournamentID)
	check("after second rebuild", 4, 7, 4)

	// Totals below what the matches say are rejected.
	err = e.svc.SetStandings(e.ctx, e.admin, e.f.TournamentID, e.f.HomeTeamID, SetStandingsRequest{})
	if status(err) != http.StatusUnprocessableEntity {
		t.Errorf("edit below match data: got %v, want 422", err)
	}
}

func TestClearSuspensions(t *testing.T) {
	e := setup(t)
	e.exec(`INSERT INTO public.player_suspensions (player_id, team_id, league_id, suspension_type, reason, matches_to_serve)
		VALUES ($1, $2, $3, 'red_card', 'Roja', 1)`, e.f.HomePlayerID, e.f.HomeTeamID, e.f.LeagueID)
	owner := auth.Principal{UserID: e.f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	if _, err := e.svc.ClearSuspensions(e.ctx, owner, e.f.LeagueID); status(err) != http.StatusForbidden {
		t.Fatalf("team owner: got %v, want 403", err)
	}
	n, err := e.svc.ClearSuspensions(e.ctx, e.admin, e.f.LeagueID)
	if err != nil || n != 1 {
		t.Fatalf("deleted %d, %v", n, err)
	}
}
