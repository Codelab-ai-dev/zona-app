package storage

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls.
type Handler struct {
	svc *Service
}

// NewHandler builds the storage HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.With(auth.RequireAuth).Post("/storage/objects", h.upload)
	r.With(auth.RequireAuth).Delete("/storage/objects", h.delete)
	r.With(auth.RequireAuth).Get("/storage/objects", h.list)
	r.With(auth.RequireAuth).Get("/storage/url", h.url)
}

// upload handles POST /storage/objects with multipart/form-data.
// Streams the file to prevent DoS from large file buffering.
func (h *Handler) upload(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	scopeStr := r.FormValue("scope")
	scopeIDStr := r.FormValue("scope_id")

	// Parse scope_id
	scopeID, err := uuid.Parse(scopeIDStr)
	if err != nil {
		httpx.WriteError(w, r, httpx.Validation(map[string]string{"scope_id": "must be a valid UUID"}))
		return
	}

	// Determine max bytes for this scope before opening the file
	scope := Scope(scopeStr)
	maxBytes := h.svc.cfg.MaxUploadBytesForScope(scope)

	// Set request body size limit: max file size + 1 MiB for multipart headers
	// This prevents DoS attacks that try to send unlimited data
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes+1024*1024)
	defer r.Body.Close()

	// Parse multipart with small memory limit (8 MiB for memory, rest goes to disk)
	if err := r.ParseMultipartForm(8 * 1024 * 1024); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			httpx.WriteError(w, r, httpx.ErrTooLarge)
			return
		}
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}
	defer r.MultipartForm.RemoveAll()

	// Open file from multipart form
	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.WriteError(w, r, httpx.ErrBadRequest.Wrap(err))
		return
	}
	defer file.Close()

	// Call service with streaming (not buffering entire file)
	result, err := h.svc.Upload(r.Context(), caller, scope, scopeID, file, header.Size, header.Filename)
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			httpx.WriteError(w, r, httpx.ErrTooLarge)
			return
		}
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, result)
}

// delete handles DELETE /storage/objects with JSON body.
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	var req DeleteRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	err := h.svc.Delete(r.Context(), caller, req.Key)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.NoContent(w)
}

// list handles GET /storage/objects?scope=...&scope_id=...
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	scopeStr := r.URL.Query().Get("scope")
	scopeIDStr := r.URL.Query().Get("scope_id")

	scopeID, err := uuid.Parse(scopeIDStr)
	if err != nil {
		httpx.WriteError(w, r, httpx.Validation(map[string]string{"scope_id": "must be a valid UUID"}))
		return
	}

	objects, err := h.svc.List(r.Context(), caller, Scope(scopeStr), scopeID, page.Limit)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, objects, page)
}

// url handles GET /storage/url?key=...
func (h *Handler) url(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())

	key := r.URL.Query().Get("key")
	if key == "" {
		httpx.WriteError(w, r, httpx.Validation(map[string]string{"key": "required"}))
		return
	}

	url, err := h.svc.URL(r.Context(), caller, key)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"url": url})
}
