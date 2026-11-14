// Command mcp runs the Zona Gol MCP server (issue #50, phase A): a local,
// read-only proof of concept over the public data of active leagues.
//
// It is a separate binary, not part of the API container, and refuses to
// start unless MCP_ENABLED=true and APP_ENV is not production. It serves
// stdio by default (for MCP hosts that launch it as a subprocess) or, with
// -http, Streamable HTTP on a loopback address only.
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
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/mcpserver"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

func main() {
	httpAddr := flag.String("http", "", "serve Streamable HTTP on this loopback address (e.g. 127.0.0.1:8090) instead of stdio")
	flag.Parse()

	// stdout carries the MCP protocol in stdio mode, so logs go to stderr.
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(*httpAddr, logger); err != nil {
		logger.Error("mcp server stopped", "err", err)
		os.Exit(1)
	}
}

func run(httpAddr string, logger *slog.Logger) error {
	if os.Getenv("MCP_ENABLED") != "true" {
		return errors.New("MCP server is disabled: set MCP_ENABLED=true to run it")
	}
	if os.Getenv("APP_ENV") == "production" {
		return errors.New("MCP phase A is a local proof of concept and does not run in production")
	}
	dbURL, err := readOnlyURL(os.Getenv("DATABASE_URL"))
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
		Leagues: leagues.NewService(leagues.NewPGRepository(pool), checker),
		Matches: matches.NewService(matches.NewPGRepository(pool), checker, pool),
		Stats:   stats.NewService(stats.NewPGRepository(pool), checker),
		Teams:   teams.NewService(teams.NewPGRepository(pool), pool, checker),
		Logger:  logger,
	})

	if httpAddr == "" {
		logger.Info("mcp server ready on stdio", "version", mcpserver.Version)
		return server.Run(ctx, &mcp.StdioTransport{})
	}
	return serveHTTP(ctx, httpAddr, server, logger)
}

// readOnlyURL makes every session of the pool read-only, so a bug in a
// tool can never write to the database.
func readOnlyURL(raw string) (string, error) {
	if raw == "" {
		return "", errors.New("DATABASE_URL is required")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", errors.New("DATABASE_URL is not a valid URL")
	}
	q := u.Query()
	q.Set("default_transaction_read_only", "on")
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func serveHTTP(ctx context.Context, addr string, server *mcp.Server, logger *slog.Logger) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("invalid -http address: %w", err)
	}
	if ip := net.ParseIP(host); host != "localhost" && (ip == nil || !ip.IsLoopback()) {
		return errors.New("phase A only listens on loopback (127.0.0.1, ::1 or localhost)")
	}

	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true, Logger: logger})
	mux := http.NewServeMux()
	mux.Handle("/mcp", http.MaxBytesHandler(handler, 64<<10))

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	logger.Info("mcp server ready", "url", "http://"+addr+"/mcp", "version", mcpserver.Version)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
