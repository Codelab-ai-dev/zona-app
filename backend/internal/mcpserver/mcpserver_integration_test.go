//go:build integration

package mcpserver

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

func realSession(t *testing.T, pool *pgxpool.Pool) (*mcp.ClientSession, *matches.Service) {
	t.Helper()
	checker := authz.NewPGChecker(pool)
	ms := matches.NewService(matches.NewPGRepository(pool), checker, pool)
	return connect(t, Deps{
		Leagues: leagues.NewService(leagues.NewPGRepository(pool), checker),
		Matches: ms,
		Stats:   stats.NewService(stats.NewPGRepository(pool), checker),
		Teams:   teams.NewService(teams.NewPGRepository(pool), pool, checker),
		Logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
	}), ms
}

// TestPublicDataOverRealServices runs every tool through an MCP client
// against the real services and schema: only public data comes back.
func TestPublicDataOverRealServices(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool) // active league, unpublished scheduled match
	hidden := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	exec(`UPDATE public.leagues SET is_active = false WHERE id = $1`, hidden.LeagueID)
	exec(`UPDATE public.matches SET is_published = true WHERE id = $1`, hidden.MatchID)
	exec(`UPDATE public.players SET birth_date = '2010-05-01' WHERE id = $1`, f.HomePlayerID)

	cs, ms := realSession(t, pool)

	t.Run("search_leagues hides inactive leagues", func(t *testing.T) {
		var got LeagueList
		call(t, cs, "search_leagues", map[string]any{"query": f.LeagueSlug}, &got)
		if got.Total != 1 || got.Leagues[0].ID != f.LeagueID.String() {
			t.Fatalf("active league not found: %+v", got)
		}
		call(t, cs, "search_leagues", map[string]any{"query": hidden.LeagueSlug}, &got)
		if got.Total != 0 {
			t.Fatalf("inactive league found: %+v", got)
		}
	})

	t.Run("get_tournaments", func(t *testing.T) {
		var got TournamentList
		call(t, cs, "get_tournaments", map[string]any{"league_id": f.LeagueID.String()}, &got)
		if got.Total != 1 || got.Tournaments[0].ID != f.TournamentID.String() {
			t.Fatalf("tournaments = %+v", got)
		}
		mustFail(t, call(t, cs, "get_tournaments", map[string]any{"league_id": hidden.LeagueID.String()}, nil), "No encontrado")
	})

	t.Run("get_matches shows only published matches of visible leagues", func(t *testing.T) {
		var got MatchList
		call(t, cs, "get_matches", map[string]any{"tournament_id": f.TournamentID.String()}, &got)
		if len(got.Matches) != 0 {
			t.Fatalf("unpublished match visible: %+v", got)
		}
		// Published, but its league is inactive.
		mustFail(t, call(t, cs, "get_matches", map[string]any{"tournament_id": hidden.TournamentID.String()}, nil), "No encontrado")

		exec(`UPDATE public.matches SET is_published = true WHERE id = $1`, f.MatchID)
		call(t, cs, "get_matches", map[string]any{"tournament_id": f.TournamentID.String()}, &got)
		if len(got.Matches) != 1 || got.Matches[0].HomeScore != nil || got.Matches[0].Home.Name != "Local FC" {
			t.Fatalf("published scheduled match = %+v", got)
		}
	})

	// Record a real result as the league admin: 1-0, goal by the home player.
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin}
	if err := ms.PostResult(ctx, admin, f.MatchID, matches.PostMatchResultRequest{
		HomeScore: 1, AwayScore: 0,
		Goals: []matches.PostGoalRequest{{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10}},
	}); err != nil {
		t.Fatalf("post result: %v", err)
	}

	t.Run("result, standings and top scorers", func(t *testing.T) {
		var got MatchList
		call(t, cs, "get_matches", map[string]any{"tournament_id": f.TournamentID.String(), "status": "finished"}, &got)
		if len(got.Matches) != 1 || *got.Matches[0].HomeScore != 1 || *got.Matches[0].AwayScore != 0 {
			t.Fatalf("finished match = %+v", got)
		}

		var table StandingsList
		call(t, cs, "get_standings", map[string]any{"tournament_id": f.TournamentID.String()}, &table)
		points := map[string]int{}
		for _, r := range table.Standings {
			points[r.TeamID] = r.Points
		}
		if points[f.HomeTeamID.String()] != 3 || points[f.AwayTeamID.String()] != 0 {
			t.Fatalf("standings = %+v", table)
		}
		mustFail(t, call(t, cs, "get_standings", map[string]any{"tournament_id": hidden.TournamentID.String()}, nil), "No encontrado")

		var top ScorerList
		call(t, cs, "get_top_scorers", map[string]any{"tournament_id": f.TournamentID.String()}, &top)
		if len(top.Scorers) != 1 || top.Scorers[0].PlayerID != f.HomePlayerID.String() || top.Scorers[0].Goals != 1 {
			t.Fatalf("top scorers = %+v", top)
		}
	})

	t.Run("get_team exposes no personal data", func(t *testing.T) {
		res, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "get_team", Arguments: map[string]any{"team_id": f.HomeTeamID.String()}})
		if err != nil || res.IsError {
			t.Fatalf("get_team: %v %+v", err, res)
		}
		raw, _ := json.Marshal(res)
		for _, private := range []string{"2010-05-01", "birth", "owner_id", f.TeamOwnerID.String()} {
			if strings.Contains(string(raw), private) {
				t.Errorf("get_team leaks %q: %s", private, raw)
			}
		}
		var team TeamProfile
		call(t, cs, "get_team", map[string]any{"team_id": f.HomeTeamID.String()}, &team)
		if len(team.Roster) != 1 || team.Roster[0].JerseyNumber != 9 || team.League.ID != f.LeagueID.String() {
			t.Fatalf("team = %+v", team)
		}

		mustFail(t, call(t, cs, "get_team", map[string]any{"team_id": hidden.HomeTeamID.String()}, nil), "No encontrado")
		exec(`UPDATE public.teams SET is_active = false WHERE id = $1`, f.AwayTeamID)
		mustFail(t, call(t, cs, "get_team", map[string]any{"team_id": f.AwayTeamID.String()}, nil), "No encontrado")
		mustFail(t, call(t, cs, "get_team", map[string]any{"team_id": uuid.New().String()}, nil), "No encontrado")
	})

	t.Run("paginated matches", func(t *testing.T) {
		for i := 0; i < 3; i++ {
			exec(`INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, round, status, is_published)
			      VALUES ($1, $2, $3, now() + make_interval(days => $4), 2, 'scheduled', true)`,
				f.TournamentID, f.HomeTeamID, f.AwayTeamID, i+1)
		}
		var p1, p2 MatchList
		call(t, cs, "get_matches", map[string]any{"tournament_id": f.TournamentID.String(), "limit": 2}, &p1)
		call(t, cs, "get_matches", map[string]any{"tournament_id": f.TournamentID.String(), "limit": 2, "offset": 2}, &p2)
		if len(p1.Matches) != 2 || !p1.HasMore || len(p2.Matches) != 2 || p2.HasMore {
			t.Fatalf("pages: %d/%v then %d/%v", len(p1.Matches), p1.HasMore, len(p2.Matches), p2.HasMore)
		}
		if p1.Matches[1].ID == p2.Matches[0].ID {
			t.Fatal("pages overlap")
		}
	})
}
