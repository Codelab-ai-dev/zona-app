// Command mcp runs the Zona Gol MCP server (issue #50): read-only access for
// AI clients to the public data of active leagues.
//
// It is a separate binary and service, not part of the API. It refuses to
// start unless MCP_ENABLED=true. It serves stdio by default (MCP hosts that
// launch it as a subprocess) or Streamable HTTP with MCP_HTTP_ADDR / -http.
// Listening beyond loopback or running in production also requires
// MCP_PUBLIC=true and MCP_TRUSTED_PROXIES (phase B, behind Caddy).
//
//	MCP_ENABLED=true DATABASE_URL=... go run ./cmd/mcp
//	MCP_ENABLED=true DATABASE_URL=... go run ./cmd/mcp -http 127.0.0.1:8090
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/mcpserver"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

func main() {
	httpAddr := flag.String("http", "", "serve Streamable HTTP on this address instead of stdio (overrides MCP_HTTP_ADDR)")
	flag.Parse()

	// stdout carries the MCP protocol in stdio mode, so logs go to stderr.
	// JSON lines in HTTP mode, ready for the container log collector.
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	if err := run(*httpAddr, logger); err != nil {
		logger.Error("mcp server stopped", "err", err)
		os.Exit(1)
	}
}

func run(httpAddr string, logger *slog.Logger) error {
	cfg, err := config.LoadMCP(httpAddr)
	if err != nil {
		return err
	}
	dbURL, err := readOnlyURL(cfg.DatabaseURL, cfg.StatementTimeout)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, dbURL)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer pool.Close()

	checker := authz.NewPGChecker(pool)
	server := mcpserver.NewServer(mcpserver.Deps{
		Leagues:     leagues.NewService(leagues.NewPGRepository(pool), checker),
		Matches:     matches.NewService(matches.NewPGRepository(pool), checker, pool),
		Stats:       stats.NewService(stats.NewPGRepository(pool), checker),
		Teams:       teams.NewService(teams.NewPGRepository(pool), pool, checker),
		Logger:      logger,
		CallTimeout: cfg.CallTimeout,
	})

	if cfg.HTTPAddr == "" {
		logger.Info("mcp server ready on stdio", "version", mcpserver.Version)
		return server.Run(ctx, &mcp.StdioTransport{})
	}
	return serveHTTP(ctx, cfg, server, logger)
}

// readOnlyURL makes every session of the pool read-only, so a bug in a
// tool can never write to the database, and bounds every statement so a
// slow query cannot hold a connection.
func readOnlyURL(raw string, statementTimeout time.Duration) (string, error) {
	if raw == "" {
		return "", errors.New("DATABASE_URL is required")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", errors.New("DATABASE_URL is not a valid URL")
	}
	q := u.Query()
	q.Set("default_transaction_read_only", "on")
	q.Set("statement_timeout", strconv.FormatInt(statementTimeout.Milliseconds(), 10))
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func serveHTTP(ctx context.Context, cfg config.MCPConfig, server *mcp.Server, logger *slog.Logger) error {
	handler := mcpserver.NewHTTPHandler(server, mcpserver.HTTPOptions{
		AllowedOrigins: cfg.AllowedOrigins,
		TrustedProxies: cfg.TrustedProxies,
		RateLimitRPS:   cfg.RateLimitRPS,
		RateLimitBurst: cfg.RateLimitBurst,
		MaxConcurrent:  cfg.MaxConcurrent,
		QueueWait:      cfg.QueueWait,
		CallTimeout:    cfg.CallTimeout,
		Logger:         logger,
	})
	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      cfg.CallTimeout + 10*time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	logger.Info("mcp server ready", "addr", cfg.HTTPAddr, "path", "/mcp", "public", cfg.Public, "version", mcpserver.Version)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
