-- +goose Up
-- OAuth 2.1 authorization server for the Zona Gol MCP endpoint (issue #50,
-- phase C). Users connect an AI client to their account; the client gets
-- opaque tokens that only the MCP resource accepts. As in auth.refresh_tokens,
-- only SHA-256 hashes of codes, secrets and tokens are stored.

-- Clients registered through Dynamic Client Registration (RFC 7591).
CREATE TABLE IF NOT EXISTS auth.oauth_clients (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    client_uri    text,
    redirect_uris text[] NOT NULL CHECK (cardinality(redirect_uris) BETWEEN 1 AND 5),
    -- 'none' = public client protected by PKCE alone.
    auth_method   text NOT NULL CHECK (auth_method IN ('none', 'client_secret_post', 'client_secret_basic')),
    secret_hash   bytea,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK ((auth_method = 'none') = (secret_hash IS NULL))
);

-- A user's consent for a client: what "Aplicaciones conectadas" lists.
-- Revoking it revokes every token issued under it.
CREATE TABLE IF NOT EXISTS auth.oauth_grants (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id    uuid NOT NULL REFERENCES auth.oauth_clients(id) ON DELETE CASCADE,
    scope        text NOT NULL,
    resource     text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at   timestamptz
);
-- One active connection per user and client; approving again reuses it.
CREATE UNIQUE INDEX IF NOT EXISTS oauth_grants_active_key
    ON auth.oauth_grants (user_id, client_id) WHERE revoked_at IS NULL;

-- An authorization request, from /oauth/authorize to the code exchange.
-- It is created before the user signs in (user_id and grant_id are set on
-- approval) and its code can be exchanged once.
CREATE TABLE IF NOT EXISTS auth.oauth_authorizations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       uuid NOT NULL REFERENCES auth.oauth_clients(id) ON DELETE CASCADE,
    redirect_uri    text NOT NULL,
    scope           text NOT NULL,
    resource        text NOT NULL,
    state           text,
    code_challenge  text NOT NULL,
    expires_at      timestamptz NOT NULL,
    decided_at      timestamptz,
    grant_id        uuid REFERENCES auth.oauth_grants(id) ON DELETE CASCADE,
    code_hash       bytea UNIQUE,
    code_expires_at timestamptz,
    code_used_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_expires ON auth.oauth_authorizations (expires_at);

-- Access and refresh tokens. Refresh tokens rotate on use; presenting a
-- rotated one revokes the whole grant (theft detection).
CREATE TABLE IF NOT EXISTS auth.oauth_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id    uuid NOT NULL REFERENCES auth.oauth_grants(id) ON DELETE CASCADE,
    kind        text NOT NULL CHECK (kind IN ('access', 'refresh')),
    token_hash  bytea NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_grant ON auth.oauth_tokens (grant_id);

-- +goose Down
DROP TABLE IF EXISTS auth.oauth_tokens;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.oauth_grants;
DROP TABLE IF EXISTS auth.oauth_clients;
