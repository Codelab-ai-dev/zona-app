package main

import (
	"context"
	"io"
	"log/slog"
	"net/url"
	"strings"
	"testing"
)

func TestRunRefusesUnlessEnabled(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cases := []struct {
		name, enabled, env, dbURL, want string
	}{
		{"disabled by default", "", "", "postgres://x/y", "MCP_ENABLED=true"},
		{"any value but true", "1", "", "postgres://x/y", "MCP_ENABLED=true"},
		{"never in production", "true", "production", "postgres://x/y", "production"},
		{"needs a database", "true", "", "", "DATABASE_URL"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("MCP_ENABLED", c.enabled)
			t.Setenv("APP_ENV", c.env)
			t.Setenv("DATABASE_URL", c.dbURL)
			err := run("", logger)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("err = %v, want it to mention %q", err, c.want)
			}
		})
	}
}

func TestServeHTTPOnlyOnLoopback(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	for _, addr := range []string{"0.0.0.0:8090", ":8090", "192.168.1.10:8090", "example.com:8090", "nonsense"} {
		if err := serveHTTP(context.Background(), addr, nil, logger); err == nil {
			t.Errorf("%s: must be rejected", addr)
		}
	}
}

func TestReadOnlyURL(t *testing.T) {
	got, err := readOnlyURL("postgres://u:p@db:5432/zona?sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(got)
	if u.Query().Get("default_transaction_read_only") != "on" || u.Query().Get("sslmode") != "disable" {
		t.Fatalf("url = %s", got)
	}
	if _, err := readOnlyURL("://bad"); err == nil || strings.Contains(err.Error(), "://bad") {
		t.Fatalf("invalid URL must fail without echoing it: %v", err)
	}
}
