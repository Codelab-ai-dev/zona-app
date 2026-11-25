package oauth

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const (
	testIssuer   = "https://zonagol.test"
	testResource = "https://zonagol.test/mcp"
	testConsent  = "https://zonagol.test/autorizar"
	testRedirect = "https://claude.example/callback"
	testVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk-extra-chars"
)

type env struct {
	t        *testing.T
	svc      *Service
	repo     *fakeRepo
	profiles *fakeProfiles
	clock    time.Time
	admin    auth.Principal
}

func newEnv(t *testing.T) *env {
	t.Helper()
	e := &env{t: t, repo: newFakeRepo(), profiles: &fakeProfiles{users: map[uuid.UUID]auth.Principal{}}, clock: time.Date(2026, 11, 24, 12, 0, 0, 0, time.UTC)}
	e.svc = NewService(e.repo, e.profiles, Config{Issuer: testIssuer, Resource: testResource, ConsentURL: testConsent})
	e.svc.now = func() time.Time { return e.clock }
	leagueID := uuid.New()
	e.admin = auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true}
	e.profiles.set(e.admin)
	return e
}

func (e *env) register(method string, redirects ...string) RegistrationResponse {
	e.t.Helper()
	if len(redirects) == 0 {
		redirects = []string{testRedirect}
	}
	resp, err := e.svc.Register(context.Background(), RegistrationRequest{
		ClientName: "Claude", RedirectURIs: redirects, TokenEndpointAuthMethod: method,
	})
	if err != nil {
		e.t.Fatalf("register: %v", err)
	}
	return resp
}

func (e *env) params(clientID string) AuthorizeParams {
	return AuthorizeParams{
		ResponseType: "code", ClientID: clientID, RedirectURI: testRedirect, Scope: ScopeRead,
		State: "xyz", CodeChallenge: s256(testVerifier), CodeChallengeMethod: "S256", Resource: testResource,
	}
}

// startRequest runs /authorize and returns the pending request ID.
func (e *env) startRequest(p AuthorizeParams) uuid.UUID {
	e.t.Helper()
	loc, err := e.svc.Authorize(context.Background(), p)
	if err != nil {
		e.t.Fatalf("authorize: %v", err)
	}
	if !strings.HasPrefix(loc, testConsent+"?solicitud=") {
		e.t.Fatalf("authorize did not reach consent: %s", loc)
	}
	return uuid.MustParse(strings.TrimPrefix(loc, testConsent+"?solicitud="))
}

// approve consents as user and returns the code from the redirect.
func (e *env) approve(user auth.Principal, id uuid.UUID) string {
	e.t.Helper()
	d, err := e.svc.Decide(context.Background(), user, id, true)
	if err != nil {
		e.t.Fatalf("decide: %v", err)
	}
	u, _ := url.Parse(d.RedirectTo)
	if got := u.Query().Get("iss"); got != testIssuer {
		e.t.Fatalf("iss = %q", got)
	}
	return u.Query().Get("code")
}

func (e *env) exchange(clientID, code string) (TokenResponse, error) {
	return e.svc.Token(context.Background(), ClientCredentials{ClientID: clientID}, TokenRequest{
		GrantType: "authorization_code", Code: code, RedirectURI: testRedirect, CodeVerifier: testVerifier, Resource: testResource,
	})
}

// connect runs the whole flow for a public client and returns its tokens.
func (e *env) connect() (RegistrationResponse, TokenResponse) {
	e.t.Helper()
	c := e.register(AuthNone)
	tok, err := e.exchange(c.ClientID, e.approve(e.admin, e.startRequest(e.params(c.ClientID))))
	if err != nil {
		e.t.Fatalf("exchange: %v", err)
	}
	return c, tok
}

func oauthCode(err error) string {
	var oe *Error
	if errors.As(err, &oe) {
		return oe.Code
	}
	return ""
}

func TestRegister(t *testing.T) {
	e := newEnv(t)
	t.Run("public client gets no secret", func(t *testing.T) {
		r := e.register(AuthNone, "http://127.0.0.1:33418/callback", "cursor.example://oauth/callback")
		if r.ClientSecret != "" || r.TokenEndpointAuthMethod != AuthNone || r.ClientSecretExpiresAt != nil {
			t.Fatalf("%+v", r)
		}
	})
	t.Run("default method is client_secret_basic with a secret", func(t *testing.T) {
		r := e.register("")
		if r.TokenEndpointAuthMethod != AuthSecretBasic || !strings.HasPrefix(r.ClientSecret, "zgs_") {
			t.Fatalf("%+v", r)
		}
	})
	t.Run("name is cleaned and defaulted", func(t *testing.T) {
		r, err := e.svc.Register(context.Background(), RegistrationRequest{ClientName: " \x00\n ", RedirectURIs: []string{testRedirect}, TokenEndpointAuthMethod: AuthNone})
		if err != nil || r.ClientName != "Aplicación sin nombre" {
			t.Fatalf("%+v %v", r, err)
		}
	})
	for name, req := range map[string]RegistrationRequest{
		"no redirect":         {},
		"plain http":          {RedirectURIs: []string{"http://evil.example/cb"}},
		"javascript scheme":   {RedirectURIs: []string{"javascript:alert(1)"}},
		"fragment":            {RedirectURIs: []string{"https://a.example/cb#x"}},
		"relative":            {RedirectURIs: []string{"/cb"}},
		"bare custom scheme":  {RedirectURIs: []string{"myapp:/cb"}},
		"too many":            {RedirectURIs: []string{testRedirect, testRedirect, testRedirect, testRedirect, testRedirect, testRedirect}},
		"implicit grant":      {RedirectURIs: []string{testRedirect}, GrantTypes: []string{"implicit"}},
		"client credentials":  {RedirectURIs: []string{testRedirect}, GrantTypes: []string{"client_credentials"}},
		"token response type": {RedirectURIs: []string{testRedirect}, ResponseTypes: []string{"token"}},
		"unknown auth method": {RedirectURIs: []string{testRedirect}, TokenEndpointAuthMethod: "private_key_jwt"},
	} {
		t.Run("rejects "+name, func(t *testing.T) {
			if _, err := e.svc.Register(context.Background(), req); oauthCode(err) == "" {
				t.Fatalf("accepted: %v", err)
			}
		})
	}
}

func TestAuthorizeNeverRedirectsToUntrustedURIs(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone)
	for name, mutate := range map[string]func(*AuthorizeParams){
		"unknown client":       func(p *AuthorizeParams) { p.ClientID = uuid.NewString() },
		"malformed client":     func(p *AuthorizeParams) { p.ClientID = "claude" },
		"unregistered uri":     func(p *AuthorizeParams) { p.RedirectURI = "https://evil.example/callback" },
		"same host other path": func(p *AuthorizeParams) { p.RedirectURI = "https://claude.example/other" },
	} {
		t.Run(name, func(t *testing.T) {
			p := e.params(c.ClientID)
			mutate(&p)
			loc, err := e.svc.Authorize(context.Background(), p)
			if err != nil || !strings.HasPrefix(loc, testConsent+"?error=") {
				t.Fatalf("location %q, %v", loc, err)
			}
		})
	}
}

func TestAuthorizeErrorsGoBackToTheClient(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone)
	for name, tc := range map[string]struct {
		mutate func(*AuthorizeParams)
		code   string
	}{
		"implicit flow":    {func(p *AuthorizeParams) { p.ResponseType = "token" }, "unsupported_response_type"},
		"no PKCE":          {func(p *AuthorizeParams) { p.CodeChallenge, p.CodeChallengeMethod = "", "" }, "invalid_request"},
		"plain PKCE":       {func(p *AuthorizeParams) { p.CodeChallengeMethod = "plain" }, "invalid_request"},
		"unknown scope":    {func(p *AuthorizeParams) { p.Scope = "zonagol:write" }, "invalid_scope"},
		"another resource": {func(p *AuthorizeParams) { p.Resource = "https://api.other.example/mcp" }, "invalid_target"},
		"huge state":       {func(p *AuthorizeParams) { p.State = strings.Repeat("s", 600) }, "invalid_request"},
	} {
		t.Run(name, func(t *testing.T) {
			p := e.params(c.ClientID)
			tc.mutate(&p)
			loc, err := e.svc.Authorize(context.Background(), p)
			if err != nil {
				t.Fatal(err)
			}
			u, _ := url.Parse(loc)
			q := u.Query()
			if !strings.HasPrefix(loc, testRedirect) || q.Get("error") != tc.code || q.Get("iss") != testIssuer {
				t.Fatalf("location %q", loc)
			}
			if tc.code != "invalid_request" || name != "huge state" {
				if q.Get("state") != "xyz" {
					t.Fatalf("state lost: %q", loc)
				}
			}
		})
	}
}

func TestAuthorizeAcceptsLoopbackOnAnyPortAndDefaults(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone, "http://127.0.0.1:1234/callback")
	p := e.params(c.ClientID)
	p.RedirectURI = "http://127.0.0.1:50211/callback"
	p.Scope, p.Resource = "", "" // defaults: zonagol:read, the MCP endpoint
	id := e.startRequest(p)
	a, _ := e.repo.AuthorizationByID(context.Background(), id)
	if a.RedirectURI != p.RedirectURI || a.Scope != ScopeRead || a.Resource != testResource {
		t.Fatalf("%+v", a)
	}

	p.RedirectURI = "http://127.0.0.1:50211/other"
	if loc, _ := e.svc.Authorize(context.Background(), p); !strings.HasPrefix(loc, testConsent+"?error=") {
		t.Fatalf("loopback path must match: %s", loc)
	}
}

func TestConsentIsOnlyForLeagueAdminsAndTeamOwners(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone)
	id := e.startRequest(e.params(c.ClientID))
	for name, p := range map[string]auth.Principal{
		"super admin": {UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
		"public":      {UserID: uuid.New(), Role: auth.RolePublic, IsActive: true},
		"inactive":    {UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: false},
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := e.svc.ConsentFor(context.Background(), p, id); httpx.AsError(err).Status != http.StatusForbidden {
				t.Fatalf("consent: %v", err)
			}
			if _, err := e.svc.Decide(context.Background(), p, id, true); httpx.AsError(err).Status != http.StatusForbidden {
				t.Fatalf("decide: %v", err)
			}
		})
	}
	owner := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true}
	got, err := e.svc.ConsentFor(context.Background(), owner, id)
	if err != nil || got.ClientName != "Claude" || got.RedirectHost != "claude.example" || len(got.Scopes) != 1 || got.Scopes[0].Description == "" {
		t.Fatalf("%+v %v", got, err)
	}
}

func TestConsentExpiresAndIsDecidedOnce(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone)

	expired := e.startRequest(e.params(c.ClientID))
	e.clock = e.clock.Add(11 * time.Minute)
	if _, err := e.svc.ConsentFor(context.Background(), e.admin, expired); httpx.AsError(err).Status != http.StatusNotFound {
		t.Fatalf("expired request: %v", err)
	}

	denied := e.startRequest(e.params(c.ClientID))
	d, err := e.svc.Decide(context.Background(), e.admin, denied, false)
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(d.RedirectTo)
	if u.Query().Get("error") != "access_denied" || u.Query().Get("state") != "xyz" || u.Query().Get("code") != "" {
		t.Fatalf("deny redirect %s", d.RedirectTo)
	}
	if _, err := e.svc.Decide(context.Background(), e.admin, denied, true); httpx.AsError(err).Status != http.StatusNotFound {
		t.Fatalf("second decision: %v", err)
	}
	if _, err := e.svc.ConsentFor(context.Background(), e.admin, uuid.New()); httpx.AsError(err).Status != http.StatusNotFound {
		t.Fatalf("unknown request: %v", err)
	}
}

func TestCodeExchange(t *testing.T) {
	e := newEnv(t)
	c, tok := e.connect()
	if !strings.HasPrefix(tok.AccessToken, "zga_") || !strings.HasPrefix(tok.RefreshToken, "zgr_") || tok.TokenType != "Bearer" || tok.ExpiresIn != 900 || tok.Scope != ScopeRead {
		t.Fatalf("%+v", tok)
	}
	info, err := e.svc.VerifyAccessToken(context.Background(), tok.AccessToken, testResource)
	if err != nil || info.UserID != e.admin.UserID || info.ClientID.String() != c.ClientID || info.Scopes[0] != ScopeRead {
		t.Fatalf("%+v %v", info, err)
	}

	type variant struct {
		cred ClientCredentials
		req  func(*TokenRequest)
		code string
	}
	other := e.register(AuthNone)
	for name, v := range map[string]variant{
		"wrong verifier":    {req: func(r *TokenRequest) { r.CodeVerifier = strings.Repeat("a", 43) }, code: "invalid_grant"},
		"missing verifier":  {req: func(r *TokenRequest) { r.CodeVerifier = "" }, code: "invalid_request"},
		"wrong redirect":    {req: func(r *TokenRequest) { r.RedirectURI = "https://claude.example/other" }, code: "invalid_grant"},
		"another client":    {cred: ClientCredentials{ClientID: other.ClientID}, code: "invalid_grant"},
		"another resource":  {req: func(r *TokenRequest) { r.Resource = "https://other.example/mcp" }, code: "invalid_target"},
		"made-up code":      {req: func(r *TokenRequest) { r.Code = "zgc_nope" }, code: "invalid_grant"},
		"unsupported grant": {req: func(r *TokenRequest) { r.GrantType = "password" }, code: "unsupported_grant_type"},
		"unknown client":    {cred: ClientCredentials{ClientID: uuid.NewString()}, code: "invalid_client"},
	} {
		t.Run(name, func(t *testing.T) {
			cl := e.register(AuthNone)
			code := e.approve(e.admin, e.startRequest(e.params(cl.ClientID)))
			req := TokenRequest{GrantType: "authorization_code", Code: code, RedirectURI: testRedirect, CodeVerifier: testVerifier}
			if v.req != nil {
				v.req(&req)
			}
			cred := v.cred
			if cred.ClientID == "" {
				cred.ClientID = cl.ClientID
			}
			if _, err := e.svc.Token(context.Background(), cred, req); oauthCode(err) != v.code {
				t.Fatalf("got %v, want %s", err, v.code)
			}
		})
	}

	t.Run("expired code", func(t *testing.T) {
		cl := e.register(AuthNone)
		code := e.approve(e.admin, e.startRequest(e.params(cl.ClientID)))
		e.clock = e.clock.Add(2 * time.Minute)
		defer func() { e.clock = e.clock.Add(-2 * time.Minute) }()
		if _, err := e.exchange(cl.ClientID, code); oauthCode(err) != "invalid_grant" {
			t.Fatalf("%v", err)
		}
	})
}

func TestCodeReplayRevokesTheConnection(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthNone)
	code := e.approve(e.admin, e.startRequest(e.params(c.ClientID)))
	tok, err := e.exchange(c.ClientID, code)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.exchange(c.ClientID, code); oauthCode(err) != "invalid_grant" {
		t.Fatalf("replay: %v", err)
	}
	if _, err := e.svc.VerifyAccessToken(context.Background(), tok.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("token from the first exchange must die: %v", err)
	}
}

func TestRefresh(t *testing.T) {
	e := newEnv(t)
	c, tok := e.connect()
	refresh := func(raw string, cred ClientCredentials) (TokenResponse, error) {
		if cred.ClientID == "" {
			cred.ClientID = c.ClientID
		}
		return e.svc.Token(context.Background(), cred, TokenRequest{GrantType: "refresh_token", RefreshToken: raw, Resource: testResource})
	}

	next, err := refresh(tok.RefreshToken, ClientCredentials{})
	if err != nil || next.RefreshToken == tok.RefreshToken {
		t.Fatalf("rotate: %+v %v", next, err)
	}
	other := e.register(AuthNone)
	if _, err := refresh(next.RefreshToken, ClientCredentials{ClientID: other.ClientID}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("another client's refresh: %v", err)
	}
	if _, err := refresh(next.AccessToken, ClientCredentials{}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("access token as refresh: %v", err)
	}

	// Replaying the rotated token revokes everything, including the new pair.
	if _, err := refresh(tok.RefreshToken, ClientCredentials{}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("replay: %v", err)
	}
	if _, err := refresh(next.RefreshToken, ClientCredentials{}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("family must be revoked: %v", err)
	}
	if _, err := e.svc.VerifyAccessToken(context.Background(), next.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("access token must die with the grant: %v", err)
	}
}

func TestRefreshEndsWhenTheUserCanNoLongerConnect(t *testing.T) {
	for name, change := range map[string]func(*auth.Principal){
		"deactivated":            func(p *auth.Principal) { p.IsActive = false },
		"demoted to public":      func(p *auth.Principal) { p.Role = auth.RolePublic },
		"promoted to superadmin": func(p *auth.Principal) { p.Role = auth.RoleSuperAdmin },
	} {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			c, tok := e.connect()
			p := e.admin
			change(&p)
			e.profiles.set(p)
			_, err := e.svc.Token(context.Background(), ClientCredentials{ClientID: c.ClientID}, TokenRequest{GrantType: "refresh_token", RefreshToken: tok.RefreshToken})
			if oauthCode(err) != "invalid_grant" {
				t.Fatalf("%v", err)
			}
			if apps, _ := e.svc.ListConnected(context.Background(), e.admin, httpx.Page{Limit: 50}); len(apps) != 0 {
				t.Fatalf("grant must be revoked: %+v", apps)
			}
		})
	}
}

func TestConfidentialClients(t *testing.T) {
	e := newEnv(t)
	c := e.register(AuthSecretPost)
	code := e.approve(e.admin, e.startRequest(e.params(c.ClientID)))
	req := TokenRequest{GrantType: "authorization_code", Code: code, RedirectURI: testRedirect, CodeVerifier: testVerifier}
	for name, secret := range map[string]string{"no secret": "", "wrong secret": "zgs_wrong"} {
		if _, err := e.svc.Token(context.Background(), ClientCredentials{ClientID: c.ClientID, ClientSecret: secret}, req); oauthCode(err) != "invalid_client" {
			t.Fatalf("%s: %v", name, err)
		}
	}
	if _, err := e.svc.Token(context.Background(), ClientCredentials{ClientID: c.ClientID, ClientSecret: c.ClientSecret}, req); err != nil {
		t.Fatalf("right secret: %v", err)
	}

	pub := e.register(AuthNone)
	if _, err := e.svc.Token(context.Background(), ClientCredentials{ClientID: pub.ClientID, ClientSecret: "anything"}, req); oauthCode(err) != "invalid_client" {
		t.Fatalf("public client with a secret: %v", err)
	}
}

func TestVerifyAccessToken(t *testing.T) {
	e := newEnv(t)
	_, tok := e.connect()
	ctx := context.Background()
	for name, tc := range map[string]struct{ raw, resource string }{
		"empty":             {"", testResource},
		"made up":           {"zga_nope", testResource},
		"refresh as access": {tok.RefreshToken, testResource},
		"another resource":  {tok.AccessToken, "https://other.example/mcp"},
	} {
		if _, err := e.svc.VerifyAccessToken(ctx, tc.raw, tc.resource); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%s: %v", name, err)
		}
	}
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource+"/"); err != nil {
		t.Errorf("trailing slash is the same resource: %v", err)
	}
	e.clock = e.clock.Add(16 * time.Minute)
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("expired: %v", err)
	}
}

func TestRevocation(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	c, tok := e.connect()

	other := e.register(AuthNone)
	if err := e.svc.Revoke(ctx, ClientCredentials{ClientID: other.ClientID}, tok.AccessToken); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource); err != nil {
		t.Fatalf("another client cannot revoke it: %v", err)
	}
	if err := e.svc.Revoke(ctx, ClientCredentials{ClientID: c.ClientID}, "zga_unknown"); err != nil {
		t.Fatalf("unknown token is not an error: %v", err)
	}
	if err := e.svc.Revoke(ctx, ClientCredentials{ClientID: uuid.NewString()}, tok.AccessToken); oauthCode(err) != "invalid_client" {
		t.Fatalf("unknown client: %v", err)
	}

	if err := e.svc.Revoke(ctx, ClientCredentials{ClientID: c.ClientID}, tok.AccessToken); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("revoked access token: %v", err)
	}
	if err := e.svc.Revoke(ctx, ClientCredentials{ClientID: c.ClientID}, tok.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if apps, _ := e.svc.ListConnected(ctx, e.admin, httpx.Page{Limit: 50}); len(apps) != 0 {
		t.Fatalf("revoking the refresh token ends the connection: %+v", apps)
	}
}

func TestConnectedApps(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	c, tok := e.connect()

	// Approving the same client again reuses the connection.
	if _, err := e.exchange(c.ClientID, e.approve(e.admin, e.startRequest(e.params(c.ClientID)))); err != nil {
		t.Fatal(err)
	}
	apps, err := e.svc.ListConnected(ctx, e.admin, httpx.Page{Limit: 50})
	if err != nil || len(apps) != 1 || apps[0].ClientName != "Claude" || apps[0].LastUsedAt == nil {
		t.Fatalf("%+v %v", apps, err)
	}

	stranger := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	if apps, _ := e.svc.ListConnected(ctx, stranger, httpx.Page{Limit: 50}); len(apps) != 0 {
		t.Fatalf("another user's list: %+v", apps)
	}
	if err := e.svc.Disconnect(ctx, stranger, apps[0].ID); httpx.AsError(err).Status != http.StatusNotFound {
		t.Fatalf("another user's grant: %v", err)
	}
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource); err != nil {
		t.Fatalf("must survive a stranger's attempt: %v", err)
	}

	if err := e.svc.Disconnect(ctx, e.admin, apps[0].ID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.VerifyAccessToken(ctx, tok.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("disconnect revokes tokens: %v", err)
	}
	if _, err := e.svc.Token(ctx, ClientCredentials{ClientID: c.ClientID}, TokenRequest{GrantType: "refresh_token", RefreshToken: tok.RefreshToken}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("refresh after disconnect: %v", err)
	}
	if err := e.svc.Disconnect(ctx, e.admin, apps[0].ID); httpx.AsError(err).Status != http.StatusNotFound {
		t.Fatalf("second disconnect: %v", err)
	}
}

func TestMetadata(t *testing.T) {
	m := newEnv(t).svc.Metadata()
	if m["issuer"] != testIssuer || m["token_endpoint"] != testIssuer+"/oauth/token" {
		t.Fatalf("%v", m)
	}
	if got := m["code_challenge_methods_supported"].([]string); len(got) != 1 || got[0] != "S256" {
		t.Fatalf("PKCE methods %v", got)
	}
}
