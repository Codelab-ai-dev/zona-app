package directory

import (
	"net/http"
	"strings"

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

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req ListUsersRequest
	req.Limit = page.Limit
	req.Offset = page.Offset
	if role := r.URL.Query().Get("role"); role != "" {
		switch role {
		case "super_admin", "league_admin", "team_owner", "public":
			req.Role = &role
		default:
			httpx.WriteError(w, r, httpx.Validation(map[string]string{"role": "rol no válido"}))
			return
		}
	}
	req.Search = strings.TrimSpace(r.URL.Query().Get("q"))
	users, err := h.svc.ListUsers(r.Context(), caller, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, users, page)
}

// listLeagueUsers handles GET /leagues/{leagueID}/users.
func (h *Handler) listLeagueUsers(w http.ResponseWriter, r *http.Request) {
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

	search := r.URL.Query().Get("search")

	users, err := h.svc.ListLeagueUsers(r.Context(), caller, leagueID, search, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, users, page)
}

// listWhatsAppLinks handles GET /leagues/{leagueID}/whatsapp-links.
func (h *Handler) listWhatsAppLinks(w http.ResponseWriter, r *http.Request) {
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

	links, err := h.svc.ListWhatsAppLinks(r.Context(), caller, leagueID, page.Limit, page.Offset)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, links, page)
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
