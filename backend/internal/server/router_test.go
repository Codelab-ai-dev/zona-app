package server

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
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
