package accounts

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls.
type Handler struct {
	svc *Service
}

// NewHandler builds the accounts HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleSuperAdmin, auth.RoleLeagueAdmin)).
		Post("/admin/users", h.createUser)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleSuperAdmin, auth.RoleLeagueAdmin)).
		Patch("/admin/users/{userID}", h.updateUser)
}

func (h *Handler) createUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	user, err := h.svc.CreateUser(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, user)
}

func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) {
	userID, err := httpx.UUIDParam(r, "userID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateUserRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	user, err := h.svc.UpdateUser(r.Context(), caller, userID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, user)
}
