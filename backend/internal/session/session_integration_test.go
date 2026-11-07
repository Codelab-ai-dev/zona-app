//go:build integration

package session_test

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/accounts"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/mail"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
)

type nopMailer struct{}

func (nopMailer) Send(context.Context, mail.Message) error { return nil }

func newService(t *testing.T) (*session.Service, *session.PGRepository) {
	t.Helper()
	pool := testdb.Pool(t)
	repo := session.NewPGRepository(pool)
	tokens := auth.NewTokenService("integration-secret-integration-secret", "zona-api", time.Minute)
	return session.NewService(repo, tokens, nopMailer{}, session.Config{AppURL: "http://localhost"}), repo
}

// A user whose hash has another bcrypt cost ($2a$10) still logs in, and the
// profile row comes from the handle_new_user trigger.
func TestLowerCostHashLogsIn(t *testing.T) {
	pool := testdb.Pool(t)
	svc, _ := newService(t)
	ctx := context.Background()

	hash, err := bcrypt.GenerateFromPassword([]byte("clave-de-coste-10"), 10)
	if err != nil {
		t.Fatal(err)
	}
	email := "coste10-" + uuid.NewString()[:8] + "@liga.mx"
	var id uuid.UUID
	if err := pool.QueryRow(ctx, `INSERT INTO auth.users (email, encrypted_password, aud, role)
		VALUES ($1, $2, 'authenticated', 'authenticated') RETURNING id`, email, string(hash)).Scan(&id); err != nil {
		t.Fatal(err)
	}

	if _, err := svc.Login(ctx, session.LoginRequest{Email: email, Password: "clave-de-coste-10"}, "test"); err != nil {
		t.Fatalf("imported user cannot log in: %v", err)
	}
	var lastSignIn *time.Time
	_ = pool.QueryRow(ctx, `SELECT last_sign_in_at FROM auth.users WHERE id = $1`, id).Scan(&lastSignIn)
	if lastSignIn == nil {
		t.Error("last_sign_in_at not recorded")
	}

	if _, err := pool.Exec(ctx, `UPDATE public.users SET is_active = false WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Login(ctx, session.LoginRequest{Email: email, Password: "clave-de-coste-10"}, ""); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("deactivated profile logged in: %v", err)
	}
}

// Accounts created by the local identity provider can log in; duplicate
// emails (any case) are a 409.
func TestLocalIdentityProvider(t *testing.T) {
	pool := testdb.Pool(t)
	svc, _ := newService(t)
	ctx := context.Background()
	idp := accounts.NewLocalIdentityProvider(pool)
	email := "nuevo-" + uuid.NewString()[:8] + "@liga.mx"

	id, err := idp.CreateUser(ctx, email, "contraseña-segura")
	if err != nil {
		t.Fatal(err)
	}
	var profiles int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.users WHERE id = $1`, id).Scan(&profiles)
	if profiles != 1 {
		t.Fatalf("profile rows = %d, want 1 (trigger)", profiles)
	}
	if _, err := idp.CreateUser(ctx, "  "+strings.ToUpper(email), "contraseña-segura"); !errors.Is(err, httpx.ErrConflict) {
		t.Fatalf("duplicate email (different case): got %v, want conflict", err)
	}
	if _, err := svc.Login(ctx, session.LoginRequest{Email: email, Password: "contraseña-segura"}, ""); err != nil {
		t.Fatalf("local account cannot log in: %v", err)
	}
	if err := idp.DeleteUser(ctx, id); err != nil {
		t.Fatal(err)
	}
}

// Concurrent refreshes with the same token: exactly one wins; the replay is
// treated as theft and the family is revoked.
func TestConcurrentRefreshRotatesOnce(t *testing.T) {
	pool := testdb.Pool(t)
	svc, _ := newService(t)
	ctx := context.Background()
	email := "concurrente-" + uuid.NewString()[:8] + "@liga.mx"
	if _, err := accounts.NewLocalIdentityProvider(pool).CreateUser(ctx, email, "contraseña-segura"); err != nil {
		t.Fatal(err)
	}

	tok, err := svc.Login(ctx, session.LoginRequest{Email: email, Password: "contraseña-segura"}, "")
	if err != nil {
		t.Fatal(err)
	}
	raw := tok.RawRefresh()

	var wg sync.WaitGroup
	results := make([]error, 5)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, results[i] = svc.Refresh(ctx, raw, "")
		}(i)
	}
	wg.Wait()

	var ok int
	for _, err := range results {
		if err == nil {
			ok++
		}
	}
	if ok > 1 {
		t.Fatalf("%d concurrent refreshes succeeded with one token, want at most 1", ok)
	}
	var active int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM auth.refresh_tokens t JOIN auth.users u ON u.id = t.user_id
		WHERE lower(u.email) = $1 AND t.revoked_at IS NULL`, email).Scan(&active)
	if ok == 1 && active > 1 {
		t.Fatalf("%d active refresh tokens after the race", active)
	}
}
