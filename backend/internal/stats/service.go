package stats

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules. Authorization decisions live here, not in
// handlers, so they are unit-testable without HTTP.
type Service struct {
	repo      Repository
	azChecker authz.Checker
}

// NewService builds the stats service.
func NewService(repo Repository, azChecker authz.Checker) *Service {
	return &Service{repo: repo, azChecker: azChecker}
}

// GetStandingsByTournament returns league standings for a tournament (public read).
func (s *Service) GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]Standings, error) {
	if err := s.ensureVisible(ctx, ScopeTournament, tournamentID); err != nil {
		return nil, err
	}
	return s.repo.GetStandingsByTournament(ctx, tournamentID, 100)
}

// GetTeamStats returns team statistics (public read).
func (s *Service) GetTeamStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) (TeamStats, error) {
	if err := s.ensureVisible(ctx, ScopeTeam, teamID); err != nil {
		return TeamStats{}, err
	}
	return s.repo.GetTeamStats(ctx, teamID, tournamentID)
}

// UpdateTeamPointsAdjustment adjusts points for a team (league admin only).
func (s *Service) UpdateTeamPointsAdjustment(ctx context.Context, caller auth.Principal, req *PointsAdjustmentRequest) error {
	// Check authorization: caller must be able to manage the tournament
	tournament, err := getTournamentFromTeam(ctx, s.repo, req.TeamID, req.TournamentID)
	if err != nil {
		return err
	}

	if err := s.azChecker.CanManageTournament(ctx, caller, tournament); err != nil {
		return err
	}

	return s.repo.UpdateTeamPointsAdjustment(ctx, req.TeamID, req.TournamentID, req.PointsAdjustment, req.AdjustmentReason)
}

// GetPlayerStats returns a player's aggregated statistics (public read).
func (s *Service) GetPlayerStats(ctx context.Context, playerID uuid.UUID) (PlayerStats, error) {
	if err := s.ensureVisible(ctx, ScopePlayer, playerID); err != nil {
		return PlayerStats{}, err
	}
	return s.repo.GetPlayerStats(ctx, playerID)
}

// GetTopScorersByTournament returns top scorers for a tournament (public read).
func (s *Service) GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID) ([]TopScorersRow, error) {
	if err := s.ensureVisible(ctx, ScopeTournament, tournamentID); err != nil {
		return nil, err
	}
	return s.repo.GetTopScorersByTournament(ctx, tournamentID, 20)
}

// GetDisciplineByTournament returns discipline ranking for a tournament (public read).
func (s *Service) GetDisciplineByTournament(ctx context.Context, tournamentID uuid.UUID) ([]DisciplineRow, error) {
	if err := s.ensureVisible(ctx, ScopeTournament, tournamentID); err != nil {
		return nil, err
	}
	return s.repo.GetDisciplineByTournament(ctx, tournamentID, 20)
}

// GetPlayerStatsByTeam returns all player stats for a team (public read).
func (s *Service) GetPlayerStatsByTeam(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]PlayerStats, error) {
	if err := s.ensureVisible(ctx, ScopeTeam, teamID); err != nil {
		return nil, err
	}
	return s.repo.GetPlayerStatsByTeam(ctx, teamID, tournamentID)
}

// GetSuspensionsByLeague returns all suspensions for a league (league admin only).
func (s *Service) GetSuspensionsByLeague(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) ([]Suspension, error) {
	// Check authorization: caller must be able to manage the league
	if err := s.azChecker.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}

	return s.repo.GetSuspensionsByLeague(ctx, leagueID)
}

// GetSuspensionsByTeam returns all suspensions for a team (team owner reads own, league admin reads all).
func (s *Service) GetSuspensionsByTeam(ctx context.Context, caller auth.Principal, teamID uuid.UUID) ([]Suspension, error) {
	// Check authorization: caller must be team owner or league admin
	if err := s.azChecker.CanManageTeam(ctx, caller, teamID); err != nil {
		return nil, err
	}

	return s.repo.GetSuspensionsByTeam(ctx, teamID)
}

// CreateSuspension creates a new suspension (league admin only).
func (s *Service) CreateSuspension(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *CreateSuspensionRequest) (Suspension, error) {
	// Check authorization: caller must be able to manage the league
	if err := s.azChecker.CanManageLeague(ctx, caller, leagueID); err != nil {
		return Suspension{}, err
	}

	// Verify player exists, belongs to the correct team, and is in the correct league (IDOR prevention)
	ptl, err := s.repo.GetPlayerTeamLeague(ctx, req.PlayerID)
	if err != nil {
		return Suspension{}, err
	}

	// Verify team_id matches player's team
	if ptl.TeamID != req.TeamID {
		return Suspension{}, httpx.ErrBadRequest.Wrap(fmt.Errorf("player does not belong to team"))
	}

	// Verify player's league matches the requested league (IDOR prevention)
	if ptl.LeagueID != leagueID {
		return Suspension{}, httpx.ErrForbidden.Wrap(fmt.Errorf("player not in this league"))
	}

	return s.repo.CreateSuspension(ctx, leagueID, req)
}

// UpdateSuspension updates a suspension (league admin only).
func (s *Service) UpdateSuspension(ctx context.Context, caller auth.Principal, suspensionID uuid.UUID, req *UpdateSuspensionRequest) (Suspension, error) {
	// Get suspension to check authorization
	suspension, err := s.repo.GetSuspensionByID(ctx, suspensionID)
	if err != nil {
		return Suspension{}, err
	}

	// Check authorization: caller must be able to manage the league
	if err := s.azChecker.CanManageLeague(ctx, caller, suspension.LeagueID); err != nil {
		return Suspension{}, err
	}

	return s.repo.UpdateSuspension(ctx, suspensionID, req)
}

// CancelSuspension cancels a suspension (league admin only).
func (s *Service) CancelSuspension(ctx context.Context, caller auth.Principal, suspensionID uuid.UUID) (Suspension, error) {
	// Get suspension to check authorization
	sus, err := s.repo.GetSuspensionByID(ctx, suspensionID)
	if err != nil {
		return Suspension{}, err
	}

	// Check authorization: caller must be able to manage the league
	if err := s.azChecker.CanManageLeague(ctx, caller, sus.LeagueID); err != nil {
		return Suspension{}, err
	}

	return s.repo.CancelSuspension(ctx, suspensionID)
}

// CompleteSuspension marks a suspension as completed (league admin only).
func (s *Service) CompleteSuspension(ctx context.Context, caller auth.Principal, suspensionID uuid.UUID) (Suspension, error) {
	// Get suspension to check authorization
	sus, err := s.repo.GetSuspensionByID(ctx, suspensionID)
	if err != nil {
		return Suspension{}, err
	}

	// Check authorization: caller must be able to manage the league
	if err := s.azChecker.CanManageLeague(ctx, caller, sus.LeagueID); err != nil {
		return Suspension{}, err
	}

	return s.repo.CompleteSuspension(ctx, suspensionID)
}

// ApplySuspensionToMatch applies a suspension to a match (league admin only).
func (s *Service) ApplySuspensionToMatch(ctx context.Context, caller auth.Principal, suspensionID uuid.UUID, matchID uuid.UUID) error {
	// Check authorization: caller must be able to manage the match
	if err := s.azChecker.CanManageMatch(ctx, caller, matchID); err != nil {
		return err
	}

	// Load suspension and verify it's active
	suspension, err := s.repo.GetSuspensionByID(ctx, suspensionID)
	if err != nil {
		return err
	}

	if suspension.Status != "active" {
		return httpx.ErrBadRequest.Wrap(fmt.Errorf("suspension must be active"))
	}

	// Load match and verify suspended player's team plays in it
	match, err := s.repo.GetMatchWithTeams(ctx, matchID)
	if err != nil {
		return err
	}

	if suspension.TeamID != match.HomeTeamID && suspension.TeamID != match.AwayTeamID {
		return httpx.ErrBadRequest.Wrap(fmt.Errorf("suspended player's team does not play in this match"))
	}

	return s.repo.ApplySuspensionToMatch(ctx, suspensionID, matchID)
}

// Helper function to get tournament ID from team.
// Verifies that team_stats row exists for this tournament (team belongs to tournament).
func getTournamentFromTeam(ctx context.Context, repo Repository, teamID uuid.UUID, tournamentID uuid.UUID) (uuid.UUID, error) {
	// GetTeamStats returns NotFound if team_stats row doesn't exist for this tournament.
	// This ensures the team actually belongs to the tournament.
	stats, err := repo.GetTeamStats(ctx, teamID, &tournamentID)
	if err != nil {
		return uuid.Nil, err
	}
	return stats.TournamentID, nil
}

// ensureVisible hides public stats of inactive leagues, teams or players,
// mirroring the legacy RLS. Hidden resources answer 404.
func (s *Service) ensureVisible(ctx context.Context, scope Scope, id uuid.UUID) error {
	ok, err := s.repo.IsPubliclyVisible(ctx, scope, id)
	if err != nil {
		return err
	}
	if !ok {
		return httpx.ErrNotFound
	}
	return nil
}
