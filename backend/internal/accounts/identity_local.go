package accounts

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
)

// LocalIdentityProvider implements IdentityProvider on the API's own
// auth.users table (no Supabase). Passwords are stored as bcrypt hashes.
type LocalIdentityProvider struct {
	db database.Querier
}

// NewLocalIdentityProvider builds the local identity provider.
func NewLocalIdentityProvider(db database.Querier) *LocalIdentityProvider {
	return &LocalIdentityProvider{db: db}
}

var errEmailTaken = &httpx.Error{Status: 409, Code: "conflict", Message: "Ya existe una cuenta con ese correo"}

// CreateUser implements IdentityProvider.
func (p *LocalIdentityProvider) CreateUser(ctx context.Context, email, password string) (uuid.UUID, error) {
	hash, err := session.HashPassword(password)
	if err != nil {
		return uuid.Nil, err
	}
	var id uuid.UUID
	err = p.db.QueryRow(ctx, `
		INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, aud, role)
		VALUES ($1, $2, now(), 'authenticated', 'authenticated')
		RETURNING id`, strings.ToLower(strings.TrimSpace(email)), hash).Scan(&id)
	if database.IsUniqueViolation(err) {
		return uuid.Nil, errEmailTaken
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("create identity: %w", err)
	}
	return id, nil
}

// UpdateEmail implements IdentityProvider.
func (p *LocalIdentityProvider) UpdateEmail(ctx context.Context, userID uuid.UUID, email string) error {
	tag, err := p.db.Exec(ctx, `UPDATE auth.users SET email = $2, updated_at = now() WHERE id = $1`,
		userID, strings.ToLower(strings.TrimSpace(email)))
	if database.IsUniqueViolation(err) {
		return errEmailTaken
	}
	if err != nil {
		return fmt.Errorf("update identity email: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return httpx.ErrNotFound
	}
	return nil
}

// DeleteUser implements IdentityProvider. Refresh and reset tokens cascade.
func (p *LocalIdentityProvider) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	if _, err := p.db.Exec(ctx, `DELETE FROM auth.users WHERE id = $1`, userID); err != nil {
		return fmt.Errorf("delete identity: %w", err)
	}
	return nil
}
