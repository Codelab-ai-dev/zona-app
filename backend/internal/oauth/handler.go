package oauth

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"golang.org/x/time/rate"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// maxFormBytes bounds the token, revocation and registration bodies.
const maxFormBytes = 16 << 10

// Handler serves the OAuth endpoints and the consent API.
type Handler struct {
	svc       *Service
	registers *ipLimiter
}

// NewHandler builds the handler.
func NewHandler(svc *Service) *Handler {
	// Registration is open, so it is the endpoint worth flooding: a few
	// clients per hour per address is plenty for real MCP hosts.
	return &Handler{svc: svc, registers: newIPLimiter(rate.Every(3*time.Minute), 10)}
}

// Routes mounts the consent and connected-apps API under /api/v1/oauth. The
// web calls it with the user's normal session.
func (h *Handler) Routes(r chi.Router) {
	r.Route("/oauth", func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Get("/requests/{requestID}", h.consent)
		r.Post("/requests/{requestID}/decision", h.decide)
		r.Get("/connections", h.connections)
		r.Delete("/connections/{grantID}", h.disconnect)
	})
}

// Endpoints serves the protocol endpoints at the site root: metadata,
// /oauth/authorize, /oauth/token, /oauth/register and /oauth/revoke.
// MCP hosts may call them from a browser (e.g. MCP Inspector), so they allow
// any origin; none of them uses cookies.
func (h *Handler) Endpoints() http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type", "MCP-Protocol-Version"},
		MaxAge:         300,
	}))
	r.Get("/.well-known/oauth-authorization-server", h.metadata)
	r.Get("/oauth/authorize", h.authorize)
	r.Post("/oauth/token", h.token)
	r.Post("/oauth/register", h.register)
	r.Post("/oauth/revoke", h.revoke)
	r.NotFound(func(w http.ResponseWriter, r *http.Request) { httpx.WriteError(w, r, httpx.ErrNotFound) })
	return r
}

func (h *Handler) metadata(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=3600")
	httpx.JSON(w, http.StatusOK, h.svc.Metadata())
}

func (h *Handler) authorize(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	location, err := h.svc.Authorize(r.Context(), AuthorizeParams{
		ResponseType:        q.Get("response_type"),
		ClientID:            q.Get("client_id"),
		RedirectURI:         q.Get("redirect_uri"),
		Scope:               q.Get("scope"),
		State:               q.Get("state"),
		CodeChallenge:       q.Get("code_challenge"),
		CodeChallengeMethod: q.Get("code_challenge_method"),
		Resource:            q.Get("resource"),
	})
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	http.Redirect(w, r, location, http.StatusFound)
}

func (h *Handler) token(w http.ResponseWriter, r *http.Request) {
	cred, ok := h.parseClientForm(w, r)
	if !ok {
		return
	}
	f := r.PostForm
	resp, err := h.svc.Token(r.Context(), cred, TokenRequest{
		GrantType:    f.Get("grant_type"),
		Code:         f.Get("code"),
		RedirectURI:  f.Get("redirect_uri"),
		CodeVerifier: f.Get("code_verifier"),
		RefreshToken: f.Get("refresh_token"),
		Resource:     f.Get("resource"),
		Scope:        f.Get("scope"),
	})
	if err != nil {
		writeOAuthError(w, r, err)
		return
	}
	w.Header().Set("Pragma", "no-cache")
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) revoke(w http.ResponseWriter, r *http.Request) {
	cred, ok := h.parseClientForm(w, r)
	if !ok {
		return
	}
	if err := h.svc.Revoke(r.Context(), cred, r.PostForm.Get("token")); err != nil {
		writeOAuthError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	if !h.registers.allow(clientIP(r)) {
		w.Header().Set("Retry-After", "180")
		writeOAuthError(w, r, oauthErr(http.StatusTooManyRequests, "slow_down", "too many registrations from this address"))
		return
	}
	if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		writeOAuthError(w, r, oauthErr(http.StatusBadRequest, "invalid_client_metadata", "expected application/json"))
		return
	}
	// Unknown metadata fields are allowed by RFC 7591 and ignored here.
	var req RegistrationRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxFormBytes)).Decode(&req); err != nil {
		writeOAuthError(w, r, oauthErr(http.StatusBadRequest, "invalid_client_metadata", "malformed JSON body"))
		return
	}
	resp, err := h.svc.Register(r.Context(), req)
	if err != nil {
		writeOAuthError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, resp)
}

// parseClientForm reads a form body and the client credentials, from the
// Basic header (RFC 6749 §2.3.1, form-urlencoded inside) or the form.
func (h *Handler) parseClientForm(w http.ResponseWriter, r *http.Request) (ClientCredentials, bool) {
	if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		writeOAuthError(w, r, oauthErr(http.StatusBadRequest, "invalid_request", "expected application/x-www-form-urlencoded"))
		return ClientCredentials{}, false
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxFormBytes)
	if err := r.ParseForm(); err != nil {
		writeOAuthError(w, r, oauthErr(http.StatusBadRequest, "invalid_request", "malformed form body"))
		return ClientCredentials{}, false
	}
	if id, secret, ok := r.BasicAuth(); ok {
		uid, err1 := url.QueryUnescape(id)
		usecret, err2 := url.QueryUnescape(secret)
		if err1 != nil || err2 != nil || (r.PostForm.Get("client_id") != "" && r.PostForm.Get("client_id") != uid) {
			writeOAuthError(w, r, errInvalidClient)
			return ClientCredentials{}, false
		}
		return ClientCredentials{ClientID: uid, ClientSecret: usecret}, true
	}
	return ClientCredentials{ClientID: r.PostForm.Get("client_id"), ClientSecret: r.PostForm.Get("client_secret")}, true
}

// writeOAuthError answers in the RFC 6749 error format. Internal errors
// keep the API format and never reach the client in detail.
func writeOAuthError(w http.ResponseWriter, r *http.Request, err error) {
	var oe *Error
	if !errors.As(err, &oe) {
		httpx.WriteError(w, r, err)
		return
	}
	if oe.Status == http.StatusUnauthorized {
		w.Header().Set("WWW-Authenticate", `Basic realm="zona-gol"`)
	}
	httpx.JSON(w, oe.Status, map[string]string{"error": oe.Code, "error_description": oe.Description})
}

// --- consent API ---

func (h *Handler) consent(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "requestID")
	if err != nil {
		httpx.WriteError(w, r, errRequestGone)
		return
	}
	c, err := h.svc.ConsentFor(r.Context(), p, id)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) decide(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "requestID")
	if err != nil {
		httpx.WriteError(w, r, errRequestGone)
		return
	}
	var req DecisionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	d, err := h.svc.Decide(r.Context(), p, id, req.Approve)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, d)
}

func (h *Handler) connections(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.FromContext(r.Context())
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	apps, err := h.svc.ListConnected(r.Context(), p, page)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, apps, page)
}

func (h *Handler) disconnect(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.FromContext(r.Context())
	id, err := httpx.UUIDParam(r, "grantID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.Disconnect(r.Context(), p, id); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// --- per-address limiter for registration ---

type ipLimiter struct {
	mu      sync.Mutex
	every   rate.Limit
	burst   int
	clients map[string]*limiterEntry
}

type limiterEntry struct {
	lim  *rate.Limiter
	seen time.Time
}

func newIPLimiter(every rate.Limit, burst int) *ipLimiter {
	return &ipLimiter{every: every, burst: burst, clients: map[string]*limiterEntry{}}
}

func (l *ipLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if len(l.clients) > 10_000 {
		for k, e := range l.clients {
			if now.Sub(e.seen) > time.Hour {
				delete(l.clients, k)
			}
		}
	}
	e, ok := l.clients[ip]
	if !ok {
		e = &limiterEntry{lim: rate.NewLimiter(l.every, l.burst)}
		l.clients[ip] = e
	}
	e.seen = now
	return e.lim.Allow()
}

// clientIP is the caller address; behind Caddy the router's RealIP
// middleware has already replaced RemoteAddr.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
