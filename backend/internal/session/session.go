// Package session implements the API's own authentication: password login,
// rotating refresh tokens, logout, password reset and change.
//
// Security notes:
//   - Passwords are bcrypt hashes in auth.users.encrypted_password.
//   - Refresh and reset tokens are 32 random bytes; only their SHA-256 is
//     stored. Refresh tokens rotate on every use; presenting an already
//     rotated token revokes the whole family (theft detection).
//   - Login answers the same error and takes similar time whether or not the
//     email exists; forgot-password always answers 204.
//   - The web client receives the refresh token in an HttpOnly, SameSite=Strict
//     cookie scoped to /api/v1/auth; mobile clients (X-Client: mobile) get it
//     in the body.
package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

// Config tunes token lifetimes and links.
type Config struct {
	RefreshTTL    time.Duration // default 30 days
	ResetTTL      time.Duration // default 1 hour
	AppURL        string        // public web URL used in reset emails
	SecureCookies bool          // true in production (HTTPS)
}

// MinPasswordLength is enforced on reset and change.
const MinPasswordLength = 10

// ErrInvalidCredentials is the only login failure callers see.
var ErrInvalidCredentials = errors.New("invalid credentials")

// Credentials of a user, as stored.
type Credentials struct {
	UserID       uuid.UUID
	Email        string
	PasswordHash string
	IsActive     bool // public.users.is_active
}

// RefreshToken is a stored (hashed) refresh token.
type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	FamilyID  uuid.UUID
	ExpiresAt time.Time
	RevokedAt *time.Time
}

// Repository is the persistence the service needs.
type Repository interface {
	CredentialsByEmail(ctx context.Context, email string) (Credentials, error)
	CredentialsByID(ctx context.Context, userID uuid.UUID) (Credentials, error)
	TouchLastSignIn(ctx context.Context, userID uuid.UUID) error

	CreateRefreshToken(ctx context.Context, userID, familyID uuid.UUID, hash []byte, expiresAt time.Time, userAgent string) (uuid.UUID, error)
	RefreshTokenByHash(ctx context.Context, hash []byte) (RefreshToken, error)
	// RotateRefreshToken revokes oldID (only if still active) and links it to
	// newID; it reports false when oldID was already revoked (a race/replay).
	RotateRefreshToken(ctx context.Context, oldID, newID uuid.UUID) (bool, error)
	RevokeRefreshToken(ctx context.Context, id uuid.UUID) error
	RevokeFamily(ctx context.Context, familyID uuid.UUID) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error

	CreateResetToken(ctx context.Context, userID uuid.UUID, hash []byte, expiresAt time.Time) error
	// ConsumeResetToken marks the token used and returns its user, failing if
	// it is unknown, expired or already used.
	ConsumeResetToken(ctx context.Context, hash []byte) (uuid.UUID, error)
	SetPassword(ctx context.Context, userID uuid.UUID, hash string) error
}

// TokenIssuer issues access tokens (implemented by auth.TokenService).
type TokenIssuer interface {
	Issue(userID uuid.UUID, email string) (string, time.Time, error)
}

// Tokens is the result of a successful login or refresh.
type Tokens struct {
	AccessToken  string    `json:"access_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	RefreshToken string    `json:"refresh_token,omitempty"` // mobile only
	refresh      string    // always set; the handler decides where it goes
}

// --- request DTOs ---

// LoginRequest is the body of POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Validate implements httpx.Validator.
func (r LoginRequest) Validate() map[string]string {
	errs := map[string]string{}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		errs["email"] = "correo no válido"
	}
	if r.Password == "" || len(r.Password) > 200 {
		errs["password"] = "contraseña requerida"
	}
	return errs
}

// ForgotPasswordRequest is the body of POST /auth/password/forgot.
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// Validate implements httpx.Validator.
func (r ForgotPasswordRequest) Validate() map[string]string {
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return map[string]string{"email": "correo no válido"}
	}
	return nil
}

// ResetPasswordRequest is the body of POST /auth/password/reset.
type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// Validate implements httpx.Validator.
func (r ResetPasswordRequest) Validate() map[string]string {
	errs := map[string]string{}
	if r.Token == "" {
		errs["token"] = "enlace no válido"
	}
	if msg := passwordProblem(r.Password); msg != "" {
		errs["password"] = msg
	}
	return errs
}

// ChangePasswordRequest is the body of POST /auth/password/change.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// Validate implements httpx.Validator.
func (r ChangePasswordRequest) Validate() map[string]string {
	errs := map[string]string{}
	if r.CurrentPassword == "" {
		errs["current_password"] = "requerida"
	}
	if msg := passwordProblem(r.NewPassword); msg != "" {
		errs["new_password"] = msg
	}
	return errs
}

func passwordProblem(p string) string {
	switch n := utf8.RuneCountInString(p); {
	case n < MinPasswordLength:
		return "mínimo 10 caracteres"
	case len(p) > 72:
		// bcrypt only uses the first 72 bytes; reject instead of truncating.
		return "máximo 72 caracteres"
	}
	return ""
}

func normalizeEmail(e string) string { return strings.ToLower(strings.TrimSpace(e)) }

// newToken returns a random URL-safe token and its SHA-256.
func newToken() (string, []byte, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", nil, err
	}
	tok := base64.RawURLEncoding.EncodeToString(b)
	return tok, hashToken(tok), nil
}

func hashToken(tok string) []byte {
	sum := sha256.Sum256([]byte(tok))
	return sum[:]
}
