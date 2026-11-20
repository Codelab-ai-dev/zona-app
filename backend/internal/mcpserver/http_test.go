package mcpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
)

// --- harness ---

// syncBuffer collects log output written from handler goroutines.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// blockingLeagues makes search_leagues wait until released or until the
// request context ends, to exercise concurrency limits and timeouts.
type blockingLeagues struct {
	*fakeLeagues
	entered chan struct{}
	release chan struct{}
}

func (b *blockingLeagues) ListActiveLeagues(ctx context.Context, limit, offset int) ([]leagues.League, int, error) {
	select { // signal without blocking: search_leagues may read several pages
	case b.entered <- struct{}{}:
	default:
	}
	select {
	case <-b.release:
		return b.fakeLeagues.ListActiveLeagues(ctx, limit, offset)
	case <-ctx.Done():
		return nil, 0, ctx.Err()
	}
}

type httpHarness struct {
	handler http.Handler
	logs    *syncBuffer
}

func newHTTPHarness(t *testing.T, w *world, l Leagues, o HTTPOptions) *httpHarness {
	t.Helper()
	logs := &syncBuffer{}
	logger := slog.New(slog.NewJSONHandler(logs, nil))
	if l == nil {
		l = w.leagues
	}
	server := NewServer(Deps{Leagues: l, Matches: w.matches, Stats: w.stats, Teams: w.teams, Logger: logger, CallTimeout: o.CallTimeout})
	o.Logger = logger
	return &httpHarness{handler: NewHTTPHandler(server, o), logs: logs}
}

type rpcRequest struct {
	method, remote, origin, xff string
	body                        string
}

func callBody(tool string, args map[string]any) string {
	raw, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "tools/call",
		"params": map[string]any{"name": tool, "arguments": args},
	})
	return string(raw)
}

func (h *httpHarness) do(r rpcRequest) *httptest.ResponseRecorder {
	if r.method == "" {
		r.method = http.MethodPost
	}
	if r.remote == "" {
		r.remote = "203.0.113.7:51000"
	}
	req := httptest.NewRequest(r.method, "/mcp", strings.NewReader(r.body))
	req.RemoteAddr = r.remote
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if r.origin != "" {
		req.Header.Set("Origin", r.origin)
	}
	if r.xff != "" {
		req.Header.Set("X-Forwarded-For", r.xff)
	}
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	return rec
}

// toolResult decodes a successful JSON-RPC tools/call response.
func toolResult(t *testing.T, rec *httptest.ResponseRecorder) (isError bool, text string) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}
	var resp struct {
		Result struct {
			IsError bool `json:"isError"`
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
		} `json:"result"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode %s: %v", rec.Body, err)
	}
	if resp.Error != nil {
		t.Fatalf("protocol error: %s", resp.Error.Message)
	}
	if len(resp.Result.Content) > 0 {
		text = resp.Result.Content[0].Text
	}
	return resp.Result.IsError, text
}

var generous = HTTPOptions{RateLimitRPS: 100, RateLimitBurst: 100, MaxConcurrent: 8, CallTimeout: 5 * time.Second}

// --- tests ---

func TestHTTPServesToolsAndTagsRequests(t *testing.T) {
	w := newWorld()
	w.leagues.active = []leagues.League{{ID: uuid.New(), Name: "Liga Demo", Slug: "liga-demo", IsActive: true}}
	h := newHTTPHarness(t, w, nil, generous)

	rec := h.do(rpcRequest{body: callBody("search_leagues", map[string]any{"query": "secreto-del-cliente"})})
	if isErr, text := toolResult(t, rec); isErr {
		t.Fatalf("tool error: %s", text)
	}
	id := rec.Header().Get("X-Request-Id")
	if id == "" {
		t.Fatalf("headers = %v", rec.Header())
	}
	logs := h.logs.String()
	// The tool call is logged with the HTTP request ID: the request context
	// reaches the tool handler.
	if !strings.Contains(logs, `"msg":"mcp tool call"`) || !strings.Contains(logs, `"tool":"search_leagues"`) ||
		!strings.Contains(logs, `"request_id":"`+id+`"`) {
		t.Fatalf("logs = %s", logs)
	}
	// Arguments and the raw client IP never reach the logs.
	if strings.Contains(logs, "secreto-del-cliente") || strings.Contains(logs, "203.0.113.7") {
		t.Fatalf("logs leak request data: %s", logs)
	}
}

func TestHTTPHealthz(t *testing.T) {
	h := newHTTPHarness(t, newWorld(), nil, generous)
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/mcp/healthz", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("healthz = %d %q", rec.Code, rec.Body)
	}
}

func TestHTTPOnlyPost(t *testing.T) {
	h := newHTTPHarness(t, newWorld(), nil, generous)
	for _, m := range []string{http.MethodGet, http.MethodDelete, http.MethodPut, http.MethodOptions} {
		rec := h.do(rpcRequest{method: m})
		if rec.Code != http.StatusMethodNotAllowed || rec.Header().Get("Allow") != http.MethodPost {
			t.Errorf("%s: status = %d", m, rec.Code)
		}
	}
}

func TestHTTPOriginCheck(t *testing.T) {
	o := generous
	o.AllowedOrigins = []string{"https://claude.ai/"}
	h := newHTTPHarness(t, newWorld(), nil, o)
	body := callBody("search_leagues", nil)

	if rec := h.do(rpcRequest{body: body, origin: "https://evil.example"}); rec.Code != http.StatusForbidden {
		t.Fatalf("foreign origin: status = %d", rec.Code)
	}
	// DNS rebinding: a page served from an attacker host that resolves to us.
	if rec := h.do(rpcRequest{body: body, origin: "http://127.0.0.1:8090"}); rec.Code != http.StatusForbidden {
		t.Fatalf("rebinding origin: status = %d", rec.Code)
	}
	if rec := h.do(rpcRequest{body: body, origin: "https://claude.ai"}); rec.Code != http.StatusOK {
		t.Fatalf("allowed origin: status = %d, body = %s", rec.Code, rec.Body)
	}
	if rec := h.do(rpcRequest{body: body}); rec.Code != http.StatusOK {
		t.Fatalf("no origin (non-browser host): status = %d", rec.Code)
	}
}

func TestHTTPRateLimitPerClient(t *testing.T) {
	o := generous
	o.RateLimitRPS, o.RateLimitBurst = 0.001, 3
	o.TrustedProxies = []netip.Prefix{netip.MustParsePrefix("172.18.0.0/16")}
	h := newHTTPHarness(t, newWorld(), nil, o)
	body := callBody("search_leagues", nil)
	caddy := "172.18.0.5:40000"

	// Enumeration from one client: the burst passes, then 429.
	for i := 0; i < 3; i++ {
		if rec := h.do(rpcRequest{body: body, remote: caddy, xff: "198.51.100.1"}); rec.Code != http.StatusOK {
			t.Fatalf("call %d: status = %d", i, rec.Code)
		}
	}
	rec := h.do(rpcRequest{body: body, remote: caddy, xff: "198.51.100.1"})
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("over budget: status = %d", rec.Code)
	}
	// Another client behind the same proxy has its own budget.
	if rec := h.do(rpcRequest{body: body, remote: caddy, xff: "198.51.100.2"}); rec.Code != http.StatusOK {
		t.Fatalf("other client: status = %d", rec.Code)
	}
	// A spoofed leftmost X-Forwarded-For does not buy a new budget: Caddy
	// appends the real address last.
	if rec := h.do(rpcRequest{body: body, remote: caddy, xff: "1.2.3.4, 198.51.100.1"}); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("spoofed XFF: status = %d", rec.Code)
	}
	if !strings.Contains(h.logs.String(), `"rejected":"rate_limit"`) {
		t.Fatal("rate-limited request not logged")
	}
}

func TestClientIP(t *testing.T) {
	trusted := []netip.Prefix{netip.MustParsePrefix("172.18.0.0/16"), netip.MustParsePrefix("10.0.0.1/32")}
	cases := []struct{ remote, xff, want string }{
		{"203.0.113.7:1", "", "203.0.113.7"},
		{"203.0.113.7:1", "9.9.9.9", "203.0.113.7"}, // untrusted peer: its XFF is ignored
		{"172.18.0.5:1", "198.51.100.1", "198.51.100.1"},
		{"172.18.0.5:1", "6.6.6.6, 198.51.100.1, 10.0.0.1", "198.51.100.1"},
		{"172.18.0.5:1", "not-an-ip", "172.18.0.5"},
		{"172.18.0.5:1", "", "172.18.0.5"},
	}
	for _, c := range cases {
		r := httptest.NewRequest(http.MethodPost, "/mcp", nil)
		r.RemoteAddr = c.remote
		if c.xff != "" {
			r.Header.Set("X-Forwarded-For", c.xff)
		}
		if got := clientIP(r, trusted); got != c.want {
			t.Errorf("remote %s xff %q: got %s, want %s", c.remote, c.xff, got, c.want)
		}
	}
}

func TestHTTPConcurrencyLimit(t *testing.T) {
	w := newWorld()
	bl := &blockingLeagues{fakeLeagues: w.leagues, entered: make(chan struct{}, 1), release: make(chan struct{})}
	o := generous
	o.MaxConcurrent = 1
	o.QueueWait = 50 * time.Millisecond
	h := newHTTPHarness(t, w, bl, o)
	body := callBody("search_leagues", nil)

	done := make(chan *httptest.ResponseRecorder)
	go func() { done <- h.do(rpcRequest{body: body}) }()
	<-bl.entered // the first call holds the only slot

	// The second call waits QueueWait for the slot, then gives up with 503.
	if rec := h.do(rpcRequest{body: body, remote: "198.51.100.9:1"}); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("second call: status = %d", rec.Code)
	}
	// A third call queues and gets the slot once the first one finishes.
	queued := make(chan *httptest.ResponseRecorder)
	go func() { queued <- h.do(rpcRequest{body: body, remote: "198.51.100.10:1"}) }()
	time.Sleep(10 * time.Millisecond)
	close(bl.release)
	if rec := <-queued; rec.Code != http.StatusOK {
		t.Fatalf("queued call: status = %d", rec.Code)
	}
	if rec := <-done; rec.Code != http.StatusOK {
		t.Fatalf("first call: status = %d", rec.Code)
	}
}

func TestHTTPCallTimeoutAndCancellation(t *testing.T) {
	w := newWorld()
	bl := &blockingLeagues{fakeLeagues: w.leagues, entered: make(chan struct{}, 2), release: make(chan struct{})}
	o := generous
	o.CallTimeout = 50 * time.Millisecond
	h := newHTTPHarness(t, w, bl, o)

	start := time.Now()
	isErr, text := toolResult(t, h.do(rpcRequest{body: callBody("search_leagues", nil)}))
	if !isErr || !strings.Contains(text, "se canceló o tardó demasiado") || time.Since(start) > 2*time.Second {
		t.Fatalf("timeout: isError=%v text=%q after %v", isErr, text, time.Since(start))
	}

	// A client that disconnects cancels the tool call.
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(callBody("search_leagues", nil))).WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	finished := make(chan struct{})
	go func() {
		h.handler.ServeHTTP(httptest.NewRecorder(), req)
		close(finished)
	}()
	<-bl.entered
	<-bl.entered
	cancel()
	select {
	case <-finished:
	case <-time.After(2 * time.Second):
		t.Fatal("cancelled request kept running")
	}
}

func TestHTTPRejectsOversizedAndMalformedBodies(t *testing.T) {
	h := newHTTPHarness(t, newWorld(), nil, generous)

	big := callBody("search_leagues", map[string]any{"query": strings.Repeat("a", MaxBodyBytes)})
	if rec := h.do(rpcRequest{body: big}); rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("declared big body: status = %d", rec.Code)
	}
	// Without Content-Length (chunked) the body is cut at the limit.
	req := httptest.NewRequest(http.MethodPost, "/mcp", io.MultiReader(strings.NewReader(big)))
	req.ContentLength = -1
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	if rec.Code < 400 || rec.Code >= 500 {
		t.Fatalf("chunked big body: status = %d", rec.Code)
	}

	for _, body := range []string{`{`, `[]`, `{"jsonrpc":"2.0","id":1}`, `not json`} {
		if rec := h.do(rpcRequest{body: body}); rec.Code >= 500 {
			t.Errorf("%q: status = %d", body, rec.Code)
		}
	}
}

func TestHTTPCatalogIsFixed(t *testing.T) {
	h := newHTTPHarness(t, newWorld(), nil, generous)
	rec := h.do(rpcRequest{body: callBody("run_sql", map[string]any{"query": "DROP TABLE leagues"})})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"error"`) {
		t.Fatalf("unknown tool must fail: %s", rec.Body)
	}

	raw, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": map[string]any{}})
	rec = h.do(rpcRequest{body: string(raw)})
	var resp struct {
		Result struct {
			Tools []struct{ Name string } `json:"tools"`
		} `json:"result"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, tool := range resp.Result.Tools {
		names = append(names, tool.Name)
	}
	slices.Sort(names)
	want := "get_matches,get_standings,get_team,get_top_scorers,get_tournaments,search_leagues"
	if strings.Join(names, ",") != want {
		t.Fatalf("catalog = %v", names)
	}
}
