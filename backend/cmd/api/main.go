// Command api runs the Zona Gol HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/accounts"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/attendance"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/directory"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/finance"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/health"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/knowledge"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/notifications"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/play"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/server"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/storage"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/users"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	setupLogger(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.MigrateOnStart {
		if err := database.Migrate(ctx, pool); err != nil {
			return err
		}
	}

	tokens := auth.NewTokenService(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTokenTTL, cfg.SupabaseJWTSecret)
	authMW := auth.NewMiddleware(tokens, auth.NewPGProfileLoader(pool))

	modules, err := buildModules(cfg, pool)
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr: cfg.HTTPAddr,
		Handler: server.NewRouter(server.Deps{
			AllowedOrigins: cfg.AllowedOrigins,
			TrustProxy:     cfg.IsProduction(),
			Auth:           authMW,
			Health:         health.NewHandler(pool),
			Modules:        modules,
		}),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("api listening", "addr", cfg.HTTPAddr, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	slog.Info("shutting down")
	return srv.Shutdown(shutdownCtx)
}

// buildModules wires every feature package. Integrations whose settings are
// missing are not mounted (their routes return 404) and a warning is logged,
// so the API never runs a half-configured module.
func buildModules(cfg config.Config, pool *pgxpool.Pool) ([]server.Module, error) {
	checker := authz.NewPGChecker(pool)
	modules := []server.Module{
		users.NewHandler(users.NewService(users.NewPGRepository(pool))),
		leagues.NewHandler(leagues.NewService(leagues.NewPGRepository(pool), checker)),
		teams.NewHandler(teams.NewService(teams.NewPGRepository(pool), pool, checker)),
		stats.NewHandler(stats.NewService(stats.NewPGRepository(pool), checker)),
		finance.NewHandler(finance.NewService(finance.NewPGRepository(pool), checker)),
		attendance.NewHandler(attendance.NewService(attendance.NewPGRepository(pool), checker), checker),
		directory.NewHandler(directory.NewService(directory.NewPGRepository(pool), checker)),
		matches.NewHandler(matches.NewService(matches.NewPGRepository(pool), checker, pool)),
	}

	if cfg.SupabaseURL != "" {
		identity := accounts.NewSupabaseIdentityProvider(accounts.Config{
			SupabaseURL:    cfg.SupabaseURL,
			ServiceRoleKey: cfg.SupabaseServiceRoleKey,
		})
		modules = append(modules, accounts.NewHandler(accounts.NewService(accounts.NewPGRepository(pool), identity, checker)))
	} else {
		slog.Warn("module disabled: accounts (SUPABASE_URL not set)")
	}

	if cfg.Storage.Enabled() {
		storageCfg := storage.Config{
			Endpoint:              cfg.Storage.Endpoint,
			Region:                cfg.Storage.Region,
			Bucket:                cfg.Storage.Bucket,
			AccessKeyID:           cfg.Storage.AccessKeyID,
			SecretAccessKey:       cfg.Storage.SecretAccessKey,
			PublicBaseURL:         cfg.Storage.PublicBaseURL,
			MaxImageUploadBytes:   10 << 20,
			MaxReleaseUploadBytes: 150 << 20,
			PresignTTL:            15 * time.Minute,
		}
		store, err := storage.NewS3Store(storageCfg)
		if err != nil {
			return nil, fmt.Errorf("storage: %w", err)
		}
		modules = append(modules, storage.NewHandler(storage.NewService(store, checker, storageCfg)))
	} else {
		slog.Warn("module disabled: storage (S3_* not set)")
	}

	if cfg.Notifications.Enabled() {
		n := cfg.Notifications
		notifCfg := notifications.Config{
			KapsoBaseURL:       n.KapsoBaseURL,
			KapsoAPIKey:        n.KapsoAPIKey,
			PhoneNumberID:      n.PhoneNumberID,
			TemplateJornada:    n.TemplateJornada,
			TemplateResultados: n.TemplateResultados,
			PublicSiteURL:      n.PublicSiteURL,
		}
		svc := notifications.NewService(notifications.NewPGRepository(pool), checker, notifications.NewKapsoHTTPSender(notifCfg), notifCfg)
		modules = append(modules, notifications.NewHandler(svc))
	} else {
		slog.Warn("module disabled: notifications (KAPSO_* not set)")
	}

	if cfg.Mux.Enabled() {
		mux := play.NewMuxClient(play.MuxConfig{TokenID: cfg.Mux.TokenID, TokenSecret: cfg.Mux.TokenSecret})
		svc := play.NewService(play.NewPGRepository(pool), mux, checker)
		modules = append(modules, play.NewHandler(svc, &play.Config{MuxWebhookSecret: cfg.Mux.WebhookSecret}))
	} else {
		slog.Warn("module disabled: play (MUX_* not set)")
	}

	if cfg.OpenAI.Enabled() {
		embedder := knowledge.NewOpenAIEmbedder(knowledge.Config{
			OpenAIBaseURL:  cfg.OpenAI.BaseURL,
			OpenAIAPIKey:   cfg.OpenAI.APIKey,
			EmbeddingModel: cfg.OpenAI.EmbeddingModel,
			Dimensions:     1536, // league_knowledge_base.embedding is vector(1536)
		})
		modules = append(modules, knowledge.NewHandler(knowledge.NewService(knowledge.NewPGRepository(pool), embedder, checker)))
	} else {
		slog.Warn("module disabled: knowledge (OPENAI_API_KEY not set)")
	}

	return modules, nil
}

func setupLogger(cfg config.Config) {
	var h slog.Handler
	if cfg.IsProduction() {
		h = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		h = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	}
	slog.SetDefault(slog.New(h))
}
