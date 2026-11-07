// Command createadmin creates (or promotes) a super admin account. It is the
// way to bootstrap a fresh installation:
//
//	ADMIN_EMAIL=ana@liga.mx ADMIN_NAME="Ana" ADMIN_PASSWORD=... createadmin
//
// The password comes from the environment, never from flags (which end up in
// shell history and process listings). If the email exists, the account is
// promoted to super admin and its password is reset.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
)

func main() {
	if err := run(); err != nil {
		slog.Error("createadmin failed", "err", err)
		os.Exit(1)
	}
}

func run() error {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	password := os.Getenv("ADMIN_PASSWORD")
	if _, err := mail.ParseAddress(email); err != nil {
		return errors.New("ADMIN_EMAIL must be a valid email")
	}
	if name == "" {
		name = "Super Admin"
	}
	if len(password) < session.MinPasswordLength || len(password) > 72 {
		return errors.New("ADMIN_PASSWORD must be 10-72 characters")
	}
	hash, err := session.HashPassword(password)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	pool, err := database.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		return err
	}

	var id uuid.UUID
	err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		// Upsert the identity; the handle_new_user trigger creates the profile.
		if err := tx.QueryRow(ctx, `
			INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, aud, role)
			VALUES ($1, $2, now(), 'authenticated', 'authenticated')
			ON CONFLICT (lower(email)) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, updated_at = now()
			RETURNING id`, email, hash).Scan(&id); err != nil {
			return fmt.Errorf("identity: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE public.users SET role = 'super_admin', name = $2, is_active = true WHERE id = $1`, id, name); err != nil {
			return fmt.Errorf("profile: %w", err)
		}
		// A password reset invalidates every existing session.
		_, err := tx.Exec(ctx, `UPDATE auth.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, id)
		return err
	})
	if err != nil {
		return err
	}
	slog.Info("super admin ready", "email", email, "user_id", id)
	return nil
}
