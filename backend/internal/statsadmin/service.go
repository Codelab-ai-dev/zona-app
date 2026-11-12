package statsadmin

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service implements the manual corrections. Everything runs in one
// transaction per call.
type Service struct {
	pool  *pgxpool.Pool
	authz authz.Checker
}

// NewService builds the service.
func NewService(pool *pgxpool.Pool, checker authz.Checker) *Service {
	return &Service{pool: pool, authz: checker}
}

// ListManualStats returns the manual player stats of a tournament.
func (s *Service) ListManualStats(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID) ([]ManualStats, error) {
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.name, p.jersey_number, t.id, t.name,
		       COALESCE(ps.goals, 0), COALESCE(ps.assists, 0), COALESCE(ps.yellow_cards, 0), COALESCE(ps.red_cards, 0)
		FROM public.player_stats ps
		JOIN public.players p ON p.id = ps.player_id
		JOIN public.teams t ON t.id = p.team_id
		WHERE ps.match_id IS NULL AND ps.tournament_id = $1
		ORDER BY ps.goals DESC, p.name`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("list manual stats: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (ManualStats, error) {
		var m ManualStats
		err := r.Scan(&m.PlayerID, &m.PlayerName, &m.JerseyNumber, &m.TeamID, &m.TeamName, &m.Goals, &m.Assists, &m.YellowCards, &m.RedCards)
		return m, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan manual stats: %w", err)
	}
	return out, nil
}

// SetManualStats replaces a player's manual stats in a tournament. The player
// must belong to a team of the tournament's league.
func (s *Service) SetManualStats(ctx context.Context, caller auth.Principal, tournamentID, playerID uuid.UUID, req SetManualStatsRequest) error {
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return err
	}
	return database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		var ok bool
		err := tx.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM public.players p
				JOIN public.teams t ON t.id = p.team_id
				JOIN public.tournaments tr ON tr.league_id = t.league_id
				WHERE p.id = $1 AND tr.id = $2)`, playerID, tournamentID).Scan(&ok)
		if err != nil {
			return fmt.Errorf("check player: %w", err)
		}
		if !ok {
			return httpx.Validation(map[string]string{"player_id": "el jugador no pertenece a esta liga"})
		}
		if req == (SetManualStatsRequest{}) {
			_, err := tx.Exec(ctx, `DELETE FROM public.player_stats WHERE player_id = $1 AND tournament_id = $2 AND match_id IS NULL`, playerID, tournamentID)
			return err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO public.player_stats (player_id, tournament_id, goals, assists, yellow_cards, red_cards, is_extemporaneous)
			VALUES ($1, $2, $3, $4, $5, $6, true)
			ON CONFLICT (player_id, tournament_id) WHERE match_id IS NULL DO UPDATE SET
				goals = EXCLUDED.goals, assists = EXCLUDED.assists,
				yellow_cards = EXCLUDED.yellow_cards, red_cards = EXCLUDED.red_cards, updated_at = now()`,
			playerID, tournamentID, req.Goals, req.Assists, req.YellowCards, req.RedCards)
		if err != nil {
			return fmt.Errorf("save manual stats: %w", err)
		}
		return nil
	})
}

// SetStandings makes a team's standings show the requested totals by
// storing their difference with the match data as adjustments.
func (s *Service) SetStandings(ctx context.Context, caller auth.Principal, tournamentID, teamID uuid.UUID, req SetStandingsRequest) error {
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return err
	}
	return database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		var leagueID uuid.UUID
		err := tx.QueryRow(ctx, `
			SELECT t.league_id FROM public.teams t
			JOIN public.tournaments tr ON tr.league_id = t.league_id
			WHERE t.id = $1 AND tr.id = $2`, teamID, tournamentID).Scan(&leagueID)
		if database.IsNoRows(err) {
			return httpx.Validation(map[string]string{"team_id": "el equipo no pertenece a esta liga"})
		}
		if err != nil {
			return fmt.Errorf("check team: %w", err)
		}

		// What the finished matches alone say.
		var played, won, drawn, lost, gf, ga int
		err = tx.QueryRow(ctx, `
			WITH r AS (
				SELECT COALESCE(home_score, 0) AS gf, COALESCE(away_score, 0) AS ga FROM public.matches
				WHERE tournament_id = $1 AND status = 'finished' AND home_team_id = $2
				UNION ALL
				SELECT COALESCE(away_score, 0), COALESCE(home_score, 0) FROM public.matches
				WHERE tournament_id = $1 AND status = 'finished' AND away_team_id = $2)
			SELECT count(*), count(*) FILTER (WHERE gf > ga), count(*) FILTER (WHERE gf = ga),
			       count(*) FILTER (WHERE gf < ga), COALESCE(sum(gf), 0), COALESCE(sum(ga), 0) FROM r`,
			tournamentID, teamID).Scan(&played, &won, &drawn, &lost, &gf, &ga)
		if err != nil {
			return fmt.Errorf("match totals: %w", err)
		}
		if req.MatchesWon < won || req.MatchesDrawn < drawn || req.MatchesLost < lost || req.GoalsFor < gf || req.GoalsAgainst < ga {
			return httpx.Validation(map[string]string{"matches_played": fmt.Sprintf(
				"no puede ser menor que lo registrado en partidos (PG %d, PE %d, PP %d, GF %d, GC %d)", won, drawn, lost, gf, ga)})
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO public.team_stats (team_id, tournament_id, league_id)
			VALUES ($1, $2, $3) ON CONFLICT (team_id, tournament_id) DO NOTHING`, teamID, tournamentID, leagueID)
		if err != nil {
			return fmt.Errorf("ensure standings row: %w", err)
		}
		_, err = tx.Exec(ctx, `
			UPDATE public.team_stats SET
				played_adjustment = $3, won_adjustment = $4, drawn_adjustment = $5, lost_adjustment = $6,
				goals_for_adjustment = $7, goals_against_adjustment = $8,
				adjustment_reason = COALESCE(NULLIF($9, ''), adjustment_reason), updated_at = now()
			WHERE team_id = $1 AND tournament_id = $2`,
			teamID, tournamentID, req.MatchesPlayed-played, req.MatchesWon-won, req.MatchesDrawn-drawn,
			req.MatchesLost-lost, req.GoalsFor-gf, req.GoalsAgainst-ga, strings.TrimSpace(req.Reason))
		if err != nil {
			return fmt.Errorf("save adjustment: %w", err)
		}
		if _, err := tx.Exec(ctx, `SELECT public.rebuild_team_stats_for_tournament($1)`, tournamentID); err != nil {
			return fmt.Errorf("rebuild standings: %w", err)
		}
		return nil
	})
}

// ClearSuspensions deletes every suspension of a league.
func (s *Service) ClearSuspensions(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) (int64, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return 0, err
	}
	var deleted int64
	err := database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM public.player_suspensions WHERE league_id = $1`, leagueID)
		if err != nil {
			return fmt.Errorf("clear suspensions: %w", err)
		}
		deleted = tag.RowsAffected()
		return nil
	})
	return deleted, err
}
