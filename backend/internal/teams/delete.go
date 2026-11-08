package teams

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// DeleteTeam permanently deletes a team: its players, staff, registration
// requests and every match it played (with goals, cards and stats) cascade.
// Only the league admin or a super admin may do it (not the team owner).
// The standings of the affected tournaments are rebuilt in the same
// transaction so rivals lose the points of the deleted matches.
func (s *Service) DeleteTeam(ctx context.Context, caller auth.Principal, teamID uuid.UUID) error {
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if err := s.authz.CanManageLeague(ctx, caller, team.LeagueID); err != nil {
		return err
	}
	if s.pool == nil {
		return errors.New("teams: transaction pool not configured")
	}
	return database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		return deleteTeamTx(ctx, tx, teamID)
	})
}

func deleteTeamTx(ctx context.Context, tx pgx.Tx, teamID uuid.UUID) error {
	rows, err := tx.Query(ctx, `
		SELECT DISTINCT tournament_id FROM public.matches WHERE home_team_id = $1 OR away_team_id = $1
		UNION
		SELECT tournament_id FROM public.teams WHERE id = $1 AND tournament_id IS NOT NULL`, teamID)
	if err != nil {
		return fmt.Errorf("affected tournaments: %w", err)
	}
	tournaments, err := pgx.CollectRows(rows, pgx.RowTo[uuid.UUID])
	if err != nil {
		return fmt.Errorf("affected tournaments: %w", err)
	}

	tag, err := tx.Exec(ctx, `DELETE FROM public.teams WHERE id = $1`, teamID)
	if err != nil {
		return fmt.Errorf("delete team: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return httpx.ErrNotFound
	}
	for _, id := range tournaments {
		if _, err := tx.Exec(ctx, `SELECT public.rebuild_team_stats_for_tournament($1)`, id); err != nil {
			return fmt.Errorf("rebuild standings: %w", err)
		}
	}
	return nil
}

// checkTournamentChange lets only the league admin move a team, and only to
// a tournament of the team's league (uuid.Nil = no tournament).
func (s *Service) checkTournamentChange(ctx context.Context, caller auth.Principal, teamID, tournamentID uuid.UUID) error {
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if err := s.authz.CanManageLeague(ctx, caller, team.LeagueID); err != nil {
		return err
	}
	if tournamentID == uuid.Nil {
		return nil
	}
	if s.pool == nil {
		return errors.New("teams: pool not configured")
	}
	var ok bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM public.tournaments WHERE id = $1 AND league_id = $2)`,
		tournamentID, team.LeagueID).Scan(&ok); err != nil {
		return fmt.Errorf("check tournament: %w", err)
	}
	if !ok {
		return httpx.Validation(map[string]string{"tournament_id": "el torneo no pertenece a la liga del equipo"})
	}
	return nil
}
