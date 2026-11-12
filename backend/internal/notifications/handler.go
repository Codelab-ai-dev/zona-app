package notifications

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

// NewHandler builds the notifications HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes registers all notification endpoints.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth).Post("/notifications/leagues/{leagueID}", h.sendLeagueNotification)
	r.With(auth.RequireAuth).Post("/notifications/matches/{matchID}/finalized", h.sendMatchFinalized)
	r.With(auth.RequireRole(auth.RoleSuperAdmin)).Post("/notifications/test", h.sendTest)
}

// sendLeagueNotification handles POST /notifications/leagues/{leagueID}.
func (h *Handler) sendLeagueNotification(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	var req SendLeagueNotificationRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Force leagueID from path, not from body
	req.LeagueID = leagueID

	summary, err := h.svc.SendLeagueNotification(r.Context(), caller, leagueID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}

// sendMatchFinalized handles POST /notifications/matches/{matchID}/finalized.
func (h *Handler) sendMatchFinalized(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}

	var req SendMatchFinalizedRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Force matchID from path, not from body
	req.MatchID = matchID

	summary, err := h.svc.SendMatchFinalized(r.Context(), caller, matchID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}

// sendTest handles POST /notifications/test (super_admin only).
func (h *Handler) sendTest(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req TestNotificationRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	summary, err := h.svc.SendTest(r.Context(), caller, req.PhoneNumber)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}
