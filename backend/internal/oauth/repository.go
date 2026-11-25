package oauth

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGRepository implements Repository on the auth.oauth_* tables.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds the repository.
func NewPGRepository(db database.Querier) *PGRepository { return &PGRepository{db: db} }

// CreateClient implements Repository.
func (r *PGRepository) CreateClient(ctx context.Context, c Client) (Client, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO auth.oauth_clients (name, client_uri, redirect_uris, auth_method, secret_hash)
		VALUES ($1, NULLIF($2, ''), $3, $4, $5)
		RETURNING id, created_at`,
		c.Name, c.ClientURI, c.RedirectURIs, c.AuthMethod, c.SecretHash).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return Client{}, fmt.Errorf("insert oauth client: %w", err)
	}
	return c, nil
}

// ClientByID implements Repository.
func (r *PGRepository) ClientByID(ctx context.Context, id uuid.UUID) (Client, error) {
	var c Client
	err := r.db.QueryRow(ctx, `
		SELECT id, name, COALESCE(client_uri, ''), redirect_uris, auth_method, secret_hash, created_at
		FROM auth.oauth_clients WHERE id = $1`, id).
		Scan(&c.ID, &c.Name, &c.ClientURI, &c.RedirectURIs, &c.AuthMethod, &c.SecretHash, &c.CreatedAt)
	if database.IsNoRows(err) {
		return Client{}, ErrNotFound
	}
	if err != nil {
		return Client{}, fmt.Errorf("load oauth client: %w", err)
	}
	return c, nil
}

// CreateAuthorization implements Repository.
func (r *PGRepository) CreateAuthorization(ctx context.Context, a Authorization) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `
		INSERT INTO auth.oauth_authorizations
			(client_id, redirect_uri, scope, resource, state, code_challenge, expires_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
		RETURNING id`,
		a.ClientID, a.RedirectURI, a.Scope, a.Resource, a.State, a.CodeChallenge, a.ExpiresAt).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert oauth authorization: %w", err)
	}
	return id, nil
}

const authorizationSelect = `
	SELECT a.id, a.client_id, a.redirect_uri, a.scope, a.resource, COALESCE(a.state, ''),
	       a.code_challenge, a.expires_at, a.decided_at, a.grant_id, COALESCE(g.user_id, '00000000-0000-0000-0000-000000000000'),
	       a.code_expires_at
	FROM auth.oauth_authorizations a
	LEFT JOIN auth.oauth_grants g ON g.id = a.grant_id`

func scanAuthorization(row interface{ Scan(...any) error }) (Authorization, error) {
	var a Authorization
	err := row.Scan(&a.ID, &a.ClientID, &a.RedirectURI, &a.Scope, &a.Resource, &a.State,
		&a.CodeChallenge, &a.ExpiresAt, &a.DecidedAt, &a.GrantID, &a.UserID, &a.CodeExpiresAt)
	if database.IsNoRows(err) {
		return Authorization{}, ErrNotFound
	}
	if err != nil {
		return Authorization{}, fmt.Errorf("load oauth authorization: %w", err)
	}
	return a, nil
}

// AuthorizationByID implements Repository.
func (r *PGRepository) AuthorizationByID(ctx context.Context, id uuid.UUID) (Authorization, error) {
	return scanAuthorization(r.db.QueryRow(ctx, authorizationSelect+` WHERE a.id = $1`, id))
}

// ApproveAuthorization implements Repository. The grant upsert and the
// decision are one statement, so two concurrent approvals cannot both
// attach a code: the second finds decided_at set and changes nothing.
func (r *PGRepository) ApproveAuthorization(ctx context.Context, id, userID uuid.UUID, codeHash []byte, codeExpiresAt time.Time) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		WITH req AS (
			SELECT client_id, scope, resource FROM auth.oauth_authorizations
			WHERE id = $1 AND decided_at IS NULL
		), g AS (
			INSERT INTO auth.oauth_grants (user_id, client_id, scope, resource)
			SELECT $2, client_id, scope, resource FROM req
			ON CONFLICT (user_id, client_id) WHERE revoked_at IS NULL
			DO UPDATE SET scope = EXCLUDED.scope, resource = EXCLUDED.resource
			RETURNING id
		)
		UPDATE auth.oauth_authorizations
		SET decided_at = now(), grant_id = (SELECT id FROM g), code_hash = $3, code_expires_at = $4
		WHERE id = $1 AND decided_at IS NULL AND EXISTS (SELECT 1 FROM g)`,
		id, userID, codeHash, codeExpiresAt)
	if err != nil {
		return false, fmt.Errorf("approve oauth authorization: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// DenyAuthorization implements Repository.
func (r *PGRepository) DenyAuthorization(ctx context.Context, id uuid.UUID) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE auth.oauth_authorizations SET decided_at = now()
		WHERE id = $1 AND decided_at IS NULL`, id)
	if err != nil {
		return false, fmt.Errorf("deny oauth authorization: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// ConsumeCode implements Repository.
func (r *PGRepository) ConsumeCode(ctx context.Context, codeHash []byte) (Authorization, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx, `
		UPDATE auth.oauth_authorizations SET code_used_at = now()
		WHERE code_hash = $1 AND code_used_at IS NULL
		RETURNING id`, codeHash).Scan(&id)
	if err == nil {
		return r.AuthorizationByID(ctx, id)
	}
	if !database.IsNoRows(err) {
		return Authorization{}, fmt.Errorf("consume oauth code: %w", err)
	}
	a, err := scanAuthorization(r.db.QueryRow(ctx, authorizationSelect+` WHERE a.code_hash = $1`, codeHash))
	if err != nil {
		return Authorization{}, err // ErrNotFound for an unknown code
	}
	return a, ErrCodeUsed
}

// CreateToken implements Repository.
func (r *PGRepository) CreateToken(ctx context.Context, grantID uuid.UUID, kind string, hash []byte, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO auth.oauth_tokens (grant_id, kind, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)`, grantID, kind, hash, expiresAt)
	if err != nil {
		return fmt.Errorf("insert oauth token: %w", err)
	}
	return nil
}

// TokenByHash implements Repository.
func (r *PGRepository) TokenByHash(ctx context.Context, hash []byte) (Token, error) {
	var t Token
	err := r.db.QueryRow(ctx, `
		SELECT t.id, t.grant_id, t.kind, t.expires_at, t.revoked_at,
		       g.user_id, g.client_id, g.scope, g.resource, g.revoked_at
		FROM auth.oauth_tokens t
		JOIN auth.oauth_grants g ON g.id = t.grant_id
		WHERE t.token_hash = $1`, hash).
		Scan(&t.ID, &t.GrantID, &t.Kind, &t.ExpiresAt, &t.RevokedAt,
			&t.UserID, &t.ClientID, &t.Scope, &t.Resource, &t.GrantRevokedAt)
	if database.IsNoRows(err) {
		return Token{}, ErrNotFound
	}
	if err != nil {
		return Token{}, fmt.Errorf("load oauth token: %w", err)
	}
	return t, nil
}

// RevokeToken implements Repository.
func (r *PGRepository) RevokeToken(ctx context.Context, id uuid.UUID) (bool, error) {
	tag, err := r.db.Exec(ctx, `UPDATE auth.oauth_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	if err != nil {
		return false, fmt.Errorf("revoke oauth token: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// RevokeGrant implements Repository.
func (r *PGRepository) RevokeGrant(ctx context.Context, grantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		WITH g AS (
			UPDATE auth.oauth_grants SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL
		)
		UPDATE auth.oauth_tokens SET revoked_at = now() WHERE grant_id = $1 AND revoked_at IS NULL`, grantID)
	if err != nil {
		return fmt.Errorf("revoke oauth grant: %w", err)
	}
	return nil
}

// TouchGrant implements Repository.
func (r *PGRepository) TouchGrant(ctx context.Context, grantID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE auth.oauth_grants SET last_used_at = now() WHERE id = $1`, grantID)
	return err
}

// ListGrants implements Repository.
func (r *PGRepository) ListGrants(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Grant, error) {
	rows, err := r.db.Query(ctx, `
		SELECT g.id, g.user_id, g.client_id, c.name, COALESCE(c.client_uri, ''), g.scope, g.resource,
		       g.created_at, g.last_used_at
		FROM auth.oauth_grants g
		JOIN auth.oauth_clients c ON c.id = g.client_id
		WHERE g.user_id = $1 AND g.revoked_at IS NULL
		ORDER BY g.created_at DESC, g.id
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list oauth grants: %w", err)
	}
	defer rows.Close()
	var out []Grant
	for rows.Next() {
		var g Grant
		if err := rows.Scan(&g.ID, &g.UserID, &g.ClientID, &g.ClientName, &g.ClientURI, &g.Scope, &g.Resource,
			&g.CreatedAt, &g.LastUsedAt); err != nil {
			return nil, fmt.Errorf("scan oauth grant: %w", err)
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// RevokeUserGrant implements Repository.
func (r *PGRepository) RevokeUserGrant(ctx context.Context, userID, grantID uuid.UUID) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		WITH g AS (
			UPDATE auth.oauth_grants SET revoked_at = now()
			WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
			RETURNING id
		), t AS (
			UPDATE auth.oauth_tokens SET revoked_at = now()
			WHERE grant_id IN (SELECT id FROM g) AND revoked_at IS NULL
		)
		SELECT 1 FROM g`, grantID, userID)
	if err != nil {
		return false, fmt.Errorf("revoke user oauth grant: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}
