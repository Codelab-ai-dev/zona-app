//go:build integration

package matches

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

type bracket struct {
	t     *testing.T
	pool  *pgxpool.Pool
	svc   *Service
	admin auth.Principal
	f     testdb.Fixture
	seeds []uuid.UUID
}

func newBracket(t *testing.T, teams int, homeAndAway, thirdPlace bool) *bracket {
	t.Helper()
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	b := &bracket{t: t, pool: pool, f: f, svc: NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool),
		admin: auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true},
		seeds: []uuid.UUID{f.HomeTeamID, f.AwayTeamID}}
	for len(b.seeds) < teams {
		id := uuid.New()
		if _, err := pool.Exec(ctx, `INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, $2, $3, $4, $5, $6)`,
			id, "Equipo "+id.String()[:4], "eq-"+id.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID); err != nil {
			t.Fatal(err)
		}
		b.seeds = append(b.seeds, id)
	}
	if _, err := b.svc.GeneratePlayoffs(ctx, b.admin, GeneratePlayoffsRequest{TournamentID: f.TournamentID, NumTeams: teams,
		StartDate: httpx.NewDate(time.Now()), StartTime: "18:00", FieldNumber: 1, TeamIDs: b.seeds,
		HomeAndAway: homeAndAway, ThirdPlaceMatch: thirdPlace}); err != nil {
		t.Fatalf("generate: %v", err)
	}
	return b
}

// match finds the playoff match of round/position/leg ("" = single).
func (b *bracket) match(round string, position int, leg string) (Match, bool) {
	b.t.Helper()
	var id uuid.UUID
	err := b.pool.QueryRow(context.Background(), `
		SELECT id FROM public.matches WHERE tournament_id = $1 AND phase = 'playoffs'
		  AND playoff_round = $2 AND playoff_position = $3 AND COALESCE(leg, '') = $4`,
		b.f.TournamentID, round, position, leg).Scan(&id)
	if err != nil {
		return Match{}, false
	}
	m, err := b.svc.repo.GetMatchByID(context.Background(), id)
	if err != nil {
		b.t.Fatal(err)
	}
	return m, true
}

func (b *bracket) mustMatch(round string, position int, leg string) Match {
	b.t.Helper()
	m, ok := b.match(round, position, leg)
	if !ok {
		b.t.Fatalf("no %s %d %q match", round, position, leg)
	}
	return m
}

func (b *bracket) play(m Match, home, away int, pens ...int) error {
	req := PostMatchResultRequest{HomeScore: home, AwayScore: away}
	if len(pens) == 2 {
		req.HomePenalties, req.AwayPenalties = &pens[0], &pens[1]
	}
	return b.svc.PostResult(context.Background(), b.admin, m.ID, req)
}

func (b *bracket) mustPlay(m Match, home, away int, pens ...int) {
	b.t.Helper()
	if err := b.play(m, home, away, pens...); err != nil {
		b.t.Fatalf("play %s %d: %v", *m.PlayoffRound, *m.PlayoffPosition, err)
	}
}

func code(err error) int {
	if err == nil {
		return http.StatusOK
	}
	return apiStatus(err)
}

// Single matches: only the first round exists, winners (also on penalties)
// fill the next round, semifinal losers the third-place match (#83).
func TestPlayoffAdvancementSingleMatches(t *testing.T) {
	b := newBracket(t, 8, false, true)
	if _, ok := b.match("semifinals", 1, ""); ok {
		t.Fatal("semifinals created before their teams are known")
	}

	// Quarterfinals: 1v8, 4v5, 2v7, 3v6 (positions 1..4).
	b.mustPlay(b.mustMatch("quarterfinals", 1, ""), 2, 0) // seed 1
	if _, ok := b.match("semifinals", 1, ""); ok {
		t.Fatal("semifinal created with one tie decided")
	}
	qf2 := b.mustMatch("quarterfinals", 2, "")
	if code(b.play(qf2, 1, 1)) != 422 {
		t.Fatal("a level knockout match without penalties was accepted")
	}
	b.mustPlay(qf2, 1, 1, 3, 4) // seed 5 wins on penalties
	sf1 := b.mustMatch("semifinals", 1, "")
	if sf1.HomeTeamID != b.seeds[0] || sf1.AwayTeamID != b.seeds[4] {
		t.Fatalf("semifinal 1 = %s vs %s, want seeds 1 and 5", sf1.HomeTeamID, sf1.AwayTeamID)
	}
	if sf1.HomePenalties != nil {
		t.Fatal("penalties leaked to the next round")
	}

	b.mustPlay(b.mustMatch("quarterfinals", 3, ""), 0, 1) // seed 7
	b.mustPlay(b.mustMatch("quarterfinals", 4, ""), 3, 2) // seed 3
	sf2 := b.mustMatch("semifinals", 2, "")
	if sf2.HomeTeamID != b.seeds[6] || sf2.AwayTeamID != b.seeds[2] {
		t.Fatalf("semifinal 2 = %s vs %s, want seeds 7 and 3", sf2.HomeTeamID, sf2.AwayTeamID)
	}

	t.Run("correcting a quarterfinal moves the next round's team", func(t *testing.T) {
		b.mustPlay(b.mustMatch("quarterfinals", 4, ""), 0, 2) // now seed 6
		if got := b.mustMatch("semifinals", 2, ""); got.AwayTeamID != b.seeds[5] {
			t.Fatalf("semifinal 2 away = %s, want seed 6", got.AwayTeamID)
		}
	})

	b.mustPlay(sf1, 1, 0)                                    // seed 1 to the final, seed 5 to third place
	b.mustPlay(b.mustMatch("semifinals", 2, ""), 2, 2, 5, 3) // seed 7 on penalties, seed 6 to third place
	final := b.mustMatch("final", 1, "")
	third := b.mustMatch("third_place", 1, "")
	if final.HomeTeamID != b.seeds[0] || final.AwayTeamID != b.seeds[6] {
		t.Fatalf("final = %s vs %s, want seeds 1 and 7", final.HomeTeamID, final.AwayTeamID)
	}
	if third.HomeTeamID != b.seeds[4] || third.AwayTeamID != b.seeds[5] {
		t.Fatalf("third place = %s vs %s, want seeds 5 and 6", third.HomeTeamID, third.AwayTeamID)
	}

	t.Run("a played next round blocks corrections that change it", func(t *testing.T) {
		b.mustPlay(final, 1, 0)
		if code(b.play(b.mustMatch("semifinals", 1, ""), 0, 1)) != 409 {
			t.Fatal("changing a semifinal winner after the final was played was accepted")
		}
		if _, err := b.svc.ReopenMatch(context.Background(), b.admin, b.mustMatch("semifinals", 1, "").ID, ReopenMatchRequest{Reason: "Error de captura"}); code(err) != 409 {
			t.Fatalf("reopening a semifinal after the final: %v, want 409", err)
		}
		// Correcting without changing the winner is fine.
		b.mustPlay(b.mustMatch("semifinals", 1, ""), 3, 0)
	})

	t.Run("penalties only to break a level tie", func(t *testing.T) {
		if code(b.play(third, 2, 1, 4, 3)) != 422 {
			t.Fatal("penalties accepted on a decided match")
		}
	})
}

// Two legs: aggregate decides, penalties after a level second leg; the
// first leg never takes penalties (#83).
func TestPlayoffAdvancementTwoLegs(t *testing.T) {
	b := newBracket(t, 4, true, false)
	// Semifinal 1: seed 1 v seed 4; semifinal 2: seed 2 v seed 3.
	first := b.mustMatch("semifinals", 1, "first")
	second := b.mustMatch("semifinals", 1, "second")
	if code(b.play(second, 1, 0)) != 422 {
		t.Fatal("second leg accepted before the first")
	}
	if code(b.play(first, 1, 1, 4, 3)) != 422 {
		t.Fatal("penalties accepted in a first leg")
	}
	b.mustPlay(first, 2, 1) // seed 1 leads 2-1
	if code(b.play(second, 1, 0)) != 422 {
		t.Fatal("level aggregate (2-2) without penalties accepted")
	}
	b.mustPlay(second, 1, 0, 2, 4) // seed 4 hosts; seed 1 wins the shoot-out 4-2

	b.mustPlay(b.mustMatch("semifinals", 2, "first"), 0, 2)  // seed 3 away wins 2-0
	b.mustPlay(b.mustMatch("semifinals", 2, "second"), 1, 0) // seed 3 hosts, loses 1-0: aggregate 2-1 seed 3

	final := b.mustMatch("final", 1, "")
	if final.HomeTeamID != b.seeds[0] || final.AwayTeamID != b.seeds[2] {
		t.Fatalf("final = %s vs %s, want seeds 1 and 3", final.HomeTeamID, final.AwayTeamID)
	}
	if _, ok := b.match("third_place", 1, ""); ok {
		t.Fatal("third place created without being planned")
	}

	t.Run("reopening a decided tie removes the unplayed next round", func(t *testing.T) {
		if _, err := b.svc.ReopenMatch(context.Background(), b.admin, second.ID, ReopenMatchRequest{Reason: "Penales mal capturados"}); err != nil {
			t.Fatal(err)
		}
		if _, ok := b.match("final", 1, ""); ok {
			t.Fatal("final survived reopening its semifinal")
		}
		b.mustPlay(second, 3, 0) // seed 4 wins 4-2 on aggregate
		if got := b.mustMatch("final", 1, ""); got.HomeTeamID != b.seeds[3] {
			t.Fatalf("final home = %s, want seed 4", got.HomeTeamID)
		}
	})
}

// Regular-season matches never take penalties.
func TestNoPenaltiesOutsideKnockouts(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	h, a := 5, 4
	err := svc.PostResult(context.Background(), admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 1, HomePenalties: &h, AwayPenalties: &a})
	if code(err) != 422 {
		t.Fatalf("regular match with penalties: %v, want 422", err)
	}
}
