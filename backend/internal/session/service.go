package session

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/mail"
)

// BcryptCost for new passwords. GoTrue uses 10; 12 is the current baseline.
const BcryptCost = 12

// dummyHash is compared when the email doesn't exist so both paths cost a
// bcrypt verification (no user enumeration by timing).
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("zona-gol-timing-equalizer"), BcryptCost)

// ErrNotFound is returned by repositories for unknown users/tokens.
var ErrNotFound = errors.New("not found")

// Service implements the authentication flows.
type Service struct {
	repo   Repository
	tokens TokenIssuer
	mailer mail.Sender
	cfg    Config
	now    func() time.Time
}

// NewService builds the session service.
func NewService(repo Repository, tokens TokenIssuer, mailer mail.Sender, cfg Config) *Service {
	if cfg.RefreshTTL == 0 {
		cfg.RefreshTTL = 30 * 24 * time.Hour
	}
	if cfg.ResetTTL == 0 {
		cfg.ResetTTL = time.Hour
	}
	return &Service{repo: repo, tokens: tokens, mailer: mailer, cfg: cfg, now: time.Now}
}

// Login verifies email/password and starts a new refresh-token family.
func (s *Service) Login(ctx context.Context, req LoginRequest, userAgent string) (Tokens, error) {
	creds, err := s.repo.CredentialsByEmail(ctx, normalizeEmail(req.Email))
	switch {
	case errors.Is(err, ErrNotFound):
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(req.Password))
		return Tokens{}, ErrInvalidCredentials
	case err != nil:
		return Tokens{}, err
	}
	if creds.PasswordHash == "" || bcrypt.CompareHashAndPassword([]byte(creds.PasswordHash), []byte(req.Password)) != nil {
		return Tokens{}, ErrInvalidCredentials
	}
	if !creds.IsActive {
		return Tokens{}, httpx.ErrForbidden.Wrap(errors.New("inactive account"))
	}
	if err := s.repo.TouchLastSignIn(ctx, creds.UserID); err != nil {
		slog.WarnContext(ctx, "last sign-in not recorded", "err", err)
	}
	return s.issue(ctx, creds, uuid.New(), userAgent)
}

// Refresh rotates a refresh token. Reusing a rotated token revokes its
// whole family and fails, forcing every holder to log in again.
func (s *Service) Refresh(ctx context.Context, rawToken, userAgent string) (Tokens, error) {
	if rawToken == "" {
		return Tokens{}, httpx.ErrUnauthorized
	}
	stored, err := s.repo.RefreshTokenByHash(ctx, hashToken(rawToken))
	if errors.Is(err, ErrNotFound) {
		return Tokens{}, httpx.ErrUnauthorized
	}
	if err != nil {
		return Tokens{}, err
	}
	if stored.RevokedAt != nil {
		slog.WarnContext(ctx, "refresh token reuse detected; revoking family", "user_id", stored.UserID)
		if err := s.repo.RevokeFamily(ctx, stored.FamilyID); err != nil {
			return Tokens{}, err
		}
		return Tokens{}, httpx.ErrUnauthorized
	}
	if !s.now().Before(stored.ExpiresAt) {
		return Tokens{}, httpx.ErrUnauthorized
	}
	creds, err := s.repo.CredentialsByID(ctx, stored.UserID)
	if err != nil {
		return Tokens{}, httpx.ErrUnauthorized.Wrap(err)
	}
	if !creds.IsActive {
		_ = s.repo.RevokeAllForUser(ctx, creds.UserID)
		return Tokens{}, httpx.ErrUnauthorized
	}

	tokens, newID, err := s.issueWithID(ctx, creds, stored.FamilyID, userAgent)
	if err != nil {
		return Tokens{}, err
	}
	rotated, err := s.repo.RotateRefreshToken(ctx, stored.ID, newID)
	if err != nil {
		return Tokens{}, err
	}
	if !rotated {
		// Another request rotated it first: treat as reuse.
		_ = s.repo.RevokeFamily(ctx, stored.FamilyID)
		return Tokens{}, httpx.ErrUnauthorized
	}
	return tokens, nil
}

// Logout revokes the presented refresh token (idempotent).
func (s *Service) Logout(ctx context.Context, rawToken string) error {
	if rawToken == "" {
		return nil
	}
	stored, err := s.repo.RefreshTokenByHash(ctx, hashToken(rawToken))
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return s.repo.RevokeRefreshToken(ctx, stored.ID)
}

// ForgotPassword emails a reset link if the account exists. It never
// reveals whether it does.
func (s *Service) ForgotPassword(ctx context.Context, req ForgotPasswordRequest) error {
	creds, err := s.repo.CredentialsByEmail(ctx, normalizeEmail(req.Email))
	if errors.Is(err, ErrNotFound) || (err == nil && !creds.IsActive) {
		return nil
	}
	if err != nil {
		return err
	}
	raw, hash, err := newToken()
	if err != nil {
		return fmt.Errorf("reset token: %w", err)
	}
	if err := s.repo.CreateResetToken(ctx, creds.UserID, hash, s.now().Add(s.cfg.ResetTTL)); err != nil {
		return err
	}
	link := s.cfg.AppURL + "/reset-password?token=" + url.QueryEscape(raw)
	err = s.mailer.Send(ctx, mail.Message{
		To:      creds.Email,
		Subject: "Restablecer tu contraseña de Zona Gol",
		Body: "Recibimos una solicitud para restablecer tu contraseña.\n\n" +
			"Abre este enlace (vence en una hora):\n" + link + "\n\n" +
			"Si no fuiste tú, ignora este correo; tu contraseña no cambiará.",
	})
	if err != nil {
		// Don't fail the request (would reveal the account exists); log it.
		slog.ErrorContext(ctx, "reset email not sent", "user_id", creds.UserID, "err", err)
	}
	return nil
}

// ResetPassword sets a new password from a valid reset token and signs the
// user out everywhere.
func (s *Service) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	userID, err := s.repo.ConsumeResetToken(ctx, hashToken(req.Token))
	if errors.Is(err, ErrNotFound) {
		return httpx.Validation(map[string]string{"token": "el enlace no es válido o ya venció"})
	}
	if err != nil {
		return err
	}
	return s.setPassword(ctx, userID, req.Password)
}

// ChangePassword verifies the current password and sets a new one, signing
// out every other session.
func (s *Service) ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error {
	creds, err := s.repo.CredentialsByID(ctx, userID)
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(creds.PasswordHash), []byte(req.CurrentPassword)) != nil {
		return httpx.Validation(map[string]string{"current_password": "la contraseña actual no es correcta"})
	}
	return s.setPassword(ctx, userID, req.NewPassword)
}

func (s *Service) setPassword(ctx context.Context, userID uuid.UUID, password string) error {
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	if err := s.repo.SetPassword(ctx, userID, hash); err != nil {
		return err
	}
	return s.repo.RevokeAllForUser(ctx, userID)
}

// HashPassword bcrypt-hashes a password (shared with account creation).
func HashPassword(password string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(h), nil
}

func (s *Service) issue(ctx context.Context, creds Credentials, familyID uuid.UUID, userAgent string) (Tokens, error) {
	t, _, err := s.issueWithID(ctx, creds, familyID, userAgent)
	return t, err
}

func (s *Service) issueWithID(ctx context.Context, creds Credentials, familyID uuid.UUID, userAgent string) (Tokens, uuid.UUID, error) {
	access, exp, err := s.tokens.Issue(creds.UserID, creds.Email)
	if err != nil {
		return Tokens{}, uuid.Nil, err
	}
	raw, hash, err := newToken()
	if err != nil {
		return Tokens{}, uuid.Nil, fmt.Errorf("refresh token: %w", err)
	}
	if len(userAgent) > 255 {
		userAgent = userAgent[:255]
	}
	id, err := s.repo.CreateRefreshToken(ctx, creds.UserID, familyID, hash, s.now().Add(s.cfg.RefreshTTL), userAgent)
	if err != nil {
		return Tokens{}, uuid.Nil, err
	}
	return Tokens{AccessToken: access, ExpiresAt: exp, refresh: raw}, id, nil
}
