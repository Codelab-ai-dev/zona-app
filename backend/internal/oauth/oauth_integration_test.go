//go:build integration

package oauth

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func realService(t *testing.T, pool *pgxpool.Pool) *Service {
	t.Helper()
	return NewService(NewPGRepository(pool), auth.NewPGProfileLoader(pool), Config{
		Issuer: testIssuer, Resource: testResource, ConsentURL: testConsent,
	})
}

func principal(t *testing.T, pool *pgxpool.Pool, id uuid.UUID) auth.Principal {
	t.Helper()
	p, err := auth.NewPGProfileLoader(pool).LoadPrincipal(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// connectReal runs register → authorize → approve → exchange on the real
// schema and returns the client and tokens.
func connectReal(t *testing.T, svc *Service, user auth.Principal) (RegistrationResponse, TokenResponse) {
	t.Helper()
	ctx := context.Background()
	c, err := svc.Register(ctx, RegistrationRequest{ClientName: "Claude", RedirectURIs: []string{testRedirect}, TokenEndpointAuthMethod: AuthNone})
	if err != nil {
		t.Fatal(err)
	}
	loc, err := svc.Authorize(ctx, AuthorizeParams{
		ResponseType: "code", ClientID: c.ClientID, RedirectURI: testRedirect, State: "st",
		CodeChallenge: s256(testVerifier), CodeChallengeMethod: "S256", Resource: testResource,
	})
	if err != nil || !strings.HasPrefix(loc, testConsent+"?solicitud=") {
		t.Fatalf("authorize: %s %v", loc, err)
	}
	id := uuid.MustParse(strings.TrimPrefix(loc, testConsent+"?solicitud="))
	if _, err := svc.ConsentFor(ctx, user, id); err != nil {
		t.Fatalf("consent: %v", err)
	}
	d, err := svc.Decide(ctx, user, id, true)
	if err != nil {
		t.Fatalf("decide: %v", err)
	}
	u, _ := url.Parse(d.RedirectTo)
	tok, err := svc.Token(ctx, ClientCredentials{ClientID: c.ClientID}, TokenRequest{
		GrantType: "authorization_code", Code: u.Query().Get("code"), RedirectURI: testRedirect, CodeVerifier: testVerifier,
	})
	if err != nil {
		t.Fatalf("exchange: %v", err)
	}
	return c, tok
}

func TestOAuthFlowOnRealSchema(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	svc := realService(t, pool)
	admin := principal(t, pool, f.LeagueAdminID)

	c, tok := connectReal(t, svc, admin)
	info, err := svc.VerifyAccessToken(ctx, tok.AccessToken, testResource)
	if err != nil || info.UserID != f.LeagueAdminID || info.ClientID.String() != c.ClientID {
		t.Fatalf("verify: %+v %v", info, err)
	}

	// Only hashes are stored.
	var raw, hashed int
	if err := pool.QueryRow(ctx, `SELECT count(*) FILTER (WHERE token_hash = $1), count(*) FILTER (WHERE token_hash = $2) FROM auth.oauth_tokens`,
		[]byte(tok.AccessToken), hash(tok.AccessToken)).Scan(&raw, &hashed); err != nil || raw != 0 || hashed != 1 {
		t.Fatalf("raw=%d hashed=%d %v", raw, hashed, err)
	}

	// Refresh rotates; replay revokes the grant.
	next, err := svc.Token(ctx, ClientCredentials{ClientID: c.ClientID}, TokenRequest{GrantType: "refresh_token", RefreshToken: tok.RefreshToken})
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if _, err := svc.Token(ctx, ClientCredentials{ClientID: c.ClientID}, TokenRequest{GrantType: "refresh_token", RefreshToken: tok.RefreshToken}); oauthCode(err) != "invalid_grant" {
		t.Fatalf("replay: %v", err)
	}
	if _, err := svc.VerifyAccessToken(ctx, next.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("grant must be revoked after replay: %v", err)
	}
	if apps, _ := svc.ListConnected(ctx, admin, httpx.Page{Limit: 50}); len(apps) != 0 {
		t.Fatalf("revoked grant still listed: %+v", apps)
	}
}

func TestOAuthConnectionsAreIsolatedPerUser(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	a := testdb.Seed(t, pool)
	b := testdb.Seed(t, pool)
	svc := realService(t, pool)
	adminA, adminB := principal(t, pool, a.LeagueAdminID), principal(t, pool, b.LeagueAdminID)
	owner := principal(t, pool, a.TeamOwnerID)

	_, tokA := connectReal(t, svc, adminA)
	_, tokOwner := connectReal(t, svc, owner)

	appsA, err := svc.ListConnected(ctx, adminA, httpx.Page{Limit: 50})
	if err != nil || len(appsA) != 1 {
		t.Fatalf("league A: %+v %v", appsA, err)
	}
	if apps, _ := svc.ListConnected(ctx, adminB, httpx.Page{Limit: 50}); len(apps) != 0 {
		t.Fatalf("league B sees A's connections: %+v", apps)
	}
	if err := svc.Disconnect(ctx, adminB, appsA[0].ID); httpx.AsError(err).Status != 404 {
		t.Fatalf("league B revoked A's connection: %v", err)
	}
	if _, err := svc.VerifyAccessToken(ctx, tokA.AccessToken, testResource); err != nil {
		t.Fatalf("A's token must survive: %v", err)
	}
	if err := svc.Disconnect(ctx, adminA, appsA[0].ID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.VerifyAccessToken(ctx, tokA.AccessToken, testResource); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("disconnect must revoke: %v", err)
	}
	if info, err := svc.VerifyAccessToken(ctx, tokOwner.AccessToken, testResource); err != nil || info.UserID != a.TeamOwnerID {
		t.Fatalf("owner's connection is independent: %+v %v", info, err)
	}

	// Deactivating the owner ends their connection at the next refresh.
	if _, err := pool.Exec(ctx, `UPDATE public.users SET is_active = false WHERE id = $1`, a.TeamOwnerID); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Token(ctx, ClientCredentials{ClientID: mustClientOf(t, pool, tokOwner)}, TokenRequest{GrantType: "refresh_token", RefreshToken: tokOwner.RefreshToken})
	if oauthCode(err) != "invalid_grant" {
		t.Fatalf("deactivated owner refreshed: %v", err)
	}
}

func mustClientOf(t *testing.T, pool *pgxpool.Pool, tok TokenResponse) string {
	t.Helper()
	tk, err := NewPGRepository(pool).TokenByHash(context.Background(), hash(tok.RefreshToken))
	if err != nil {
		t.Fatal(err)
	}
	return tk.ClientID.String()
}

// Two concurrent approvals or code exchanges: exactly one wins.
func TestOAuthRacesOnRealSchema(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	svc := realService(t, pool)
	admin := principal(t, pool, f.LeagueAdminID)

	c, err := svc.Register(ctx, RegistrationRequest{ClientName: "Race", RedirectURIs: []string{testRedirect}, TokenEndpointAuthMethod: AuthNone})
	if err != nil {
		t.Fatal(err)
	}
	clientID := uuid.MustParse(c.ClientID)
	id, err := repo.CreateAuthorization(ctx, Authorization{ClientID: clientID, RedirectURI: testRedirect, Scope: ScopeRead,
		Resource: testResource, CodeChallenge: s256(testVerifier), ExpiresAt: time.Now().Add(time.Minute)})
	if err != nil {
		t.Fatal(err)
	}

	var wg sync.WaitGroup
	wins := make(chan bool, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			ok, err := repo.ApproveAuthorization(ctx, id, admin.UserID, hash("zgc_"+uuid.NewString()), time.Now().Add(time.Minute))
			if err != nil {
				t.Error(err)
			}
			wins <- ok
		}(i)
	}
	wg.Wait()
	close(wins)
	n := 0
	for ok := range wins {
		if ok {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("%d approvals won", n)
	}
	var grants int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM auth.oauth_grants WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL`, admin.UserID, clientID).Scan(&grants); err != nil || grants != 1 {
		t.Fatalf("active grants = %d %v", grants, err)
	}
	if ok, err := repo.DenyAuthorization(ctx, id); ok || err != nil {
		t.Fatalf("deny after approve: %v %v", ok, err)
	}

	// Concurrent exchange of one code.
	code, codeHash, _ := newSecret("zgc_")
	id2, _ := repo.CreateAuthorization(ctx, Authorization{ClientID: clientID, RedirectURI: testRedirect, Scope: ScopeRead,
		Resource: testResource, CodeChallenge: s256(testVerifier), ExpiresAt: time.Now().Add(time.Minute)})
	if ok, err := repo.ApproveAuthorization(ctx, id2, admin.UserID, codeHash, time.Now().Add(time.Minute)); !ok || err != nil {
		t.Fatalf("approve: %v %v", ok, err)
	}
	results := make(chan error, 6)
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.Token(ctx, ClientCredentials{ClientID: c.ClientID}, TokenRequest{
				GrantType: "authorization_code", Code: code, RedirectURI: testRedirect, CodeVerifier: testVerifier,
			})
			results <- err
		}()
	}
	wg.Wait()
	close(results)
	ok := 0
	for err := range results {
		if err == nil {
			ok++
		} else if oauthCode(err) != "invalid_grant" {
			t.Errorf("unexpected: %v", err)
		}
	}
	if ok > 1 {
		t.Fatalf("one code produced %d token pairs", ok)
	}
}
