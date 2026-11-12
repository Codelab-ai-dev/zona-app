package session

import (
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const (
	refreshCookie = "zg_refresh"
	cookiePath    = "/api/v1/auth"
)

// Handler exposes /auth/* routes.
type Handler struct {
	svc      *Service
	secure   bool
	attempts *attemptLimiter
}

// NewHandler builds the session handler.
func NewHandler(svc *Service, secureCookies bool) *Handler {
	return &Handler{svc: svc, secure: secureCookies, attempts: newAttemptLimiter()}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", h.login)
		r.Post("/refresh", h.refresh)
		r.Post("/logout", h.logout)
		r.Post("/password/forgot", h.forgot)
		r.Post("/password/reset", h.reset)
		r.With(auth.RequireAuth).Post("/password/change", h.change)
	})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	key := clientIP(r) + "|" + normalizeEmail(req.Email)
	if !h.attempts.allow(key) {
		w.Header().Set("Retry-After", "60")
		httpx.WriteError(w, r, httpx.ErrRateLimited)
		return
	}
	tokens, err := h.svc.Login(r.Context(), req, r.UserAgent())
	if errors.Is(err, ErrInvalidCredentials) {
		httpx.WriteError(w, r, &httpx.Error{Status: http.StatusUnauthorized, Code: "invalid_credentials", Message: "Correo o contraseña incorrectos"})
		return
	}
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	h.attempts.reset(key)
	h.writeTokens(w, r, tokens)
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	raw, err := h.refreshTokenFrom(w, r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	tokens, err := h.svc.Refresh(r.Context(), raw, r.UserAgent())
	if err != nil {
		h.clearCookie(w)
		httpx.WriteError(w, r, err)
		return
	}
	h.writeTokens(w, r, tokens)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	raw, err := h.refreshTokenFrom(w, r)
	if err == nil {
		if err := h.svc.Logout(r.Context(), raw); err != nil {
			httpx.WriteError(w, r, err)
			return
		}
	}
	h.clearCookie(w)
	httpx.NoContent(w)
}

func (h *Handler) forgot(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if !h.attempts.allow("forgot|" + clientIP(r)) {
		httpx.WriteError(w, r, httpx.ErrRateLimited)
		return
	}
	if err := h.svc.ForgotPassword(r.Context(), req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) reset(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.ResetPassword(r.Context(), req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) change(w http.ResponseWriter, r *http.Request) {
	var req ChangePasswordRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	caller, _ := auth.FromContext(r.Context())
	if err := h.svc.ChangePassword(r.Context(), caller.UserID, req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	h.clearCookie(w)
	httpx.NoContent(w)
}

// isMobile reports whether the client keeps the refresh token itself.
func isMobile(r *http.Request) bool { return r.Header.Get("X-Client") == "mobile" }

// refreshTokenFrom reads the refresh token: JSON body for mobile clients,
// HttpOnly cookie for the web.
func (h *Handler) refreshTokenFrom(w http.ResponseWriter, r *http.Request) (string, error) {
	if isMobile(r) {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := httpx.DecodeJSON(w, r, &body); err != nil {
			return "", err
		}
		return body.RefreshToken, nil
	}
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		return "", httpx.ErrUnauthorized
	}
	return c.Value, nil
}

func (h *Handler) writeTokens(w http.ResponseWriter, r *http.Request, t Tokens) {
	if isMobile(r) {
		t.RefreshToken = t.refresh
	} else {
		http.SetCookie(w, &http.Cookie{
			Name:     refreshCookie,
			Value:    t.refresh,
			Path:     cookiePath,
			MaxAge:   int(h.svc.cfg.RefreshTTL.Seconds()),
			HttpOnly: true,
			Secure:   h.secure,
			SameSite: http.SameSiteStrictMode,
		})
	}
	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) clearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: refreshCookie, Value: "", Path: cookiePath, MaxAge: -1,
		HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteStrictMode,
	})
}

// clientIP uses RemoteAddr, which middleware.RealIP rewrites behind Caddy.
func clientIP(r *http.Request) string {
	ip := r.RemoteAddr
	if i := strings.LastIndex(ip, ":"); i > 0 {
		ip = ip[:i]
	}
	return ip
}

// attemptLimiter allows 5 attempts per key per minute (login brute force,
// reset-email flooding). In-memory: fine for a single API instance.
type attemptLimiter struct {
	mu   sync.Mutex
	keys map[string]*rate.Limiter
}

func newAttemptLimiter() *attemptLimiter { return &attemptLimiter{keys: map[string]*rate.Limiter{}} }

func (a *attemptLimiter) allow(key string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	l, ok := a.keys[key]
	if !ok {
		if len(a.keys) > 50_000 {
			a.keys = map[string]*rate.Limiter{}
		}
		l = rate.NewLimiter(rate.Every(12*time.Second), 5)
		a.keys[key] = l
	}
	return l.Allow()
}

func (a *attemptLimiter) reset(key string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.keys, key)
}
