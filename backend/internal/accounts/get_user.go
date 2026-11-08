package accounts

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// GetUser returns a user to whoever may edit it: super admins any user,
// league admins only team owners of a league they manage (same rule as
// UpdateUser, so the edit form can be prefilled).
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
	if u.Role != "team_owner" || u.LeagueID == nil {
		return User{}, httpx.ErrForbidden
	}
	if err := s.authz.CanManageLeague(ctx, caller, *u.LeagueID); err != nil {
		return User{}, err
	}
	return u, nil
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
