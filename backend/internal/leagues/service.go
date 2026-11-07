package leagues

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service implements business rules and authorization for leagues and tournaments.
type Service struct {
	repo  Repository
	authz authz.Checker
}

// NewService builds a leagues service.
func NewService(repo Repository, checker authz.Checker) *Service {
	return &Service{
		repo:  repo,
		authz: checker,
	}
}

// GetLeagueByID fetches a league by ID (any state, authorized callers only).
func (s *Service) GetLeagueByID(ctx context.Context, caller auth.Principal, id uuid.UUID) (League, error) {
	l, err := s.repo.GetLeagueByID(ctx, id)
	if err != nil {
		return League{}, err
	}
	if !canSeeLeague(caller, l) {
		return League{}, httpx.ErrNotFound
	}
	return l, nil
}

// canSeeLeague mirrors the legacy RLS: anyone sees active leagues; inactive
// ones only their admin or a super admin. Hidden leagues answer 404, not 403,
// so their existence is not disclosed.
func canSeeLeague(caller auth.Principal, l League) bool {
	return l.IsActive || caller.IsSuperAdmin() || (caller.UserID != uuid.Nil && caller.UserID == l.AdminID)
}

// GetLeagueBySlug fetches an active league by slug (public endpoint).
func (s *Service) GetLeagueBySlug(ctx context.Context, slug string) (League, error) {
	return s.repo.GetLeagueBySlug(ctx, slug)
}

// ListActiveLeagues lists active leagues (public endpoint).
func (s *Service) ListActiveLeagues(ctx context.Context, limit int, offset int) ([]League, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListActiveLeagues(ctx, limit, offset)
}

// ListAllLeagues lists all leagues including inactive (super admin only).
func (s *Service) ListAllLeagues(ctx context.Context, caller auth.Principal, limit int, offset int) ([]League, int, error) {
	if !caller.IsSuperAdmin() {
		return nil, 0, httpx.ErrForbidden
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListAllLeagues(ctx, limit, offset)
}

// CreateLeague creates a new league. Super admin can assign admin_id; others become the admin.
func (s *Service) CreateLeague(ctx context.Context, caller auth.Principal, req *CreateLeagueRequest) (League, error) {
	// Only super_admin or league_admin can create
	if !caller.IsSuperAdmin() && caller.Role != auth.RoleLeagueAdmin {
		return League{}, httpx.ErrForbidden
	}

	adminID := caller.UserID
	if req.AdminID != nil {
		// Only super admin can assign admin_id
		if !caller.IsSuperAdmin() {
			return League{}, httpx.ErrForbidden
		}
		adminID = *req.AdminID
	}

	// Default features
	defaultFeatures, _ := json.Marshal(map[string]bool{
		"ai_agent":           true,
		"qr_codes":           true,
		"mobile_app":         true,
		"statistics":         true,
		"manual_entry":       true,
		"public_portal":      true,
		"realtime_updates":   true,
		"facial_recognition": true,
	})

	l := &League{
		ID:          uuid.New(),
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Logo:        req.Logo,
		AdminID:     adminID,
		IsActive:    true,
		ProductMode: "full",
		Features:    json.RawMessage(defaultFeatures),
		CreatedAt:   timeNow(),
		UpdatedAt:   timeNow(),
	}

	id, err := s.repo.CreateLeague(ctx, l)
	if err != nil {
		return League{}, err
	}
	l.ID = id
	return *l, nil
}

// UpdateLeague updates a league (admin or super admin).
func (s *Service) UpdateLeague(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *UpdateLeagueRequest) (League, error) {
	// Authorize
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return League{}, err
	}

	// Load current league
	l, err := s.repo.GetLeagueByID(ctx, leagueID)
	if err != nil {
		return League{}, err
	}

	// Apply updates
	if req.Name != nil {
		l.Name = *req.Name
	}
	if req.Slug != nil {
		l.Slug = *req.Slug
	}
	if req.Description != nil {
		l.Description = *req.Description
	}
	if req.Logo != nil {
		l.Logo = req.Logo
	}

	l.UpdatedAt = timeNow()

	if err := s.repo.UpdateLeague(ctx, &l); err != nil {
		return League{}, err
	}

	return l, nil
}

// UpdateLeagueProductMode updates product_mode and features (super admin only).
func (s *Service) UpdateLeagueProductMode(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *UpdateProductModeRequest) (League, error) {
	if !caller.IsSuperAdmin() {
		return League{}, httpx.ErrForbidden
	}

	// Verify league exists
	l, err := s.repo.GetLeagueByID(ctx, leagueID)
	if err != nil {
		return League{}, err
	}

	// Default features if not provided
	features := req.Features
	if features == nil {
		defaultFeatures, _ := json.Marshal(map[string]bool{
			"ai_agent":           true,
			"qr_codes":           true,
			"mobile_app":         true,
			"statistics":         true,
			"manual_entry":       true,
			"public_portal":      true,
			"realtime_updates":   true,
			"facial_recognition": true,
		})
		features = json.RawMessage(defaultFeatures)
	}

	if err := s.repo.UpdateLeagueProductMode(ctx, leagueID, req.ProductMode, features, caller.UserID); err != nil {
		return League{}, err
	}

	// Reload and return
	l, err = s.repo.GetLeagueByID(ctx, leagueID)
	if err != nil {
		return League{}, err
	}

	return l, nil
}

// SetLeagueStatus sets the is_active status (admin or super admin).
func (s *Service) SetLeagueStatus(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, isActive bool) (League, error) {
	// Authorize
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return League{}, err
	}

	// Load current league
	l, err := s.repo.GetLeagueByID(ctx, leagueID)
	if err != nil {
		return League{}, err
	}

	l.IsActive = isActive
	l.UpdatedAt = timeNow()

	if err := s.repo.UpdateLeague(ctx, &l); err != nil {
		return League{}, err
	}

	return l, nil
}

// GetTournamentByID fetches a tournament by ID.
func (s *Service) GetTournamentByID(ctx context.Context, caller auth.Principal, id uuid.UUID) (Tournament, error) {
	t, err := s.repo.GetTournamentByID(ctx, id)
	if err != nil {
		return Tournament{}, err
	}
	// Tournaments are visible only while their league is visible (legacy RLS).
	if _, err := s.GetLeagueByID(ctx, caller, t.LeagueID); err != nil {
		return Tournament{}, err
	}
	return t, nil
}

// ListTournamentsByLeague lists tournaments for a league.
func (s *Service) ListTournamentsByLeague(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, limit int, offset int) ([]Tournament, int, error) {
	if _, err := s.GetLeagueByID(ctx, caller, leagueID); err != nil {
		return nil, 0, err
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListTournamentsByLeague(ctx, leagueID, limit, offset)
}

// CreateTournament creates a tournament (league admin or super admin).
func (s *Service) CreateTournament(ctx context.Context, caller auth.Principal, req *CreateTournamentRequest) (Tournament, error) {
	// Authorize
	if err := s.authz.CanManageLeague(ctx, caller, req.LeagueID); err != nil {
		return Tournament{}, err
	}

	// Defaults
	isActive := false
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	registrationOpen := true
	if req.RegistrationOpen != nil {
		registrationOpen = *req.RegistrationOpen
	}

	maxCoachingStaff := 10
	if req.MaxCoachingStaff != nil {
		maxCoachingStaff = *req.MaxCoachingStaff
	}

	roundsPerSeason := 1
	if req.RoundsPerSeason != nil {
		roundsPerSeason = *req.RoundsPerSeason
	}

	hasThirdPlace := false
	if req.HasThirdPlaceMatch != nil {
		hasThirdPlace = *req.HasThirdPlaceMatch
	}

	t := &Tournament{
		ID:                     uuid.New(),
		Name:                   req.Name,
		LeagueID:               req.LeagueID,
		StartDate:              req.StartDate,
		EndDate:                req.EndDate,
		IsActive:               isActive,
		MaxPlayers:             req.MaxPlayers,
		RegistrationOpen:       registrationOpen,
		MaxCoachingStaff:       &maxCoachingStaff,
		TournamentFormat:       req.TournamentFormat,
		NumberOfGroups:         req.NumberOfGroups,
		TeamsAdvancingPerGroup: req.TeamsAdvancingPerGroup,
		RoundsPerSeason:        roundsPerSeason,
		HasThirdPlaceMatch:     hasThirdPlace,
		AgeValidationEnabled:   false,
		MinAge:                 req.MinAge,
		MaxAge:                 req.MaxAge,
		AgeReferenceDate:       req.AgeReferenceDate,
		AgeExceptionCount:      req.AgeExceptionCount,
		AgeExceptionMinAge:     req.AgeExceptionMinAge,
		AgeExceptionMaxAge:     req.AgeExceptionMaxAge,
		IDDocumentRequired:     false,
		CreatedAt:              timeNow(),
		UpdatedAt:              timeNow(),
	}

	id, err := s.repo.CreateTournament(ctx, t)
	if err != nil {
		return Tournament{}, err
	}
	t.ID = id
	return *t, nil
}

// UpdateTournament updates a tournament (league admin or super admin).
func (s *Service) UpdateTournament(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID, req *UpdateTournamentRequest) (Tournament, error) {
	// Load tournament first to get league_id for authorization
	t, err := s.repo.GetTournamentByID(ctx, tournamentID)
	if err != nil {
		return Tournament{}, err
	}

	// Authorize via league
	if err := s.authz.CanManageLeague(ctx, caller, t.LeagueID); err != nil {
		return Tournament{}, err
	}

	// Apply updates
	if req.Name != nil {
		t.Name = *req.Name
	}
	if req.StartDate != nil {
		t.StartDate = *req.StartDate
	}
	if req.EndDate != nil {
		t.EndDate = *req.EndDate
	}
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if req.MaxPlayers != nil {
		t.MaxPlayers = req.MaxPlayers
	}
	if req.RegistrationOpen != nil {
		t.RegistrationOpen = *req.RegistrationOpen
	}
	if req.MaxCoachingStaff != nil {
		t.MaxCoachingStaff = req.MaxCoachingStaff
	}
	if req.TournamentFormat != nil {
		t.TournamentFormat = *req.TournamentFormat
	}
	if req.NumberOfGroups != nil {
		t.NumberOfGroups = req.NumberOfGroups
	}
	if req.TeamsAdvancingPerGroup != nil {
		t.TeamsAdvancingPerGroup = req.TeamsAdvancingPerGroup
	}
	if req.RoundsPerSeason != nil {
		t.RoundsPerSeason = *req.RoundsPerSeason
	}
	if req.HasThirdPlaceMatch != nil {
		t.HasThirdPlaceMatch = *req.HasThirdPlaceMatch
	}
	if req.AgeValidationEnabled != nil {
		t.AgeValidationEnabled = *req.AgeValidationEnabled
	}
	if req.MinAge != nil {
		t.MinAge = req.MinAge
	}
	if req.MaxAge != nil {
		t.MaxAge = req.MaxAge
	}
	if req.AgeReferenceDate != nil {
		t.AgeReferenceDate = req.AgeReferenceDate
	}
	if req.AgeExceptionCount != nil {
		t.AgeExceptionCount = req.AgeExceptionCount
	}
	if req.AgeExceptionMinAge != nil {
		t.AgeExceptionMinAge = req.AgeExceptionMinAge
	}
	if req.AgeExceptionMaxAge != nil {
		t.AgeExceptionMaxAge = req.AgeExceptionMaxAge
	}
	if req.IDDocumentRequired != nil {
		t.IDDocumentRequired = *req.IDDocumentRequired
	}

	t.UpdatedAt = timeNow()

	if err := s.repo.UpdateTournament(ctx, &t); err != nil {
		return Tournament{}, err
	}

	return t, nil
}

// timeNow is a helper to allow testing with time mocking.
func timeNow() time.Time {
	return time.Now().UTC()
}

// MyLeagues returns the leagues the caller administers.
func (s *Service) MyLeagues(ctx context.Context, caller auth.Principal) ([]League, error) {
	return s.repo.ListLeaguesByAdmin(ctx, caller.UserID)
}
