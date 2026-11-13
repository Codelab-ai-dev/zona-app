// Command seed loads a demo dataset for local development and matchday
// rehearsals: a super admin and two independent leagues, each with its own
// league admin and team owner, a tournament, teams, rosters and a round-robin
// that is half played and has a round scheduled for today (QR attendance).
//
// It refuses to run with APP_ENV=production, is idempotent per league (a
// league whose slug exists is left alone, so re-running adds only what is
// missing) and takes the shared demo password from SEED_PASSWORD so no
// credential lives in the repository.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/session"
)

// leagueSpec describes one demo league.
type leagueSpec struct {
	slug, name, description, tournament string
	admin, owner                        account
	teams, colors                       []string
	// startDaysAgo sets round 1; rounds are weekly, so a multiple of 7 puts
	// one round today.
	startDaysAgo int
}

var superAdmin = account{email: "superadmin@zonagol.local", name: "Super Admin", role: "super_admin"}

var leagues = []leagueSpec{
	{
		slug: "liga-demo", name: "Liga Demo Zona Gol", description: "Liga de demostración para desarrollo local",
		tournament:   "Apertura 2026",
		admin:        account{email: "liga@zonagol.local", name: "Admin de Liga", role: "league_admin"},
		owner:        account{email: "equipo@zonagol.local", name: "Dueño de Equipo", role: "team_owner"},
		teams:        []string{"Águilas FC", "Tigres del Norte", "Real Colonia", "Deportivo Juárez", "Atlético Centro", "Halcones United"},
		colors:       []string{"#1D4ED8", "#F59E0B", "#7C3AED", "#DC2626", "#059669", "#0F172A"},
		startDaysAgo: 21,
	},
	{
		// Second league for isolation rehearsals (issue #41).
		slug: "liga-ensayo-b", name: "Liga Ensayo B", description: "Segunda liga para ensayar el aislamiento entre ligas",
		tournament:   "Apertura 2027",
		admin:        account{email: "liga-b@zonagol.local", name: "Admin Liga B", role: "league_admin"},
		owner:        account{email: "equipo-b@zonagol.local", name: "Dueño Equipo B", role: "team_owner"},
		teams:        []string{"Pumas del Sur", "Lobos FC", "Cometas", "Unión Vecinal"},
		colors:       []string{"#B91C1C", "#334155", "#0EA5E9", "#65A30D"},
		startDaysAgo: 14,
	},
}

func main() {
	if err := run(); err != nil {
		slog.Error("seed failed", "err", err)
		os.Exit(1)
	}
}

func run() error {
	if os.Getenv("APP_ENV") == "production" {
		return errors.New("refusing to seed demo data in production")
	}
	password := os.Getenv("SEED_PASSWORD")
	if len(password) < session.MinPasswordLength || len(password) > 72 {
		return errors.New("SEED_PASSWORD must be 10-72 characters")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	pool, err := database.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		return err
	}

	hash, err := session.HashPassword(password)
	if err != nil {
		return err
	}
	return pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		if err := ensureAccount(ctx, tx, &superAdmin, hash); err != nil {
			return err
		}
		for _, spec := range leagues {
			var exists bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM public.leagues WHERE slug = $1)`, spec.slug).Scan(&exists); err != nil {
				return err
			}
			if exists {
				slog.Info("demo league already present; skipping", "slug", spec.slug)
				continue
			}
			if err := seedLeague(ctx, tx, spec, hash); err != nil {
				return fmt.Errorf("league %s: %w", spec.slug, err)
			}
			slog.Info("demo league created", "slug", spec.slug, "admin", spec.admin.email, "owner", spec.owner.email)
		}
		return nil
	})
}

type account struct {
	email, name, role string
	id                uuid.UUID
}

// ensureAccount creates the account, or reuses it (keeping its password) when
// the email already exists.
func ensureAccount(ctx context.Context, tx pgx.Tx, a *account, passwordHash string) error {
	err := tx.QueryRow(ctx, `SELECT id FROM auth.users WHERE email = $1`, a.email).Scan(&a.id)
	if err == nil {
		return nil
	}
	if !database.IsNoRows(err) {
		return fmt.Errorf("account %s: %w", a.email, err)
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, aud, role)
		VALUES ($1, $2, now(), 'authenticated', 'authenticated') RETURNING id`,
		a.email, passwordHash).Scan(&a.id); err != nil {
		return fmt.Errorf("account %s: %w", a.email, err)
	}
	// The handle_new_user trigger created the profile with role 'public'.
	if _, err := tx.Exec(ctx, `UPDATE public.users SET role = $2, name = $3 WHERE id = $1`, a.id, a.role, a.name); err != nil {
		return fmt.Errorf("account %s: %w", a.email, err)
	}
	return nil
}

var positions = []string{"Portero", "Defensa", "Defensa", "Defensa", "Medio", "Medio", "Delantero", "Delantero"}

var firstNames = []string{"Luis", "Carlos", "Jorge", "Miguel", "Andrés", "Diego", "Raúl", "Iván"}

func seedLeague(ctx context.Context, tx pgx.Tx, spec leagueSpec, passwordHash string) error {
	exec := func(q string, args ...any) error {
		if _, err := tx.Exec(ctx, q, args...); err != nil {
			return fmt.Errorf("%.60s…: %w", q, err)
		}
		return nil
	}

	leagueAdmin, owner := spec.admin, spec.owner
	for _, a := range []*account{&leagueAdmin, &owner} {
		if err := ensureAccount(ctx, tx, a, passwordHash); err != nil {
			return err
		}
	}

	leagueID, tournamentID := uuid.New(), uuid.New()
	// Full plan with finance enabled, so every tab of the panel is visible.
	if err := exec(`INSERT INTO public.leagues (id, name, slug, description, admin_id, product_mode, features)
		VALUES ($1, $2, $3, $4, $5, 'full',
		        '{"ai_agent": true, "qr_codes": true, "mobile_app": true, "statistics": true, "manual_entry": true,
		          "public_portal": true, "realtime_updates": true, "facial_recognition": true,
		          "finance": true, "finance_auto_fines": true, "finance_payments": true}'::jsonb)`,
		leagueID, spec.name, spec.slug, spec.description, leagueAdmin.id); err != nil {
		return err
	}
	if err := exec(`UPDATE public.users SET league_id = $2 WHERE id = ANY($1)`, []uuid.UUID{leagueAdmin.id, owner.id}, leagueID); err != nil {
		return err
	}
	start := time.Now().AddDate(0, 0, -spec.startDaysAgo)
	if err := exec(`INSERT INTO public.tournaments (id, name, league_id, start_date, end_date, is_active, max_players)
		VALUES ($1, $2, $3, $4, $5, true, 20)`, tournamentID, spec.tournament, leagueID, start, start.AddDate(0, 3, 0)); err != nil {
		return err
	}

	teamIDs := make([]uuid.UUID, len(spec.teams))
	for i, name := range spec.teams {
		teamIDs[i] = uuid.New()
		// The owner manages the first team; the rest belong to the league admin.
		ownerID := leagueAdmin.id
		if i == 0 {
			ownerID = owner.id
		}
		if err := exec(`INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id, home_primary_color)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			teamIDs[i], name, fmt.Sprintf("equipo-%d", i+1), leagueID, tournamentID, ownerID, spec.colors[i]); err != nil {
			return err
		}
		for j, pos := range positions {
			birth := time.Date(1995+(i+j)%10, time.Month(1+j), 10+i, 0, 0, 0, 0, time.UTC)
			if err := exec(`INSERT INTO public.players (team_id, name, position, jersey_number, birth_date) VALUES ($1, $2, $3, $4, $5)`,
				teamIDs[i], fmt.Sprintf("%s %s", firstNames[j], lastName(i, j)), pos, j+1, birth); err != nil {
				return err
			}
		}
	}
	if err := exec(`UPDATE public.users SET team_id = $2 WHERE id = $1`, owner.id, teamIDs[0]); err != nil {
		return err
	}

	return seedMatches(ctx, tx, tournamentID, teamIDs, start)
}

var lastNames = []string{"García", "Hernández", "López", "Martínez", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz"}

func lastName(team, player int) string { return lastNames[(team*3+player)%len(lastNames)] }

// seedMatches creates a circle-method round robin (n-1 rounds for n teams),
// one round per week. Past rounds are finished with deterministic scores and
// goal stats; future rounds are scheduled.
func seedMatches(ctx context.Context, tx pgx.Tx, tournamentID uuid.UUID, teams []uuid.UUID, start time.Time) error {
	n := len(teams)
	order := append([]uuid.UUID(nil), teams...)
	// Match dates are the local calendar day at 00:00 UTC (what the scanner's
	// today-matches lookup compares against), so "played" means before today.
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	for round := 1; round < n; round++ {
		date := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, 7*(round-1))
		finished := date.Before(today)
		for k := range n / 2 {
			home, away := order[k], order[n-1-k]
			if round%2 == 0 {
				home, away = away, home
			}
			var matchID uuid.UUID
			if err := tx.QueryRow(ctx, `
				INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, match_time,
				                            field_number, round, status, is_published)
				VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', true) RETURNING id`,
				tournamentID, home, away, date, fmt.Sprintf("%02d:00", 16+k*2), k+1, round).Scan(&matchID); err != nil {
				return fmt.Errorf("match round %d: %w", round, err)
			}
			if finished {
				// Finish it with an UPDATE, like the API does, so the
				// team_stats trigger computes the standings.
				hs, as := (round+k*2)%4, (round*3+k)%3
				if _, err := tx.Exec(ctx, `UPDATE public.matches SET status = 'finished', home_score = $2, away_score = $3 WHERE id = $1`,
					matchID, hs, as); err != nil {
					return fmt.Errorf("finish match: %w", err)
				}
				if err := scoreGoals(ctx, tx, matchID, home, hs); err != nil {
					return err
				}
				if err := scoreGoals(ctx, tx, matchID, away, as); err != nil {
					return err
				}
			}
		}
		// Rotate every team but the first.
		order = append([]uuid.UUID{order[0], order[n-1]}, order[1:n-1]...)
	}
	return nil
}

// scoreGoals credits the team's goals to its strikers (jerseys 7 and 8).
func scoreGoals(ctx context.Context, tx pgx.Tx, matchID, teamID uuid.UUID, goals int) error {
	for g := range goals {
		jersey := 7 + g%2
		if _, err := tx.Exec(ctx, `
			INSERT INTO public.player_stats (player_id, match_id, goals, minutes_played)
			SELECT id, $1, 1, 90 FROM public.players WHERE team_id = $2 AND jersey_number = $3
			ON CONFLICT (player_id, match_id) DO UPDATE SET goals = player_stats.goals + 1`,
			matchID, teamID, jersey); err != nil {
			return fmt.Errorf("goals: %w", err)
		}
	}
	return nil
}
