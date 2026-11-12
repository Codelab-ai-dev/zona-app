package users

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls. It holds no business logic.
type Handler struct {
	svc *Service
}

// NewHandler builds the users HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth).Get("/me", h.me)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	profile, err := h.svc.Me(r.Context(), caller)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, profile)
}
