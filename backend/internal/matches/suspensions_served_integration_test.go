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

// Suspensions count the later matches of the player's team as served and
// complete themselves; undoing a match gives it back (#81).
func TestSuspensionsAreServedByLaterMatches(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	match := func(tournament uuid.UUID, daysAgo int) uuid.UUID {
		id := uuid.New()
		exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status)
			VALUES ($1, $2, $3, $4, now() - make_interval(days => $5), 1, 'scheduled')`, id, tournament, f.HomeTeamID, f.AwayTeamID, daysAgo)
		return id
	}
	result := func(id uuid.UUID, cards ...PostCardRequest) {
		t.Helper()
		if err := svc.PostResult(ctx, admin, id, PostMatchResultRequest{HomeScore: 1, AwayScore: 0, Cards: cards}); err != nil {
			t.Fatalf("post result: %v", err)
		}
	}
	type state struct {
		served int
		status string
	}
	get := func(id uuid.UUID) state {
		t.Helper()
		var s state
		if err := pool.QueryRow(ctx, `SELECT matches_served, status FROM public.player_suspensions WHERE id = $1`, id).Scan(&s.served, &s.status); err != nil {
			t.Fatal(err)
		}
		return s
	}
	expect := func(what string, id uuid.UUID, want state) {
		t.Helper()
		if got := get(id); got != want {
			t.Fatalf("%s: suspension = %+v, want %+v", what, got, want)
		}
	}

	exec(`UPDATE public.matches SET match_date = now() - interval '10 days' WHERE id = $1`, f.MatchID)
	origin := f.MatchID

	// Red card in the origin match: a 1-match suspension.
	result(origin, PostCardRequest{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, CardType: "red", Minute: 70})
	var red uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT id FROM public.player_suspensions WHERE match_id = $1`, origin).Scan(&red); err != nil {
		t.Fatalf("red card suspension: %v", err)
	}
	expect("the origin match does not count", red, state{0, "active"})

	// A manual 2-match suspension of an away player, scoped to the tournament.
	awayPlayer, twoMatch := uuid.New(), uuid.New()
	exec(`INSERT INTO public.players (id, name, team_id, position, jersey_number) VALUES ($1, 'Visitante', $2, 'Defensa', 4)`, awayPlayer, f.AwayTeamID)
	exec(`INSERT INTO public.player_suspensions (id, player_id, team_id, league_id, tournament_id, suspension_type, reason, matches_to_serve, start_date)
		VALUES ($1, $2, $3, $4, $5, 'disciplinary_committee', 'Comité', 2, now() - interval '9 days')`,
		twoMatch, awayPlayer, f.AwayTeamID, f.LeagueID, f.TournamentID)

	t.Run("earlier matches and other tournaments do not count", func(t *testing.T) {
		result(match(f.TournamentID, 20)) // played before the red card
		other := uuid.New()
		exec(`INSERT INTO public.tournaments (id, name, league_id, start_date, end_date) VALUES ($1, 'Copa', $2, current_date, current_date + 30)`, other, f.LeagueID)
		result(match(other, 8)) // later, but another tournament
		expect("red", red, state{0, "active"})
		expect("2-match", twoMatch, state{0, "active"})
	})

	y := match(f.TournamentID, 7)
	t.Run("the next match serves them", func(t *testing.T) {
		result(y)
		expect("red after one match", red, state{1, "completed"})
		expect("2-match after one match", twoMatch, state{1, "active"})
	})

	t.Run("correcting a result does not count twice", func(t *testing.T) {
		result(y)
		expect("2-match after re-posting", twoMatch, state{1, "active"})
	})

	z := match(f.TournamentID, 3)
	t.Run("reopening gives the match back", func(t *testing.T) {
		result(z)
		expect("2-match after two matches", twoMatch, state{2, "completed"})
		if _, err := svc.ReopenMatch(ctx, admin, z, ReopenMatchRequest{Reason: "Resultado equivocado"}); err != nil {
			t.Fatal(err)
		}
		expect("2-match after reopening", twoMatch, state{1, "active"})
		expect("red is untouched", red, state{1, "completed"})
	})

	t.Run("deleting a match gives it back", func(t *testing.T) {
		result(z)
		expect("2-match served again", twoMatch, state{2, "completed"})
		exec(`DELETE FROM public.matches WHERE id = $1`, z)
		expect("2-match after deleting the match", twoMatch, state{1, "active"})
	})

	t.Run("an admin's manual completion stays", func(t *testing.T) {
		exec(`UPDATE public.player_suspensions SET status = 'completed', end_date = now() WHERE id = $1`, twoMatch) // like CompleteSuspension
		if _, err := svc.ReopenMatch(ctx, admin, y, ReopenMatchRequest{Reason: "Resultado equivocado"}); err != nil {
			t.Fatal(err)
		}
		expect("manually completed", twoMatch, state{0, "completed"})
		expect("red comes back", red, state{0, "active"})
	})
}
