// Package server wires HTTP middleware and mounts every module's routes.
package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Module is implemented by every feature package's HTTP handler.
// Routes are mounted under /api/v1.
type Module interface {
	Routes(r chi.Router)
}

// Deps are the shared dependencies the router needs.
type Deps struct {
	AllowedOrigins []string
	TrustProxy     bool
	Auth           *auth.Middleware
	Health         http.Handler
	Modules        []Module
	// OAuth serves the authorization server endpoints at the root
	// (/.well-known/oauth-authorization-server and /oauth/*); nil when
	// MCP_OAUTH_ENABLED is off. It brings its own CORS policy.
	OAuth http.Handler
	// RequestTimeout bounds every non-streaming request; zero means 30s.
	RequestTimeout time.Duration
}

// NewRouter builds the root handler.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(requestID)
	if d.TrustProxy {
		// Only safe when the API is reachable exclusively through Caddy.
		r.Use(middleware.RealIP)
	}
	r.Use(requestLogger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)
	timeout := d.RequestTimeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	r.Use(timeoutExceptStreams(timeout))
	r.Use(newIPRateLimiter(20, 40).Middleware)

	r.Method(http.MethodGet, "/healthz", d.Health)

	// The API's CORS policy wraps only /api/v1: it answers preflights from
	// unlisted origins itself, which would block the OAuth endpoints.
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(cors.Handler(cors.Options{
			AllowedOrigins:   d.AllowedOrigins,
			AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
			ExposedHeaders:   []string{"X-Request-ID"},
			AllowCredentials: false,
			MaxAge:           300,
		}))
		api.Use(d.Auth.Authenticate)
		for _, m := range d.Modules {
			m.Routes(api)
		}
	})

	if d.OAuth != nil {
		r.Handle("/.well-known/oauth-authorization-server", d.OAuth)
		r.Handle("/oauth/*", d.OAuth)
	}

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, r, httpx.ErrNotFound)
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, r, &httpx.Error{Status: http.StatusMethodNotAllowed, Code: "method_not_allowed", Message: "Método no permitido"})
	})
	return r
}
