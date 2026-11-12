package session

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGRepository implements Repository on auth.users and the auth token tables.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds the repository.
func NewPGRepository(db database.Querier) *PGRepository { return &PGRepository{db: db} }

const credentialsSelect = `
	SELECT u.id, u.email, COALESCE(u.encrypted_password, ''), COALESCE(p.is_active, true)
	FROM auth.users u
	LEFT JOIN public.users p ON p.id = u.id`

func (r *PGRepository) scanCredentials(row interface{ Scan(...any) error }) (Credentials, error) {
	var c Credentials
	err := row.Scan(&c.UserID, &c.Email, &c.PasswordHash, &c.IsActive)
	if database.IsNoRows(err) {
		return Credentials{}, ErrNotFound
	}
	if err != nil {
		return Credentials{}, fmt.Errorf("load credentials: %w", err)
	}
	return c, nil
}

// CredentialsByEmail implements Repository (case-insensitive).
func (r *PGRepository) CredentialsByEmail(ctx context.Context, email string) (Credentials, error) {
	return r.scanCredentials(r.db.QueryRow(ctx, credentialsSelect+` WHERE lower(u.email) = $1`, email))
}

// CredentialsByID implements Repository.
func (r *PGRepository) CredentialsByID(ctx context.Context, userID uuid.UUID) (Credentials, error) {
	return r.scanCredentials(r.db.QueryRow(ctx, credentialsSelect+` WHERE u.id = $1`, userID))
}

// TouchLastSignIn implements Repository.
func (r *PGRepository) TouchLastSignIn(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1`, userID)
	return err
}

// CreateRefreshToken implements Repository.
func (r *PGRepository) CreateRefreshToken(ctx context.Context, userID, familyID uuid.UUID, hash []byte, expiresAt time.Time, userAgent string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `
		INSERT INTO auth.refresh_tokens (user_id, family_id, token_hash, expires_at, user_agent)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		RETURNING id`, userID, familyID, hash, expiresAt, userAgent).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("create refresh token: %w", err)
	}
	return id, nil
}

// RefreshTokenByHash implements Repository.
func (r *PGRepository) RefreshTokenByHash(ctx context.Context, hash []byte) (RefreshToken, error) {
	var t RefreshToken
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, family_id, expires_at, revoked_at
		FROM auth.refresh_tokens WHERE token_hash = $1`, hash).
		Scan(&t.ID, &t.UserID, &t.FamilyID, &t.ExpiresAt, &t.RevokedAt)
	if database.IsNoRows(err) {
		return RefreshToken{}, ErrNotFound
	}
	if err != nil {
		return RefreshToken{}, fmt.Errorf("load refresh token: %w", err)
	}
	return t, nil
}

// RotateRefreshToken implements Repository; the WHERE on revoked_at makes
// concurrent rotations of the same token succeed only once.
func (r *PGRepository) RotateRefreshToken(ctx context.Context, oldID, newID uuid.UUID) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE auth.refresh_tokens SET revoked_at = now(), replaced_by = $2
		WHERE id = $1 AND revoked_at IS NULL`, oldID, newID)
	if err != nil {
		return false, fmt.Errorf("rotate refresh token: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// RevokeRefreshToken implements Repository.
func (r *PGRepository) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE auth.refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	return err
}

// RevokeFamily implements Repository.
func (r *PGRepository) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE auth.refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`, familyID)
	return err
}

// RevokeAllForUser implements Repository.
func (r *PGRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE auth.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	return err
}

// CreateResetToken implements Repository. Older unused tokens of the user
// are invalidated so only the latest link works.
func (r *PGRepository) CreateResetToken(ctx context.Context, userID uuid.UUID, hash []byte, expiresAt time.Time) error {
	if _, err := r.db.Exec(ctx, `UPDATE auth.password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, userID); err != nil {
		return fmt.Errorf("expire old reset tokens: %w", err)
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, hash, expiresAt)
	if err != nil {
		return fmt.Errorf("create reset token: %w", err)
	}
	return nil
}

// ConsumeResetToken implements Repository atomically (single UPDATE).
func (r *PGRepository) ConsumeResetToken(ctx context.Context, hash []byte) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx, `
		UPDATE auth.password_reset_tokens SET used_at = now()
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
		RETURNING user_id`, hash).Scan(&userID)
	if database.IsNoRows(err) {
		return uuid.Nil, ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("consume reset token: %w", err)
	}
	return userID, nil
}

// SetPassword implements Repository.
func (r *PGRepository) SetPassword(ctx context.Context, userID uuid.UUID, hash string) error {
	tag, err := r.db.Exec(ctx, `UPDATE auth.users SET encrypted_password = $2, updated_at = now() WHERE id = $1`, userID, hash)
	if err != nil {
		return fmt.Errorf("set password: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return ErrNotFound
	}
	return nil
}
