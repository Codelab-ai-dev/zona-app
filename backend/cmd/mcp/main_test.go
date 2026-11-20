package main

import (
	"io"
	"log/slog"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestRunRefusesUnsafeConfigurations(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cases := []struct {
		name, enabled, public, env, addr, proxies, dbURL, want string
	}{
		{"disabled by default", "", "", "", "", "", "postgres://x/y", "MCP_ENABLED=true"},
		{"any value but true", "1", "", "", "", "", "postgres://x/y", "MCP_ENABLED=true"},
		{"production needs MCP_PUBLIC", "true", "", "production", ":8090", "10.0.0.0/8", "postgres://x/y", "MCP_PUBLIC=true"},
		{"production is HTTP only", "true", "true", "production", "", "", "postgres://x/y", "MCP_HTTP_ADDR"},
		{"non-loopback needs MCP_PUBLIC", "true", "", "", "0.0.0.0:8090", "10.0.0.0/8", "postgres://x/y", "MCP_PUBLIC=true"},
		{"public needs trusted proxies", "true", "true", "", ":8090", "", "postgres://x/y", "MCP_TRUSTED_PROXIES"},
		{"needs a database", "true", "", "", "", "", "", "DATABASE_URL"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("MCP_ENABLED", c.enabled)
			t.Setenv("MCP_PUBLIC", c.public)
			t.Setenv("APP_ENV", c.env)
			t.Setenv("MCP_HTTP_ADDR", c.addr)
			t.Setenv("MCP_TRUSTED_PROXIES", c.proxies)
			t.Setenv("DATABASE_URL", c.dbURL)
			err := run("", logger)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("err = %v, want it to mention %q", err, c.want)
			}
		})
	}
}

func TestHTTPFlagStillLoopbackOnlyWithoutPublic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	t.Setenv("MCP_ENABLED", "true")
	t.Setenv("MCP_PUBLIC", "")
	t.Setenv("DATABASE_URL", "postgres://x/y")
	for _, addr := range []string{"0.0.0.0:8090", ":8090", "192.168.1.10:8090", "example.com:8090", "nonsense"} {
		if err := run(addr, logger); err == nil || !strings.Contains(err.Error(), "MCP_") {
			t.Errorf("%s: must be rejected before connecting, got %v", addr, err)
		}
	}
}

func TestReadOnlyURL(t *testing.T) {
	got, err := readOnlyURL("postgres://u:p@db:5432/zona?sslmode=disable", 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(got)
	q := u.Query()
	if q.Get("default_transaction_read_only") != "on" || q.Get("statement_timeout") != "5000" || q.Get("sslmode") != "disable" {
		t.Fatalf("url = %s", got)
	}
	if _, err := readOnlyURL("://bad", time.Second); err == nil || strings.Contains(err.Error(), "://bad") {
		t.Fatalf("invalid URL must fail without echoing it: %v", err)
	}
}
