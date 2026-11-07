package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/server"
)

// anonymousAllowed lists every route reachable without a bearer token.
// Adding a route here is a security decision: it must be reviewed.
var anonymousAllowed = map[string]bool{
	"GET /healthz":                        true,
	"GET /api/v1/play/videos":             true,
	"GET /api/v1/play/videos/{videoId}":   true,
	"GET /api/v1/play/clips":              true,
	"GET /api/v1/play/clips/{clipId}":     true,
	"GET /api/v1/play/streams":            true,
	"GET /api/v1/play/streams/{streamId}": true,
	"POST /api/v1/play/webhooks/mux":      true, // HMAC-signed by Mux
}

// TestEveryRouteRequiresAuthUnlessAllowlisted mounts every module with all
// integrations enabled and asserts that anonymous requests are rejected with
// 401 on any route not explicitly allowlisted above.
func TestEveryRouteRequiresAuthUnlessAllowlisted(t *testing.T) {
	// The pool never connects: rejected requests must not reach the database.
	poolCfg, err := pgxpool.ParseConfig("postgres://u:p@127.0.0.1:1/none?connect_timeout=1")
	if err != nil {
		t.Fatal(err)
	}
	pool, err := pgxpool.NewWithConfig(context.Background(), poolCfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	cfg := config.Config{
		SupabaseURL:            "http://supabase.invalid",
		SupabaseServiceRoleKey: "service-role",
		Storage:                config.StorageConfig{Region: "us-east-1", Bucket: "b", AccessKeyID: "k", SecretAccessKey: "s", Endpoint: "http://s3.invalid"},
		Notifications:          config.NotificationsConfig{KapsoBaseURL: "http://kapso.invalid", KapsoAPIKey: "k", PhoneNumberID: "1", PublicSiteURL: "http://site.invalid"},
		Mux:                    config.MuxConfig{TokenID: "id", TokenSecret: "secret", WebhookSecret: "whsec"},
		OpenAI:                 config.OpenAIConfig{BaseURL: "http://openai.invalid", APIKey: "k", EmbeddingModel: "m"},
	}
	modules, err := buildModules(cfg, pool)
	if err != nil {
		t.Fatal(err)
	}
	tokens := auth.NewTokenService(strings.Repeat("x", 32), "zona-api", time.Minute, "")
	handler := server.NewRouter(server.Deps{
		Auth:    auth.NewMiddleware(tokens, auth.NewPGProfileLoader(pool)),
		Health:  http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
		Modules: modules,
	})

	routes, ok := handler.(chi.Routes)
	if !ok {
		t.Fatal("router does not expose chi.Routes")
	}

	var checked int
	err = chi.Walk(routes, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		route = strings.ReplaceAll(route, "/*/", "/")
		key := method + " " + route
		if anonymousAllowed[key] {
			return nil
		}
		checked++
		path := strings.NewReplacer(
			"{videoId}", "00000000-0000-0000-0000-000000000001",
			"{clipId}", "00000000-0000-0000-0000-000000000001",
			"{streamId}", "00000000-0000-0000-0000-000000000001",
			"{userID}", "00000000-0000-0000-0000-000000000001",
			"{leagueID}", "00000000-0000-0000-0000-000000000001",
			"{matchID}", "00000000-0000-0000-0000-000000000001",
		).Replace(route)

		req := httptest.NewRequest(method, path, strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s: anonymous request got %d, want 401 (add auth.RequireAuth or allowlist it after review)", key, rec.Code)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if checked < 20 {
		t.Fatalf("only %d protected routes found; modules were probably not mounted", checked)
	}
}
