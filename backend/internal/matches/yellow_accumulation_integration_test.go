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

// With the rule on, every N yellows suspend; yellows of a match with a red
// for the same player do not count; off by default (#82).
func TestYellowAccumulation(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	off := testdb.Seed(t, pool) // a tournament with the rule off
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	exec(`UPDATE public.tournaments SET yellow_accumulation_limit = 2, yellow_accumulation_matches = 1 WHERE id = $1`, f.TournamentID)

	day := 30
	match := func(fx testdb.Fixture) uuid.UUID {
		id := uuid.New()
		day--
		exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status)
			VALUES ($1, $2, $3, $4, now() - make_interval(days => $5), 1, 'scheduled')`, id, fx.TournamentID, fx.HomeTeamID, fx.AwayTeamID, day)
		return id
	}
	play := func(fx testdb.Fixture, id uuid.UUID, cards ...string) {
		t.Helper()
		req := PostMatchResultRequest{HomeScore: 0, AwayScore: 0}
		for i, c := range cards {
			req.Cards = append(req.Cards, PostCardRequest{PlayerID: fx.HomePlayerID, TeamID: fx.HomeTeamID, CardType: c, Minute: 10 + i})
		}
		admin := auth.Principal{UserID: fx.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
		if err := svc.PostResult(ctx, admin, id, req); err != nil {
			t.Fatalf("post result: %v", err)
		}
	}
	accumulations := func(fx testdb.Fixture) []string {
		t.Helper()
		rows, err := pool.Query(ctx, `SELECT reason || ' ' || status FROM public.player_suspensions
			WHERE player_id = $1 AND suspension_type = 'yellow_accumulation' ORDER BY created_at`, fx.HomePlayerID)
		if err != nil {
			t.Fatal(err)
		}
		defer rows.Close()
		var out []string
		for rows.Next() {
			var s string
			if err := rows.Scan(&s); err != nil {
				t.Fatal(err)
			}
			out = append(out, s)
		}
		return out
	}
	expect := func(what string, fx testdb.Fixture, want ...string) {
		t.Helper()
		got := accumulations(fx)
		if len(got) != len(want) {
			t.Fatalf("%s: %v, want %v", what, got, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("%s: %v, want %v", what, got, want)
			}
		}
	}

	m1 := match(f)
	play(f, m1, "yellow")
	expect("1 yellow", f)

	m2 := match(f)
	play(f, m2, "yellow")
	expect("2 yellows", f, "Acumulación de 2 tarjetas amarillas active")

	play(f, m2, "yellow") // correcting the same result
	expect("result corrected", f, "Acumulación de 2 tarjetas amarillas active")

	m3 := match(f)
	play(f, m3, "yellow", "red")                                                            // sent off: these yellows do not count
	expect("yellow + red in one match", f, "Acumulación de 2 tarjetas amarillas completed") // served by m3

	m4 := match(f)
	play(f, m4, "yellow")
	expect("3 counted yellows", f, "Acumulación de 2 tarjetas amarillas completed")

	m5 := match(f)
	play(f, m5, "yellow")
	expect("4 counted yellows", f, "Acumulación de 2 tarjetas amarillas completed", "Acumulación de 4 tarjetas amarillas active")

	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	if _, err := svc.ReopenMatch(ctx, admin, m5, ReopenMatchRequest{Reason: "Tarjeta mal capturada"}); err != nil {
		t.Fatal(err)
	}
	expect("after reopening the 4th", f, "Acumulación de 2 tarjetas amarillas completed")

	t.Run("off by default", func(t *testing.T) {
		for i := 0; i < 3; i++ {
			play(off, match(off), "yellow")
		}
		expect("rule off", off)
	})
}
