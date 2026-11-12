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
	"path/filepath"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/accounts"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/agent"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/attendance"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/directory"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/finance"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/health"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/knowledge"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leaguedata"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/notifications"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/mail"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/play"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/server"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/statsadmin"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/storage"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/superadmin"
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

	tokens := auth.NewTokenService(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTokenTTL)
	authMW := auth.NewMiddleware(tokens, auth.NewPGProfileLoader(pool))

	modules, err := buildModules(ctx, cfg, pool, tokens)
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

// buildSession wires login/refresh/logout/password flows.
func buildSession(cfg config.Config, pool *pgxpool.Pool, tokens *auth.TokenService) server.Module {
	var mailer mail.Sender = mail.LogSender{}
	if cfg.SMTP.Enabled() {
		mailer = mail.NewSMTPSender(mail.SMTPConfig{
			Host: cfg.SMTP.Host, Port: cfg.SMTP.Port,
			Username: cfg.SMTP.Username, Password: cfg.SMTP.Password, From: cfg.SMTP.From,
		})
	} else {
		slog.Warn("SMTP not configured: password-reset emails are logged, not sent (development only)")
	}
	svc := session.NewService(session.NewPGRepository(pool), tokens, mailer, session.Config{
		AppURL:        cfg.AppURL,
		SecureCookies: cfg.IsProduction(),
	})
	return session.NewHandler(svc, cfg.IsProduction())
}

// buildStorage uses the S3 bucket when configured, otherwise local disk:
// public images under STORAGE_DIR/public (served by Caddy at /media) and
// private files under STORAGE_DIR/private (signed API download links only).
func buildStorage(cfg config.Config, checker authz.Checker) (server.Module, error) {
	storageCfg := storage.Config{
		MaxImageUploadBytes:   10 << 20,
		MaxReleaseUploadBytes: 150 << 20,
		PresignTTL:            15 * time.Minute,
	}
	if cfg.Storage.S3Enabled() {
		storageCfg.Endpoint = cfg.Storage.Endpoint
		storageCfg.Region = cfg.Storage.Region
		storageCfg.Bucket = cfg.Storage.Bucket
		storageCfg.AccessKeyID = cfg.Storage.AccessKeyID
		storageCfg.SecretAccessKey = cfg.Storage.SecretAccessKey
		storageCfg.PublicBaseURL = cfg.Storage.PublicBaseURL
		store, err := storage.NewS3Store(storageCfg)
		if err != nil {
			return nil, fmt.Errorf("storage: %w", err)
		}
		return storage.NewHandler(storage.NewService(store, checker, storageCfg), nil), nil
	}

	storageCfg.PublicBaseURL = cfg.AppURL + "/media"
	files, err := storage.NewFSStore(
		filepath.Join(cfg.Storage.Dir, "public"),
		filepath.Join(cfg.Storage.Dir, "private"),
		cfg.AppURL+"/api/v1/storage/download",
		storage.DeriveKey(cfg.JWTSecret, "storage-download-v1"),
	)
	if err != nil {
		return nil, fmt.Errorf("storage: %w", err)
	}
	return storage.NewHandler(storage.NewService(files, checker, storageCfg), files), nil
}

// buildModules wires every feature package. Integrations whose settings are
// missing are not mounted (their routes return 404) and a warning is logged,
// so the API never runs a half-configured module.
func buildModules(ctx context.Context, cfg config.Config, pool *pgxpool.Pool, tokens *auth.TokenService) ([]server.Module, error) {
	checker := authz.NewPGChecker(pool)
	modules := []server.Module{
		buildSession(cfg, pool, tokens),
		users.NewHandler(users.NewService(users.NewPGRepository(pool))),
		leagues.NewHandler(leagues.NewService(leagues.NewPGRepository(pool), checker)),
		teams.NewHandler(teams.NewService(teams.NewPGRepository(pool), pool, checker)),
		stats.NewHandler(stats.NewService(stats.NewPGRepository(pool), checker)),
		statsadmin.NewHandler(statsadmin.NewService(pool, checker)),
		superadmin.NewHandler(superadmin.NewService(pool)),
		leaguedata.NewHandler(leaguedata.NewService(pool, checker)),
		finance.NewHandler(finance.NewService(finance.NewPGRepository(pool), checker)),
		attendance.NewHandler(attendance.NewService(attendance.NewPGRepository(pool), checker), checker),
		directory.NewHandler(directory.NewService(directory.NewPGRepository(pool), checker)),
		matches.NewHandler(matches.NewService(matches.NewPGRepository(pool), checker, pool)),
	}

	identity := accounts.NewLocalIdentityProvider(pool)
	modules = append(modules, accounts.NewHandler(accounts.NewService(accounts.NewPGRepository(pool), identity, checker)))

	if cfg.Storage.Enabled() {
		storageMod, err := buildStorage(cfg, checker)
		if err != nil {
			return nil, err
		}
		modules = append(modules, storageMod)
	} else {
		slog.Warn("module disabled: storage (set STORAGE_DIR or S3_*)")
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

	// Zona Play reads always work; uploads and streams need Mux.
	var video play.VideoProvider = play.UnconfiguredProvider{}
	if cfg.Mux.Enabled() {
		video = play.NewMuxClient(play.MuxConfig{TokenID: cfg.Mux.TokenID, TokenSecret: cfg.Mux.TokenSecret})
	} else {
		slog.Warn("Zona Play: video uploads and streams disabled (MUX_* not set)")
	}
	modules = append(modules, play.NewHandler(play.NewService(play.NewPGRepository(pool), video, checker),
		&play.Config{MuxWebhookSecret: cfg.Mux.WebhookSecret}))

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

	if cfg.Agent.Enabled() {
		repo := agent.NewPGRepository(pool)
		deps := agent.Deps{
			Identities:    repo,
			Classifier:    agent.NewKeywordClassifier(),
			Data:          agent.NewPGDataProvider(pool),
			Knowledge:     repo,
			LLM:           agent.NewChatClient(agent.LLMConfig{BaseURL: cfg.Agent.LLMBaseURL, APIKey: cfg.Agent.LLMAPIKey, Model: cfg.Agent.LLMModel}),
			Conversations: repo,
		}
		if cfg.OpenAI.Enabled() {
			deps.Embedder = knowledge.NewOpenAIEmbedder(knowledge.Config{
				OpenAIBaseURL: cfg.OpenAI.BaseURL, OpenAIAPIKey: cfg.OpenAI.APIKey,
				EmbeddingModel: cfg.OpenAI.EmbeddingModel, Dimensions: 1536,
			})
		}
		// WhatsApp needs both the Kapso API (replies) and the webhook secret.
		var sender agent.WhatsAppSender
		if cfg.Notifications.Enabled() && cfg.Agent.KapsoWebhookSecret != "" {
			sender = agent.NewKapsoSender(agent.KapsoConfig{
				BaseURL: cfg.Notifications.KapsoBaseURL, APIKey: cfg.Notifications.KapsoAPIKey,
				PhoneNumberID: cfg.Notifications.PhoneNumberID,
			})
		} else {
			slog.Warn("agent WhatsApp webhook disabled (KAPSO_* or KAPSO_WEBHOOK_SECRET not set)")
		}
		modules = append(modules, agent.NewHandler(ctx, agent.NewService(deps), repo, sender, cfg.Agent.KapsoWebhookSecret))
	} else {
		slog.Warn("module disabled: agent (LLM_API_KEY / LLM_MODEL not set)")
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
