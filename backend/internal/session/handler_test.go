package session

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func newTestRouter(t *testing.T) (http.Handler, *memRepo) {
	t.Helper()
	svc, repo, _ := newTestService()
	repo.addUser(t, "ana@liga.mx", "contraseña-segura", true)
	r := chi.NewRouter()
	NewHandler(svc, true).Routes(r)
	return r, repo
}

func post(h http.Handler, path, body string, mutate ...func(*http.Request)) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "203.0.113.7:5555"
	for _, m := range mutate {
		m(req)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func refreshCookieFrom(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == refreshCookie {
			return c
		}
	}
	t.Fatal("no refresh cookie set")
	return nil
}

const loginBody = `{"email":"ana@liga.mx","password":"contraseña-segura"}`

func TestWebLoginUsesHardenedCookie(t *testing.T) {
	h, _ := newTestRouter(t)
	rec := post(h, "/auth/login", loginBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["access_token"] == "" || body["refresh_token"] != nil {
		t.Fatalf("web body must carry the access token only: %v", body)
	}
	c := refreshCookieFrom(t, rec)
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteStrictMode || c.Path != cookiePath {
		t.Fatalf("cookie not hardened: %+v", c)
	}

	// The cookie refreshes and is rotated.
	rec2 := post(h, "/auth/refresh", "", func(r *http.Request) { r.AddCookie(c) })
	if rec2.Code != http.StatusOK {
		t.Fatalf("refresh status %d: %s", rec2.Code, rec2.Body)
	}
	if refreshCookieFrom(t, rec2).Value == c.Value {
		t.Fatal("cookie not rotated")
	}

	// Logout clears the cookie and revokes it.
	rec3 := post(h, "/auth/logout", "", func(r *http.Request) { r.AddCookie(refreshCookieFrom(t, rec2)) })
	if rec3.Code != http.StatusNoContent || refreshCookieFrom(t, rec3).MaxAge >= 0 {
		t.Fatalf("logout: %d %+v", rec3.Code, rec3.Result().Cookies())
	}
}

func TestMobileLoginReturnsRefreshTokenInBody(t *testing.T) {
	h, _ := newTestRouter(t)
	mobile := func(r *http.Request) { r.Header.Set("X-Client", "mobile") }
	rec := post(h, "/auth/login", loginBody, mobile)
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if rec.Code != http.StatusOK || body.RefreshToken == "" || len(rec.Result().Cookies()) != 0 {
		t.Fatalf("mobile login: %d %s", rec.Code, rec.Body)
	}
	rec2 := post(h, "/auth/refresh", `{"refresh_token":"`+body.RefreshToken+`"}`, mobile)
	if rec2.Code != http.StatusOK {
		t.Fatalf("mobile refresh: %d %s", rec2.Code, rec2.Body)
	}
}

func TestLoginErrorsAndRateLimit(t *testing.T) {
	h, _ := newTestRouter(t)
	rec := post(h, "/auth/login", `{"email":"ana@liga.mx","password":"mala"}`)
	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), "invalid_credentials") {
		t.Fatalf("wrong password: %d %s", rec.Code, rec.Body)
	}
	if rec := post(h, "/auth/login", `{"email":"no-es-correo","password":"x"}`); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid body: %d", rec.Code)
	}

	var limited bool
	for range 10 {
		if post(h, "/auth/login", `{"email":"ana@liga.mx","password":"mala"}`).Code == http.StatusTooManyRequests {
			limited = true
			break
		}
	}
	if !limited {
		t.Fatal("login brute force not rate limited")
	}
	// Another IP is unaffected.
	other := func(r *http.Request) { r.RemoteAddr = "198.51.100.9:1" }
	if rec := post(h, "/auth/login", loginBody, other); rec.Code != http.StatusOK {
		t.Fatalf("other IP blocked: %d", rec.Code)
	}
}

func TestRefreshWithoutCookieIsUnauthorized(t *testing.T) {
	h, _ := newTestRouter(t)
	if rec := post(h, "/auth/refresh", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestForgotAlwaysNoContent(t *testing.T) {
	h, _ := newTestRouter(t)
	for _, email := range []string{"ana@liga.mx", "nadie@liga.mx"} {
		if rec := post(h, "/auth/password/forgot", `{"email":"`+email+`"}`); rec.Code != http.StatusNoContent {
			t.Fatalf("%s: %d", email, rec.Code)
		}
	}
}
