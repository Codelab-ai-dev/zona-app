package config

import (
	"strings"
	"testing"
)

func setAPIEnv(t *testing.T, kv map[string]string) {
	t.Helper()
	base := map[string]string{
		"APP_ENV": "development", "DATABASE_URL": "postgres://x", "JWT_SECRET": strings.Repeat("s", 32),
		"APP_URL": "http://localhost:5173", "MCP_OAUTH_ENABLED": "", "MCP_RESOURCE_URL": "",
	}
	for k, v := range kv {
		base[k] = v
	}
	for k, v := range base {
		t.Setenv(k, v)
	}
}

func TestMCPOAuthIsOffUnlessExactlyTrue(t *testing.T) {
	for _, v := range []string{"", "1", "yes", "TRUE"} {
		setAPIEnv(t, map[string]string{"MCP_OAUTH_ENABLED": v})
		cfg, err := Load()
		if err != nil || cfg.MCPOAuth.Enabled {
			t.Fatalf("%q: enabled=%v err=%v", v, cfg.MCPOAuth.Enabled, err)
		}
	}
}

func TestMCPOAuthResource(t *testing.T) {
	setAPIEnv(t, map[string]string{"MCP_OAUTH_ENABLED": "true"})
	cfg, err := Load()
	if err != nil || cfg.MCPOAuth.ResourceURL != "http://localhost:5173/mcp" {
		t.Fatalf("default resource: %q %v", cfg.MCPOAuth.ResourceURL, err)
	}

	setAPIEnv(t, map[string]string{"MCP_OAUTH_ENABLED": "true", "MCP_RESOURCE_URL": "not a url"})
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "MCP_RESOURCE_URL") {
		t.Fatalf("invalid resource accepted: %v", err)
	}

	setAPIEnv(t, map[string]string{
		"APP_ENV": "production", "APP_URL": "https://zonagol.app", "CORS_ALLOWED_ORIGINS": "https://zonagol.app",
		"SMTP_HOST": "smtp.example", "SMTP_FROM": "no-reply@zonagol.app",
		"MCP_OAUTH_ENABLED": "true", "MCP_RESOURCE_URL": "http://zonagol.app/mcp",
	})
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "https") {
		t.Fatalf("plain http resource accepted in production: %v", err)
	}
}
