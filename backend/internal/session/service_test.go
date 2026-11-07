package session

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/mail"
)

// --- fakes ---

type memToken struct {
	RefreshToken
	hash string
}

type memReset struct {
	userID  uuid.UUID
	expires time.Time
	used    bool
}

type memRepo struct {
	mu      sync.Mutex
	users   map[uuid.UUID]*Credentials
	refresh map[uuid.UUID]*memToken
	resets  map[string]*memReset
}

func newMemRepo() *memRepo {
	return &memRepo{users: map[uuid.UUID]*Credentials{}, refresh: map[uuid.UUID]*memToken{}, resets: map[string]*memReset{}}
}

func (m *memRepo) addUser(t *testing.T, email, password string, active bool) uuid.UUID {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	id := uuid.New()
	m.users[id] = &Credentials{UserID: id, Email: email, PasswordHash: string(h), IsActive: active}
	return id
}

func (m *memRepo) CredentialsByEmail(_ context.Context, email string) (Credentials, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, u := range m.users {
		if strings.ToLower(u.Email) == email {
			return *u, nil
		}
	}
	return Credentials{}, ErrNotFound
}

func (m *memRepo) CredentialsByID(_ context.Context, id uuid.UUID) (Credentials, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[id]; ok {
		return *u, nil
	}
	return Credentials{}, ErrNotFound
}

func (m *memRepo) TouchLastSignIn(context.Context, uuid.UUID) error { return nil }

func (m *memRepo) CreateRefreshToken(_ context.Context, userID, familyID uuid.UUID, hash []byte, exp time.Time, _ string) (uuid.UUID, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := uuid.New()
	m.refresh[id] = &memToken{RefreshToken{ID: id, UserID: userID, FamilyID: familyID, ExpiresAt: exp}, string(hash)}
	return id, nil
}

func (m *memRepo) RefreshTokenByHash(_ context.Context, hash []byte) (RefreshToken, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.refresh {
		if t.hash == string(hash) {
			return t.RefreshToken, nil
		}
	}
	return RefreshToken{}, ErrNotFound
}

func (m *memRepo) revoke(t *memToken) {
	if t.RevokedAt == nil {
		now := time.Now()
		t.RevokedAt = &now
	}
}

func (m *memRepo) RotateRefreshToken(_ context.Context, oldID, _ uuid.UUID) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t := m.refresh[oldID]
	if t.RevokedAt != nil {
		return false, nil
	}
	m.revoke(t)
	return true, nil
}

func (m *memRepo) RevokeRefreshToken(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.revoke(m.refresh[id])
	return nil
}

func (m *memRepo) RevokeFamily(_ context.Context, family uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.refresh {
		if t.FamilyID == family {
			m.revoke(t)
		}
	}
	return nil
}

func (m *memRepo) RevokeAllForUser(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.refresh {
		if t.UserID == userID {
			m.revoke(t)
		}
	}
	return nil
}

func (m *memRepo) CreateResetToken(_ context.Context, userID uuid.UUID, hash []byte, exp time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range m.resets {
		if r.userID == userID {
			r.used = true
		}
	}
	m.resets[string(hash)] = &memReset{userID: userID, expires: exp}
	return nil
}

func (m *memRepo) ConsumeResetToken(_ context.Context, hash []byte) (uuid.UUID, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.resets[string(hash)]
	if !ok || r.used || !time.Now().Before(r.expires) {
		return uuid.Nil, ErrNotFound
	}
	r.used = true
	return r.userID, nil
}

func (m *memRepo) SetPassword(_ context.Context, id uuid.UUID, hash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[id].PasswordHash = hash
	return nil
}

type fakeIssuer struct{}

func (fakeIssuer) Issue(id uuid.UUID, _ string) (string, time.Time, error) {
	return "access-" + id.String(), time.Now().Add(15 * time.Minute), nil
}

type captureMailer struct{ sent []mail.Message }

func (c *captureMailer) Send(_ context.Context, m mail.Message) error {
	c.sent = append(c.sent, m)
	return nil
}

func newTestService() (*Service, *memRepo, *captureMailer) {
	repo := newMemRepo()
	mailer := &captureMailer{}
	return NewService(repo, fakeIssuer{}, mailer, Config{AppURL: "https://zona.test"}), repo, mailer
}

// --- tests ---

func TestLogin(t *testing.T) {
	svc, repo, _ := newTestService()
	id := repo.addUser(t, "ana@liga.mx", "contraseña-segura", true)
	repo.addUser(t, "off@liga.mx", "contraseña-segura", false)
	ctx := context.Background()

	tok, err := svc.Login(ctx, LoginRequest{Email: "  ANA@liga.mx ", Password: "contraseña-segura"}, "ua")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if tok.AccessToken != "access-"+id.String() || tok.refresh == "" {
		t.Fatalf("unexpected tokens %+v", tok)
	}

	for name, req := range map[string]LoginRequest{
		"wrong password": {Email: "ana@liga.mx", Password: "otra-contraseña"},
		"unknown email":  {Email: "nadie@liga.mx", Password: "contraseña-segura"},
	} {
		if _, err := svc.Login(ctx, req, ""); !errors.Is(err, ErrInvalidCredentials) {
			t.Errorf("%s: got %v, want ErrInvalidCredentials", name, err)
		}
	}
	if _, err := svc.Login(ctx, LoginRequest{Email: "off@liga.mx", Password: "contraseña-segura"}, ""); !errors.Is(err, httpx.ErrForbidden) {
		t.Errorf("inactive: got %v, want forbidden", err)
	}
	if _, err := svc.Login(ctx, LoginRequest{Email: "off@liga.mx", Password: "mala-contraseña"}, ""); !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("inactive with wrong password must not reveal the account: %v", err)
	}
}

func TestRefreshRotatesAndDetectsReuse(t *testing.T) {
	svc, repo, _ := newTestService()
	repo.addUser(t, "ana@liga.mx", "contraseña-segura", true)
	ctx := context.Background()

	first, err := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-segura"}, "")
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Refresh(ctx, first.refresh, "")
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if second.refresh == first.refresh {
		t.Fatal("refresh token was not rotated")
	}

	// Replaying the rotated token (stolen copy) fails and kills the family,
	// so the legitimate newer token stops working too.
	if _, err := svc.Refresh(ctx, first.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Fatalf("reuse: got %v, want unauthorized", err)
	}
	if _, err := svc.Refresh(ctx, second.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Fatalf("family not revoked after reuse: %v", err)
	}
}

func TestRefreshRejectsExpiredUnknownAndInactive(t *testing.T) {
	svc, repo, _ := newTestService()
	id := repo.addUser(t, "ana@liga.mx", "contraseña-segura", true)
	ctx := context.Background()

	if _, err := svc.Refresh(ctx, "no-existe", ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Errorf("unknown: %v", err)
	}
	if _, err := svc.Refresh(ctx, "", ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Errorf("empty: %v", err)
	}

	tok, _ := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-segura"}, "")
	svc.now = func() time.Time { return time.Now().Add(31 * 24 * time.Hour) }
	if _, err := svc.Refresh(ctx, tok.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Errorf("expired: %v", err)
	}
	svc.now = time.Now

	tok, _ = svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-segura"}, "")
	repo.users[id].IsActive = false
	if _, err := svc.Refresh(ctx, tok.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Errorf("deactivated user kept refreshing: %v", err)
	}
}

func TestLogoutRevokes(t *testing.T) {
	svc, repo, _ := newTestService()
	repo.addUser(t, "ana@liga.mx", "contraseña-segura", true)
	ctx := context.Background()
	tok, _ := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-segura"}, "")

	if err := svc.Logout(ctx, tok.refresh); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Refresh(ctx, tok.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Fatalf("refresh after logout: %v", err)
	}
	if err := svc.Logout(ctx, "desconocido"); err != nil {
		t.Fatalf("logout must be idempotent: %v", err)
	}
}

func resetTokenFrom(t *testing.T, m mail.Message) string {
	t.Helper()
	i := strings.Index(m.Body, "https://zona.test/reset-password?")
	if i < 0 {
		t.Fatalf("no reset link in %q", m.Body)
	}
	link := strings.Fields(m.Body[i:])[0]
	u, err := url.Parse(link)
	if err != nil {
		t.Fatal(err)
	}
	return u.Query().Get("token")
}

func TestPasswordResetFlow(t *testing.T) {
	svc, repo, mailer := newTestService()
	repo.addUser(t, "ana@liga.mx", "contraseña-vieja", true)
	ctx := context.Background()
	session, _ := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-vieja"}, "")

	// Unknown email: same answer, no mail.
	if err := svc.ForgotPassword(ctx, ForgotPasswordRequest{Email: "nadie@liga.mx"}); err != nil {
		t.Fatal(err)
	}
	if len(mailer.sent) != 0 {
		t.Fatal("mail sent for unknown email")
	}

	if err := svc.ForgotPassword(ctx, ForgotPasswordRequest{Email: "Ana@Liga.mx"}); err != nil {
		t.Fatal(err)
	}
	if len(mailer.sent) != 1 || mailer.sent[0].To != "ana@liga.mx" {
		t.Fatalf("mails: %+v", mailer.sent)
	}
	token := resetTokenFrom(t, mailer.sent[0])

	if err := svc.ResetPassword(ctx, ResetPasswordRequest{Token: token, Password: "contraseña-nueva"}); err != nil {
		t.Fatalf("reset: %v", err)
	}
	if _, err := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-nueva"}, ""); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	if _, err := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-vieja"}, ""); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatal("old password still works")
	}
	if _, err := svc.Refresh(ctx, session.refresh, ""); !errors.Is(err, httpx.ErrUnauthorized) {
		t.Fatal("sessions survived a password reset")
	}

	err := svc.ResetPassword(ctx, ResetPasswordRequest{Token: token, Password: "otra-contraseña"})
	var apiErr *httpx.Error
	if !errors.As(err, &apiErr) || apiErr.Fields["token"] == "" {
		t.Fatalf("reused reset token: got %v, want token field error", err)
	}
}

func TestOnlyLatestResetLinkWorks(t *testing.T) {
	svc, repo, mailer := newTestService()
	repo.addUser(t, "ana@liga.mx", "contraseña-vieja", true)
	ctx := context.Background()
	_ = svc.ForgotPassword(ctx, ForgotPasswordRequest{Email: "ana@liga.mx"})
	_ = svc.ForgotPassword(ctx, ForgotPasswordRequest{Email: "ana@liga.mx"})

	if err := svc.ResetPassword(ctx, ResetPasswordRequest{Token: resetTokenFrom(t, mailer.sent[0]), Password: "contraseña-nueva"}); err == nil {
		t.Fatal("superseded reset link still works")
	}
	if err := svc.ResetPassword(ctx, ResetPasswordRequest{Token: resetTokenFrom(t, mailer.sent[1]), Password: "contraseña-nueva"}); err != nil {
		t.Fatalf("latest link: %v", err)
	}
}

func TestChangePassword(t *testing.T) {
	svc, repo, _ := newTestService()
	id := repo.addUser(t, "ana@liga.mx", "contraseña-vieja", true)
	ctx := context.Background()

	err := svc.ChangePassword(ctx, id, ChangePasswordRequest{CurrentPassword: "equivocada", NewPassword: "contraseña-nueva"})
	var apiErr *httpx.Error
	if !errors.As(err, &apiErr) || apiErr.Fields["current_password"] == "" {
		t.Fatalf("wrong current password: %v", err)
	}
	if err := svc.ChangePassword(ctx, id, ChangePasswordRequest{CurrentPassword: "contraseña-vieja", NewPassword: "contraseña-nueva"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Login(ctx, LoginRequest{Email: "ana@liga.mx", Password: "contraseña-nueva"}, ""); err != nil {
		t.Fatal(err)
	}
}

func TestPasswordRules(t *testing.T) {
	if passwordProblem("corta") == "" {
		t.Error("short password accepted")
	}
	if passwordProblem(strings.Repeat("a", 73)) == "" {
		t.Error("password over 72 bytes accepted (bcrypt would truncate it)")
	}
	if passwordProblem("diez-chars") != "" {
		t.Error("valid password rejected")
	}
}
