//go:build integration

package session_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/accounts"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
)

// A super admin deactivates and then reactivates an account through
// PATCH /admin/users (accounts.UpdateUser); the account can log in again (#52).
func TestReactivatedAccountLogsInAgain(t *testing.T) {
	pool := testdb.Pool(t)
	svc, _ := newService(t)
	ctx := context.Background()
	admin := accounts.NewService(accounts.NewPGRepository(pool), accounts.NewLocalIdentityProvider(pool), authz.NewPGChecker(pool))
	super := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}

	hash, err := bcrypt.GenerateFromPassword([]byte("clave-reactivar"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	email := "reactivar-" + uuid.NewString()[:8] + "@liga.mx"
	var id uuid.UUID
	if err := pool.QueryRow(ctx, `INSERT INTO auth.users (email, encrypted_password, aud, role)
		VALUES ($1, $2, 'authenticated', 'authenticated') RETURNING id`, email, string(hash)).Scan(&id); err != nil {
		t.Fatal(err)
	}
	login := func() error {
		_, err := svc.Login(ctx, session.LoginRequest{Email: email, Password: "clave-reactivar"}, "test")
		return err
	}
	setActive := func(v bool) {
		t.Helper()
		if _, err := admin.UpdateUser(ctx, super, id, accounts.UpdateUserRequest{IsActive: &v}); err != nil {
			t.Fatalf("set is_active=%v: %v", v, err)
		}
	}

	setActive(false)
	if err := login(); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("deactivated account: %v, want 403", err)
	}
	setActive(true)
	if err := login(); err != nil {
		t.Fatalf("reactivated account cannot log in: %v", err)
	}
}
