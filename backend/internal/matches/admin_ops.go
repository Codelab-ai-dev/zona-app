package matches

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// seededTeams turns an explicit seed order into bracket input. Every team
// must be an active team of the tournament's league.
func (s *Service) seededTeams(ctx context.Context, tournamentID uuid.UUID, ids []uuid.UUID) ([]StandingsTeam, error) {
	var valid int
	err := s.pool.QueryRow(ctx, `
		SELECT count(*) FROM public.teams t
		JOIN public.tournaments tr ON tr.league_id = t.league_id
		WHERE tr.id = $1 AND t.id = ANY($2) AND t.is_active`, tournamentID, ids).Scan(&valid)
	if err != nil {
		return nil, fmt.Errorf("check seeded teams: %w", err)
	}
	if valid != len(ids) {
		return nil, httpx.Validation(map[string]string{"team_ids": "todos los equipos deben ser equipos activos de la liga"})
	}
	out := make([]StandingsTeam, len(ids))
	for i, id := range ids {
		out[i] = StandingsTeam{TeamID: id}
	}
	return out, nil
}

// checkTeamChange allows changing the teams of a scheduled match only, and
// only to teams of the same league.
func (s *Service) checkTeamChange(ctx context.Context, matchID uuid.UUID, req UpdateMatchScheduleRequest) error {
	var status string
	var home, away uuid.UUID
	var leagueID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT m.status, m.home_team_id, m.away_team_id, tr.league_id
		FROM public.matches m JOIN public.tournaments tr ON tr.id = m.tournament_id
		WHERE m.id = $1`, matchID).Scan(&status, &home, &away, &leagueID)
	if database.IsNoRows(err) {
		return httpx.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("load match: %w", err)
	}
	if status != string(MatchStatusScheduled) {
		return httpx.Validation(map[string]string{"home_team_id": "solo se pueden cambiar los equipos de un partido programado"})
	}
	if req.HomeTeamID != nil {
		home = *req.HomeTeamID
	}
	if req.AwayTeamID != nil {
		away = *req.AwayTeamID
	}
	if home == away {
		return httpx.Validation(map[string]string{"away_team_id": "debe ser distinto del local"})
	}
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM public.teams WHERE league_id = $1 AND id IN ($2, $3)`,
		leagueID, home, away).Scan(&n); err != nil {
		return fmt.Errorf("check teams: %w", err)
	}
	if n != 2 {
		return httpx.Validation(map[string]string{"home_team_id": "los equipos deben ser de la liga"})
	}
	return nil
}

// DeleteTournamentMatches deletes the matches of a tournament, optionally
// only one round and/or phase ("Eliminar jornada" / "Eliminar calendario"),
// including finished ones, and rebuilds the standings.
func (s *Service) DeleteTournamentMatches(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID, round *int, phase *string) (int64, error) {
	if round != nil && *round <= 0 {
		return 0, httpx.Validation(map[string]string{"round": "debe ser mayor que 0"})
	}
	if phase != nil && *phase != string(PhaseRegular) && *phase != string(PhasePlayoffs) {
		return 0, httpx.Validation(map[string]string{"phase": "debe ser regular o playoffs"})
	}
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return 0, err
	}
	var deleted int64
	err := database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
			DELETE FROM public.matches
			WHERE tournament_id = $1
			  AND ($2::int IS NULL OR round = $2)
			  AND ($3::text IS NULL OR phase = $3)`, tournamentID, round, phase)
		if err != nil {
			return fmt.Errorf("delete matches: %w", err)
		}
		deleted = tag.RowsAffected()
		if _, err := tx.Exec(ctx, `SELECT public.rebuild_team_stats_for_tournament($1)`, tournamentID); err != nil {
			return fmt.Errorf("rebuild standings: %w", err)
		}
		return nil
	})
	return deleted, err
}
