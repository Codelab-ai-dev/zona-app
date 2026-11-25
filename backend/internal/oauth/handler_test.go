package oauth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// testServer mounts the endpoints and the consent API like the router does.
// The X-Test-User header plays the role of the API session.
func testServer(t *testing.T, e *env) *httptest.Server {
	t.Helper()
	h := NewHandler(e.svc)
	r := chi.NewRouter()
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if id := r.Header.Get("X-Test-User"); id != "" {
					p, _ := e.profiles.LoadPrincipal(r.Context(), uuid.MustParse(id))
					r = r.WithContext(auth.WithPrincipal(r.Context(), p))
				}
				next.ServeHTTP(w, r)
			})
		})
		h.Routes(api)
	})
	endpoints := h.Endpoints()
	r.Handle("/.well-known/oauth-authorization-server", endpoints)
	r.Handle("/oauth/*", endpoints)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return srv
}

var noRedirect = &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

func postForm(t *testing.T, srv *httptest.Server, path string, form url.Values, basic *[2]string) (int, map[string]any, http.Header) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if basic != nil {
		req.SetBasicAuth(url.QueryEscape(basic[0]), url.QueryEscape(basic[1]))
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body map[string]any
	_ = json.NewDecoder(res.Body).Decode(&body)
	return res.StatusCode, body, res.Header
}

func TestHTTPFullFlow(t *testing.T) {
	e := newEnv(t)
	srv := testServer(t, e)

	// Discovery.
	res, err := http.Get(srv.URL + "/.well-known/oauth-authorization-server")
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("metadata: %v %v", res, err)
	}
	res.Body.Close()

	// Registration.
	body := `{"client_name":"Claude","redirect_uris":["` + testRedirect + `"],"token_endpoint_auth_method":"client_secret_basic","logo_uri":"https://x.example/l.png"}`
	res, err = http.Post(srv.URL+"/oauth/register", "application/json", strings.NewReader(body))
	if err != nil || res.StatusCode != http.StatusCreated {
		t.Fatalf("register: %v %v", res.StatusCode, err)
	}
	var client RegistrationResponse
	_ = json.NewDecoder(res.Body).Decode(&client)
	res.Body.Close()

	// Authorization request → consent page.
	q := url.Values{
		"response_type": {"code"}, "client_id": {client.ClientID}, "redirect_uri": {testRedirect},
		"scope": {ScopeRead}, "state": {"st"}, "code_challenge": {s256(testVerifier)},
		"code_challenge_method": {"S256"}, "resource": {testResource},
	}
	res, err = noRedirect.Get(srv.URL + "/oauth/authorize?" + q.Encode())
	if err != nil || res.StatusCode != http.StatusFound {
		t.Fatalf("authorize: %v %v", res.StatusCode, err)
	}
	loc := res.Header.Get("Location")
	res.Body.Close()
	requestID := strings.TrimPrefix(loc, testConsent+"?solicitud=")

	// The consent API needs the user's session.
	res, _ = http.Get(srv.URL + "/api/v1/oauth/requests/" + requestID)
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("anonymous consent: %d", res.StatusCode)
	}
	res.Body.Close()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/api/v1/oauth/requests/"+requestID+"/decision", strings.NewReader(`{"approve":true}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", e.admin.UserID.String())
	res, err = http.DefaultClient.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("decision: %d %v", res.StatusCode, err)
	}
	var d Decision
	_ = json.NewDecoder(res.Body).Decode(&d)
	res.Body.Close()
	ru, _ := url.Parse(d.RedirectTo)
	code := ru.Query().Get("code")

	// Token with Basic client authentication.
	status, tok, hdr := postForm(t, srv, "/oauth/token", url.Values{
		"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {testRedirect},
		"code_verifier": {testVerifier}, "resource": {testResource},
	}, &[2]string{client.ClientID, client.ClientSecret})
	if status != http.StatusOK || tok["access_token"] == nil || hdr.Get("Pragma") != "no-cache" {
		t.Fatalf("token: %d %v", status, tok)
	}

	// Revocation (always 200).
	status, _, _ = postForm(t, srv, "/oauth/revoke", url.Values{"token": {tok["refresh_token"].(string)}}, &[2]string{client.ClientID, client.ClientSecret})
	if status != http.StatusOK {
		t.Fatalf("revoke: %d", status)
	}
}

func TestHTTPTokenErrors(t *testing.T) {
	e := newEnv(t)
	srv := testServer(t, e)
	c := e.register(AuthSecretBasic)

	status, body, hdr := postForm(t, srv, "/oauth/token", url.Values{"grant_type": {"refresh_token"}, "refresh_token": {"x"}}, &[2]string{c.ClientID, "wrong"})
	if status != http.StatusUnauthorized || body["error"] != "invalid_client" || hdr.Get("WWW-Authenticate") == "" {
		t.Fatalf("bad secret: %d %v", status, body)
	}
	status, body, _ = postForm(t, srv, "/oauth/token", url.Values{"grant_type": {"refresh_token"}, "client_id": {uuid.NewString()}}, &[2]string{c.ClientID, c.ClientSecret})
	if status != http.StatusUnauthorized || body["error"] != "invalid_client" {
		t.Fatalf("client_id differs from Basic: %d %v", status, body)
	}
	status, body, _ = postForm(t, srv, "/oauth/token", url.Values{"grant_type": {"refresh_token"}, "refresh_token": {"zgr_nope"}}, &[2]string{c.ClientID, c.ClientSecret})
	if status != http.StatusBadRequest || body["error"] != "invalid_grant" {
		t.Fatalf("unknown refresh: %d %v", status, body)
	}

	res, _ := http.Post(srv.URL+"/oauth/token", "application/json", strings.NewReader(`{"grant_type":"refresh_token"}`))
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("JSON body: %d", res.StatusCode)
	}
	res.Body.Close()
	big := url.Values{"grant_type": {"refresh_token"}, "refresh_token": {strings.Repeat("a", maxFormBytes)}}
	if status, body, _ := postForm(t, srv, "/oauth/token", big, nil); status != http.StatusBadRequest || body["error"] != "invalid_request" {
		t.Fatalf("oversized body: %d %v", status, body)
	}
	res, _ = http.Get(srv.URL + "/oauth/token")
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("GET token: %d", res.StatusCode)
	}
	res.Body.Close()
}

func TestHTTPRegisterRejectsAndThrottles(t *testing.T) {
	e := newEnv(t)
	srv := testServer(t, e)
	post := func(body string) (int, map[string]any) {
		res, err := http.Post(srv.URL+"/oauth/register", "application/json", strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		var out map[string]any
		_ = json.NewDecoder(res.Body).Decode(&out)
		return res.StatusCode, out
	}
	if status, body := post(`{"redirect_uris":["http://evil.example/cb"]}`); status != http.StatusBadRequest || body["error"] != "invalid_redirect_uri" {
		t.Fatalf("%d %v", status, body)
	}
	if status, body := post(`{`); status != http.StatusBadRequest || body["error"] != "invalid_client_metadata" {
		t.Fatalf("%d %v", status, body)
	}
	limited := false
	for i := 0; i < 15; i++ {
		if status, _ := post(`{"redirect_uris":["` + testRedirect + `"],"token_endpoint_auth_method":"none"}`); status == http.StatusTooManyRequests {
			limited = true
			break
		}
	}
	if !limited {
		t.Fatal("registration is not throttled per address")
	}
}

func TestHTTPEndpointsAllowAnyOriginWithoutCredentials(t *testing.T) {
	srv := testServer(t, newEnv(t))
	req, _ := http.NewRequest(http.MethodOptions, srv.URL+"/oauth/token", nil)
	req.Header.Set("Origin", "http://localhost:6274")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.Header.Get("Access-Control-Allow-Origin") != "*" || res.Header.Get("Access-Control-Allow-Credentials") != "" {
		t.Fatalf("preflight headers: %v", res.Header)
	}
}

func TestHTTPAuthorizeRejectsUntrustedClientWithoutRedirectingToIt(t *testing.T) {
	srv := testServer(t, newEnv(t))
	q := url.Values{"response_type": {"code"}, "client_id": {uuid.NewString()}, "redirect_uri": {"https://evil.example/cb"}}
	res, err := noRedirect.Get(srv.URL + "/oauth/authorize?" + q.Encode())
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if loc := res.Header.Get("Location"); res.StatusCode != http.StatusFound || !strings.HasPrefix(loc, testConsent+"?error=invalid_client") {
		t.Fatalf("%d %s", res.StatusCode, loc)
	}
}

func TestHTTPConsentAPIValidatesIDs(t *testing.T) {
	e := newEnv(t)
	srv := testServer(t, e)
	for _, path := range []string{"/api/v1/oauth/requests/not-a-uuid", "/api/v1/oauth/requests/" + uuid.NewString()} {
		req, _ := http.NewRequest(http.MethodGet, srv.URL+path, nil)
		req.Header.Set("X-Test-User", e.admin.UserID.String())
		res, _ := http.DefaultClient.Do(req)
		res.Body.Close()
		if res.StatusCode != http.StatusNotFound {
			t.Fatalf("%s: %d", path, res.StatusCode)
		}
	}
	req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/v1/oauth/connections/"+uuid.NewString(), nil)
	req.Header.Set("X-Test-User", e.admin.UserID.String())
	res, _ := http.DefaultClient.Do(req)
	res.Body.Close()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("disconnect unknown: %d", res.StatusCode)
	}
	res, _ = http.Get(srv.URL + "/api/v1/oauth/connections")
	res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("anonymous connections: %d", res.StatusCode)
	}
}
