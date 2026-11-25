// Package oauth is the authorization server that lets a user connect an AI
// client (an MCP host such as Claude) to their Zona Gol account (issue #50,
// phase C). It implements OAuth 2.1 as the MCP authorization spec
// (2025-11-25) requires: authorization code with PKCE (S256 only), resource
// indicators (RFC 8707), authorization server metadata (RFC 8414), dynamic
// client registration (RFC 7591), token revocation (RFC 7009) and issuer
// identification in the redirect (RFC 9207).
//
// Security notes:
//   - Tokens are opaque random strings; only their SHA-256 is stored. They
//     are not API JWTs: the REST API never accepts them and MCP never
//     accepts API tokens.
//   - Every token is bound to one resource (the MCP endpoint) and one grant.
//     Revoking the grant ("Aplicaciones conectadas") revokes its tokens.
//   - Refresh tokens rotate; presenting a rotated one, or exchanging a code
//     twice, revokes the whole grant.
//   - Only league admins and team owners can connect a client. Super admins
//     are excluded on purpose: MCP must never get implicit global access.
//   - The server, not the client, decides what a connection can reach: the
//     grant only identifies the user, and the MCP tools authorize every
//     resource against that user on each call.
package oauth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// ScopeRead lets a client read the sports data the user can manage. It is
// the only scope: writes are out of scope for issue #50.
const ScopeRead = "zonagol:read"

// scopeDescriptions are shown on the consent screen, in Spanish.
var scopeDescriptions = map[string]string{
	ScopeRead: "Consultar los datos de las ligas y equipos que administras (solo lectura)",
}

// Config of the authorization server.
type Config struct {
	// Issuer is the public origin of the site, e.g. https://zonagol.app.
	// Endpoints and metadata hang from it.
	Issuer string
	// Resource is the canonical URL of the MCP endpoint, the only audience
	// tokens are issued for.
	Resource string
	// ConsentURL is the web page where the user approves a request.
	ConsentURL string

	AccessTTL  time.Duration // default 15 minutes
	RefreshTTL time.Duration // default 30 days
	RequestTTL time.Duration // time to sign in and decide; default 10 minutes
	CodeTTL    time.Duration // default 1 minute
}

func (c Config) withDefaults() Config {
	if c.AccessTTL == 0 {
		c.AccessTTL = 15 * time.Minute
	}
	if c.RefreshTTL == 0 {
		c.RefreshTTL = 30 * 24 * time.Hour
	}
	if c.RequestTTL == 0 {
		c.RequestTTL = 10 * time.Minute
	}
	if c.CodeTTL == 0 {
		c.CodeTTL = time.Minute
	}
	return c
}

// Client authentication methods at the token endpoint.
const (
	AuthNone        = "none"
	AuthSecretPost  = "client_secret_post"
	AuthSecretBasic = "client_secret_basic"
)

// Token kinds.
const (
	KindAccess  = "access"
	KindRefresh = "refresh"
)

// ErrNotFound is returned by repositories for unknown rows.
var ErrNotFound = errors.New("not found")

// ErrCodeUsed is returned by ConsumeCode for a code that was already
// exchanged; the returned Authorization carries its grant.
var ErrCodeUsed = errors.New("authorization code already used")

// Client is a registered OAuth client.
type Client struct {
	ID           uuid.UUID
	Name         string
	ClientURI    string
	RedirectURIs []string
	AuthMethod   string
	SecretHash   []byte
	CreatedAt    time.Time
}

// Authorization is a request from /oauth/authorize until its code is used.
type Authorization struct {
	ID            uuid.UUID
	ClientID      uuid.UUID
	RedirectURI   string
	Scope         string
	Resource      string
	State         string
	CodeChallenge string
	ExpiresAt     time.Time
	DecidedAt     *time.Time
	GrantID       *uuid.UUID
	// UserID is the user who approved it (zero until approved).
	UserID        uuid.UUID
	CodeExpiresAt *time.Time
}

// Grant is a user's connection with a client.
type Grant struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	ClientID   uuid.UUID
	ClientName string
	ClientURI  string
	Scope      string
	Resource   string
	CreatedAt  time.Time
	LastUsedAt *time.Time
}

// Token is a stored token joined with its grant.
type Token struct {
	ID             uuid.UUID
	GrantID        uuid.UUID
	Kind           string
	ExpiresAt      time.Time
	RevokedAt      *time.Time
	UserID         uuid.UUID
	ClientID       uuid.UUID
	Scope          string
	Resource       string
	GrantRevokedAt *time.Time
}

// Repository is the persistence the service needs.
type Repository interface {
	CreateClient(ctx context.Context, c Client) (Client, error)
	ClientByID(ctx context.Context, id uuid.UUID) (Client, error)

	CreateAuthorization(ctx context.Context, a Authorization) (uuid.UUID, error)
	AuthorizationByID(ctx context.Context, id uuid.UUID) (Authorization, error)
	// ApproveAuthorization creates (or reuses) the user's active grant for
	// the client and attaches the code. It reports false when the request
	// was already decided.
	ApproveAuthorization(ctx context.Context, id, userID uuid.UUID, codeHash []byte, codeExpiresAt time.Time) (bool, error)
	// DenyAuthorization marks the request decided; false if it already was.
	DenyAuthorization(ctx context.Context, id uuid.UUID) (bool, error)
	// ConsumeCode marks the code used and returns its request. A code that
	// was already used returns ErrCodeUsed and the request.
	ConsumeCode(ctx context.Context, codeHash []byte) (Authorization, error)

	CreateToken(ctx context.Context, grantID uuid.UUID, kind string, hash []byte, expiresAt time.Time) error
	TokenByHash(ctx context.Context, hash []byte) (Token, error)
	// RevokeToken revokes an active token; false if it was not active.
	RevokeToken(ctx context.Context, id uuid.UUID) (bool, error)
	// RevokeGrant revokes the grant and every token issued under it.
	RevokeGrant(ctx context.Context, grantID uuid.UUID) error
	TouchGrant(ctx context.Context, grantID uuid.UUID) error

	ListGrants(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Grant, error)
	// RevokeUserGrant revokes the grant only if it belongs to userID; false
	// when there is no such active grant.
	RevokeUserGrant(ctx context.Context, userID, grantID uuid.UUID) (bool, error)
}

// Profiles loads the current role and status of a user
// (implemented by auth.PGProfileLoader).
type Profiles interface {
	LoadPrincipal(ctx context.Context, userID uuid.UUID) (auth.Principal, error)
}

// CanConnect reports whether a user may connect an AI client.
func CanConnect(p auth.Principal) bool {
	return p.IsActive && p.HasRole(auth.RoleLeagueAdmin, auth.RoleTeamOwner)
}

// --- random secrets ---

// newSecret returns prefix + 32 random bytes (base64url) and its SHA-256.
// The prefix makes leaked tokens easy to recognize in logs and scanners.
func newSecret(prefix string) (string, []byte, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", nil, err
	}
	s := prefix + base64.RawURLEncoding.EncodeToString(b)
	return s, hash(s), nil
}

func hash(s string) []byte {
	sum := sha256.Sum256([]byte(s))
	return sum[:]
}

// --- redirect URIs ---

// validRedirectURI accepts the redirect URIs OAuth 2.1 allows for
// registration: https, http on a loopback address (native apps, RFC 8252)
// and private-use schemes in reverse-domain form (e.g. cursor://...).
func validRedirectURI(raw string) bool {
	if raw == "" || len(raw) > 2000 {
		return false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Fragment != "" || u.User != nil || !u.IsAbs() {
		return false
	}
	switch scheme := strings.ToLower(u.Scheme); scheme {
	case "https":
		return u.Host != ""
	case "http":
		return isLoopback(u.Hostname())
	case "javascript", "data", "file", "vbscript", "about", "blob", "ftp", "ws", "wss":
		return false
	default:
		return strings.Contains(scheme, ".")
	}
}

func isLoopback(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// redirectMatches compares a requested redirect URI with a registered one.
// Matching is exact, except that loopback redirects may use any port, as
// native apps pick a free port at run time (RFC 8252 §7.3).
func redirectMatches(registered, requested string) bool {
	if registered == requested {
		return true
	}
	r, err1 := url.Parse(registered)
	q, err2 := url.Parse(requested)
	if err1 != nil || err2 != nil || r.Scheme != "http" || q.Scheme != "http" || !isLoopback(r.Hostname()) {
		return false
	}
	return r.Hostname() == q.Hostname() && r.Path == q.Path && r.RawQuery == q.RawQuery && q.Fragment == "" && q.User == nil
}

// redirectHost is what the consent screen shows so the user can tell where
// the code will go.
func redirectHost(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	if u.Host != "" {
		return u.Host
	}
	return u.Scheme + "://"
}

// cleanName strips control characters from client-supplied display text.
func cleanName(s string, max int) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, strings.TrimSpace(s))
	if r := []rune(s); len(r) > max {
		s = string(r[:max])
	}
	return s
}

// normalizeResource drops a trailing slash so "…/mcp" and "…/mcp/" match.
func normalizeResource(s string) string { return strings.TrimRight(s, "/") }

// validVerifier checks a PKCE code verifier (RFC 7636 §4.1).
func validVerifier(v string) bool {
	if len(v) < 43 || len(v) > 128 {
		return false
	}
	for _, c := range v {
		if !(c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-' || c == '.' || c == '_' || c == '~') {
			return false
		}
	}
	return true
}

// s256 is the PKCE S256 transform of a verifier.
func s256(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
