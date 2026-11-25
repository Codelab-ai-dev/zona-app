package oauth

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Error is an OAuth error response (RFC 6749 §5.2, RFC 7591 §3.2.2).
// Descriptions are for developers and never include internal causes.
type Error struct {
	Status      int
	Code        string
	Description string
}

func (e *Error) Error() string { return e.Code + ": " + e.Description }

func oauthErr(status int, code, desc string) *Error {
	return &Error{Status: status, Code: code, Description: desc}
}

var (
	errInvalidClient = oauthErr(http.StatusUnauthorized, "invalid_client", "client authentication failed")
	errInvalidGrant  = oauthErr(http.StatusBadRequest, "invalid_grant", "the grant is invalid, expired or revoked")
)

// Errors of the consent API, shown by the web.
var (
	errRequestGone = &httpx.Error{Status: http.StatusNotFound, Code: "authorization_not_found",
		Message: "La solicitud de conexión no existe o ya expiró. Vuelve a iniciarla desde la aplicación."}
	errCannotConnect = &httpx.Error{Status: http.StatusForbidden, Code: "connection_not_allowed",
		Message: "Solo administradores de liga y dueños de equipo pueden conectar aplicaciones."}
)

// Service implements the authorization server.
type Service struct {
	repo     Repository
	profiles Profiles
	cfg      Config
	now      func() time.Time
}

// NewService builds the service.
func NewService(repo Repository, profiles Profiles, cfg Config) *Service {
	return &Service{repo: repo, profiles: profiles, cfg: cfg.withDefaults(), now: time.Now}
}

// --- metadata ---

// Metadata is the authorization server metadata (RFC 8414).
func (s *Service) Metadata() map[string]any {
	iss := s.cfg.Issuer
	return map[string]any{
		"issuer":                                         iss,
		"authorization_endpoint":                         iss + "/oauth/authorize",
		"token_endpoint":                                 iss + "/oauth/token",
		"registration_endpoint":                          iss + "/oauth/register",
		"revocation_endpoint":                            iss + "/oauth/revoke",
		"response_types_supported":                       []string{"code"},
		"grant_types_supported":                          []string{"authorization_code", "refresh_token"},
		"code_challenge_methods_supported":               []string{"S256"},
		"token_endpoint_auth_methods_supported":          []string{AuthNone, AuthSecretPost, AuthSecretBasic},
		"revocation_endpoint_auth_methods_supported":     []string{AuthNone, AuthSecretPost, AuthSecretBasic},
		"scopes_supported":                               []string{ScopeRead},
		"authorization_response_iss_parameter_supported": true,
		"client_id_metadata_document_supported":          false,
	}
}

// --- registration (RFC 7591) ---

// RegistrationRequest is the client metadata a client sends.
type RegistrationRequest struct {
	ClientName              string   `json:"client_name"`
	ClientURI               string   `json:"client_uri"`
	RedirectURIs            []string `json:"redirect_uris"`
	GrantTypes              []string `json:"grant_types"`
	ResponseTypes           []string `json:"response_types"`
	TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
}

// RegistrationResponse is the registered client.
type RegistrationResponse struct {
	ClientID                string   `json:"client_id"`
	ClientSecret            string   `json:"client_secret,omitempty"`
	ClientIDIssuedAt        int64    `json:"client_id_issued_at"`
	ClientSecretExpiresAt   *int64   `json:"client_secret_expires_at,omitempty"`
	ClientName              string   `json:"client_name"`
	ClientURI               string   `json:"client_uri,omitempty"`
	RedirectURIs            []string `json:"redirect_uris"`
	GrantTypes              []string `json:"grant_types"`
	ResponseTypes           []string `json:"response_types"`
	TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
	Scope                   string   `json:"scope"`
}

// Register registers a client. Registration is open, as MCP hosts register
// themselves; it grants nothing until a user approves a request.
func (s *Service) Register(ctx context.Context, req RegistrationRequest) (RegistrationResponse, error) {
	if n := len(req.RedirectURIs); n == 0 || n > 5 {
		return RegistrationResponse{}, oauthErr(http.StatusBadRequest, "invalid_redirect_uri", "between 1 and 5 redirect_uris are required")
	}
	for _, u := range req.RedirectURIs {
		if !validRedirectURI(u) {
			return RegistrationResponse{}, oauthErr(http.StatusBadRequest, "invalid_redirect_uri", "redirect URIs must be https, loopback http or a private-use scheme")
		}
	}
	for _, g := range req.GrantTypes {
		if g != "authorization_code" && g != "refresh_token" {
			return RegistrationResponse{}, oauthErr(http.StatusBadRequest, "invalid_client_metadata", "unsupported grant_type "+g)
		}
	}
	for _, rt := range req.ResponseTypes {
		if rt != "code" {
			return RegistrationResponse{}, oauthErr(http.StatusBadRequest, "invalid_client_metadata", "unsupported response_type "+rt)
		}
	}
	method := req.TokenEndpointAuthMethod
	if method == "" {
		method = AuthSecretBasic // RFC 7591 §2 default
	}
	if method != AuthNone && method != AuthSecretPost && method != AuthSecretBasic {
		return RegistrationResponse{}, oauthErr(http.StatusBadRequest, "invalid_client_metadata", "unsupported token_endpoint_auth_method")
	}
	clientURI := strings.TrimSpace(req.ClientURI)
	if clientURI != "" {
		if u, err := url.Parse(clientURI); err != nil || u.Scheme != "https" || u.Host == "" || len(clientURI) > 500 {
			clientURI = "" // informative only; drop rather than reject
		}
	}
	name := cleanName(req.ClientName, 100)
	if name == "" {
		name = "Aplicación sin nombre"
	}

	c := Client{Name: name, ClientURI: clientURI, RedirectURIs: req.RedirectURIs, AuthMethod: method}
	var secret string
	if method != AuthNone {
		var err error
		if secret, c.SecretHash, err = newSecret("zgs_"); err != nil {
			return RegistrationResponse{}, err
		}
	}
	created, err := s.repo.CreateClient(ctx, c)
	if err != nil {
		return RegistrationResponse{}, fmt.Errorf("register client: %w", err)
	}
	resp := RegistrationResponse{
		ClientID:                created.ID.String(),
		ClientSecret:            secret,
		ClientIDIssuedAt:        created.CreatedAt.Unix(),
		ClientName:              created.Name,
		ClientURI:               created.ClientURI,
		RedirectURIs:            created.RedirectURIs,
		GrantTypes:              []string{"authorization_code", "refresh_token"},
		ResponseTypes:           []string{"code"},
		TokenEndpointAuthMethod: method,
		Scope:                   ScopeRead,
	}
	if secret != "" {
		never := int64(0)
		resp.ClientSecretExpiresAt = &never
	}
	return resp, nil
}

// --- authorization endpoint ---

// AuthorizeParams are the query parameters of /oauth/authorize.
type AuthorizeParams struct {
	ResponseType        string
	ClientID            string
	RedirectURI         string
	Scope               string
	State               string
	CodeChallenge       string
	CodeChallengeMethod string
	Resource            string
}

// Authorize validates an authorization request and returns where to send
// the browser: the consent page on success, the client's redirect URI with
// an error, or the consent page with an error when the client or redirect
// URI cannot be trusted (RFC 6749 §4.1.2.1: never redirect to them).
func (s *Service) Authorize(ctx context.Context, p AuthorizeParams) (string, error) {
	clientID, err := uuid.Parse(p.ClientID)
	if err != nil {
		return s.consentError("invalid_client"), nil
	}
	client, err := s.repo.ClientByID(ctx, clientID)
	if errors.Is(err, ErrNotFound) {
		return s.consentError("invalid_client"), nil
	}
	if err != nil {
		return "", err
	}
	redirect, ok := s.matchRedirect(client, p.RedirectURI)
	if !ok {
		return s.consentError("invalid_redirect_uri"), nil
	}

	fail := func(code, desc string) (string, error) {
		return s.redirectWith(redirect, url.Values{"error": {code}, "error_description": {desc}}, p.State), nil
	}
	if p.ResponseType != "code" {
		return fail("unsupported_response_type", "only response_type=code is supported")
	}
	if p.CodeChallengeMethod != "S256" || len(p.CodeChallenge) < 43 || len(p.CodeChallenge) > 128 {
		return fail("invalid_request", "PKCE with code_challenge_method=S256 is required")
	}
	if len(p.State) > 500 {
		return fail("invalid_request", "state is too long")
	}
	scope, ok := normalizeScope(p.Scope)
	if !ok {
		return fail("invalid_scope", "supported scope: "+ScopeRead)
	}
	resource, ok := s.checkResource(p.Resource)
	if !ok {
		return fail("invalid_target", "resource must be "+s.cfg.Resource)
	}

	id, err := s.repo.CreateAuthorization(ctx, Authorization{
		ClientID:      client.ID,
		RedirectURI:   redirect,
		Scope:         scope,
		Resource:      resource,
		State:         p.State,
		CodeChallenge: p.CodeChallenge,
		ExpiresAt:     s.now().Add(s.cfg.RequestTTL),
	})
	if err != nil {
		return "", fmt.Errorf("create authorization: %w", err)
	}
	return s.cfg.ConsentURL + "?solicitud=" + id.String(), nil
}

// matchRedirect returns the redirect URI to use. When the client registered
// a single URI the parameter may be omitted (RFC 6749 §3.1.2.3).
func (s *Service) matchRedirect(c Client, requested string) (string, bool) {
	if requested == "" {
		if len(c.RedirectURIs) == 1 {
			return c.RedirectURIs[0], true
		}
		return "", false
	}
	for _, reg := range c.RedirectURIs {
		if redirectMatches(reg, requested) {
			return requested, true
		}
	}
	return "", false
}

func (s *Service) consentError(code string) string {
	return s.cfg.ConsentURL + "?error=" + url.QueryEscape(code)
}

// redirectWith appends params, state and iss (RFC 9207) to a redirect URI.
func (s *Service) redirectWith(redirect string, params url.Values, state string) string {
	u, _ := url.Parse(redirect) // validated on registration
	q := u.Query()
	for k, v := range params {
		q[k] = v
	}
	if state != "" {
		q.Set("state", state)
	}
	q.Set("iss", s.cfg.Issuer)
	u.RawQuery = q.Encode()
	return u.String()
}

func normalizeScope(raw string) (string, bool) {
	for _, sc := range strings.Fields(raw) {
		if sc != ScopeRead {
			return "", false
		}
	}
	return ScopeRead, true
}

// checkResource applies RFC 8707: the only audience is the MCP endpoint.
// An omitted resource means that endpoint, for clients that predate it.
func (s *Service) checkResource(raw string) (string, bool) {
	if raw == "" {
		return s.cfg.Resource, true
	}
	if normalizeResource(raw) != normalizeResource(s.cfg.Resource) {
		return "", false
	}
	return s.cfg.Resource, true
}

// --- consent (web, authenticated with the normal API session) ---

// ScopeInfo describes a scope on the consent screen.
type ScopeInfo struct {
	Scope       string `json:"scope"`
	Description string `json:"description"`
}

// Consent is what the consent screen shows.
type Consent struct {
	ID           uuid.UUID   `json:"id"`
	ClientName   string      `json:"client_name"`
	ClientURI    string      `json:"client_uri,omitempty"`
	RedirectHost string      `json:"redirect_host"`
	Scopes       []ScopeInfo `json:"scopes"`
	ExpiresAt    time.Time   `json:"expires_at"`
}

// DecisionRequest is the body of POST /oauth/requests/{requestID}/decision.
type DecisionRequest struct {
	Approve bool `json:"approve"`
}

// Decision tells the web where to send the browser.
type Decision struct {
	RedirectTo string `json:"redirect_to"`
}

// pending loads an undecided, unexpired request for a user who may connect.
func (s *Service) pending(ctx context.Context, p auth.Principal, id uuid.UUID) (Authorization, Client, error) {
	if !CanConnect(p) {
		return Authorization{}, Client{}, errCannotConnect
	}
	a, err := s.repo.AuthorizationByID(ctx, id)
	if errors.Is(err, ErrNotFound) {
		return Authorization{}, Client{}, errRequestGone
	}
	if err != nil {
		return Authorization{}, Client{}, err
	}
	if a.DecidedAt != nil || !s.now().Before(a.ExpiresAt) {
		return Authorization{}, Client{}, errRequestGone
	}
	c, err := s.repo.ClientByID(ctx, a.ClientID)
	if err != nil {
		return Authorization{}, Client{}, errRequestGone.Wrap(err)
	}
	return a, c, nil
}

// ConsentFor returns the consent screen data of a pending request.
func (s *Service) ConsentFor(ctx context.Context, p auth.Principal, id uuid.UUID) (Consent, error) {
	a, c, err := s.pending(ctx, p, id)
	if err != nil {
		return Consent{}, err
	}
	return Consent{
		ID:           a.ID,
		ClientName:   c.Name,
		ClientURI:    c.ClientURI,
		RedirectHost: redirectHost(a.RedirectURI),
		Scopes:       describeScopes(a.Scope),
		ExpiresAt:    a.ExpiresAt,
	}, nil
}

// Decide records the user's decision and returns the client redirect with a
// code (approve) or access_denied.
func (s *Service) Decide(ctx context.Context, p auth.Principal, id uuid.UUID, approve bool) (Decision, error) {
	a, _, err := s.pending(ctx, p, id)
	if err != nil {
		return Decision{}, err
	}
	if !approve {
		ok, err := s.repo.DenyAuthorization(ctx, a.ID)
		if err != nil {
			return Decision{}, err
		}
		if !ok {
			return Decision{}, errRequestGone
		}
		return Decision{RedirectTo: s.redirectWith(a.RedirectURI, url.Values{
			"error": {"access_denied"}, "error_description": {"the user denied the request"},
		}, a.State)}, nil
	}

	code, codeHash, err := newSecret("zgc_")
	if err != nil {
		return Decision{}, err
	}
	ok, err := s.repo.ApproveAuthorization(ctx, a.ID, p.UserID, codeHash, s.now().Add(s.cfg.CodeTTL))
	if err != nil {
		return Decision{}, fmt.Errorf("approve authorization: %w", err)
	}
	if !ok {
		return Decision{}, errRequestGone
	}
	slog.InfoContext(ctx, "oauth client connected", "user_id", p.UserID, "client_id", a.ClientID)
	return Decision{RedirectTo: s.redirectWith(a.RedirectURI, url.Values{"code": {code}}, a.State)}, nil
}

func describeScopes(scope string) []ScopeInfo {
	var out []ScopeInfo
	for _, sc := range strings.Fields(scope) {
		out = append(out, ScopeInfo{Scope: sc, Description: scopeDescriptions[sc]})
	}
	return out
}

// --- token endpoint ---

// ClientCredentials identify the client at the token and revocation
// endpoints (Basic header or form fields).
type ClientCredentials struct {
	ClientID     string
	ClientSecret string
}

// TokenRequest is the form of POST /oauth/token.
type TokenRequest struct {
	GrantType    string
	Code         string
	RedirectURI  string
	CodeVerifier string
	RefreshToken string
	Resource     string
	Scope        string
}

// TokenResponse is a successful token response (RFC 6749 §5.1).
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

// authenticateClient checks the client and, for confidential clients, its
// secret. Public clients ("none") must not send a secret.
func (s *Service) authenticateClient(ctx context.Context, cred ClientCredentials) (Client, error) {
	id, err := uuid.Parse(cred.ClientID)
	if err != nil {
		return Client{}, errInvalidClient
	}
	c, err := s.repo.ClientByID(ctx, id)
	if errors.Is(err, ErrNotFound) {
		return Client{}, errInvalidClient
	}
	if err != nil {
		return Client{}, err
	}
	if c.AuthMethod == AuthNone {
		if cred.ClientSecret != "" {
			return Client{}, errInvalidClient
		}
		return c, nil
	}
	if cred.ClientSecret == "" || subtle.ConstantTimeCompare(hash(cred.ClientSecret), c.SecretHash) != 1 {
		return Client{}, errInvalidClient
	}
	return c, nil
}

// Token implements the authorization_code and refresh_token grants.
func (s *Service) Token(ctx context.Context, cred ClientCredentials, req TokenRequest) (TokenResponse, error) {
	client, err := s.authenticateClient(ctx, cred)
	if err != nil {
		return TokenResponse{}, err
	}
	switch req.GrantType {
	case "authorization_code":
		return s.exchangeCode(ctx, client, req)
	case "refresh_token":
		return s.refresh(ctx, client, req)
	default:
		return TokenResponse{}, oauthErr(http.StatusBadRequest, "unsupported_grant_type", "supported: authorization_code, refresh_token")
	}
}

func (s *Service) exchangeCode(ctx context.Context, client Client, req TokenRequest) (TokenResponse, error) {
	if req.Code == "" || !validVerifier(req.CodeVerifier) {
		return TokenResponse{}, oauthErr(http.StatusBadRequest, "invalid_request", "code and a valid code_verifier are required")
	}
	a, err := s.repo.ConsumeCode(ctx, hash(req.Code))
	switch {
	case errors.Is(err, ErrNotFound):
		return TokenResponse{}, errInvalidGrant
	case errors.Is(err, ErrCodeUsed):
		// A replayed code may mean it was stolen: drop the whole connection.
		if a.GrantID != nil {
			slog.WarnContext(ctx, "oauth code reuse detected; revoking grant", "client_id", a.ClientID)
			if err := s.repo.RevokeGrant(ctx, *a.GrantID); err != nil {
				return TokenResponse{}, err
			}
		}
		return TokenResponse{}, errInvalidGrant
	case err != nil:
		return TokenResponse{}, err
	}
	if a.ClientID != client.ID || a.GrantID == nil || a.CodeExpiresAt == nil || !s.now().Before(*a.CodeExpiresAt) {
		return TokenResponse{}, errInvalidGrant
	}
	// The redirect_uri must repeat the one of the request; it may be omitted
	// only if the request omitted it too (single registered URI).
	if req.RedirectURI != a.RedirectURI && (req.RedirectURI != "" || len(client.RedirectURIs) != 1) {
		return TokenResponse{}, errInvalidGrant
	}
	if subtle.ConstantTimeCompare([]byte(s256(req.CodeVerifier)), []byte(a.CodeChallenge)) != 1 {
		return TokenResponse{}, errInvalidGrant
	}
	if req.Resource != "" && normalizeResource(req.Resource) != normalizeResource(a.Resource) {
		return TokenResponse{}, oauthErr(http.StatusBadRequest, "invalid_target", "resource does not match the authorization")
	}
	return s.issue(ctx, *a.GrantID, a.UserID, a.Scope)
}

func (s *Service) refresh(ctx context.Context, client Client, req TokenRequest) (TokenResponse, error) {
	if req.RefreshToken == "" {
		return TokenResponse{}, oauthErr(http.StatusBadRequest, "invalid_request", "refresh_token is required")
	}
	t, err := s.repo.TokenByHash(ctx, hash(req.RefreshToken))
	if errors.Is(err, ErrNotFound) {
		return TokenResponse{}, errInvalidGrant
	}
	if err != nil {
		return TokenResponse{}, err
	}
	if t.Kind != KindRefresh || t.ClientID != client.ID || t.GrantRevokedAt != nil {
		return TokenResponse{}, errInvalidGrant
	}
	if t.RevokedAt != nil {
		slog.WarnContext(ctx, "oauth refresh token reuse detected; revoking grant", "user_id", t.UserID, "client_id", t.ClientID)
		if err := s.repo.RevokeGrant(ctx, t.GrantID); err != nil {
			return TokenResponse{}, err
		}
		return TokenResponse{}, errInvalidGrant
	}
	if !s.now().Before(t.ExpiresAt) {
		return TokenResponse{}, errInvalidGrant
	}
	if req.Resource != "" && normalizeResource(req.Resource) != normalizeResource(t.Resource) {
		return TokenResponse{}, oauthErr(http.StatusBadRequest, "invalid_target", "resource does not match the grant")
	}
	if req.Scope != "" {
		if sc, ok := normalizeScope(req.Scope); !ok || !slices.Contains(strings.Fields(t.Scope), sc) {
			return TokenResponse{}, oauthErr(http.StatusBadRequest, "invalid_scope", "scope exceeds the grant")
		}
	}
	rotated, err := s.repo.RevokeToken(ctx, t.ID)
	if err != nil {
		return TokenResponse{}, err
	}
	if !rotated {
		// Another request rotated it first: treat as reuse.
		if err := s.repo.RevokeGrant(ctx, t.GrantID); err != nil {
			return TokenResponse{}, err
		}
		return TokenResponse{}, errInvalidGrant
	}
	return s.issue(ctx, t.GrantID, t.UserID, t.Scope)
}

// issue checks the user can still connect and creates a token pair.
func (s *Service) issue(ctx context.Context, grantID, userID uuid.UUID, scope string) (TokenResponse, error) {
	p, err := s.profiles.LoadPrincipal(ctx, userID)
	if errors.Is(err, auth.ErrProfileNotFound) || (err == nil && !CanConnect(p)) {
		// Deactivated, or no longer an admin/owner: the connection ends.
		if err := s.repo.RevokeGrant(ctx, grantID); err != nil {
			return TokenResponse{}, err
		}
		return TokenResponse{}, errInvalidGrant
	}
	if err != nil {
		return TokenResponse{}, err
	}
	now := s.now()
	access, accessHash, err := newSecret("zga_")
	if err != nil {
		return TokenResponse{}, err
	}
	refresh, refreshHash, err := newSecret("zgr_")
	if err != nil {
		return TokenResponse{}, err
	}
	if err := s.repo.CreateToken(ctx, grantID, KindAccess, accessHash, now.Add(s.cfg.AccessTTL)); err != nil {
		return TokenResponse{}, fmt.Errorf("create access token: %w", err)
	}
	if err := s.repo.CreateToken(ctx, grantID, KindRefresh, refreshHash, now.Add(s.cfg.RefreshTTL)); err != nil {
		return TokenResponse{}, fmt.Errorf("create refresh token: %w", err)
	}
	if err := s.repo.TouchGrant(ctx, grantID); err != nil {
		slog.WarnContext(ctx, "oauth grant last use not recorded", "err", err)
	}
	return TokenResponse{
		AccessToken:  access,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.cfg.AccessTTL / time.Second),
		RefreshToken: refresh,
		Scope:        scope,
	}, nil
}

// --- revocation (RFC 7009) ---

// Revoke revokes a token presented by its client. Unknown tokens and tokens
// of other clients succeed silently, as the RFC requires. Revoking a refresh
// token ends the connection (grant and all its tokens).
func (s *Service) Revoke(ctx context.Context, cred ClientCredentials, token string) error {
	client, err := s.authenticateClient(ctx, cred)
	if err != nil {
		return err
	}
	if token == "" {
		return oauthErr(http.StatusBadRequest, "invalid_request", "token is required")
	}
	t, err := s.repo.TokenByHash(ctx, hash(token))
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if t.ClientID != client.ID {
		return nil
	}
	if t.Kind == KindRefresh {
		return s.repo.RevokeGrant(ctx, t.GrantID)
	}
	_, err = s.repo.RevokeToken(ctx, t.ID)
	return err
}

// --- connected apps (web) ---

// ConnectedApp is a grant as "Aplicaciones conectadas" lists it.
type ConnectedApp struct {
	ID         uuid.UUID   `json:"id"`
	ClientName string      `json:"client_name"`
	ClientURI  string      `json:"client_uri,omitempty"`
	Scopes     []ScopeInfo `json:"scopes"`
	CreatedAt  time.Time   `json:"created_at"`
	LastUsedAt *time.Time  `json:"last_used_at"`
}

// ListConnected returns the caller's active connections.
func (s *Service) ListConnected(ctx context.Context, p auth.Principal, page httpx.Page) ([]ConnectedApp, error) {
	grants, err := s.repo.ListGrants(ctx, p.UserID, page.Limit, page.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]ConnectedApp, 0, len(grants))
	for _, g := range grants {
		out = append(out, ConnectedApp{
			ID: g.ID, ClientName: g.ClientName, ClientURI: g.ClientURI,
			Scopes: describeScopes(g.Scope), CreatedAt: g.CreatedAt, LastUsedAt: g.LastUsedAt,
		})
	}
	return out, nil
}

// Disconnect revokes one of the caller's connections. Another user's grant
// answers 404, the same as a missing one.
func (s *Service) Disconnect(ctx context.Context, p auth.Principal, grantID uuid.UUID) error {
	ok, err := s.repo.RevokeUserGrant(ctx, p.UserID, grantID)
	if err != nil {
		return err
	}
	if !ok {
		return httpx.ErrNotFound
	}
	slog.InfoContext(ctx, "oauth client disconnected", "user_id", p.UserID, "grant_id", grantID)
	return nil
}

// --- token verification (for the MCP resource server) ---

// AccessInfo is what a valid access token proves.
type AccessInfo struct {
	UserID    uuid.UUID
	ClientID  uuid.UUID
	GrantID   uuid.UUID
	Scopes    []string
	Resource  string
	ExpiresAt time.Time
}

// ErrInvalidToken is returned by VerifyAccessToken for any unusable token.
var ErrInvalidToken = errors.New("invalid access token")

// VerifyAccessToken checks an access token for the given resource. It does
// not check the user's current role: callers load the principal per call.
func (s *Service) VerifyAccessToken(ctx context.Context, raw, resource string) (AccessInfo, error) {
	if raw == "" {
		return AccessInfo{}, ErrInvalidToken
	}
	t, err := s.repo.TokenByHash(ctx, hash(raw))
	if errors.Is(err, ErrNotFound) {
		return AccessInfo{}, ErrInvalidToken
	}
	if err != nil {
		return AccessInfo{}, err
	}
	if t.Kind != KindAccess || t.RevokedAt != nil || t.GrantRevokedAt != nil || !s.now().Before(t.ExpiresAt) ||
		normalizeResource(t.Resource) != normalizeResource(resource) {
		return AccessInfo{}, ErrInvalidToken
	}
	return AccessInfo{
		UserID: t.UserID, ClientID: t.ClientID, GrantID: t.GrantID,
		Scopes: strings.Fields(t.Scope), Resource: t.Resource, ExpiresAt: t.ExpiresAt,
	}, nil
}
