// Package health exposes the liveness/readiness endpoint.
package health

import (
	"context"
	"net/http"
	"time"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Pinger is satisfied by *pgxpool.Pool.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Handler reports whether the API and its database are reachable.
type Handler struct {
	db Pinger
}

// NewHandler builds the health handler.
func NewHandler(db Pinger) *Handler { return &Handler{db: db} }

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := h.db.Ping(ctx); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded"})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
