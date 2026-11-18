//go:build integration

package matches

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// snapshot captures the standings and player stats that a result changes.
func snapshot(t *testing.T, pool *pgxpool.Pool, f testdb.Fixture) string {
	t.Helper()
	var s string
	err := pool.QueryRow(context.Background(), `
		SELECT jsonb_build_object(
			'standings', COALESCE((SELECT jsonb_agg(to_jsonb(ts) - 'id' - 'created_at' - 'updated_at' ORDER BY ts.team_id)
			                       FROM public.team_stats ts WHERE ts.tournament_id = $1), '[]'),
			'players', COALESCE((SELECT jsonb_agg(to_jsonb(ps) - 'id' - 'created_at' - 'updated_at' ORDER BY ps.player_id)
			                     FROM public.player_stats ps WHERE ps.match_id = $2), '[]'))::text`,
		f.TournamentID, f.MatchID).Scan(&s)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func statusCode(err error) int {
	var he *httpx.Error
	if errors.As(err, &he) {
		return he.Status
	}
	if err == nil {
		return http.StatusOK
	}
	return http.StatusInternalServerError
}

// Reopening a finished match puts standings and stats back exactly as they
// were before the result, keeps served suspensions and paid fines, and is
// audited (#53).
func TestReopenMatch(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	awayPlayer := uuid.New()
	exec(`INSERT INTO public.players (id, name, team_id, position, jersey_number) VALUES ($1, 'Visitante', $2, 'Defensa', 4)`, awayPlayer, f.AwayTeamID)
	// The home player attended: that "played" row must survive the reopen.
	exec(`INSERT INTO public.asistencias_qr (player_id, match_id) VALUES ($1, $2)`, f.HomePlayerID, f.MatchID)

	// Another finished match of the tournament, as mid-season: the table has rows.
	earlier := uuid.New()
	exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status, is_published)
		VALUES ($1, $2, $3, $4, now() - interval '7 days', 1, 'scheduled', true)`, earlier, f.TournamentID, f.AwayTeamID, f.HomeTeamID)
	if err := svc.PostResult(ctx, admin, earlier, PostMatchResultRequest{HomeScore: 1, AwayScore: 0}); err != nil {
		t.Fatalf("earlier result: %v", err)
	}

	before := snapshot(t, pool, f)

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{
		HomeScore: 2, AwayScore: 0,
		Goals: []PostGoalRequest{
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10},
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 50},
		},
		Cards: []PostCardRequest{
			{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, CardType: "red", Minute: 80},
			{PlayerID: awayPlayer, TeamID: f.AwayTeamID, CardType: "red", Minute: 85},
		},
	}); err != nil {
		t.Fatalf("post result: %v", err)
	}
	if snapshot(t, pool, f) == before {
		t.Fatal("the result changed nothing; the test proves nothing")
	}

	// One red-card suspension is already being served; make sure both exist.
	var suspensions int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.player_suspensions
		WHERE match_card_id IN (SELECT id FROM public.match_cards WHERE match_id = $1)`, f.MatchID).Scan(&suspensions); err != nil {
		t.Fatal(err)
	}
	if suspensions != 2 {
		t.Fatalf("red cards created %d suspensions, want 2", suspensions)
	}
	exec(`UPDATE public.player_suspensions SET matches_served = 1
		WHERE player_id = $1 AND match_card_id IN (SELECT id FROM public.match_cards WHERE match_id = $2)`, awayPlayer, f.MatchID)

	// Automatic fines of this match: one unpaid, one already paid.
	fine := func(status string, paid string) uuid.UUID {
		id := uuid.New()
		exec(`INSERT INTO public.finance_transactions (id, league_id, team_id, match_id, transaction_type, description,
			amount, amount_paid, is_income, status, auto_generated, paid_at)
			VALUES ($1, $2, $3, $4, 'red_card_fine', 'Multa roja', 100, $5::numeric, false, $6::public.finance_transaction_status, true,
			        CASE WHEN $6 = 'paid' THEN now() END)`,
			id, f.LeagueID, f.HomeTeamID, f.MatchID, paid, status)
		return id
	}
	unpaid, paid := fine("pending", "0"), fine("paid", "100")

	t.Run("denied", func(t *testing.T) {
		for name, c := range map[string]struct {
			caller auth.Principal
			match  uuid.UUID
			reason string
			want   int
		}{
			"admin of another league": {auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}, f.MatchID, "Capturado en otro partido", 403},
			"team owner":              {auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}, f.MatchID, "Capturado en otro partido", 403},
			"unknown match":           {admin, uuid.New(), "Capturado en otro partido", 404},
			"not finished":            {admin, other.MatchID, "Capturado en otro partido", 403}, // other league: authz first
			"reason too short":        {admin, f.MatchID, "x", 422},
		} {
			if _, err := svc.ReopenMatch(ctx, c.caller, c.match, ReopenMatchRequest{Reason: c.reason}); statusCode(err) != c.want {
				t.Errorf("%s: %v, want %d", name, err, c.want)
			}
		}
	})

	res, err := svc.ReopenMatch(ctx, admin, f.MatchID, ReopenMatchRequest{Reason: "Resultado capturado en el partido equivocado"})
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	want := ReopenMatchResult{GoalsRemoved: 2, CardsRemoved: 2, SuspensionsRemoved: 1, SuspensionsKept: 1, FinesCancelled: 1, FinesKept: 1}
	if res != want {
		t.Fatalf("result = %+v, want %+v", res, want)
	}

	t.Run("standings and stats are back to before the result", func(t *testing.T) {
		if got := snapshot(t, pool, f); got != before {
			t.Fatalf("after reopen:\n%s\nbefore result:\n%s", got, before)
		}
		var status string
		var home, away int
		if err := pool.QueryRow(ctx, `SELECT status, home_score, away_score FROM public.matches WHERE id = $1`, f.MatchID).Scan(&status, &home, &away); err != nil {
			t.Fatal(err)
		}
		if status != "scheduled" || home != 0 || away != 0 {
			t.Fatalf("match = %s %d-%d", status, home, away)
		}
	})

	t.Run("served suspension kept, unserved removed", func(t *testing.T) {
		rows, err := pool.Query(ctx, `SELECT player_id, matches_served FROM public.player_suspensions WHERE player_id IN ($1, $2)`, f.HomePlayerID, awayPlayer)
		if err != nil {
			t.Fatal(err)
		}
		kept := map[uuid.UUID]int{}
		for rows.Next() {
			var id uuid.UUID
			var served int
			if err := rows.Scan(&id, &served); err != nil {
				t.Fatal(err)
			}
			kept[id] = served
		}
		if len(kept) != 1 || kept[awayPlayer] != 1 {
			t.Fatalf("suspensions left = %v, want only the served one of the away player", kept)
		}
	})

	t.Run("unpaid fine cancelled, paid fine kept", func(t *testing.T) {
		var s1, s2 string
		var reason *string
		if err := pool.QueryRow(ctx, `SELECT status, cancellation_reason FROM public.finance_transactions WHERE id = $1`, unpaid).Scan(&s1, &reason); err != nil {
			t.Fatal(err)
		}
		if err := pool.QueryRow(ctx, `SELECT status FROM public.finance_transactions WHERE id = $1`, paid).Scan(&s2); err != nil {
			t.Fatal(err)
		}
		if s1 != "cancelled" || reason == nil || *reason != "Partido reabierto: Resultado capturado en el partido equivocado" || s2 != "paid" {
			t.Fatalf("unpaid=%s (%v) paid=%s", s1, reason, s2)
		}
	})

	t.Run("audited", func(t *testing.T) {
		var action, reason string
		var actor uuid.UUID
		var details []byte
		if err := pool.QueryRow(ctx, `SELECT action, reason, actor_id, details FROM public.match_audit_log WHERE match_id = $1`, f.MatchID).
			Scan(&action, &reason, &actor, &details); err != nil {
			t.Fatal(err)
		}
		var d struct {
			Previous struct {
				HomeScore int `json:"home_score"`
				AwayScore int `json:"away_score"`
				Events    struct {
					Goals []json.RawMessage `json:"goals"`
					Cards []json.RawMessage `json:"cards"`
				} `json:"events"`
			} `json:"previous"`
		}
		if err := json.Unmarshal(details, &d); err != nil {
			t.Fatal(err)
		}
		if action != "reopen_match" || actor != f.LeagueAdminID || reason == "" ||
			d.Previous.HomeScore != 2 || len(d.Previous.Events.Goals) != 2 || len(d.Previous.Events.Cards) != 2 {
			t.Fatalf("audit = %s %s %s %s", action, reason, actor, details)
		}
	})

	t.Run("a scheduled match cannot be reopened", func(t *testing.T) {
		if _, err := svc.ReopenMatch(ctx, admin, f.MatchID, ReopenMatchRequest{Reason: "Otra vez por error"}); statusCode(err) != 409 {
			t.Fatalf("%v, want 409", err)
		}
	})

	t.Run("the result can be captured again", func(t *testing.T) {
		if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 1}); err != nil {
			t.Fatal(err)
		}
	})
}

// When the reopened match was the tournament's only finished one, the table
// keeps a zero row per team instead of no rows: same numbers, as the
// standings rebuild leaves them.
func TestReopenOnlyFinishedMatchLeavesZeroStandings(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 3, AwayScore: 1}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ReopenMatch(ctx, admin, f.MatchID, ReopenMatchRequest{Reason: "Único partido, capturado por error"}); err != nil {
		t.Fatal(err)
	}
	var rows, nonZero int
	if err := pool.QueryRow(ctx, `
		SELECT count(*), count(*) FILTER (WHERE points <> 0 OR matches_played <> 0 OR goals_for <> 0 OR goals_against <> 0)
		FROM public.team_stats WHERE tournament_id = $1`, f.TournamentID).Scan(&rows, &nonZero); err != nil {
		t.Fatal(err)
	}
	if nonZero != 0 {
		t.Fatalf("%d of %d standings rows still count the reopened match", nonZero, rows)
	}
}
