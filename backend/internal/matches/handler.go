package matches

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls.
type Handler struct {
	svc *Service
}

// NewHandler builds the matches HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	// Public endpoints
	r.Get("/tournaments/{tournamentID}/matches", h.listMatches)
	r.Get("/matches/{matchID}", h.getMatch)
	r.Get("/teams/{teamID}/matches", h.listTeamMatches)
	r.Get("/tournaments/{tournamentID}/matches/upcoming", h.listUpcoming)
	r.Get("/leagues/{leagueID}/matches/pending", h.listPending)
	r.With(auth.RequireAuth).Get("/matches/{matchID}/referee-report", h.getRefereeReport)
	r.With(auth.RequireAuth).Get("/tournaments/{tournamentID}/duplicates", h.findDuplicates)

	// Protected endpoints (require authentication)
	r.With(auth.RequireAuth).Post("/matches", h.createMatch)
	r.With(auth.RequireAuth).Post("/tournaments/{tournamentID}/matches/bulk", h.bulkCreateMatches)
	r.With(auth.RequireAuth).Post("/tournaments/{tournamentID}/fixtures/generate", h.generateFixtures)
	r.With(auth.RequireAuth).Patch("/matches/{matchID}/schedule", h.updateSchedule)
	r.With(auth.RequireAuth).Delete("/matches/{matchID}", h.deleteMatch)
	r.With(auth.RequireAuth).Delete("/tournaments/{tournamentID}/matches", h.deleteTournamentMatches)
	r.With(auth.RequireAuth).Post("/matches/{matchID}/result", h.postResult)
	r.With(auth.RequireAuth).Post("/matches/{matchID}/referee-report", h.createRefereeReport)
	r.With(auth.RequireAuth).Patch("/matches/{matchID}/publish", h.publishMatch)
	r.With(auth.RequireAuth).Post("/tournaments/{tournamentID}/rounds/{round}/publish", h.publishRound)
	r.With(auth.RequireAuth).Post("/tournaments/{tournamentID}/playoffs/generate", h.generatePlayoffs)
}

func (h *Handler) listMatches(w http.ResponseWriter, r *http.Request) {
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

	// Parse optional filters
	filters := ListMatchesFilter{Limit: page.Limit, Offset: page.Offset}

	matches, err := h.svc.ListMatches(r.Context(), tournamentID, filters)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, matches, page)
}

func (h *Handler) getMatch(w http.ResponseWriter, r *http.Request) {
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	match, err := h.svc.GetMatch(r.Context(), matchID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, match)
}

func (h *Handler) listTeamMatches(w http.ResponseWriter, r *http.Request) {
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	filters := ListMatchesFilter{Limit: page.Limit, Offset: page.Offset}

	matches, err := h.svc.ListTeamMatches(r.Context(), teamID, filters)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, matches, page)
}

func (h *Handler) listUpcoming(w http.ResponseWriter, r *http.Request) {
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

	matches, err := h.svc.ListUpcoming(r.Context(), tournamentID, 10)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, matches, page)
}

func (h *Handler) listPending(w http.ResponseWriter, r *http.Request) {
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

	matches, err := h.svc.ListPending(r.Context(), leagueID, 50)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, matches, page)
}

func (h *Handler) findDuplicates(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	duplicates, err := h.svc.FindDuplicates(r.Context(), caller, tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, duplicates)
}

func (h *Handler) createMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req CreateMatchRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	match, err := h.svc.CreateMatch(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, match)
}

func (h *Handler) bulkCreateMatches(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req BulkCreateMatchesRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	req.TournamentID = tournamentID

	matches, err := h.svc.BulkCreateMatches(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, matches)
}

func (h *Handler) generateFixtures(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req GenerateFixturesRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	req.TournamentID = tournamentID

	result, err := h.svc.GenerateFixtures(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, result)
}

func (h *Handler) updateSchedule(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateMatchScheduleRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	match, err := h.svc.UpdateSchedule(r.Context(), caller, matchID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, match)
}

func (h *Handler) deleteMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if err := h.svc.DeleteMatch(r.Context(), caller, matchID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

func (h *Handler) postResult(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req PostMatchResultRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if err := h.svc.PostResult(r.Context(), caller, matchID, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

func (h *Handler) createRefereeReport(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req PostRefereeReportRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	report, err := h.svc.CreateRefereeReport(r.Context(), caller, matchID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, report)
}

func (h *Handler) publishMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req PublishMatchRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if err := h.svc.PublishMatch(r.Context(), caller, matchID, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

func (h *Handler) publishRound(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	roundStr := r.PathValue("round")
	round := 0
	if roundStr != "" {
		if _, err := fmt.Sscanf(roundStr, "%d", &round); err != nil {
			httpx.WriteError(w, r, httpx.ErrBadRequest)
			return
		}
	}

	var req PublishRoundRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if err := h.svc.PublishRound(r.Context(), caller, tournamentID, round, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

func (h *Handler) generatePlayoffs(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req GeneratePlayoffsRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	req.TournamentID = tournamentID

	matches, err := h.svc.GeneratePlayoffs(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, matches)
}

func (h *Handler) getRefereeReport(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	report, err := h.svc.GetRefereeReport(r.Context(), caller, matchID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, report)
}

// deleteTournamentMatches handles DELETE /tournaments/{tournamentID}/matches
// (?round=N and/or ?phase=regular|playoffs to narrow it).
func (h *Handler) deleteTournamentMatches(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var round *int
	if raw := r.URL.Query().Get("round"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil {
			httpx.WriteError(w, r, httpx.Validation(map[string]string{"round": "debe ser un número"}))
			return
		}
		round = &n
	}
	var phase *string
	if raw := r.URL.Query().Get("phase"); raw != "" {
		phase = &raw
	}
	deleted, err := h.svc.DeleteTournamentMatches(r.Context(), caller, tournamentID, round, phase)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, DeleteMatchesResponse{Deleted: deleted})
}
