package knowledge

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

// NewHandler builds the knowledge HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.Route("/knowledge", func(r chi.Router) {
		// Free-text entries feed the AI agent's RAG, so only super admins.
		r.With(auth.RequireAuth, auth.RequireRole(auth.RoleSuperAdmin)).Post("/embeddings", h.createEmbedding)
		r.With(auth.RequireAuth).Post("/triggers", h.processTrigger)
	})
}

func (h *Handler) createEmbedding(w http.ResponseWriter, r *http.Request) {
	var req CreateEmbeddingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	kb, err := h.svc.CreateEmbedding(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, kb)
}

func (h *Handler) processTrigger(w http.ResponseWriter, r *http.Request) {
	var req TriggerEmbeddingRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	caller, _ := auth.FromContext(r.Context())
	kb, err := h.svc.ProcessTrigger(r.Context(), caller, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, kb)
}
