package matches

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Knockout ties (#83), FIFA rules: a single match level after full time,
// or two legs level on aggregate, are decided on penalties (no away goals).
// A decided tie advances its winner; when both ties that feed a match are
// decided, that match is created from its playoff_slots plan with the real
// teams (semifinal losers go to the third-place match).

var errNextRoundPlayed = &httpx.Error{
	Status:  http.StatusConflict,
	Code:    httpx.ErrConflict.Code,
	Message: "La siguiente ronda de la liguilla ya se jugó: corrige primero ese partido.",
}

// tieMatch is the part of a knockout match the rules need.
type tieMatch struct {
	ID         uuid.UUID
	Home, Away uuid.UUID
	HomeScore  int
	AwayScore  int
	HomePens   *int
	AwayPens   *int
	Leg        *string
	Finished   bool
}

func loadTie(ctx context.Context, tx pgx.Tx, tournamentID uuid.UUID, round string, position int) ([]tieMatch, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, home_team_id, away_team_id, home_score, away_score, home_penalties, away_penalties, leg, status = 'finished'
		FROM public.matches
		WHERE tournament_id = $1 AND phase = 'playoffs' AND playoff_round = $2 AND playoff_position = $3
		ORDER BY leg NULLS FIRST`, tournamentID, round, position)
	if err != nil {
		return nil, fmt.Errorf("load tie: %w", err)
	}
	defer rows.Close()
	var out []tieMatch
	for rows.Next() {
		var m tieMatch
		if err := rows.Scan(&m.ID, &m.Home, &m.Away, &m.HomeScore, &m.AwayScore, &m.HomePens, &m.AwayPens, &m.Leg, &m.Finished); err != nil {
			return nil, fmt.Errorf("scan tie: %w", err)
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func legOf(ms []tieMatch, leg string) *tieMatch {
	for i := range ms {
		if ms[i].Leg != nil && *ms[i].Leg == leg {
			return &ms[i]
		}
	}
	return nil
}

// tieResult returns the winner and loser of a tie once it is decided.
func tieResult(ms []tieMatch) (winner, loser uuid.UUID, decided bool) {
	if len(ms) == 1 && ms[0].Leg == nil {
		m := ms[0]
		if !m.Finished {
			return uuid.Nil, uuid.Nil, false
		}
		switch {
		case m.HomeScore > m.AwayScore, m.HomeScore == m.AwayScore && m.HomePens != nil && *m.HomePens > *m.AwayPens:
			return m.Home, m.Away, true
		case m.AwayScore > m.HomeScore, m.HomeScore == m.AwayScore && m.HomePens != nil:
			return m.Away, m.Home, true
		}
		return uuid.Nil, uuid.Nil, false
	}
	first, second := legOf(ms, "first"), legOf(ms, "second")
	if first == nil || second == nil || !first.Finished || !second.Finished {
		return uuid.Nil, uuid.Nil, false
	}
	a, b := first.Home, first.Away // b hosts the second leg
	aGoals := first.HomeScore + second.AwayScore
	bGoals := first.AwayScore + second.HomeScore
	switch {
	case aGoals > bGoals, aGoals == bGoals && second.AwayPens != nil && *second.AwayPens > *second.HomePens:
		return a, b, true
	case bGoals > aGoals, aGoals == bGoals && second.HomePens != nil:
		return b, a, true
	}
	return uuid.Nil, uuid.Nil, false
}

// checkPenalties enforces when a result needs (or may not have) penalties.
func checkPenalties(ctx context.Context, tx pgx.Tx, m Match, req PostMatchResultRequest) error {
	given := req.HomePenalties != nil
	notAllowed := httpx.Validation(map[string]string{"home_penalties": "solo hay penales para desempatar una eliminatoria"})
	required := httpx.Validation(map[string]string{"home_penalties": "la eliminatoria quedó empatada: captura los penales"})

	if m.Phase != PhasePlayoffs || m.PlayoffRound == nil || m.PlayoffPosition == nil {
		if given {
			return notAllowed
		}
		return nil
	}
	if m.Leg == nil { // single match
		if req.HomeScore == req.AwayScore && !given {
			return required
		}
		if req.HomeScore != req.AwayScore && given {
			return notAllowed
		}
		return nil
	}
	if *m.Leg == LegFirst {
		if given {
			return httpx.Validation(map[string]string{"home_penalties": "los penales van en el partido de vuelta"})
		}
		return nil
	}
	ms, err := loadTie(ctx, tx, m.TournamentID, string(*m.PlayoffRound), *m.PlayoffPosition)
	if err != nil {
		return err
	}
	first := legOf(ms, "first")
	if first == nil || !first.Finished {
		return httpx.Validation(map[string]string{"home_score": "captura primero el partido de ida"})
	}
	// The second leg's home team was the first leg's away team.
	level := first.HomeScore+req.AwayScore == first.AwayScore+req.HomeScore
	if level && !given {
		return required
	}
	if !level && given {
		return notAllowed
	}
	return nil
}

// target is a later knockout match fed by two ties.
type target struct {
	round         string
	position      int
	homeFeed      int // position of the tie in the previous round feeding the home side
	awayFeed      int
	losers        bool // third place: the feeding ties' losers
	previousRound string
}

// targetsOf lists the matches a decided tie of round/position feeds.
func targetsOf(round string, position int) []target {
	pair := func(p int) (int, int) {
		if p%2 == 1 {
			return p, p + 1
		}
		return p - 1, p
	}
	switch round {
	case string(PlayoffRoundQuarterfinals):
		h, a := pair(position)
		return []target{{round: string(PlayoffRoundSemifinals), position: (position + 1) / 2, homeFeed: h, awayFeed: a, previousRound: round}}
	case string(PlayoffRoundSemifinals):
		return []target{
			{round: string(PlayoffRoundFinal), position: 1, homeFeed: 1, awayFeed: 2, previousRound: round},
			{round: string(PlayoffRoundThirdPlace), position: 1, homeFeed: 1, awayFeed: 2, losers: true, previousRound: round},
		}
	}
	return nil
}

// advance creates or updates the matches fed by the tie of m once both of
// their feeding ties are decided. Called after m's result is saved.
func advance(ctx context.Context, tx pgx.Tx, m Match) error {
	if m.Phase != PhasePlayoffs || m.PlayoffRound == nil || m.PlayoffPosition == nil {
		return nil
	}
	for _, tg := range targetsOf(string(*m.PlayoffRound), *m.PlayoffPosition) {
		home, okH, err := feed(ctx, tx, m.TournamentID, tg.previousRound, tg.homeFeed, tg.losers)
		if err != nil {
			return err
		}
		away, okA, err := feed(ctx, tx, m.TournamentID, tg.previousRound, tg.awayFeed, tg.losers)
		if err != nil {
			return err
		}
		if !okH || !okA {
			continue
		}
		if err := place(ctx, tx, m.TournamentID, tg, home, away); err != nil {
			return err
		}
	}
	return nil
}

func feed(ctx context.Context, tx pgx.Tx, tournamentID uuid.UUID, round string, position int, losers bool) (uuid.UUID, bool, error) {
	ms, err := loadTie(ctx, tx, tournamentID, round, position)
	if err != nil || len(ms) == 0 {
		return uuid.Nil, false, err
	}
	winner, loser, decided := tieResult(ms)
	if losers {
		return loser, decided, nil
	}
	return winner, decided, nil
}

// place creates the target match(es) from their slots, or updates the teams
// of matches not played yet. A played target whose teams change is a 409.
func place(ctx context.Context, tx pgx.Tx, tournamentID uuid.UUID, tg target, home, away uuid.UUID) error {
	existing, err := loadTie(ctx, tx, tournamentID, tg.round, tg.position)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		for _, e := range existing {
			wantHome, wantAway := home, away
			if e.Leg != nil && *e.Leg == "second" {
				wantHome, wantAway = away, home
			}
			if e.Home == wantHome && e.Away == wantAway {
				continue
			}
			if e.Finished {
				return errNextRoundPlayed
			}
			if _, err := tx.Exec(ctx, `UPDATE public.matches SET home_team_id = $2, away_team_id = $3, updated_at = now() WHERE id = $1`,
				e.ID, wantHome, wantAway); err != nil {
				return fmt.Errorf("update next round: %w", err)
			}
		}
		return nil
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, match_time, field_number,
		                            status, phase, playoff_round, playoff_position, leg)
		SELECT s.tournament_id,
		       CASE WHEN s.leg = 'second' THEN $5::uuid ELSE $4::uuid END,
		       CASE WHEN s.leg = 'second' THEN $4::uuid ELSE $5::uuid END,
		       s.match_date, s.match_time, s.field_number, 'scheduled', 'playoffs', s.playoff_round, s.playoff_position,
		       NULLIF(s.leg, 'single')
		FROM public.playoff_slots s
		WHERE s.tournament_id = $1 AND s.playoff_round = $2 AND s.playoff_position = $3`,
		tournamentID, tg.round, tg.position, home, away)
	if err != nil {
		return fmt.Errorf("create next round: %w", err)
	}
	return nil
}

// undoAdvance removes the not yet played matches a reopened tie had created;
// a played one blocks the reopen.
func undoAdvance(ctx context.Context, tx pgx.Tx, tournamentID uuid.UUID, round string, position int) error {
	for _, tg := range targetsOf(round, position) {
		existing, err := loadTie(ctx, tx, tournamentID, tg.round, tg.position)
		if err != nil {
			return err
		}
		for _, e := range existing {
			if e.Finished {
				return errNextRoundPlayed
			}
		}
		if _, err := tx.Exec(ctx, `
			DELETE FROM public.matches
			WHERE tournament_id = $1 AND phase = 'playoffs' AND playoff_round = $2 AND playoff_position = $3 AND status <> 'finished'`,
			tournamentID, tg.round, tg.position); err != nil {
			return fmt.Errorf("undo next round: %w", err)
		}
	}
	return nil
}
