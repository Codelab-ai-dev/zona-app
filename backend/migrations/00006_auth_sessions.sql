-- +goose Up
-- Own authentication (replaces Supabase Auth). Passwords stay in
-- auth.users.encrypted_password (bcrypt, compatible with imported GoTrue
-- hashes). Only SHA-256 hashes of tokens are stored, never the tokens.

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id   uuid NOT NULL,          -- rotation chain; reuse revokes the whole family
    token_hash  bytea NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    replaced_by uuid REFERENCES auth.refresh_tokens(id) ON DELETE SET NULL,
    user_agent  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON auth.refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  bytea NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON auth.password_reset_tokens (user_id);

-- Emails are compared case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_lower_key ON auth.users (lower(email));

-- +goose Down
DROP INDEX IF EXISTS auth.auth_users_email_lower_key;
DROP TABLE IF EXISTS auth.password_reset_tokens;
DROP TABLE IF EXISTS auth.refresh_tokens;
