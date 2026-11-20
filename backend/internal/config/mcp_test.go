package config

import (
	"net/netip"
	"strings"
	"testing"
	"time"
)

func setMCPEnv(t *testing.T, kv map[string]string) {
	t.Helper()
	for _, k := range []string{"APP_ENV", "DATABASE_URL", "MCP_ENABLED", "MCP_PUBLIC", "MCP_HTTP_ADDR", "MCP_ALLOWED_ORIGINS",
		"MCP_TRUSTED_PROXIES", "MCP_RATE_LIMIT_RPS", "MCP_RATE_LIMIT_BURST", "MCP_MAX_CONCURRENT", "MCP_CALL_TIMEOUT", "MCP_DB_STATEMENT_TIMEOUT", "MCP_QUEUE_WAIT"} {
		t.Setenv(k, kv[k])
	}
}

func TestLoadMCPDefaults(t *testing.T) {
	setMCPEnv(t, map[string]string{"MCP_ENABLED": "true", "DATABASE_URL": "postgres://x/y"})
	cfg, err := LoadMCP("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPAddr != "" || cfg.Public || cfg.RateLimitRPS != 2 || cfg.RateLimitBurst != 20 || cfg.MaxConcurrent != 16 ||
		cfg.CallTimeout != 10*time.Second || cfg.StatementTimeout != 5*time.Second {
		t.Fatalf("defaults = %+v", cfg)
	}
}

func TestLoadMCPPublicBehindProxy(t *testing.T) {
	setMCPEnv(t, map[string]string{
		"MCP_ENABLED": "true", "MCP_PUBLIC": "true", "APP_ENV": "production", "DATABASE_URL": "postgres://x/y",
		"MCP_HTTP_ADDR": ":8090", "MCP_TRUSTED_PROXIES": "172.16.0.0/12, 10.0.0.5",
		"MCP_ALLOWED_ORIGINS": "https://claude.ai", "MCP_RATE_LIMIT_RPS": "0.5",
	})
	cfg, err := LoadMCP("")
	if err != nil {
		t.Fatal(err)
	}
	want := []netip.Prefix{netip.MustParsePrefix("172.16.0.0/12"), netip.MustParsePrefix("10.0.0.5/32")}
	if len(cfg.TrustedProxies) != 2 || cfg.TrustedProxies[0] != want[0] || cfg.TrustedProxies[1] != want[1] || cfg.RateLimitRPS != 0.5 {
		t.Fatalf("cfg = %+v", cfg)
	}
}

func TestLoadMCPRejects(t *testing.T) {
	base := map[string]string{"MCP_ENABLED": "true", "DATABASE_URL": "postgres://x/y"}
	cases := []struct {
		name string
		env  map[string]string
		flag string
		want string
	}{
		{"flag beyond loopback", nil, "0.0.0.0:8090", "MCP_PUBLIC=true"},
		{"bad proxy", map[string]string{"MCP_TRUSTED_PROXIES": "proxy.local"}, "", "not an IP or CIDR"},
		{"insecure origin", map[string]string{"MCP_ALLOWED_ORIGINS": "http://evil.example"}, "", "must be https"},
		{"bad rate", map[string]string{"MCP_RATE_LIMIT_RPS": "2x"}, "", "MCP_RATE_LIMIT_RPS"},
		{"zero concurrency", map[string]string{"MCP_MAX_CONCURRENT": "0"}, "", "MCP_MAX_CONCURRENT"},
		{"bad addr", map[string]string{"MCP_HTTP_ADDR": "8090"}, "", "host:port"},
		{"statement longer than call", map[string]string{"MCP_DB_STATEMENT_TIMEOUT": "20s"}, "", "shorter than MCP_CALL_TIMEOUT"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			env := map[string]string{}
			for k, v := range base {
				env[k] = v
			}
			for k, v := range c.env {
				env[k] = v
			}
			setMCPEnv(t, env)
			if _, err := LoadMCP(c.flag); err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("err = %v, want %q", err, c.want)
			}
		})
	}
}
