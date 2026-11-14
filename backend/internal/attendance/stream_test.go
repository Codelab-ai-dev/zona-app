package attendance

import (
	"bufio"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// streamRepo feeds the stream from a channel and counts running pollers, so
// tests can prove none outlives its request.
type streamRepo struct {
	*fakeRepository
	records chan AttendanceRecord
	err     error // returned when records is closed
	running atomic.Int32
}

func newStreamRepo() *streamRepo {
	return &streamRepo{
		fakeRepository: &fakeRepository{
			qrRecords:     make(map[uuid.UUID][]QRAttendance),
			facialRecords: make(map[uuid.UUID][]FacialAttendance),
		},
		records: make(chan AttendanceRecord),
	}
}

func (s *streamRepo) StreamAttendance(ctx context.Context, _ uuid.UUID, ch chan AttendanceRecord) error {
	s.running.Add(1)
	defer s.running.Add(-1)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case rec, ok := <-s.records:
			if !ok {
				return s.err
			}
			select {
			case ch <- rec:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

// Production-like timeouts, scaled down: the stream must outlive them.
const (
	testReadTimeout  = 150 * time.Millisecond
	testWriteTimeout = 250 * time.Millisecond
)

type streamEnv struct {
	srv  *httptest.Server
	h    *Handler
	repo *streamRepo
}

// newStreamEnv serves the handler through a real http.Server with read and
// write timeouts and a wrapping ResponseWriter, like cmd/api and the router.
func newStreamEnv(t *testing.T, allowed bool, tune func(*Handler)) *streamEnv {
	t.Helper()
	repo := newStreamRepo()
	az := &fakeAuthzAttendance{allowed: allowed}
	h := NewHandler(NewService(repo, az), az)
	h.streamHeartbeat = 40 * time.Millisecond
	h.streamWrite = time.Second
	h.streamMaxAge = 10 * time.Second
	if tune != nil {
		tune(h)
	}

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler { // like requestLogger
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(middleware.NewWrapResponseWriter(w, r.ProtoMajor), r)
		})
	})
	r.Use(func(next http.Handler) http.Handler { // principal from a test header
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id, err := uuid.Parse(r.Header.Get("X-Test-User"))
			if err == nil {
				r = r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserID: id, Role: auth.RoleLeagueAdmin, IsActive: true}))
			}
			next.ServeHTTP(w, r)
		})
	})
	h.Routes(r)

	srv := httptest.NewUnstartedServer(r)
	srv.Config.ReadHeaderTimeout = testReadTimeout
	srv.Config.ReadTimeout = testReadTimeout
	srv.Config.WriteTimeout = testWriteTimeout
	srv.Start()
	t.Cleanup(srv.Close)
	return &streamEnv{srv: srv, h: h, repo: repo}
}

func (e *streamEnv) open(t *testing.T, ctx context.Context, user uuid.UUID) *http.Response {
	t.Helper()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, e.srv.URL+"/matches/"+uuid.NewString()+"/attendance/stream", nil)
	req.Header.Set("X-Test-User", user.String())
	resp, err := e.srv.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func (e *streamEnv) activeStreams() int {
	e.h.streamMu.Lock()
	defer e.h.streamMu.Unlock()
	n := 0
	for _, c := range e.h.streams {
		n += c
	}
	return n
}

// eventually polls cond for up to 2 s.
func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(10 * time.Millisecond) {
		if cond() {
			return
		}
	}
	t.Fatalf("timed out waiting for %s", what)
}

// The stream keeps running past the server's read and write timeouts,
// delivers records, and cleans up when the client disconnects.
func TestStreamOutlivesServerTimeouts(t *testing.T) {
	e := newStreamEnv(t, true, nil)
	ctx, cancel := context.WithCancel(context.Background())
	resp := e.open(t, ctx, uuid.New())
	if resp.StatusCode != http.StatusOK || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		t.Fatalf("status %d, content-type %q", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("stream must not override CORS, got Access-Control-Allow-Origin %q", got)
	}

	lines := make(chan string)
	scanErr := make(chan error, 1)
	go func() {
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
			lines <- sc.Text()
		}
		scanErr <- sc.Err()
		close(lines)
	}()

	start := time.Now()
	stayOpen := 4 * testWriteTimeout
	heartbeats, sent, gotRecord := 0, false, false
	for time.Since(start) < stayOpen || !gotRecord {
		if !sent && time.Since(start) > 2*testWriteTimeout {
			e.repo.records <- AttendanceRecord{PlayerName: "Jugador Tardío", Source: "qr"}
			sent = true
		}
		select {
		case l, ok := <-lines:
			if !ok {
				t.Fatalf("stream closed after %v: %v", time.Since(start), <-scanErr)
			}
			if l == ": heartbeat" {
				heartbeats++
			}
			if strings.HasPrefix(l, "data: ") && strings.Contains(l, "Jugador Tardío") {
				gotRecord = true
			}
		case <-time.After(time.Second):
			t.Fatalf("no data for 1s after %v", time.Since(start))
		}
	}
	if heartbeats < 5 {
		t.Errorf("heartbeats = %d over %v", heartbeats, time.Since(start))
	}

	cancel() // client disconnects
	resp.Body.Close()
	eventually(t, "poller to stop", func() bool { return e.repo.running.Load() == 0 })
	eventually(t, "stream slot to be released", func() bool { return e.activeStreams() == 0 })
}

// The stream ends cleanly at its maximum age, and when the poller fails.
func TestStreamEndsCleanly(t *testing.T) {
	t.Run("max age", func(t *testing.T) {
		e := newStreamEnv(t, true, func(h *Handler) { h.streamMaxAge = 2 * testWriteTimeout })
		start := time.Now()
		resp := e.open(t, context.Background(), uuid.New())
		defer resp.Body.Close()
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
		}
		if err := sc.Err(); err != nil {
			t.Fatalf("stream did not end cleanly: %v", err)
		}
		if d := time.Since(start); d < 2*testWriteTimeout || d > 2*time.Second {
			t.Fatalf("stream lasted %v", d)
		}
		eventually(t, "poller to stop", func() bool { return e.repo.running.Load() == 0 })
		eventually(t, "stream slot to be released", func() bool { return e.activeStreams() == 0 })
	})

	t.Run("poller error", func(t *testing.T) {
		e := newStreamEnv(t, true, nil)
		e.repo.err = errors.New("db down")
		resp := e.open(t, context.Background(), uuid.New())
		defer resp.Body.Close()
		close(e.repo.records)
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
		}
		if err := sc.Err(); err != nil {
			t.Fatalf("stream did not end cleanly: %v", err)
		}
		eventually(t, "stream slot to be released", func() bool { return e.activeStreams() == 0 })
	})
}

func TestStreamAuthorizationAndLimits(t *testing.T) {
	t.Run("forbidden", func(t *testing.T) {
		e := newStreamEnv(t, false, nil)
		resp := e.open(t, context.Background(), uuid.New())
		resp.Body.Close()
		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", resp.StatusCode)
		}
		if e.repo.running.Load() != 0 {
			t.Fatal("poller started for a forbidden caller")
		}
	})

	t.Run("three streams per user", func(t *testing.T) {
		e := newStreamEnv(t, true, nil)
		user := uuid.New()
		cancels := make([]context.CancelFunc, 0, maxStreamsPerUser)
		for i := 0; i < maxStreamsPerUser; i++ {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			cancels = append(cancels, cancel)
			if resp := e.open(t, ctx, user); resp.StatusCode != http.StatusOK {
				t.Fatalf("stream %d: status %d", i+1, resp.StatusCode)
			}
		}

		resp := e.open(t, context.Background(), user)
		resp.Body.Close()
		if resp.StatusCode != http.StatusTooManyRequests {
			t.Fatalf("4th stream: status %d, want 429", resp.StatusCode)
		}

		other, cancelOther := context.WithCancel(context.Background())
		defer cancelOther()
		if resp := e.open(t, other, uuid.New()); resp.StatusCode != http.StatusOK {
			t.Fatalf("another user: status %d", resp.StatusCode)
		}

		cancels[0]() // a disconnect frees a slot
		eventually(t, "a slot to be released", func() bool { return e.activeStreams() == maxStreamsPerUser })
		again, cancelAgain := context.WithCancel(context.Background())
		defer cancelAgain()
		if resp := e.open(t, again, user); resp.StatusCode != http.StatusOK {
			t.Fatalf("after disconnect: status %d", resp.StatusCode)
		}
	})
}
