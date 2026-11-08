package teams

import (
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

// NewHandler builds the teams HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	// Public team endpoints
	r.Get("/teams/{teamID}", h.getTeam)
	r.Get("/teams", h.getTeamsByLeague)

	// Team owner endpoints (authenticated)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleTeamOwner, auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).Post("/teams", h.createTeam)
	r.With(auth.RequireAuth).Get("/my-teams", h.getMyTeams)
	r.With(auth.RequireAuth).Patch("/teams/{teamID}", h.updateTeam)
	r.With(auth.RequireAuth).Post("/teams/{teamID}/activate", h.activateTeam)
	r.With(auth.RequireAuth).Post("/teams/{teamID}/deactivate", h.deactivateTeam)
	r.With(auth.RequireAuth).Delete("/teams/{teamID}", h.deleteTeam)

	// Player endpoints - public GETs return PublicPlayer (no PII)
	r.Get("/teams/{teamID}/players", h.getTeamPlayers)
	r.Get("/players/{playerID}", h.getPlayer)
	r.With(auth.RequireAuth).Post("/teams/{teamID}/players", h.createPlayer)
	r.With(auth.RequireAuth).Patch("/players/{playerID}", h.updatePlayer)
	r.With(auth.RequireAuth).Get("/players/{playerID}/verification", h.getPlayerVerification)
	r.With(auth.RequireAuth).Patch("/players/{playerID}/verification", h.verifyPlayer)
	r.With(auth.RequireAuth).Post("/players/{playerID}/deactivate", h.deactivatePlayer)

	// Coaching staff endpoints - public GETs return PublicCoachingStaff (no PII)
	r.Get("/teams/{teamID}/coaching-staff", h.getTeamCoachingStaff)
	r.Get("/coaching-staff/{staffID}", h.getCoachingStaff)
	r.With(auth.RequireAuth).Post("/teams/{teamID}/coaching-staff", h.createCoachingStaff)
	r.With(auth.RequireAuth).Patch("/coaching-staff/{staffID}", h.updateCoachingStaff)
	r.With(auth.RequireAuth).Post("/coaching-staff/{staffID}/deactivate", h.deactivateCoachingStaff)

	// Player registration requests - all authenticated
	r.With(auth.RequireAuth).Get("/player-registration-requests/{reqID}", h.getPlayerRegistrationRequest)
	r.With(auth.RequireAuth).Get("/teams/{teamID}/player-registration-requests", h.getTeamPlayerRegistrationRequests)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).Get("/tournaments/{tournamentID}/player-registration-requests", h.getTournamentPlayerRegistrationRequests)
	r.With(auth.RequireAuth).Post("/teams/{teamID}/tournaments/{tournamentID}/player-registration-requests", h.requestPlayerRegistration)
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).Patch("/player-registration-requests/{reqID}/review", h.reviewPlayerRegistration)

	// QR batch update - league admin only
	r.With(auth.RequireAuth, auth.RequireRole(auth.RoleLeagueAdmin, auth.RoleSuperAdmin)).Post("/leagues/{leagueID}/players/qr-batch", h.batchUpdatePlayerQRCodes)
}

// getTeam returns a team by ID (public endpoint).
func (h *Handler) getTeam(w http.ResponseWriter, r *http.Request) {
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	team, err := h.svc.GetTeam(r.Context(), teamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, team)
}

// getTeamsByLeague handles GET /teams?league_id=... (public endpoint).
func (h *Handler) getTeamsByLeague(w http.ResponseWriter, r *http.Request) {
	leagueID, err := httpx.UUIDQuery(r, "league_id")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	teams, err := h.svc.GetTeamsByLeague(r.Context(), leagueID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, teams, page)
}

// getMyTeams returns teams owned by the authenticated user.
func (h *Handler) getMyTeams(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	teams, err := h.svc.GetMyTeams(r.Context(), caller, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, teams, page)
}

// createTeam creates a new team.
func (h *Handler) createTeam(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	var req CreateTeamRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	team, err := h.svc.CreateTeam(r.Context(), caller, req.LeagueID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, team)
}

// updateTeam updates a team's details.
func (h *Handler) updateTeam(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req UpdateTeamRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	team, err := h.svc.UpdateTeam(r.Context(), caller, teamID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, team)
}

// activateTeam activates a team.
func (h *Handler) activateTeam(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	team, err := h.svc.ActivateTeam(r.Context(), caller, teamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, team)
}

// deactivateTeam deactivates a team.
func (h *Handler) deactivateTeam(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	team, err := h.svc.DeactivateTeam(r.Context(), caller, teamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, team)
}

// getPlayer returns a player by ID. Returns PublicPlayer (no PII).
func (h *Handler) getPlayer(w http.ResponseWriter, r *http.Request) {
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	player, err := h.svc.GetPlayer(r.Context(), playerID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	// Return safe public DTO (no PII: no birth_date, id_verified*, enrollment_metadata, face_embedding, etc)
	publicPlayer := PublicPlayer{
		ID:           player.ID,
		Name:         player.Name,
		TeamID:       player.TeamID,
		Position:     player.Position,
		JerseyNumber: player.JerseyNumber,
		Photo:        player.Photo,
		IsActive:     player.IsActive,
	}
	httpx.JSON(w, http.StatusOK, publicPlayer)
}

// getTeamPlayers returns all players on a team. Returns PublicPlayer list.
func (h *Handler) getTeamPlayers(w http.ResponseWriter, r *http.Request) {
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
	players, err := h.svc.GetTeamPlayers(r.Context(), teamID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	// Convert to public DTOs
	publicPlayers := make([]PublicPlayer, len(players))
	for i, p := range players {
		publicPlayers[i] = PublicPlayer{
			ID:           p.ID,
			Name:         p.Name,
			TeamID:       p.TeamID,
			Position:     p.Position,
			JerseyNumber: p.JerseyNumber,
			Photo:        p.Photo,
			IsActive:     p.IsActive,
		}
	}
	httpx.List(w, publicPlayers, page)
}

// createPlayer adds a player to a team.
func (h *Handler) createPlayer(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req CreatePlayerRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	player, err := h.svc.CreatePlayer(r.Context(), caller, teamID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, player)
}

// updatePlayer updates a player's details.
func (h *Handler) updatePlayer(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req UpdatePlayerRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	player, err := h.svc.UpdatePlayer(r.Context(), caller, playerID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, player)
}

// deactivatePlayer deactivates a player.
func (h *Handler) deactivatePlayer(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	player, err := h.svc.DeactivatePlayer(r.Context(), caller, playerID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, player)
}

// getCoachingStaff returns a coaching staff member by ID. Returns PublicCoachingStaff (no PII).
func (h *Handler) getCoachingStaff(w http.ResponseWriter, r *http.Request) {
	staffID, err := httpx.UUIDParam(r, "staffID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	staff, err := h.svc.GetCoachingStaff(r.Context(), staffID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	// Return safe public DTO (no PII: no birth_date, cedula)
	publicStaff := PublicCoachingStaff{
		ID:       staff.ID,
		TeamID:   staff.TeamID,
		Name:     staff.Name,
		Role:     staff.Role,
		Photo:    staff.Photo,
		IsActive: staff.IsActive,
	}
	httpx.JSON(w, http.StatusOK, publicStaff)
}

// getTeamCoachingStaff returns all coaching staff on a team. Returns PublicCoachingStaff list.
func (h *Handler) getTeamCoachingStaff(w http.ResponseWriter, r *http.Request) {
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
	staff, err := h.svc.GetTeamCoachingStaff(r.Context(), teamID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	// Convert to public DTOs
	publicStaff := make([]PublicCoachingStaff, len(staff))
	for i, s := range staff {
		publicStaff[i] = PublicCoachingStaff{
			ID:       s.ID,
			TeamID:   s.TeamID,
			Name:     s.Name,
			Role:     s.Role,
			Photo:    s.Photo,
			IsActive: s.IsActive,
		}
	}
	httpx.List(w, publicStaff, page)
}

// createCoachingStaff adds a coaching staff member to a team.
func (h *Handler) createCoachingStaff(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req CreateCoachingStaffRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	staff, err := h.svc.CreateCoachingStaff(r.Context(), caller, teamID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, staff)
}

// updateCoachingStaff updates a coaching staff member's details.
func (h *Handler) updateCoachingStaff(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	staffID, err := httpx.UUIDParam(r, "staffID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req UpdateCoachingStaffRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	staff, err := h.svc.UpdateCoachingStaff(r.Context(), caller, staffID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, staff)
}

// deactivateCoachingStaff deactivates a coaching staff member.
func (h *Handler) deactivateCoachingStaff(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	staffID, err := httpx.UUIDParam(r, "staffID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	staff, err := h.svc.DeactivateCoachingStaff(r.Context(), caller, staffID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, staff)
}

// getPlayerRegistrationRequest returns a registration request by ID (authenticated).
func (h *Handler) getPlayerRegistrationRequest(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	reqID, err := httpx.UUIDParam(r, "reqID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	req, err := h.svc.GetPlayerRegistrationRequest(r.Context(), caller, reqID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, req)
}

// getTeamPlayerRegistrationRequests returns pending registration requests for a team.
func (h *Handler) getTeamPlayerRegistrationRequests(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
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
	reqs, err := h.svc.GetTeamPlayerRegistrationRequests(r.Context(), caller, teamID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, reqs, page)
}

// getTournamentPlayerRegistrationRequests returns pending registration requests for a tournament.
func (h *Handler) getTournamentPlayerRegistrationRequests(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "pending"
	}
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	reqs, err := h.svc.GetTournamentPlayerRegistrationRequests(r.Context(), caller, tournamentID, status, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, reqs, page)
}

// requestPlayerRegistration submits a player registration request.
func (h *Handler) requestPlayerRegistration(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req CreatePlayerRegistrationRequestRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	registrationReq, err := h.svc.RequestPlayerRegistration(r.Context(), caller, teamID, tournamentID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, registrationReq)
}

// reviewPlayerRegistration approves or rejects a registration request.
func (h *Handler) reviewPlayerRegistration(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	reqID, err := httpx.UUIDParam(r, "reqID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req ReviewPlayerRegistrationRequestRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	registrationReq, err := h.svc.ReviewPlayerRegistration(r.Context(), caller, reqID, req.Status, req.ReviewNotes)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationReq)
}

// batchUpdatePlayerQRCodes updates QR codes for multiple players in a league.
func (h *Handler) batchUpdatePlayerQRCodes(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req QRBatchUpdateRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Convert player IDs
	playerIDs := make([]uuid.UUID, len(req.Players))
	for i, p := range req.Players {
		playerIDs[i] = p.ID
	}

	updated, err := h.svc.BatchUpdatePlayerQRCodes(r.Context(), caller, leagueID, playerIDs)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]int{"updated": updated})
}

// deleteTeam handles DELETE /teams/{teamID} (permanent; league admin only).
func (h *Handler) deleteTeam(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.DeleteTeam(r.Context(), caller, id); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}
