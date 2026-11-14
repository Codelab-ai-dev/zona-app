package accounts

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules and authorization logic.
type Service struct {
	repo     Repository
	identity IdentityProvider
	authz    authz.Checker
}

// NewService builds the accounts service.
func NewService(repo Repository, identity IdentityProvider, authz authz.Checker) *Service {
	return &Service{
		repo:     repo,
		identity: identity,
		authz:    authz,
	}
}

// CreateUser creates a new user in both identity provider and database.
// Authorization: super_admin can create any user with any role;
// league_admin can only create team_owner users in their managed leagues.
func (s *Service) CreateUser(ctx context.Context, caller auth.Principal, req CreateUserRequest) (User, error) {
	// Authorization checks
	if !caller.IsSuperAdmin() && caller.Role != auth.RoleLeagueAdmin {
		return User{}, httpx.ErrForbidden
	}

	// league_admin restrictions
	if caller.Role == auth.RoleLeagueAdmin {
		// Can only create team_owner
		if req.Role != "team_owner" {
			return User{}, httpx.ErrForbidden
		}
		// Must specify a league_id and it must be one they manage
		if req.LeagueID == nil {
			return User{}, httpx.Validation(map[string]string{
				"league_id": "Un administrador de liga solo puede crear propietarios de equipo en sus ligas",
			})
		}
		if err := s.authz.CanManageLeague(ctx, caller, *req.LeagueID); err != nil {
			return User{}, err
		}
	}

	if req.TeamID != nil {
		leagueID, err := s.repo.TeamLeague(ctx, *req.TeamID)
		if err != nil || req.LeagueID == nil || leagueID != *req.LeagueID {
			return User{}, httpx.Validation(map[string]string{"team_id": "El equipo no pertenece a la liga"})
		}
	}

	// Create in identity provider first (returns the user ID)
	userID, err := s.identity.CreateUser(ctx, req.Email, req.Password)
	if err != nil {
		return User{}, err
	}

	// Create profile in database with the identity ID
	user := User{
		ID:       userID,
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Role:     req.Role,
		LeagueID: req.LeagueID,
		TeamID:   req.TeamID,
		IsActive: true,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		// Best-effort cleanup on DB failure: delete the identity so it can be retried
		if delErr := s.identity.DeleteUser(ctx, userID); delErr != nil {
			slog.ErrorContext(ctx, "failed to delete identity after DB create failure",
				"user_id", userID.String(), "err", delErr)
		}
		return User{}, fmt.Errorf("create user in database: %w", err)
	}

	return user, nil
}

// UpdateUser updates a user's profile.
// Authorization: super_admin can update any user and any role;
// league_admin can only update team owners of leagues they manage (canManageOwner),
// and may not change role/is_active for themselves.
func (s *Service) UpdateUser(ctx context.Context, caller auth.Principal, userID uuid.UUID, req UpdateUserRequest) (User, error) {
	// Role gate first so callers without admin rights can't probe user IDs.
	if !caller.IsSuperAdmin() && caller.Role != auth.RoleLeagueAdmin {
		return User{}, httpx.ErrForbidden
	}

	existingUser, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return User{}, err
	}

	// league_admin: can only update team owners of leagues they manage
	if caller.Role == auth.RoleLeagueAdmin {
		if err := s.canManageOwner(ctx, caller, existingUser); err != nil {
			return User{}, err
		}
		// Cannot assign super_admin or league_admin roles
		if req.Role != nil && (*req.Role == "super_admin" || *req.Role == "league_admin") {
			return User{}, httpx.ErrForbidden
		}
		// league_admin cannot change their own role or is_active
		if caller.UserID == userID {
			if req.Role != nil && *req.Role != "" {
				return User{}, httpx.ErrForbidden
			}
			if req.IsActive != nil {
				return User{}, httpx.ErrForbidden
			}
		}
	}

	// super_admin: caller cannot change their own role
	if caller.IsSuperAdmin() && caller.UserID == userID && req.Role != nil && *req.Role != "" {
		return User{}, httpx.ErrForbidden
	}

	// If updating email, also update in identity provider
	if req.Email != nil && *req.Email != "" && *req.Email != existingUser.Email {
		if err := s.identity.UpdateEmail(ctx, userID, *req.Email); err != nil {
			return User{}, fmt.Errorf("update identity provider: %w", err)
		}
	}

	// Update in database
	return s.repo.UpdateUser(ctx, userID, req)
}
