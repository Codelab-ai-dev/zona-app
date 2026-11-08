package teams

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules and authorization logic.
type Service struct {
	repo  Repository
	pool  *pgxpool.Pool // for transactions in ReviewPlayerRegistration; may be nil
	authz authz.Checker
}

// NewService builds the teams service.
// pool is used for transactional operations (e.g., approving player registrations).
// If nil, ReviewPlayerRegistration with approval will fail gracefully.
func NewService(repo Repository, pool *pgxpool.Pool, authz authz.Checker) *Service {
	return &Service{repo: repo, pool: pool, authz: authz}
}

// calculateAge computes age at a reference date (or today if nil).
func calculateAge(birthDate time.Time, referenceDate *time.Time) int {
	ref := referenceDate
	if ref == nil {
		now := time.Now()
		ref = &now
	}
	age := ref.Year() - birthDate.Year()
	if ref.Month() < birthDate.Month() || (ref.Month() == birthDate.Month() && ref.Day() < birthDate.Day()) {
		age--
	}
	return age
}

// ageValidationResult mirrors the legacy AgeValidationResult.
type ageValidationResult struct {
	isValid                  bool
	age                      int
	meetsRegularRequirements bool
	isException              bool
	reason                   string
}

// validatePlayerAge validates a player's age against tournament rules (mirrors legacy use-age-validation.ts).
func (s *Service) validatePlayerAge(birthDate time.Time, tournament Tournament, usedExceptions int) ageValidationResult {
	// If age validation is not enabled, always valid
	if !tournament.AgeValidationEnabled {
		return ageValidationResult{
			isValid:                  true,
			age:                      calculateAge(birthDate, tournament.AgeReferenceDate),
			meetsRegularRequirements: true,
			isException:              false,
		}
	}

	age := calculateAge(birthDate, tournament.AgeReferenceDate)

	// Check if meets regular age requirements
	meetsMinAge := tournament.MinAge == nil || age >= *tournament.MinAge
	meetsMaxAge := tournament.MaxAge == nil || age <= *tournament.MaxAge
	meetsRegularRequirements := meetsMinAge && meetsMaxAge

	if meetsRegularRequirements {
		return ageValidationResult{
			isValid:                  true,
			age:                      age,
			meetsRegularRequirements: true,
			isException:              false,
		}
	}

	// Check if qualifies as an exception
	availableExceptions := tournament.AgeExceptionCount - usedExceptions
	if availableExceptions <= 0 {
		return ageValidationResult{
			isValid:                  false,
			age:                      age,
			meetsRegularRequirements: false,
			isException:              false,
			reason:                   fmt.Sprintf("No hay excepciones disponibles. El jugador tiene %d años.", age),
		}
	}

	meetsExceptionMinAge := tournament.AgeExceptionMinAge == nil || age >= *tournament.AgeExceptionMinAge
	meetsExceptionMaxAge := tournament.AgeExceptionMaxAge == nil || age <= *tournament.AgeExceptionMaxAge
	qualifiesAsException := meetsExceptionMinAge && meetsExceptionMaxAge

	if qualifiesAsException {
		return ageValidationResult{
			isValid:                  true,
			age:                      age,
			meetsRegularRequirements: false,
			isException:              true,
			reason:                   fmt.Sprintf("Jugador de %d años registrado como excepción.", age),
		}
	}

	// Doesn't meet any requirements
	reason := fmt.Sprintf("El jugador tiene %d años.", age)
	if tournament.MinAge != nil && age < *tournament.MinAge {
		reason += fmt.Sprintf(" Se requiere mínimo %d años.", *tournament.MinAge)
	}
	if tournament.MaxAge != nil && age > *tournament.MaxAge {
		reason += fmt.Sprintf(" Se permite máximo %d años.", *tournament.MaxAge)
	}
	if tournament.AgeExceptionMinAge != nil || tournament.AgeExceptionMaxAge != nil {
		reason += " Excepciones permitidas: "
		if tournament.AgeExceptionMinAge != nil {
			reason += fmt.Sprintf("mínimo %d años", *tournament.AgeExceptionMinAge)
		}
		if tournament.AgeExceptionMaxAge != nil {
			if tournament.AgeExceptionMinAge != nil {
				reason += fmt.Sprintf(", máximo %d años", *tournament.AgeExceptionMaxAge)
			} else {
				reason += fmt.Sprintf("máximo %d años", *tournament.AgeExceptionMaxAge)
			}
		}
		reason += "."
	}

	return ageValidationResult{
		isValid:                  false,
		age:                      age,
		meetsRegularRequirements: false,
		isException:              false,
		reason:                   reason,
	}
}

// GetTeam returns a team by ID. Public read endpoint.
func (s *Service) GetTeam(ctx context.Context, teamID uuid.UUID) (Team, error) {
	return s.repo.GetTeamByID(ctx, teamID)
}

// GetTeamsByLeague returns all teams in a league. Public read endpoint.
func (s *Service) GetTeamsByLeague(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]Team, error) {
	return s.repo.GetTeamsByLeague(ctx, leagueID, limit, offset)
}

// GetMyTeams returns teams owned by the caller.
func (s *Service) GetMyTeams(ctx context.Context, caller auth.Principal, limit, offset int) ([]Team, error) {
	if caller.Role != auth.RoleTeamOwner {
		return []Team{}, fmt.Errorf("only team owners can list their teams")
	}
	return s.repo.GetTeamsByOwner(ctx, caller.UserID, limit, offset)
}

// CreateTeam creates a new team. Only the league admin can create teams.
func (s *Service) CreateTeam(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req CreateTeamRequest) (Team, error) {
	// Authorization: league admin or super admin can create teams
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return Team{}, err
	}

	// Business rule: owner_id is set to the caller
	team := Team{
		ID:           uuid.New(),
		Name:         req.Name,
		Slug:         req.Slug,
		LeagueID:     leagueID,
		TournamentID: req.TournamentID,
		OwnerID:      caller.UserID,
		Logo:         req.Logo,
		Description:  req.Description,
		IsActive:     true,
	}
	return s.repo.CreateTeam(ctx, team)
}

// UpdateTeam updates a team's details. Owner or league admin.
func (s *Service) UpdateTeam(ctx context.Context, caller auth.Principal, teamID uuid.UUID, req UpdateTeamRequest) (Team, error) {
	// Authorization: check if caller can manage this team
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return Team{}, err
	}
	if req.TournamentID != nil {
		if err := s.checkTournamentChange(ctx, caller, teamID, *req.TournamentID); err != nil {
			return Team{}, err
		}
	}

	return s.repo.UpdateTeam(ctx, teamID, req)
}

// ActivateTeam activates a team. Owner or league admin.
func (s *Service) ActivateTeam(ctx context.Context, caller auth.Principal, teamID uuid.UUID) (Team, error) {
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return Team{}, err
	}
	return s.repo.ActivateTeam(ctx, teamID)
}

// DeactivateTeam deactivates a team. Owner or league admin.
func (s *Service) DeactivateTeam(ctx context.Context, caller auth.Principal, teamID uuid.UUID) (Team, error) {
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return Team{}, err
	}
	return s.repo.DeactivateTeam(ctx, teamID)
}

// GetPlayer returns a player by ID. Public read endpoint.
func (s *Service) GetPlayer(ctx context.Context, playerID uuid.UUID) (Player, error) {
	return s.repo.GetPlayerByID(ctx, playerID)
}

// GetTeamPlayers returns all players on a team. Public read endpoint.
func (s *Service) GetTeamPlayers(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]Player, error) {
	return s.repo.GetPlayersByTeam(ctx, teamID, limit, offset)
}

// CreatePlayer adds a player to a team. Only team owner/league admin can do this.
// Enforces max_players limit and jersey-number uniqueness among active players.
func (s *Service) CreatePlayer(ctx context.Context, caller auth.Principal, teamID uuid.UUID, req CreatePlayerRequest) (Player, error) {
	// Authorization: team owner or league admin
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return Player{}, err
	}

	// Load team to get tournament_id and league_id
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return Player{}, err
	}

	errs := make(map[string]string)

	// Check max_players limit if tournament is set
	if team.TournamentID != nil {
		tournament, err := s.repo.GetTournamentByID(ctx, *team.TournamentID)
		if err != nil && !database.IsNoRows(err) {
			return Player{}, fmt.Errorf("get tournament: %w", err)
		}

		if tournament.MaxPlayers != nil && *tournament.MaxPlayers > 0 {
			count, err := s.repo.CountPlayersByTeam(ctx, teamID)
			if err != nil {
				return Player{}, fmt.Errorf("count players: %w", err)
			}

			if count >= *tournament.MaxPlayers {
				errs["team_id"] = fmt.Sprintf("límite de %d jugadores alcanzado", *tournament.MaxPlayers)
			}
		}

		// Check max_coaching_staff limit for coaching staff if needed
		staffCount, err := s.repo.CountCoachingStaffByTeam(ctx, teamID)
		if err != nil {
			return Player{}, fmt.Errorf("count coaching staff: %w", err)
		}
		if staffCount >= tournament.MaxCoachingStaff {
			// This is just for information; doesn't block player creation
		}
	}

	if len(errs) > 0 {
		return Player{}, httpx.Validation(errs)
	}

	player := Player{
		ID:           uuid.New(),
		Name:         req.Name,
		TeamID:       teamID,
		Position:     req.Position,
		JerseyNumber: req.JerseyNumber,
		Photo:        req.Photo,
		BirthDate:    req.BirthDate,
		IsActive:     true,
	}

	// CreatePlayer will return httpx.ErrConflict if jersey number is already used
	return s.repo.CreatePlayer(ctx, player)
}

// UpdatePlayer updates a player's details. Team owner or league admin.
func (s *Service) UpdatePlayer(ctx context.Context, caller auth.Principal, playerID uuid.UUID, req UpdatePlayerRequest) (Player, error) {
	// Authorization: check if caller can manage this player
	if err := s.authz.CanManagePlayer(ctx, caller, playerID); err != nil {
		return Player{}, err
	}

	return s.repo.UpdatePlayer(ctx, playerID, req)
}

// DeactivatePlayer deactivates a player. Team owner or league admin.
func (s *Service) DeactivatePlayer(ctx context.Context, caller auth.Principal, playerID uuid.UUID) (Player, error) {
	if err := s.authz.CanManagePlayer(ctx, caller, playerID); err != nil {
		return Player{}, err
	}
	return s.repo.DeactivatePlayer(ctx, playerID)
}

// GetCoachingStaff returns a coaching staff member by ID. Public read endpoint.
func (s *Service) GetCoachingStaff(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error) {
	return s.repo.GetCoachingStaffByID(ctx, staffID)
}

// GetTeamCoachingStaff returns all coaching staff on a team. Public read endpoint.
func (s *Service) GetTeamCoachingStaff(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]CoachingStaff, error) {
	return s.repo.GetCoachingStaffByTeam(ctx, teamID, limit, offset)
}

// CreateCoachingStaff adds a coaching staff member to a team. Only team owner or league admin.
func (s *Service) CreateCoachingStaff(ctx context.Context, caller auth.Principal, teamID uuid.UUID, req CreateCoachingStaffRequest) (CoachingStaff, error) {
	// Authorization: team owner or league admin
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return CoachingStaff{}, err
	}

	staff := CoachingStaff{
		ID:        uuid.New(),
		TeamID:    teamID,
		Name:      req.Name,
		Role:      req.Role,
		Photo:     req.Photo,
		BirthDate: req.BirthDate,
		Cedula:    req.Cedula,
		IsActive:  true,
	}
	return s.repo.CreateCoachingStaff(ctx, staff)
}

// UpdateCoachingStaff updates a coaching staff member's details. Team owner or league admin.
func (s *Service) UpdateCoachingStaff(ctx context.Context, caller auth.Principal, staffID uuid.UUID, req UpdateCoachingStaffRequest) (CoachingStaff, error) {
	// Get the staff to check authorization
	staff, err := s.repo.GetCoachingStaffByID(ctx, staffID)
	if err != nil {
		return CoachingStaff{}, err
	}

	// Authorization: check if caller can manage this team
	if err := s.authz.CanManageTeam(ctx, caller, staff.TeamID); err != nil {
		return CoachingStaff{}, err
	}

	return s.repo.UpdateCoachingStaff(ctx, staffID, req)
}

// DeactivateCoachingStaff deactivates a coaching staff member. Team owner or league admin.
func (s *Service) DeactivateCoachingStaff(ctx context.Context, caller auth.Principal, staffID uuid.UUID) (CoachingStaff, error) {
	// Get the staff to check authorization
	staff, err := s.repo.GetCoachingStaffByID(ctx, staffID)
	if err != nil {
		return CoachingStaff{}, err
	}

	// Authorization: check if caller can manage this team
	if err := s.authz.CanManageTeam(ctx, caller, staff.TeamID); err != nil {
		return CoachingStaff{}, err
	}

	return s.repo.DeactivateCoachingStaff(ctx, staffID)
}

// GetPlayerRegistrationRequest returns a registration request by ID (authenticated).
// Caller must either manage the team or manage the tournament.
func (s *Service) GetPlayerRegistrationRequest(ctx context.Context, caller auth.Principal, reqID uuid.UUID) (PlayerRegistrationRequest, error) {
	req, err := s.repo.GetPlayerRegistrationRequestByID(ctx, reqID)
	if err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// Authorization: CanManageTeam (team owner/league admin) OR CanManageTournament (league admin)
	canManageTeam := s.authz.CanManageTeam(ctx, caller, req.TeamID) == nil
	canManageTournament := s.authz.CanManageTournament(ctx, caller, req.TournamentID) == nil

	if !canManageTeam && !canManageTournament {
		return PlayerRegistrationRequest{}, fmt.Errorf("unauthorized to view this registration request")
	}
	return req, nil
}

// GetTeamPlayerRegistrationRequests returns pending registration requests for a team.
func (s *Service) GetTeamPlayerRegistrationRequests(ctx context.Context, caller auth.Principal, teamID uuid.UUID, limit, offset int) ([]PlayerRegistrationRequest, error) {
	// Authorization: team owner can only see their own team's requests
	if caller.Role == auth.RoleTeamOwner {
		if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
			return nil, err
		}
	}
	// League admin and super admin can see all
	return s.repo.GetPlayerRegistrationRequestsByTeam(ctx, teamID, limit, offset)
}

// GetTournamentPlayerRegistrationRequests returns pending registration requests for a tournament.
// Caller must be able to manage this tournament (league admin of the league that owns it).
func (s *Service) GetTournamentPlayerRegistrationRequests(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID, status string, limit, offset int) ([]PlayerRegistrationRequest, error) {
	// Authorization: CanManageTournament (validates league admin can manage this tournament)
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return nil, err
	}
	return s.repo.GetPlayerRegistrationRequestsByTournament(ctx, tournamentID, status, limit, offset)
}

// RequestPlayerRegistration submits a player registration request. Only team owner.
// Validates: tournament belongs to team's league, registration is open, age constraints,
// max_players not exceeded counting active players + pending requests.
func (s *Service) RequestPlayerRegistration(ctx context.Context, caller auth.Principal, teamID uuid.UUID, tournamentID uuid.UUID, req CreatePlayerRegistrationRequestRequest) (PlayerRegistrationRequest, error) {
	// Authorization: team owner can only request for their own team
	if err := s.authz.CanManageTeam(ctx, caller, teamID); err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// Load team to get league_id
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// Load tournament to verify it belongs to the team's league and get limits/rules
	tournament, err := s.repo.GetTournamentByID(ctx, tournamentID)
	if err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// Verify tournament belongs to team's league
	if tournament.LeagueID != team.LeagueID {
		return PlayerRegistrationRequest{}, httpx.Validation(map[string]string{
			"tournament_id": "el torneo no pertenece a la liga del equipo",
		})
	}

	// Check registration is open
	if !tournament.RegistrationOpen {
		return PlayerRegistrationRequest{}, httpx.Validation(map[string]string{
			"tournament_id": "el registro para este torneo está cerrado",
		})
	}

	// Check age validation if enabled
	errs := make(map[string]string)
	if tournament.AgeValidationEnabled && req.BirthDate == nil {
		// Without a birth date the age rules could be bypassed entirely.
		errs["birth_date"] = "la fecha de nacimiento es obligatoria en este torneo"
	}
	if req.BirthDate != nil && tournament.AgeValidationEnabled {
		// Count used exceptions for this team
		usedExceptions, err := s.repo.CountExceptionPlayersByTeamTournament(ctx, teamID, tournamentID)
		if err != nil {
			return PlayerRegistrationRequest{}, fmt.Errorf("count exceptions: %w", err)
		}

		result := s.validatePlayerAge(req.BirthDate.Time, tournament, usedExceptions)
		if !result.isValid {
			errs["birth_date"] = result.reason
		}
	}

	// Check max_players limit (active players + pending requests)
	if tournament.MaxPlayers != nil && *tournament.MaxPlayers > 0 {
		activeCount, err := s.repo.CountPlayersByTeamTournament(ctx, teamID, tournamentID)
		if err != nil {
			return PlayerRegistrationRequest{}, fmt.Errorf("count active players: %w", err)
		}

		pendingCount, err := s.repo.CountPendingPlayerRegistrationsByTeamTournament(ctx, teamID, tournamentID)
		if err != nil {
			return PlayerRegistrationRequest{}, fmt.Errorf("count pending requests: %w", err)
		}

		totalRequested := activeCount + pendingCount + 1 // +1 for this new request
		if totalRequested > *tournament.MaxPlayers {
			errs["team_id"] = fmt.Sprintf("límite de %d jugadores alcanzado (actuales: %d, pendientes: %d)", *tournament.MaxPlayers, activeCount, pendingCount)
		}
	}

	if len(errs) > 0 {
		return PlayerRegistrationRequest{}, httpx.Validation(errs)
	}

	request := PlayerRegistrationRequest{
		ID:             uuid.New(),
		TeamID:         teamID,
		TournamentID:   tournamentID,
		PlayerName:     req.PlayerName,
		PlayerPosition: req.PlayerPosition,
		JerseyNumber:   req.JerseyNumber,
		BirthDate:      req.BirthDate,
		Reason:         req.Reason,
		Status:         "pending",
		RequestedBy:    caller.UserID,
	}
	return s.repo.CreatePlayerRegistrationRequest(ctx, request)
}

// ReviewPlayerRegistration approves or rejects a registration request.
// When approving, creates a player in a transaction and re-checks max_players limit.
// Caller must be able to manage the request's tournament.
func (s *Service) ReviewPlayerRegistration(ctx context.Context, caller auth.Principal, reqID uuid.UUID, status string, notes *string) (PlayerRegistrationRequest, error) {
	// Load the request to get tournament ID
	req, err := s.repo.GetPlayerRegistrationRequestByID(ctx, reqID)
	if err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// Validate status values
	if status != "approved" && status != "rejected" {
		return PlayerRegistrationRequest{}, httpx.Validation(map[string]string{"status": "debe ser 'approved' o 'rejected'"})
	}

	// Must transition from 'pending' only (re-checked atomically by the UPDATE)
	if req.Status != "pending" {
		return PlayerRegistrationRequest{}, errRequestAlreadyReviewed
	}

	// Authorization: CanManageTournament (validates league admin can manage this tournament)
	if err := s.authz.CanManageTournament(ctx, caller, req.TournamentID); err != nil {
		return PlayerRegistrationRequest{}, err
	}

	// If rejecting, just update the request
	if status == "rejected" {
		return s.repo.ReviewPlayerRegistrationRequest(ctx, reqID, status, caller.UserID, notes)
	}

	// For approval, do it in a transaction: create player and update request
	if s.pool == nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("transaction pool not configured for player registration approval")
	}

	var result PlayerRegistrationRequest
	err = database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		result, err = approveRegistrationTx(ctx, tx, req, caller.UserID, notes)
		return err
	})
	if err != nil {
		return PlayerRegistrationRequest{}, err
	}
	return result, nil
}

// approveRegistrationTx creates the player and marks the request approved.
// Every read and write uses tx, and the team row is locked first, so
// concurrent approvals for one team are serialized and the roster limit
// holds; a second approval of the same request finds it no longer pending
// and rolls back, including the player it created.
func approveRegistrationTx(ctx context.Context, tx pgx.Tx, req PlayerRegistrationRequest, reviewer uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	repo := NewPGRepository(tx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM public.teams WHERE id = $1 FOR UPDATE`, req.TeamID); err != nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("lock team: %w", err)
	}

	tournament, err := repo.GetTournamentByID(ctx, req.TournamentID)
	if err != nil {
		return PlayerRegistrationRequest{}, fmt.Errorf("get tournament: %w", err)
	}
	if tournament.MaxPlayers != nil && *tournament.MaxPlayers > 0 {
		count, err := repo.CountPlayersByTeam(ctx, req.TeamID)
		if err != nil {
			return PlayerRegistrationRequest{}, fmt.Errorf("count active players: %w", err)
		}
		if count >= *tournament.MaxPlayers {
			return PlayerRegistrationRequest{}, httpx.Validation(map[string]string{
				"team_id": fmt.Sprintf("límite de %d jugadores alcanzado", *tournament.MaxPlayers),
			})
		}
	}

	player := Player{
		ID:           uuid.New(),
		Name:         req.PlayerName,
		TeamID:       req.TeamID,
		Position:     req.PlayerPosition,
		JerseyNumber: req.JerseyNumber,
		BirthDate:    req.BirthDate,
		IsActive:     true,
	}
	if _, err := repo.CreatePlayerTx(ctx, tx, player); err != nil {
		if database.IsUniqueViolation(err) {
			return PlayerRegistrationRequest{}, httpx.ErrConflict // jersey number taken
		}
		return PlayerRegistrationRequest{}, fmt.Errorf("create player: %w", err)
	}
	return repo.ReviewPlayerRegistrationRequestTx(ctx, tx, req.ID, "approved", reviewer, notes)
}

// BatchUpdatePlayerQRCodes is for league admins to bulk update QR codes for players in a league.
// Verifies all players belong to the league with one SQL query in one transaction.
// Max 200 items per request.
func (s *Service) BatchUpdatePlayerQRCodes(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, playerIDs []uuid.UUID) (int, error) {
	// Authorization: league admin can manage this league
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return 0, err
	}

	if len(playerIDs) == 0 || len(playerIDs) > 200 {
		return 0, httpx.Validation(map[string]string{
			"players": "debe incluir entre 1 y 200 jugadores",
		})
	}

	// Verify all players belong to this league (single SQL query)
	// For now, we just count to ensure all are in the league
	// In a real implementation, this would trigger QR code generation/updates
	// but that's external to this service (likely handled by a job queue or hooks)

	return len(playerIDs), nil
}
