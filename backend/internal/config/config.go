// Package config loads and validates runtime configuration from the environment.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds every setting the API needs. It is built once at startup and
// passed explicitly; packages must not read environment variables themselves.
type Config struct {
	Env             string // "development" | "production"
	HTTPAddr        string
	DatabaseURL     string
	MigrateOnStart  bool
	AllowedOrigins  []string
	ShutdownTimeout time.Duration

	// JWTSecret signs and verifies tokens issued by this API.
	JWTSecret string
	// SupabaseJWTSecret, when set, lets the API accept existing Supabase
	// sessions during the migration. Remove once auth is cut over.
	SupabaseJWTSecret string
	JWTIssuer         string
	AccessTokenTTL    time.Duration

	// SupabaseURL and SupabaseServiceRoleKey back the GoTrue admin API used by
	// the accounts module while identities still live in Supabase.
	SupabaseURL            string
	SupabaseServiceRoleKey string

	Storage       StorageConfig
	Notifications NotificationsConfig
	Mux           MuxConfig
	OpenAI        OpenAIConfig
	Agent         AgentConfig
}

// AgentConfig configures the AI league assistant (OpenAI-compatible LLM,
// Groq by default) and its WhatsApp webhook.
type AgentConfig struct {
	LLMBaseURL         string
	LLMAPIKey          string
	LLMModel           string
	KapsoWebhookSecret string
}

// Enabled reports whether the assistant can answer.
func (c AgentConfig) Enabled() bool { return c.LLMAPIKey != "" && c.LLMModel != "" }

// StorageConfig configures the S3-compatible object store (Wasabi/R2/S3).
type StorageConfig struct {
	Endpoint        string
	Region          string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	PublicBaseURL   string
}

// Enabled reports whether enough settings are present to mount storage.
func (c StorageConfig) Enabled() bool {
	return c.Bucket != "" && c.AccessKeyID != "" && c.SecretAccessKey != ""
}

// NotificationsConfig configures WhatsApp delivery through Kapso.
type NotificationsConfig struct {
	KapsoBaseURL       string
	KapsoAPIKey        string
	PhoneNumberID      string
	TemplateJornada    string
	TemplateResultados string
	PublicSiteURL      string
}

// Enabled reports whether WhatsApp notifications can be sent.
func (c NotificationsConfig) Enabled() bool {
	return c.KapsoAPIKey != "" && c.PhoneNumberID != ""
}

// MuxConfig configures Zona Play video.
type MuxConfig struct {
	TokenID       string
	TokenSecret   string
	WebhookSecret string
}

// Enabled reports whether the Mux integration is configured.
func (c MuxConfig) Enabled() bool { return c.TokenID != "" && c.TokenSecret != "" }

// OpenAIConfig configures embeddings for the AI knowledge base.
type OpenAIConfig struct {
	BaseURL        string
	APIKey         string
	EmbeddingModel string
}

// Enabled reports whether embeddings can be generated.
func (c OpenAIConfig) Enabled() bool { return c.APIKey != "" }

// IsProduction reports whether the API runs in production mode.
func (c Config) IsProduction() bool { return c.Env == "production" }

// Load reads configuration from environment variables and validates it.
func Load() (Config, error) {
	cfg := Config{
		Env:               getEnv("APP_ENV", "development"),
		HTTPAddr:          getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		AllowedOrigins:    splitList(os.Getenv("CORS_ALLOWED_ORIGINS")),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		JWTIssuer:         getEnv("JWT_ISSUER", "zona-api"),

		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		Storage: StorageConfig{
			Endpoint:        os.Getenv("S3_ENDPOINT"),
			Region:          getEnv("S3_REGION", "us-east-1"),
			Bucket:          os.Getenv("S3_BUCKET"),
			AccessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
			PublicBaseURL:   os.Getenv("S3_PUBLIC_BASE_URL"),
		},
		Notifications: NotificationsConfig{
			KapsoBaseURL:       getEnv("KAPSO_BASE_URL", "https://api.kapso.ai"),
			KapsoAPIKey:        os.Getenv("KAPSO_API_KEY"),
			PhoneNumberID:      os.Getenv("KAPSO_PHONE_NUMBER_ID"),
			TemplateJornada:    getEnv("WHATSAPP_TEMPLATE_JORNADA", "jornada_notification"),
			TemplateResultados: getEnv("WHATSAPP_TEMPLATE_RESULTADO_JORNADAS", "resultado_jornadas"),
			PublicSiteURL:      os.Getenv("PUBLIC_SITE_URL"),
		},
		Mux: MuxConfig{
			TokenID:       os.Getenv("MUX_TOKEN_ID"),
			TokenSecret:   os.Getenv("MUX_TOKEN_SECRET"),
			WebhookSecret: os.Getenv("MUX_WEBHOOK_SECRET"),
		},
		Agent: AgentConfig{
			LLMBaseURL:         getEnv("LLM_API_BASE_URL", "https://api.groq.com/openai/v1"),
			LLMAPIKey:          os.Getenv("LLM_API_KEY"),
			LLMModel:           os.Getenv("LLM_MODEL"),
			KapsoWebhookSecret: os.Getenv("KAPSO_WEBHOOK_SECRET"),
		},
		OpenAI: OpenAIConfig{
			BaseURL:        getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
			APIKey:         os.Getenv("OPENAI_API_KEY"),
			EmbeddingModel: getEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
		},
	}

	var err error
	if cfg.MigrateOnStart, err = parseBool("MIGRATE_ON_START", false); err != nil {
		return Config{}, err
	}
	if cfg.ShutdownTimeout, err = parseDuration("SHUTDOWN_TIMEOUT", 15*time.Second); err != nil {
		return Config{}, err
	}
	if cfg.AccessTokenTTL, err = parseDuration("ACCESS_TOKEN_TTL", 15*time.Minute); err != nil {
		return Config{}, err
	}

	return cfg, cfg.validate()
}

func (c Config) validate() error {
	var errs []error
	if c.Env != "development" && c.Env != "production" {
		errs = append(errs, fmt.Errorf("APP_ENV must be development or production, got %q", c.Env))
	}
	if c.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if len(c.JWTSecret) < 32 {
		errs = append(errs, errors.New("JWT_SECRET must be at least 32 characters"))
	}
	if (c.SupabaseURL == "") != (c.SupabaseServiceRoleKey == "") {
		errs = append(errs, errors.New("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together"))
	}
	if c.Mux.Enabled() && c.Mux.WebhookSecret == "" {
		errs = append(errs, errors.New("MUX_WEBHOOK_SECRET is required when Mux is enabled"))
	}
	if c.Notifications.Enabled() && c.Notifications.PublicSiteURL == "" {
		errs = append(errs, errors.New("PUBLIC_SITE_URL is required when notifications are enabled"))
	}
	if c.IsProduction() && len(c.AllowedOrigins) == 0 {
		errs = append(errs, errors.New("CORS_ALLOWED_ORIGINS is required in production"))
	}
	return errors.Join(errs...)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parseBool(key string, fallback bool) (bool, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s: %w", key, err)
	}
	return v, nil
}

func parseDuration(key string, fallback time.Duration) (time.Duration, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return v, nil
}
