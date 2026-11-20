package mcpserver

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"golang.org/x/time/rate"
)

// MaxBodyBytes bounds a JSON-RPC request: tool arguments are a few IDs and
// filters, so anything bigger is abuse.
const MaxBodyBytes = 64 << 10

// requestGrace is how long an HTTP request may outlive its tool call, so a
// timed-out call still reaches the client as a readable error.
const requestGrace = 2 * time.Second

// HTTPOptions are the protections of the remote endpoint (phase B).
type HTTPOptions struct {
	// AllowedOrigins are the browser origins accepted. Requests without an
	// Origin header (MCP hosts that are not browsers) always pass.
	AllowedOrigins []string
	// TrustedProxies are the networks whose X-Forwarded-For is believed.
	TrustedProxies []netip.Prefix
	RateLimitRPS   float64
	RateLimitBurst int
	// MaxConcurrent bounds the tool calls running at once, so a burst of
	// slow queries cannot exhaust the database pool.
	MaxConcurrent int
	// QueueWait is how long a request may wait for a free slot before the
	// server answers 503, so short bursts queue instead of failing.
	QueueWait time.Duration
	// CallTimeout must match Deps.CallTimeout; the request is allowed a
	// short grace period beyond it.
	CallTimeout time.Duration
	Logger      *slog.Logger
}

type ctxKey int

const (
	requestIDKey ctxKey = iota
	requestDoneKey
)

// RequestID returns the ID the HTTP layer gave the request, if any.
func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// NewHTTPHandler serves the MCP server over stateless Streamable HTTP at
// /mcp, plus /mcp/healthz for the proxy and monitoring. Every /mcp request
// goes through, in order: request ID, access log, method and Origin checks,
// per-IP rate limit, concurrency limit, body size limit and timeout.
func NewHTTPHandler(server *mcp.Server, o HTTPOptions) http.Handler {
	if o.Logger == nil {
		o.Logger = slog.Default()
	}
	if o.RateLimitRPS <= 0 || o.RateLimitBurst < 1 {
		o.RateLimitRPS, o.RateLimitBurst = 2, 20
	}
	if o.MaxConcurrent < 1 {
		o.MaxConcurrent = 16
	}
	if o.CallTimeout <= 0 {
		o.CallTimeout = 10 * time.Second
	}
	if o.QueueWait <= 0 {
		o.QueueWait = 2 * time.Second
	}
	mcpHandler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true, Logger: o.Logger})

	h := &httpLayer{
		opts:     o,
		origins:  make(map[string]bool, len(o.AllowedOrigins)),
		limiter:  newIPLimiter(rate.Limit(o.RateLimitRPS), o.RateLimitBurst),
		slots:    make(chan struct{}, o.MaxConcurrent),
		ipSalt:   randomSalt(),
		upstream: mcpHandler,
	}
	for _, origin := range o.AllowedOrigins {
		h.origins[strings.TrimRight(origin, "/")] = true
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /mcp/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("ok"))
	})
	mux.Handle("/mcp", h)
	return mux
}

type httpLayer struct {
	opts     HTTPOptions
	origins  map[string]bool
	limiter  *ipLimiter
	slots    chan struct{}
	ipSalt   []byte
	upstream http.Handler
}

func (h *httpLayer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id := newRequestID()
	ip := clientIP(r, h.opts.TrustedProxies)
	ctx := context.WithValue(r.Context(), requestIDKey, id)
	r = r.WithContext(ctx)
	rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	rec.Header().Set("X-Request-Id", id)

	reason := h.serve(rec, r, ip)
	// One line per request. No body, arguments, headers or raw IP: the IP is
	// hashed with a per-process salt, enough to group one client's requests.
	h.opts.Logger.Info("mcp http",
		"request_id", id,
		"method", r.Method,
		"status", rec.status,
		"rejected", reason,
		"client", h.hashIP(ip),
		"duration_ms", time.Since(start).Milliseconds(),
	)
}

// serve applies the protections in order and returns why a request was
// rejected, or "" when it reached the MCP handler.
func (h *httpLayer) serve(w http.ResponseWriter, r *http.Request, ip string) string {
	if r.Method != http.MethodPost {
		// Stateless servers have no GET stream nor sessions to DELETE.
		w.Header().Set("Allow", http.MethodPost)
		httpError(w, http.StatusMethodNotAllowed, "Solo se acepta POST.")
		return "method"
	}
	if origin := r.Header.Get("Origin"); origin != "" && !h.origins[strings.TrimRight(origin, "/")] {
		// Browsers always send Origin: a page from another site must not be
		// able to drive the server (CORS / DNS rebinding).
		httpError(w, http.StatusForbidden, "Origen no permitido.")
		return "origin"
	}
	if !h.limiter.allow(ip) {
		w.Header().Set("Retry-After", "1")
		httpError(w, http.StatusTooManyRequests, "Demasiadas solicitudes. Intenta de nuevo en un momento.")
		return "rate_limit"
	}
	if !h.acquire(r.Context()) {
		w.Header().Set("Retry-After", "1")
		httpError(w, http.StatusServiceUnavailable, "Servidor ocupado. Intenta de nuevo en un momento.")
		return "busy"
	}
	defer func() { <-h.slots }()
	if r.ContentLength > MaxBodyBytes {
		httpError(w, http.StatusRequestEntityTooLarge, "La solicitud es demasiado grande.")
		return "body_size"
	}
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	// The tool call itself stops at CallTimeout (see observe) and answers
	// with an error the client can read; the request gets a grace period on
	// top as a safety net.
	ctx, cancel := context.WithTimeout(r.Context(), h.opts.CallTimeout+requestGrace)
	defer cancel()
	// The SDK runs tool handlers on the session's context, not the request's:
	// it carries this request's values but not its cancellation. Hand the
	// request's Done channel down so observe() stops the tool when the client
	// disconnects.
	ctx = context.WithValue(ctx, requestDoneKey, ctx.Done())
	h.upstream.ServeHTTP(w, r.WithContext(ctx))
	return ""
}

// acquire waits up to QueueWait for a concurrency slot.
func (h *httpLayer) acquire(ctx context.Context) bool {
	select {
	case h.slots <- struct{}{}:
		return true
	default:
	}
	timer := time.NewTimer(h.opts.QueueWait)
	defer timer.Stop()
	select {
	case h.slots <- struct{}{}:
		return true
	case <-timer.C:
		return false
	case <-ctx.Done():
		return false
	}
}

func (h *httpLayer) hashIP(ip string) string {
	sum := sha256.Sum256(append(append([]byte{}, h.ipSalt...), ip...))
	return hex.EncodeToString(sum[:6])
}

// clientIP is the connecting address, or — only when that address is a
// trusted proxy — the rightmost X-Forwarded-For entry that is not one of our
// proxies. Leftmost entries are client-controlled and never trusted.
func clientIP(r *http.Request, trusted []netip.Prefix) string {
	remote := r.RemoteAddr
	if host, _, err := net.SplitHostPort(remote); err == nil {
		remote = host
	}
	addr, err := netip.ParseAddr(remote)
	if err != nil || !isTrusted(addr, trusted) {
		return remote
	}
	hops := strings.Split(strings.Join(r.Header.Values("X-Forwarded-For"), ","), ",")
	for i := len(hops) - 1; i >= 0; i-- {
		hop, err := netip.ParseAddr(strings.TrimSpace(hops[i]))
		if err != nil {
			break
		}
		if !isTrusted(hop, trusted) {
			return hop.Unmap().String()
		}
	}
	return remote
}

func isTrusted(addr netip.Addr, trusted []netip.Prefix) bool {
	addr = addr.Unmap()
	for _, p := range trusted {
		if p.Contains(addr) {
			return true
		}
	}
	return false
}

func httpError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(msg))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	wrote  bool
}

func (s *statusRecorder) WriteHeader(code int) {
	if !s.wrote {
		s.status, s.wrote = code, true
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	s.wrote = true
	return s.ResponseWriter.Write(b)
}

// Flush keeps streaming responses working through the recorder.
func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func newRequestID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func randomSalt() []byte {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return b
}

// ipLimiter is an in-memory token bucket per client IP, enough for the
// single MCP instance behind Caddy. Idle entries are pruned on access, so no
// background goroutine outlives the handler.
type ipLimiter struct {
	mu        sync.Mutex
	visitors  map[string]*visitor
	limit     rate.Limit
	burst     int
	lastPrune time.Time
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

const visitorTTL = 3 * time.Minute

func newIPLimiter(limit rate.Limit, burst int) *ipLimiter {
	return &ipLimiter{visitors: map[string]*visitor{}, limit: limit, burst: burst, lastPrune: time.Now()}
}

func (l *ipLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if now.Sub(l.lastPrune) > time.Minute {
		for k, v := range l.visitors {
			if now.Sub(v.lastSeen) > visitorTTL {
				delete(l.visitors, k)
			}
		}
		l.lastPrune = now
	}
	v, ok := l.visitors[ip]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(l.limit, l.burst)}
		l.visitors[ip] = v
	}
	v.lastSeen = now
	return v.limiter.Allow()
}
