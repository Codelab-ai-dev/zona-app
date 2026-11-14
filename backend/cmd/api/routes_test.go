package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
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
var routeParam = regexp.MustCompile(`\{[A-Za-z]+\}`)

var anonymousAllowed = map[string]bool{
	"GET /healthz":                        true,
	"GET /api/v1/play/videos":             true,
	"GET /api/v1/play/videos/{videoId}":   true,
	"GET /api/v1/play/clips":              true,
	"GET /api/v1/play/clips/{clipId}":     true,
	"GET /api/v1/play/streams":            true,
	"GET /api/v1/play/streams/{streamId}": true,
	"POST /api/v1/play/webhooks/mux":      true, // HMAC-signed by Mux
	"POST /api/v1/agent/webhooks/kapso":   true, // HMAC-signed by Kapso (X-Webhook-Signature)

	// leagues: active leagues/tournaments are public (legacy RLS)
	"GET /api/v1/leagues":                        true,
	"GET /api/v1/leagues/{leagueID}":             true,
	"GET /api/v1/leagues/slug/{slug}":            true,
	"GET /api/v1/leagues/{leagueID}/tournaments": true,
	"GET /api/v1/tournaments/{tournamentID}":     true,

	// teams: active teams, players (PublicPlayer DTO, no PII) and staff
	"GET /api/v1/teams":                         true,
	"GET /api/v1/teams/{teamID}":                true,
	"GET /api/v1/teams/{teamID}/players":        true,
	"GET /api/v1/teams/{teamID}/coaching-staff": true,
	"GET /api/v1/players/{playerID}":            true,
	"GET /api/v1/coaching-staff/{staffID}":      true,

	// stats: public tables of active leagues only
	"GET /api/v1/tournaments/{tournamentID}/standings":   true,
	"GET /api/v1/tournaments/{tournamentID}/top-scorers": true,
	"GET /api/v1/tournaments/{tournamentID}/discipline":  true,
	"GET /api/v1/players/{playerID}/stats":               true,
	"GET /api/v1/teams/{teamID}/stats":                   true,

	// matches: published matches of active leagues (visibility enforced in service)
	"GET /api/v1/tournaments/{tournamentID}/matches":          true,
	"GET /api/v1/tournaments/{tournamentID}/matches/upcoming": true,
	"GET /api/v1/matches/{matchID}":                           true,
	"GET /api/v1/teams/{teamID}/matches":                      true,
	"GET /api/v1/leagues/{leagueID}/matches/pending":          true,

	// Session endpoints: anonymous by definition; brute force is limited per
	// IP+email (login) and per IP (forgot), refresh needs a valid token.
	"POST /api/v1/auth/login":           true,
	"POST /api/v1/auth/refresh":         true,
	"POST /api/v1/auth/logout":          true,
	"POST /api/v1/auth/password/forgot": true,
	"POST /api/v1/auth/password/reset":  true,

	// Public team page: per-player totals, no personal data.
	"GET /api/v1/teams/{teamID}/player-stats": true,

	// League-wide public reads (active leagues, published matches only).
	"GET /api/v1/leagues/{leagueID}/stats":       true,
	"GET /api/v1/leagues/{leagueID}/top-scorers": true,
	"GET /api/v1/leagues/{leagueID}/discipline":  true,
	"GET /api/v1/players/{playerID}/matches":     true,

	// Private files: authorized by an HMAC-signed, expiring link.
	"GET /api/v1/storage/download": true,
}

// TestEveryRouteRequiresAuthUnlessAllowlisted mounts every module with all
// integrations enabled and asserts that anonymous requests are rejected with
// 401 on any route not explicitly allowlisted above.
// newTestAPI mounts every module with all integrations enabled against a
// pool that never connects, for route-level tests.
func newTestAPI(t *testing.T) http.Handler {
	t.Helper()
	return newTestAPIWith(t, nil)
}

// newTestAPIWith is newTestAPI with a hook to adjust the config first.
func newTestAPIWith(t *testing.T, adjust func(*config.Config)) http.Handler {
	t.Helper()
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
		AppURL:        "http://localhost",
		JWTSecret:     strings.Repeat("x", 32),
		Storage:       config.StorageConfig{Dir: t.TempDir()},
		Notifications: config.NotificationsConfig{KapsoBaseURL: "http://kapso.invalid", KapsoAPIKey: "k", PhoneNumberID: "1", PublicSiteURL: "http://site.invalid"},
		PlayEnabled:   true,
		Mux:           config.MuxConfig{TokenID: "id", TokenSecret: "secret", WebhookSecret: "whsec"},
		OpenAI:        config.OpenAIConfig{BaseURL: "http://openai.invalid", APIKey: "k", EmbeddingModel: "m"},
		Agent:         config.AgentConfig{LLMBaseURL: "http://llm.invalid", LLMAPIKey: "k", LLMModel: "m", KapsoWebhookSecret: "whsec"},
	}
	if adjust != nil {
		adjust(&cfg)
	}
	tokens := auth.NewTokenService(strings.Repeat("x", 32), "zona-api", time.Minute)
	modules, err := buildModules(t.Context(), cfg, pool, tokens)
	if err != nil {
		t.Fatal(err)
	}
	handler := server.NewRouter(server.Deps{
		Auth:    auth.NewMiddleware(tokens, auth.NewPGProfileLoader(pool)),
		Health:  http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
		Modules: modules,
	})
	return handler
}

func TestEveryRouteRequiresAuthUnlessAllowlisted(t *testing.T) {
	handler := newTestAPI(t)
	routes, ok := handler.(chi.Routes)
	if !ok {
		t.Fatal("router does not expose chi.Routes")
	}

	var checked int
	err := chi.Walk(routes, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		route = strings.ReplaceAll(route, "/*/", "/")
		key := method + " " + route
		if anonymousAllowed[key] {
			return nil
		}
		checked++
		path := routeParam.ReplaceAllStringFunc(route, func(p string) string {
			if p == "{slug}" {
				return "liga"
			}
			if p == "{round}" {
				return "1"
			}
			return "00000000-0000-0000-0000-000000000001"
		})

		req := httptest.NewRequest(method, path, strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		// A distinct client IP per request keeps the per-IP rate limiter out of the way.
		req.RemoteAddr = fmt.Sprintf("10.%d.%d.%d:1234", checked/65536, (checked/256)%256, checked%256)
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
