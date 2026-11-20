//go:build integration

package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

// proxyNet plays the role of Caddy's Docker network in these tests.
var proxyNet = netip.MustParsePrefix("127.0.0.0/8")

func realHTTPServer(t *testing.T, pool *pgxpool.Pool, o HTTPOptions) *httptest.Server {
	t.Helper()
	checker := authz.NewPGChecker(pool)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	server := NewServer(Deps{
		Leagues:     leagues.NewService(leagues.NewPGRepository(pool), checker),
		Matches:     matches.NewService(matches.NewPGRepository(pool), checker, pool),
		Stats:       stats.NewService(stats.NewPGRepository(pool), checker),
		Teams:       teams.NewService(teams.NewPGRepository(pool), pool, checker),
		Logger:      logger,
		CallTimeout: o.CallTimeout,
	})
	o.Logger = logger
	srv := httptest.NewServer(NewHTTPHandler(server, o))
	t.Cleanup(srv.Close)
	return srv
}

// rawCall posts one tools/call as client ip (through the trusted proxy) and
// returns the HTTP status and the raw body.
func rawCall(t *testing.T, url, ip, tool string, args map[string]any) (int, string) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, url+"/mcp", strings.NewReader(callBody(tool, args)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.Header.Set("X-Forwarded-For", ip)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s: %v", tool, err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(body)
}

// TestRemoteEndpointAbuse drives the HTTP endpoint with the real services:
// a real MCP client works, and hidden resources, cross-league IDs and
// enumeration get nothing.
func TestRemoteEndpointAbuse(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	a := testdb.Seed(t, pool) // active league; its match stays unpublished
	b := testdb.Seed(t, pool) // will be an inactive league with a published match
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	exec(`UPDATE public.leagues SET is_active = false WHERE id = $1`, b.LeagueID)
	exec(`UPDATE public.matches SET is_published = true WHERE id = $1`, b.MatchID)
	exec(`UPDATE public.players SET birth_date = '2009-03-04' WHERE id = $1`, a.HomePlayerID)

	srv := realHTTPServer(t, pool, HTTPOptions{
		TrustedProxies: []netip.Prefix{proxyNet},
		RateLimitRPS:   1000, RateLimitBurst: 1000, MaxConcurrent: 16, CallTimeout: 5 * time.Second,
	})

	t.Run("a real MCP client discovers and calls the tools over HTTP", func(t *testing.T) {
		client := mcp.NewClient(&mcp.Implementation{Name: "it", Version: "1"}, nil)
		cs, err := client.Connect(ctx, &mcp.StreamableClientTransport{Endpoint: srv.URL + "/mcp"}, nil)
		if err != nil {
			t.Fatalf("connect: %v", err)
		}
		defer cs.Close()
		tools, err := cs.ListTools(ctx, nil)
		if err != nil || len(tools.Tools) != 6 {
			t.Fatalf("tools = %v, %v", tools, err)
		}
		res, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "search_leagues", Arguments: map[string]any{"query": a.LeagueSlug}})
		if err != nil || res.IsError {
			t.Fatalf("search: %v %+v", err, res)
		}
		raw, _ := json.Marshal(res.StructuredContent)
		if !strings.Contains(string(raw), a.LeagueID.String()) {
			t.Fatalf("league not found: %s", raw)
		}
	})

	// Hidden, cross-league and made-up IDs all get the same answer, so the
	// endpoint is not an oracle for which IDs exist.
	notFound := func(t *testing.T, tool string, args map[string]any) {
		t.Helper()
		status, body := rawCall(t, srv.URL, "198.51.100.10", tool, args)
		if status != http.StatusOK || !strings.Contains(body, "No encontrado o no es público.") {
			t.Fatalf("%s %v: %d %s", tool, args, status, body)
		}
	}
	t.Run("inactive league and everything under it", func(t *testing.T) {
		notFound(t, "get_tournaments", map[string]any{"league_id": b.LeagueID.String()})
		for _, tool := range []string{"get_matches", "get_standings", "get_top_scorers"} {
			notFound(t, tool, map[string]any{"tournament_id": b.TournamentID.String()})
		}
		notFound(t, "get_team", map[string]any{"team_id": b.HomeTeamID.String()})
		_, body := rawCall(t, srv.URL, "198.51.100.10", "search_leagues", map[string]any{"query": b.LeagueSlug})
		if strings.Contains(body, b.LeagueID.String()) {
			t.Fatalf("inactive league listed: %s", body)
		}
	})
	t.Run("made-up and wrong-kind IDs", func(t *testing.T) {
		notFound(t, "get_matches", map[string]any{"tournament_id": uuid.NewString()})
		// A team ID where a tournament ID goes, and a league ID as a team.
		notFound(t, "get_standings", map[string]any{"tournament_id": a.HomeTeamID.String()})
		notFound(t, "get_team", map[string]any{"team_id": a.LeagueID.String()})
	})
	t.Run("unpublished match and private fields never leave", func(t *testing.T) {
		_, body := rawCall(t, srv.URL, "198.51.100.10", "get_matches", map[string]any{"tournament_id": a.TournamentID.String()})
		if strings.Contains(body, a.MatchID.String()) {
			t.Fatalf("unpublished match exposed: %s", body)
		}
		_, body = rawCall(t, srv.URL, "198.51.100.10", "get_team", map[string]any{"team_id": a.HomeTeamID.String()})
		for _, private := range []string{"2009-03-04", "birth", "owner", a.TeamOwnerID.String(), a.LeagueAdminID.String()} {
			if strings.Contains(body, private) {
				t.Errorf("get_team leaks %q", private)
			}
		}
	})
	t.Run("malformed arguments are rejected, not executed", func(t *testing.T) {
		for _, args := range []map[string]any{
			{"tournament_id": "'; DROP TABLE matches; --"},
			{"tournament_id": a.TournamentID.String(), "status": "deleted"},
			{"tournament_id": a.TournamentID.String(), "from": "ayer"},
			{"tournament_id": a.TournamentID.String(), "limit": 100000},
		} {
			status, body := rawCall(t, srv.URL, "198.51.100.10", "get_matches", args)
			if status != http.StatusOK || !strings.Contains(body, `"isError":true`) && !strings.Contains(body, `"error"`) {
				t.Fatalf("%v: %d %s", args, status, body)
			}
		}
		var n int
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.matches`).Scan(&n); err != nil || n == 0 {
			t.Fatalf("matches table damaged: %d %v", n, err)
		}
	})
}

// TestRemoteEndpointEnumerationIsThrottled: guessing IDs from one client
// runs into the rate limit long before it can cover any ID space.
func TestRemoteEndpointEnumerationIsThrottled(t *testing.T) {
	pool := testdb.Pool(t)
	srv := realHTTPServer(t, pool, HTTPOptions{
		TrustedProxies: []netip.Prefix{proxyNet},
		RateLimitRPS:   1, RateLimitBurst: 10, MaxConcurrent: 16, CallTimeout: 5 * time.Second,
	})
	limited := 0
	for i := 0; i < 30; i++ {
		status, _ := rawCall(t, srv.URL, "198.51.100.20", "get_team", map[string]any{"team_id": uuid.NewString()})
		if status == http.StatusTooManyRequests {
			limited++
		}
	}
	if limited < 15 {
		t.Fatalf("only %d of 30 guesses were throttled", limited)
	}
	if status, _ := rawCall(t, srv.URL, "198.51.100.21", "search_leagues", nil); status != http.StatusOK {
		t.Fatalf("another client must not be affected: %d", status)
	}
}

// TestRemoteEndpointLightLoad: 40 clients × 10 calls against the real
// database. No request may fail with a 5xx other than the explicit 503
// "busy", and the server answers normally afterwards.
func TestRemoteEndpointLightLoad(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	srv := realHTTPServer(t, pool, HTTPOptions{
		TrustedProxies: []netip.Prefix{proxyNet},
		RateLimitRPS:   50, RateLimitBurst: 50, MaxConcurrent: 8, CallTimeout: 5 * time.Second,
	})
	tools := []struct {
		name string
		args map[string]any
	}{
		{"search_leagues", nil},
		{"get_tournaments", map[string]any{"league_id": f.LeagueID.String()}},
		{"get_standings", map[string]any{"tournament_id": f.TournamentID.String()}},
		{"get_matches", map[string]any{"tournament_id": f.TournamentID.String()}},
		{"get_team", map[string]any{"team_id": f.HomeTeamID.String()}},
	}

	var mu sync.Mutex
	counts := map[int]int{}
	var slowest time.Duration
	var wg sync.WaitGroup
	start := time.Now()
	for c := 0; c < 40; c++ {
		wg.Add(1)
		go func(c int) {
			defer wg.Done()
			for i := 0; i < 10; i++ {
				tool := tools[(c+i)%len(tools)]
				t0 := time.Now()
				status, _ := rawCall(t, srv.URL, fmt.Sprintf("198.51.100.%d", c+30), tool.name, tool.args)
				d := time.Since(t0)
				mu.Lock()
				counts[status]++
				slowest = max(slowest, d)
				mu.Unlock()
			}
		}(c)
	}
	wg.Wait()
	t.Logf("400 calls in %v, slowest %v, statuses %v", time.Since(start), slowest, counts)
	for status, n := range counts {
		if status != http.StatusOK && status != http.StatusServiceUnavailable {
			t.Errorf("%d responses with status %d", n, status)
		}
	}
	if counts[http.StatusOK] < 380 {
		t.Errorf("too few successful calls under load: %v", counts)
	}
	if status, body := rawCall(t, srv.URL, "198.51.100.250", "get_standings", map[string]any{"tournament_id": f.TournamentID.String()}); status != http.StatusOK || strings.Contains(body, `"isError":true`) {
		t.Fatalf("after load: %d %s", status, body)
	}
}
