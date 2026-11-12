package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// ErrProfileNotFound is returned by a ProfileLoader when no profile exists.
var ErrProfileNotFound = errors.New("profile not found")

// ProfileLoader loads the caller's profile (role and scopes) by user ID.
type ProfileLoader interface {
	LoadPrincipal(ctx context.Context, userID uuid.UUID) (Principal, error)
}

// Verifier validates a raw bearer token and returns its subject.
type Verifier interface {
	Verify(raw string) (uuid.UUID, error)
}

// Middleware resolves the principal from the Authorization header.
type Middleware struct {
	verifier Verifier
	profiles ProfileLoader
}

// NewMiddleware builds the auth middleware.
func NewMiddleware(v Verifier, p ProfileLoader) *Middleware {
	return &Middleware{verifier: v, profiles: p}
}

// Authenticate attaches the principal when a valid bearer token is present.
// Requests without a token continue anonymously; an invalid token is
// rejected so clients notice expired sessions instead of silently degrading.
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := bearerToken(r)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}
		userID, err := m.verifier.Verify(raw)
		if err != nil {
			httpx.WriteError(w, r, httpx.ErrUnauthorized)
			return
		}
		p, err := m.profiles.LoadPrincipal(r.Context(), userID)
		switch {
		case errors.Is(err, ErrProfileNotFound):
			httpx.WriteError(w, r, httpx.ErrUnauthorized)
			return
		case err != nil:
			httpx.WriteError(w, r, err)
			return
		case !p.IsActive:
			httpx.WriteError(w, r, httpx.ErrForbidden)
			return
		}
		next.ServeHTTP(w, r.WithContext(WithPrincipal(r.Context(), p)))
	})
}

// RequireAuth rejects anonymous requests.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := FromContext(r.Context()); !ok {
			httpx.WriteError(w, r, httpx.ErrUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRole rejects callers that have none of the given roles.
func RequireRole(roles ...Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			p, ok := FromContext(r.Context())
			if !ok {
				httpx.WriteError(w, r, httpx.ErrUnauthorized)
				return
			}
			if !p.HasRole(roles...) {
				httpx.WriteError(w, r, httpx.ErrForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(h) <= len(prefix) || !strings.EqualFold(h[:len(prefix)], prefix) {
		return "", false
	}
	return strings.TrimSpace(h[len(prefix):]), true
}
