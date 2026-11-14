package server

import (
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"golang.org/x/time/rate"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// securityHeaders sets conservative defaults for a JSON API.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// streamRoutes are the long-lived Server-Sent Events endpoints. Their handlers
// bound their own lifetime and per-write deadlines, so the global request
// timeout would only cut them at 30 s (#43). Keep this list exact.
var streamRoutes = regexp.MustCompile(`^/api/v1/matches/[^/]+/attendance/stream$`)

// isStream reports whether r targets a streaming route, matching the same
// path chi routes on.
func isStream(r *http.Request) bool {
	path := r.URL.RawPath
	if path == "" {
		path = r.URL.Path
	}
	return r.Method == http.MethodGet && streamRoutes.MatchString(path)
}

// timeoutExceptStreams applies middleware.Timeout to every request except
// the streaming routes.
func timeoutExceptStreams(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		bounded := middleware.Timeout(d)(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isStream(r) {
				next.ServeHTTP(w, r)
				return
			}
			bounded.ServeHTTP(w, r)
		})
	}
}

// requestLogger logs one structured line per request.
func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.InfoContext(r.Context(), "http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"bytes", ww.BytesWritten(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
		)
	})
}

// ipRateLimiter is an in-memory token bucket per client IP. It is enough for
// a single instance behind Caddy; move to Redis if the API is scaled out.
type ipRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*visitor
	rps      rate.Limit
	burst    int
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newIPRateLimiter(rps float64, burst int) *ipRateLimiter {
	l := &ipRateLimiter{limiters: make(map[string]*visitor), rps: rate.Limit(rps), burst: burst}
	go l.cleanup()
	return l
}

func (l *ipRateLimiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	v, ok := l.limiters[ip]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(l.rps, l.burst)}
		l.limiters[ip] = v
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (l *ipRateLimiter) cleanup() {
	for range time.Tick(time.Minute) {
		l.mu.Lock()
		for ip, v := range l.limiters {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(l.limiters, ip)
			}
		}
		l.mu.Unlock()
	}
}

// Middleware rejects requests over the per-IP budget. It relies on
// r.RemoteAddr, which middleware.RealIP rewrites when behind the proxy.
func (l *ipRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		if !l.get(ip).Allow() {
			w.Header().Set("Retry-After", "1")
			httpx.WriteError(w, r, httpx.ErrRateLimited)
			return
		}
		next.ServeHTTP(w, r)
	})
}
