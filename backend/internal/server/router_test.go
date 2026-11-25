package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

type noTokens struct{}

func (noTokens) Verify(string) (uuid.UUID, error) {
	return uuid.Nil, errors.New("no tokens in this test")
}

type noProfiles struct{}

func (noProfiles) LoadPrincipal(context.Context, uuid.UUID) (auth.Principal, error) {
	return auth.Principal{}, errors.New("no profiles in this test")
}

// waitModule answers 200 if the request outlives 3x the request timeout,
// or returns as soon as its context ends (the timeout then answers 504).
type waitModule struct{ timeout time.Duration }

func (m waitModule) Routes(r chi.Router) {
	wait := func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-time.After(3 * m.timeout):
			w.WriteHeader(http.StatusOK)
		}
	}
	r.Get("/matches/{matchID}/attendance/stream", wait)
	r.Get("/matches/{matchID}/attendance", wait)
	r.Post("/matches/{matchID}/attendance/qr", wait)
}

// The global timeout still bounds normal requests; only the SSE route is exempt.
func TestTimeoutExemptsOnlyStreams(t *testing.T) {
	const timeout = 50 * time.Millisecond
	h := NewRouter(Deps{
		Auth:           auth.NewMiddleware(noTokens{}, noProfiles{}),
		Health:         http.NotFoundHandler(),
		Modules:        []Module{waitModule{timeout}},
		RequestTimeout: timeout,
	})
	match := uuid.NewString()
	cases := []struct {
		method, path string
		want         int
	}{
		{http.MethodGet, "/api/v1/matches/" + match + "/attendance/stream", http.StatusOK},
		{http.MethodGet, "/api/v1/matches/" + match + "/attendance", http.StatusGatewayTimeout},
		{http.MethodPost, "/api/v1/matches/" + match + "/attendance/qr", http.StatusGatewayTimeout},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(c.method, c.path, nil))
		if rec.Code != c.want {
			t.Errorf("%s %s = %d, want %d", c.method, c.path, rec.Code, c.want)
		}
	}
}

func TestDefaultRequestTimeout(t *testing.T) {
	var deadline time.Time
	h := NewRouter(Deps{
		Auth:   auth.NewMiddleware(noTokens{}, noProfiles{}),
		Health: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { deadline, _ = r.Context().Deadline() }),
	})
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if left := time.Until(deadline); left < 29*time.Second || left > 30*time.Second {
		t.Fatalf("default timeout left %v, want 30s", left)
	}
}

func TestIsStream(t *testing.T) {
	cases := []struct {
		method, target string
		want           bool
	}{
		{http.MethodGet, "/api/v1/matches/abc/attendance/stream", true},
		{http.MethodPost, "/api/v1/matches/abc/attendance/stream", false},
		{http.MethodGet, "/api/v1/matches/abc/attendance/stream/", false},
		{http.MethodGet, "/api/v1/matches/abc/attendance/streamx", false},
		{http.MethodGet, "/api/v1/matches/a/b/attendance/stream", false},
		{http.MethodGet, "/api/v1/matches/a%2Fb/attendance/stream", true}, // one segment for chi too
		{http.MethodGet, "/api/v1/matches/abc/attendance%2Fstream", false},
		{http.MethodGet, "/api/v1/matches/abc/attendance", false},
		{http.MethodGet, "/x/api/v1/matches/abc/attendance/stream", false},
	}
	for _, c := range cases {
		if got := isStream(httptest.NewRequest(c.method, c.target, nil)); got != c.want {
			t.Errorf("%s %s = %v, want %v", c.method, c.target, got, c.want)
		}
	}
}

// Every response carries a server-generated X-Request-Id; error bodies and
// the access log line repeat it (#54).
func TestRequestID(t *testing.T) {
	var logs bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(prev) })

	h := NewRouter(Deps{
		Auth:   auth.NewMiddleware(noTokens{}, noProfiles{}),
		Health: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
	})
	valid := regexp.MustCompile(`^[23456789abcdefghjkmnpqrstuvwxyz]{10}$`)

	seen := map[string]bool{}
	for _, path := range []string{"/healthz", "/healthz", "/api/v1/nope"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		id := rec.Header().Get("X-Request-Id")
		if !valid.MatchString(id) {
			t.Fatalf("%s: X-Request-Id = %q", path, id)
		}
		if seen[id] {
			t.Fatalf("request ID %q reused", id)
		}
		seen[id] = true
	}

	t.Run("error body and access log share the header's ID", func(t *testing.T) {
		logs.Reset()
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/nope", nil))
		id := rec.Header().Get("X-Request-Id")
		var body struct {
			Error struct {
				RequestID string `json:"request_id"`
			} `json:"error"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.RequestID != id {
			t.Fatalf("body request_id = %q (%v), header %q", body.Error.RequestID, err, id)
		}
		if !strings.Contains(logs.String(), `"msg":"http request"`) || !strings.Contains(logs.String(), `"request_id":"`+id+`"`) {
			t.Fatalf("access log lacks %s: %s", id, logs.String())
		}
	})

	t.Run("client-sent IDs are ignored", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/nope", nil)
		req.Header.Set("X-Request-Id", "forged\nline")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if id := rec.Header().Get("X-Request-Id"); !valid.MatchString(id) || strings.Contains(rec.Body.String(), "forged") {
			t.Fatalf("forged ID accepted: header %q body %s", id, rec.Body)
		}
	})
}

// The API keeps its own CORS policy, and the OAuth endpoints (mounted only
// when enabled) answer preflights from any origin without credentials.
func TestCORSScopes(t *testing.T) {
	oauthEndpoints := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusNoContent)
	})
	preflight := func(h http.Handler, path, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, path, nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "POST")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}
	deps := Deps{
		AllowedOrigins: []string{"https://zonagol.app"},
		Auth:           auth.NewMiddleware(noTokens{}, noProfiles{}),
		Health:         http.NotFoundHandler(),
		Modules:        []Module{waitModule{time.Millisecond}},
	}

	off := NewRouter(deps)
	if rec := preflight(off, "/api/v1/matches/1/attendance/qr", "https://zonagol.app"); rec.Header().Get("Access-Control-Allow-Origin") != "https://zonagol.app" {
		t.Fatalf("listed origin lost API CORS: %v", rec.Header())
	}
	if rec := preflight(off, "/api/v1/matches/1/attendance/qr", "https://evil.example"); rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("unlisted origin got API CORS: %v", rec.Header())
	}
	if rec := preflight(off, "/oauth/token", "http://localhost:6274"); rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("oauth must not exist when disabled: %d %v", rec.Code, rec.Header())
	}

	deps.OAuth = oauthEndpoints
	on := NewRouter(deps)
	for _, path := range []string{"/oauth/token", "/.well-known/oauth-authorization-server"} {
		if rec := preflight(on, path, "http://localhost:6274"); rec.Header().Get("Access-Control-Allow-Origin") != "*" {
			t.Fatalf("%s preflight blocked: %d %v", path, rec.Code, rec.Header())
		}
	}
	if rec := preflight(on, "/api/v1/matches/1/attendance/qr", "http://localhost:6274"); rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("enabling oauth widened API CORS: %v", rec.Header())
	}
}
