//go:build integration

package stats

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Every reader shows the same standings order, manual adjustments
// included, and fully tied teams always come back the same way (#85).
func TestStandingsOrderIsTheSameEverywhere(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	exec(`DELETE FROM public.team_stats WHERE tournament_id = $1`, f.TournamentID)
	team := func(name string, won, lost, gf, ga, adjustment int) uuid.UUID {
		id := uuid.New()
		exec(`INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, $2, $3, $4, $5, $6)`,
			id, name, "t-"+id.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID)
		exec(`INSERT INTO public.team_stats (team_id, tournament_id, league_id, matches_played, matches_won, matches_lost, goals_for, goals_against, points_adjustment)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, id, f.TournamentID, f.LeagueID, won+lost, won, lost, gf, ga, adjustment)
		return id
	}
	// 6 points; 3 + 3 adjustment (same goal difference, fewer goals); and two
	// teams tied on everything.
	team("Halcones", 2, 0, 5, 2, 0)
	team("Búhos", 1, 0, 4, 1, 3)
	team("Zorros", 1, 1, 2, 2, 0)
	team("Águilas", 1, 1, 2, 2, 0)

	statsRows, err := NewPGRepository(pool).GetStandingsByTournament(ctx, f.TournamentID, 100)
	if err != nil {
		t.Fatal(err)
	}
	var want []string
	for i, s := range statsRows {
		if s.Position != i+1 {
			t.Fatalf("positions = %+v", statsRows)
		}
		want = append(want, s.TeamName)
	}
	if want[0] != "Halcones" || want[1] != "Búhos" {
		t.Fatalf("order = %v: the points adjustment must count", want)
	}

	t.Run("playoff seeding (matches)", func(t *testing.T) {
		rows, err := matches.NewPGRepository(pool).GetTournamentStandings(ctx, f.TournamentID)
		if err != nil {
			t.Fatal(err)
		}
		for i, r := range rows {
			if r.TeamID != statsRows[i].TeamID {
				t.Fatalf("matches order differs at %d", i+1)
			}
		}
	})

	t.Run("assistant knowledge base (SQL)", func(t *testing.T) {
		var text string
		if err := pool.QueryRow(ctx, `SELECT public.generate_standings_content($1, $2)`, f.LeagueID, f.TournamentID).Scan(&text); err != nil {
			t.Fatal(err)
		}
		last := -1
		for _, name := range want {
			i := strings.Index(text, name)
			if i <= last {
				t.Fatalf("knowledge base order differs from %v:\n%s", want, text)
			}
			last = i
		}
		if !strings.Contains(text, "Búhos") || !strings.Contains(strings.SplitN(text[strings.Index(text, "Búhos"):], "\n", 2)[0], " 6") {
			t.Fatalf("knowledge base ignores the points adjustment:\n%s", text)
		}
	})

	t.Run("stable across calls", func(t *testing.T) {
		for range 5 {
			again, err := NewPGRepository(pool).GetStandingsByTournament(ctx, f.TournamentID, 100)
			if err != nil {
				t.Fatal(err)
			}
			for i := range again {
				if again[i].TeamID != statsRows[i].TeamID {
					t.Fatal("tied teams changed order between calls")
				}
			}
		}
	})
}
