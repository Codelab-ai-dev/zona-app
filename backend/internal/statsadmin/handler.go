package statsadmin

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler exposes the manual corrections (league admins and super admins).
type Handler struct {
	svc *Service
}

// NewHandler builds the handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	admin := r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin))
	admin.Get("/tournaments/{tournamentID}/manual-stats", h.listManualStats)
	admin.Put("/tournaments/{tournamentID}/players/{playerID}/manual-stats", h.setManualStats)
	admin.Put("/tournaments/{tournamentID}/standings/{teamID}", h.setStandings)
	admin.Delete("/leagues/{leagueID}/suspensions", h.clearSuspensions)
}

func (h *Handler) listManualStats(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	items, err := h.svc.ListManualStats(r.Context(), caller, tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, items, httpx.Page{Limit: len(items)}.WithTotal(len(items)))
}

func (h *Handler) setManualStats(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req SetManualStatsRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.SetManualStats(r.Context(), caller, tournamentID, playerID, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) setStandings(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req SetStandingsRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.SetStandings(r.Context(), caller, tournamentID, teamID, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) clearSuspensions(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	deleted, err := h.svc.ClearSuspensions(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ClearSuspensionsResponse{Deleted: deleted})
}
