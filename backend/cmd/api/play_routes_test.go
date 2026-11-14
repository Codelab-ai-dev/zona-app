package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
)

// Zona Play is deferred: unless PLAY_ENABLED=true none of its routes is
// mounted, so the public reads and the Mux webhook answer 404 (#51).
func TestPlayRoutesOnlyWhenEnabled(t *testing.T) {
	probes := []struct{ method, path string }{
		{http.MethodGet, "/api/v1/play/videos"},
		{http.MethodGet, "/api/v1/play/videos/00000000-0000-0000-0000-000000000001"},
		{http.MethodGet, "/api/v1/play/clips"},
		{http.MethodGet, "/api/v1/play/streams"},
		{http.MethodGet, "/api/v1/play/streams/00000000-0000-0000-0000-000000000001"},
		{http.MethodPost, "/api/v1/play/webhooks/mux"},
	}

	t.Run("disabled", func(t *testing.T) {
		h := newTestAPIWith(t, func(c *config.Config) { c.PlayEnabled = false })
		for _, p := range probes {
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, httptest.NewRequest(p.method, p.path, strings.NewReader("{}")))
			if rec.Code != http.StatusNotFound {
				t.Errorf("%s %s = %d, want 404", p.method, p.path, rec.Code)
			}
		}
		routes := h.(chi.Routes)
		_ = chi.Walk(routes, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
			if strings.Contains(route, "/play/") {
				t.Errorf("play route mounted while disabled: %s %s", method, route)
			}
			return nil
		})
	})

	t.Run("enabled", func(t *testing.T) {
		routes := newTestAPIWith(t, func(c *config.Config) { c.PlayEnabled = true }).(chi.Routes)
		for _, p := range probes {
			if !routes.Match(chi.NewRouteContext(), p.method, p.path) {
				t.Errorf("%s %s not mounted while enabled", p.method, p.path)
			}
		}
	})
}

// A league API must not need Play: the default (unset) config keeps it off.
func TestPlayDisabledByDefault(t *testing.T) {
	t.Setenv("PLAY_ENABLED", "")
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost/db")
	t.Setenv("JWT_SECRET", strings.Repeat("x", 32))
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.PlayEnabled {
		t.Fatal("PLAY_ENABLED must default to false")
	}
}
