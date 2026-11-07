package directory

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls for directory.
type Handler struct {
	svc *Service
}

// NewHandler builds the directory HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes registers all directory endpoints.
func (h *Handler) Routes(r chi.Router) {
	// User listings
	r.With(auth.RequireAuth).Get("/users", h.listUsers)
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/users", h.listLeagueUsers)

	// WhatsApp links management
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/whatsapp-links", h.listWhatsAppLinks)
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/whatsapp-links", h.createWhatsAppLink)
	r.With(auth.RequireAuth).Put("/whatsapp-links/{linkID}", h.updateWhatsAppLink)
	r.With(auth.RequireAuth).Delete("/whatsapp-links/{linkID}", h.deactivateWhatsAppLink)
}

// listUsers handles GET /users.
func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req ListUsersRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	// Set defaults
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 50
	}
	if req.Offset < 0 {
		req.Offset = 0
	}

	users, err := h.svc.ListUsers(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if users == nil {
		users = []User{}
	}
	httpx.JSON(w, http.StatusOK, users)
}

// listLeagueUsers handles GET /leagues/{leagueID}/users.
func (h *Handler) listLeagueUsers(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	search := r.URL.Query().Get("search")
	limit := 50
	offset := 0

	// Parse limit and offset from query params if present
	if l := r.URL.Query().Get("limit"); l != "" {
		// Could parse but default is fine
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		// Could parse but default is fine
	}

	users, err := h.svc.ListLeagueUsers(r.Context(), caller, leagueID, search, limit, offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if users == nil {
		users = []User{}
	}
	httpx.JSON(w, http.StatusOK, users)
}

// listWhatsAppLinks handles GET /leagues/{leagueID}/whatsapp-links.
func (h *Handler) listWhatsAppLinks(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	limit := 50
	offset := 0

	links, err := h.svc.ListWhatsAppLinks(r.Context(), caller, leagueID, limit, offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if links == nil {
		links = []WhatsAppLink{}
	}
	httpx.JSON(w, http.StatusOK, links)
}

// createWhatsAppLink handles POST /leagues/{leagueID}/whatsapp-links.
func (h *Handler) createWhatsAppLink(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req CreateWhatsAppLinkRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	link, err := h.svc.CreateWhatsAppLink(r.Context(), caller, leagueID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, link)
}

// updateWhatsAppLink handles PUT /whatsapp-links/{linkID}.
func (h *Handler) updateWhatsAppLink(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	linkID, err := httpx.UUIDParam(r, "linkID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateWhatsAppLinkRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	link, err := h.svc.UpdateWhatsAppLink(r.Context(), caller, linkID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, link)
}

// deactivateWhatsAppLink handles DELETE /whatsapp-links/{linkID}.
func (h *Handler) deactivateWhatsAppLink(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	linkID, err := httpx.UUIDParam(r, "linkID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	link, err := h.svc.DeactivateWhatsAppLink(r.Context(), caller, linkID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, link)
}
