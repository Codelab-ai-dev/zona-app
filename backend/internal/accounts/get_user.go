package accounts

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// GetUser returns a user to whoever may edit it: super admins any user,
// league admins only team owners of leagues they manage (canManageOwner,
// the same rule as UpdateUser, so the edit form can be prefilled).
func (s *Service) GetUser(ctx context.Context, caller auth.Principal, userID uuid.UUID) (User, error) {
	if !caller.IsSuperAdmin() && caller.Role != auth.RoleLeagueAdmin {
		return User{}, httpx.ErrForbidden
	}
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return User{}, err
	}
	if caller.IsSuperAdmin() {
		return u, nil
	}
	if err := s.canManageOwner(ctx, caller, u); err != nil {
		return User{}, err
	}
	return u, nil
}

// canManageOwner is the league admin's rule for reading and editing a user:
// only team owners, scoped by their users.league_id when set. Owners without
// one (#64) are scoped by the teams they own, and the caller must manage
// every one of those leagues: deactivating or renaming the account affects
// all of them.
func (s *Service) canManageOwner(ctx context.Context, caller auth.Principal, u User) error {
	if u.Role != "team_owner" {
		return httpx.ErrForbidden
	}
	if u.LeagueID != nil {
		return s.authz.CanManageLeague(ctx, caller, *u.LeagueID)
	}
	leagues, err := s.repo.OwnedTeamLeagues(ctx, u.ID)
	if err != nil {
		return err
	}
	if len(leagues) == 0 {
		return httpx.ErrForbidden
	}
	for _, id := range leagues {
		if err := s.authz.CanManageLeague(ctx, caller, id); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) getUser(w http.ResponseWriter, r *http.Request) {
	userID, err := httpx.UUIDParam(r, "userID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	caller, _ := auth.FromContext(r.Context())
	u, err := h.svc.GetUser(r.Context(), caller, userID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, u)
}
