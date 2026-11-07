package directory

import (
	"context"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules for directory operations.
type Service struct {
	repo  Repository
	authz authz.Checker
}

// NewService builds the directory service.
func NewService(repo Repository, authz authz.Checker) *Service {
	return &Service{repo: repo, authz: authz}
}

// ListUsers lists all users (super_admin only) or league users.
func (s *Service) ListUsers(ctx context.Context, caller auth.Principal, req *ListUsersRequest) ([]User, error) {
	// Super admin can see all users
	if caller.IsSuperAdmin() {
		return s.repo.ListUsers(ctx, req.Role, nil, req.Search, req.Limit, req.Offset)
	}

	// League admin can only see users in their league
	if caller.Role == auth.RoleLeagueAdmin && caller.LeagueID != nil {
		users, err := s.repo.ListLeagueUsers(ctx, *caller.LeagueID, req.Search, req.Limit, req.Offset)
		if err != nil {
			return nil, err
		}
		// Filter by role if specified
		if req.Role != nil {
			var filtered []User
			for _, u := range users {
				if u.Role == *req.Role {
					filtered = append(filtered, u)
				}
			}
			return filtered, nil
		}
		return users, nil
	}

	return nil, httpx.ErrForbidden
}

// ListLeagueUsers lists users of a specific league (league admin only).
func (s *Service) ListLeagueUsers(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, search string, limit, offset int) ([]User, error) {
	// Must be league admin or super admin
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}

	return s.repo.ListLeagueUsers(ctx, leagueID, search, limit, offset)
}

// ListWhatsAppLinks lists WhatsApp links for a league (league admin only).
func (s *Service) ListWhatsAppLinks(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, limit, offset int) ([]WhatsAppLink, error) {
	// Must be league admin or super admin
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}

	return s.repo.ListWhatsAppLinks(ctx, leagueID, limit, offset)
}

// CreateWhatsAppLink creates a new WhatsApp link (league admin only).
func (s *Service) CreateWhatsAppLink(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *CreateWhatsAppLinkRequest) (WhatsAppLink, error) {
	// Must be league admin or super admin
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return WhatsAppLink{}, err
	}

	// Check phone number not already registered
	exists, err := s.repo.PhoneNumberExists(ctx, req.PhoneNumber)
	if err != nil {
		return WhatsAppLink{}, err
	}
	if exists {
		return WhatsAppLink{}, httpx.ErrConflict.Wrap(nil)
	}

	return s.repo.CreateWhatsAppLink(ctx, leagueID, req)
}

// UpdateWhatsAppLink updates a WhatsApp link (league admin only).
func (s *Service) UpdateWhatsAppLink(ctx context.Context, caller auth.Principal, linkID uuid.UUID, req *UpdateWhatsAppLinkRequest) (WhatsAppLink, error) {
	// Fetch the link to check authorization
	link, err := s.repo.GetWhatsAppLink(ctx, linkID)
	if err != nil {
		return WhatsAppLink{}, err
	}

	// Check authorization on the league
	if err := s.authz.CanManageLeague(ctx, caller, link.LeagueID); err != nil {
		return WhatsAppLink{}, err
	}

	return s.repo.UpdateWhatsAppLink(ctx, linkID, req)
}

// DeactivateWhatsAppLink deactivates a WhatsApp link (league admin only).
func (s *Service) DeactivateWhatsAppLink(ctx context.Context, caller auth.Principal, linkID uuid.UUID) (WhatsAppLink, error) {
	// Fetch the link to check authorization
	link, err := s.repo.GetWhatsAppLink(ctx, linkID)
	if err != nil {
		return WhatsAppLink{}, err
	}

	// Check authorization on the league
	if err := s.authz.CanManageLeague(ctx, caller, link.LeagueID); err != nil {
		return WhatsAppLink{}, err
	}

	return s.repo.DeactivateWhatsAppLink(ctx, linkID)
}
