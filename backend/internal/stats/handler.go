package stats

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls. It holds no business logic.
type Handler struct {
	svc *Service
}

// NewHandler builds the stats HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	// Public reads
	r.Get("/tournaments/{tournamentID}/standings", h.getStandingsByTournament)
	r.Get("/tournaments/{tournamentID}/top-scorers", h.getTopScorersByTournament)
	r.Get("/tournaments/{tournamentID}/discipline", h.getDisciplineByTournament)
	r.Get("/players/{playerID}/stats", h.getPlayerStats)
	r.Get("/teams/{teamID}/stats", h.getTeamStats)

	// League admin writes
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Post("/standings/adjust", h.updateTeamPointsAdjustment)

	// Suspensions
	r.Get("/teams/{teamID}/suspensions", h.getSuspensionsByTeam)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Get("/leagues/{leagueID}/suspensions", h.getSuspensionsByLeague)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Post("/suspensions", h.createSuspension)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Put("/suspensions/{suspensionID}", h.updateSuspension)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Post("/suspensions/{suspensionID}/cancel", h.cancelSuspension)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Post("/suspensions/{suspensionID}/complete", h.completeSuspension)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).
		Post("/suspensions/{suspensionID}/apply-to-match", h.applySuspensionToMatch)
}

func (h *Handler) getStandingsByTournament(w http.ResponseWriter, r *http.Request) {
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	standings, err := h.svc.GetStandingsByTournament(r.Context(), tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, standings, page)
}

func (h *Handler) getTopScorersByTournament(w http.ResponseWriter, r *http.Request) {
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	scorers, err := h.svc.GetTopScorersByTournament(r.Context(), tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, scorers, page)
}

func (h *Handler) getDisciplineByTournament(w http.ResponseWriter, r *http.Request) {
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	discipline, err := h.svc.GetDisciplineByTournament(r.Context(), tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, discipline, page)
}

func (h *Handler) getPlayerStats(w http.ResponseWriter, r *http.Request) {
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	stats, err := h.svc.GetPlayerStats(r.Context(), playerID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) getTeamStats(w http.ResponseWriter, r *http.Request) {
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	stats, err := h.svc.GetTeamStats(r.Context(), teamID, nil)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) updateTeamPointsAdjustment(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req PointsAdjustmentRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	if err := h.svc.UpdateTeamPointsAdjustment(r.Context(), caller, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

func (h *Handler) getSuspensionsByLeague(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

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

	suspensions, err := h.svc.GetSuspensionsByLeague(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, suspensions, page)
}

func (h *Handler) getSuspensionsByTeam(w http.ResponseWriter, r *http.Request) {
	caller, ok := auth.FromContext(r.Context())

	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// If not authenticated, return 401
	if !ok {
		httpx.WriteError(w, r, httpx.ErrUnauthorized)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	suspensions, err := h.svc.GetSuspensionsByTeam(r.Context(), caller, teamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, suspensions, page)
}

func (h *Handler) createSuspension(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	// The league comes from the player (a stale client may still send
	// ?league_id=, which must then match).
	var leagueID uuid.UUID
	if r.URL.Query().Get("league_id") != "" {
		id, err := httpx.UUIDQuery(r, "league_id")
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		leagueID = id
	}

	var req CreateSuspensionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	suspension, err := h.svc.CreateSuspension(r.Context(), caller, leagueID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, suspension)
}

func (h *Handler) updateSuspension(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	suspensionID, err := httpx.UUIDParam(r, "suspensionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateSuspensionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	suspension, err := h.svc.UpdateSuspension(r.Context(), caller, suspensionID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, suspension)
}

func (h *Handler) cancelSuspension(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	suspensionID, err := httpx.UUIDParam(r, "suspensionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	suspension, err := h.svc.CancelSuspension(r.Context(), caller, suspensionID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, suspension)
}

func (h *Handler) completeSuspension(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	suspensionID, err := httpx.UUIDParam(r, "suspensionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	suspension, err := h.svc.CompleteSuspension(r.Context(), caller, suspensionID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, suspension)
}

func (h *Handler) applySuspensionToMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	suspensionID, err := httpx.UUIDParam(r, "suspensionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Get matchID from query
	matchIDStr := r.URL.Query().Get("match_id")
	if matchIDStr == "" {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(fmt.Errorf("match_id required")))
		return
	}

	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(fmt.Errorf("invalid match_id")))
		return
	}

	if err := h.svc.ApplySuspensionToMatch(r.Context(), caller, suspensionID, matchID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}
