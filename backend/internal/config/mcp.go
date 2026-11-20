package config

import (
	"errors"
	"fmt"
	"net"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

// MCPConfig configures the Zona Gol MCP server (cmd/mcp, issue #50). It is
// separate from Config because the MCP binary needs no JWT, mail or storage
// settings and must be able to start without them.
type MCPConfig struct {
	Env         string
	Enabled     bool
	DatabaseURL string
	// HTTPAddr serves Streamable HTTP when set; empty means stdio.
	HTTPAddr string
	// Public allows a non-loopback HTTPAddr (behind Caddy) and running with
	// APP_ENV=production. It must be set explicitly: phase B keeps the remote
	// endpoint off unless someone decides to publish it.
	Public bool
	// AllowedOrigins are the browser origins accepted on /mcp. MCP hosts
	// that are not browsers send no Origin header and are not affected.
	AllowedOrigins []string
	// TrustedProxies are the networks whose X-Forwarded-For is believed
	// (Caddy). Without them every client would share the proxy's IP.
	TrustedProxies []netip.Prefix

	RateLimitRPS     float64
	RateLimitBurst   int
	MaxConcurrent    int
	QueueWait        time.Duration
	CallTimeout      time.Duration
	StatementTimeout time.Duration
	ShutdownTimeout  time.Duration
}

// IsProduction reports whether the MCP server runs in production.
func (c MCPConfig) IsProduction() bool { return c.Env == "production" }

// LoadMCP reads and validates the MCP server settings. httpAddrFlag, when not
// empty, overrides MCP_HTTP_ADDR (the -http flag of phase A).
func LoadMCP(httpAddrFlag string) (MCPConfig, error) {
	cfg := MCPConfig{
		Env:            getEnv("APP_ENV", "development"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		HTTPAddr:       os.Getenv("MCP_HTTP_ADDR"),
		AllowedOrigins: splitList(os.Getenv("MCP_ALLOWED_ORIGINS")),
	}
	if httpAddrFlag != "" {
		cfg.HTTPAddr = httpAddrFlag
	}

	// Only the exact value "true" enables the server, as in phase A, so a
	// stray "1" or "yes" never publishes it by accident.
	cfg.Enabled = os.Getenv("MCP_ENABLED") == "true"
	cfg.Public = os.Getenv("MCP_PUBLIC") == "true"

	var err error
	if cfg.TrustedProxies, err = parsePrefixes("MCP_TRUSTED_PROXIES"); err != nil {
		return MCPConfig{}, err
	}
	if cfg.RateLimitRPS, err = parseFloat("MCP_RATE_LIMIT_RPS", 2); err != nil {
		return MCPConfig{}, err
	}
	if cfg.RateLimitBurst, err = parseInt("MCP_RATE_LIMIT_BURST", 20); err != nil {
		return MCPConfig{}, err
	}
	if cfg.MaxConcurrent, err = parseInt("MCP_MAX_CONCURRENT", 16); err != nil {
		return MCPConfig{}, err
	}
	if cfg.QueueWait, err = parseDuration("MCP_QUEUE_WAIT", 2*time.Second); err != nil {
		return MCPConfig{}, err
	}
	if cfg.CallTimeout, err = parseDuration("MCP_CALL_TIMEOUT", 10*time.Second); err != nil {
		return MCPConfig{}, err
	}
	if cfg.StatementTimeout, err = parseDuration("MCP_DB_STATEMENT_TIMEOUT", 5*time.Second); err != nil {
		return MCPConfig{}, err
	}
	if cfg.ShutdownTimeout, err = parseDuration("SHUTDOWN_TIMEOUT", 10*time.Second); err != nil {
		return MCPConfig{}, err
	}
	return cfg, cfg.validate()
}

func (c MCPConfig) validate() error {
	if !c.Enabled {
		return errors.New("MCP server is disabled: set MCP_ENABLED=true to run it")
	}
	var errs []error
	if c.Env != "development" && c.Env != "production" {
		errs = append(errs, fmt.Errorf("APP_ENV must be development or production, got %q", c.Env))
	}
	if c.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if c.IsProduction() && !c.Public {
		errs = append(errs, errors.New("MCP in production requires MCP_PUBLIC=true (remote endpoint reviewed and approved)"))
	}
	if c.IsProduction() && c.HTTPAddr == "" {
		errs = append(errs, errors.New("MCP in production only serves HTTP: set MCP_HTTP_ADDR"))
	}
	if c.HTTPAddr != "" {
		loopback, err := isLoopbackAddr(c.HTTPAddr)
		switch {
		case err != nil:
			errs = append(errs, fmt.Errorf("MCP_HTTP_ADDR: %w", err))
		case !loopback && !c.Public:
			errs = append(errs, errors.New("MCP_HTTP_ADDR is not loopback: set MCP_PUBLIC=true to listen on it"))
		case !loopback && len(c.TrustedProxies) == 0:
			errs = append(errs, errors.New("MCP_TRUSTED_PROXIES is required when MCP listens beyond loopback"))
		}
	}
	for _, o := range c.AllowedOrigins {
		if !strings.HasPrefix(o, "https://") && !strings.HasPrefix(o, "http://localhost") && !strings.HasPrefix(o, "http://127.0.0.1") {
			errs = append(errs, fmt.Errorf("MCP_ALLOWED_ORIGINS: %q must be https (or a local http origin)", o))
		}
	}
	if c.RateLimitRPS <= 0 || c.RateLimitBurst < 1 {
		errs = append(errs, errors.New("MCP_RATE_LIMIT_RPS must be > 0 and MCP_RATE_LIMIT_BURST >= 1"))
	}
	if c.MaxConcurrent < 1 {
		errs = append(errs, errors.New("MCP_MAX_CONCURRENT must be >= 1"))
	}
	if c.CallTimeout <= 0 || c.StatementTimeout <= 0 || c.QueueWait <= 0 {
		errs = append(errs, errors.New("MCP_CALL_TIMEOUT, MCP_QUEUE_WAIT and MCP_DB_STATEMENT_TIMEOUT must be positive"))
	}
	if c.StatementTimeout >= c.CallTimeout {
		errs = append(errs, errors.New("MCP_DB_STATEMENT_TIMEOUT must be shorter than MCP_CALL_TIMEOUT"))
	}
	return errors.Join(errs...)
}

// isLoopbackAddr reports whether host:port only listens on the loopback
// interface. An empty host (":8090") listens everywhere.
func isLoopbackAddr(addr string) (bool, error) {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false, errors.New("must be host:port")
	}
	if host == "localhost" {
		return true, nil
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback(), nil
}

func parsePrefixes(key string) ([]netip.Prefix, error) {
	var out []netip.Prefix
	for _, raw := range splitList(os.Getenv(key)) {
		p, err := netip.ParsePrefix(raw)
		if err != nil {
			addr, aerr := netip.ParseAddr(raw)
			if aerr != nil {
				return nil, fmt.Errorf("%s: %q is not an IP or CIDR", key, raw)
			}
			p = netip.PrefixFrom(addr, addr.BitLen())
		}
		out = append(out, p.Masked())
	}
	return out, nil
}

func parseFloat(key string, fallback float64) (float64, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: not a number", key)
	}
	return v, nil
}
