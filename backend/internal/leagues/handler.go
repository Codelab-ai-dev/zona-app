package leagues

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

// NewHandler builds the leagues HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes registers all league and tournament endpoints.
func (h *Handler) Routes(r chi.Router) {
	// League endpoints
	r.Get("/leagues", h.listActiveLeagues)                           // Public: list active leagues
	r.With(auth.RequireAuth).Get("/leagues/admin", h.listAllLeagues) // Super admin: list all leagues
	r.With(auth.RequireAuth).Get("/leagues/mine", h.myLeagues)       // Leagues the caller administers
	r.Get("/leagues/{leagueID}", h.getLeague)                        // Public: get league by ID
	r.Get("/leagues/slug/{slug}", h.getLeagueBySlug)                 // Public: get league by slug
	r.With(auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).Post("/leagues", h.createLeague)
	r.With(auth.RequireAuth).Patch("/leagues/{leagueID}", h.updateLeague)
	r.With(auth.RequireRole(auth.RoleSuperAdmin)).Patch("/leagues/{leagueID}/product-mode", h.updateProductMode)
	r.With(auth.RequireAuth).Patch("/leagues/{leagueID}/status", h.setLeagueStatus)

	// Tournament endpoints
	r.Get("/tournaments/{tournamentID}", h.getTournament)                              // Public: get tournament
	r.Get("/leagues/{leagueID}/tournaments", h.listTournamentsByLeague)                // Public: list tournaments by league
	r.With(auth.RequireAuth).Post("/tournaments", h.createTournament)                  // League admin+: create tournament
	r.With(auth.RequireAuth).Patch("/tournaments/{tournamentID}", h.updateTournament)  // League admin+: update tournament
	r.With(auth.RequireAuth).Delete("/tournaments/{tournamentID}", h.deleteTournament) // League admin+: permanent delete
}

// listActiveLeagues handles GET /leagues (public, paginated).
func (h *Handler) listActiveLeagues(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	leagues, total, err := h.svc.ListActiveLeagues(r.Context(), page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, leagues, page.WithTotal(total))
}

// listAllLeagues handles GET /leagues/admin (super admin only, paginated).
func (h *Handler) listAllLeagues(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	leagues, total, err := h.svc.ListAllLeagues(r.Context(), caller, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, leagues, page.WithTotal(total))
}

// getLeague handles GET /leagues/{leagueID}.
func (h *Handler) getLeague(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	league, err := h.svc.GetLeagueByID(r.Context(), caller, id)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, league)
}

// getLeagueBySlug handles GET /leagues/slug/{slug}.
func (h *Handler) getLeagueBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		httpx.WriteError(w, r, httpx.Validation(map[string]string{"slug": "requerido"}))
		return
	}

	league, err := h.svc.GetLeagueBySlug(r.Context(), slug)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, league)
}

// createLeague handles POST /leagues.
func (h *Handler) createLeague(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req CreateLeagueRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	league, err := h.svc.CreateLeague(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, league)
}

// updateLeague handles PATCH /leagues/{leagueID}.
func (h *Handler) updateLeague(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateLeagueRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	league, err := h.svc.UpdateLeague(r.Context(), caller, id, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, league)
}

// updateProductMode handles PATCH /leagues/{leagueID}/product-mode (super admin only).
func (h *Handler) updateProductMode(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateProductModeRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	league, err := h.svc.UpdateLeagueProductMode(r.Context(), caller, id, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, league)
}

// setLeagueStatus handles PATCH /leagues/{leagueID}/status.
func (h *Handler) setLeagueStatus(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req SetLeagueStatusRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	league, err := h.svc.SetLeagueStatus(r.Context(), caller, id, req.IsActive)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, league)
}

// getTournament handles GET /tournaments/{tournamentID}.
func (h *Handler) getTournament(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	tournament, err := h.svc.GetTournamentByID(r.Context(), caller, id)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, tournament)
}

// listTournamentsByLeague handles GET /leagues/{leagueID}/tournaments (paginated).
func (h *Handler) listTournamentsByLeague(w http.ResponseWriter, r *http.Request) {
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	tournaments, total, err := h.svc.ListTournamentsByLeague(r.Context(), caller, leagueID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, tournaments, page.WithTotal(total))
}

// createTournament handles POST /tournaments.
func (h *Handler) createTournament(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req CreateTournamentRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	tournament, err := h.svc.CreateTournament(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, tournament)
}

// updateTournament handles PATCH /tournaments/{tournamentID}.
func (h *Handler) updateTournament(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateTournamentRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	tournament, err := h.svc.UpdateTournament(r.Context(), caller, id, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, tournament)
}

// deleteTournament handles DELETE /tournaments/{tournamentID}.
func (h *Handler) deleteTournament(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.DeleteTournament(r.Context(), caller, id); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// myLeagues handles GET /leagues/mine.
func (h *Handler) myLeagues(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagues, err := h.svc.MyLeagues(r.Context(), caller)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, leagues, httpx.Page{Limit: 100}.WithTotal(len(leagues)))
}
