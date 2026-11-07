//go:build integration

// Package testdb gives integration tests a migrated PostgreSQL pool and a
// small seeded fixture. Tests using it run with:
//
//	TEST_DATABASE_URL=postgres://... go test -tags integration ./...
package testdb

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

var migrateOnce sync.Once

// Pool returns a pool to TEST_DATABASE_URL with migrations applied, or skips
// the test when the variable is not set.
func Pool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	var migErr error
	migrateOnce.Do(func() { migErr = database.Migrate(ctx, pool) })
	if migErr != nil {
		t.Fatalf("migrate: %v", migErr)
	}
	t.Cleanup(pool.Close)
	return pool
}

// Fixture is a minimal league: an admin, a team owner, one tournament, two
// teams with one player each and a scheduled match between them (2-1).
type Fixture struct {
	LeagueAdminID uuid.UUID
	TeamOwnerID   uuid.UUID
	LeagueID      uuid.UUID
	LeagueSlug    string
	TournamentID  uuid.UUID
	HomeTeamID    uuid.UUID
	AwayTeamID    uuid.UUID
	HomePlayerID  uuid.UUID
	MatchID       uuid.UUID
}

// Seed inserts a fresh Fixture with unique IDs so tests don't interfere.
func Seed(t *testing.T, pool *pgxpool.Pool) Fixture {
	t.Helper()
	ctx := context.Background()
	f := Fixture{
		LeagueAdminID: uuid.New(), TeamOwnerID: uuid.New(), LeagueID: uuid.New(),
		TournamentID: uuid.New(), HomeTeamID: uuid.New(), AwayTeamID: uuid.New(),
		HomePlayerID: uuid.New(), MatchID: uuid.New(),
	}
	f.LeagueSlug = "liga-" + f.LeagueID.String()[:8]

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("seed %q: %v", q, err)
		}
	}

	for _, u := range []struct {
		id   uuid.UUID
		role string
	}{{f.LeagueAdminID, "league_admin"}, {f.TeamOwnerID, "team_owner"}} {
		email := u.id.String() + "@test.local"
		// The auth.users trigger creates the public.users row with role 'public'.
		exec(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, u.id, email)
		exec(`UPDATE public.users SET role = $2, name = 'Test' WHERE id = $1`, u.id, u.role)
	}

	exec(`INSERT INTO public.leagues (id, name, slug, description, admin_id) VALUES ($1, 'Liga Test', $2, 'desc', $3)`,
		f.LeagueID, f.LeagueSlug, f.LeagueAdminID)
	exec(`UPDATE public.users SET league_id = $2 WHERE id = $1`, f.TeamOwnerID, f.LeagueID)
	exec(`INSERT INTO public.tournaments (id, name, league_id, start_date, end_date) VALUES ($1, 'Apertura', $2, current_date, current_date + 90)`,
		f.TournamentID, f.LeagueID)
	exec(`INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES
	        ($1, 'Local FC', $3, $4, $5, $6), ($2, 'Visita FC', $7, $4, $5, $6)`,
		f.HomeTeamID, f.AwayTeamID, "local-"+f.HomeTeamID.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID,
		"visita-"+f.AwayTeamID.String()[:8])
	exec(`INSERT INTO public.players (id, name, team_id, position, jersey_number) VALUES ($1, 'Jugador', $2, 'Delantero', 9)`,
		f.HomePlayerID, f.HomeTeamID)
	exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, match_time, round, status, home_score, away_score)
	        VALUES ($1, $2, $3, $4, now(), '18:30', 1, 'scheduled', 2, 1)`,
		f.MatchID, f.TournamentID, f.HomeTeamID, f.AwayTeamID)
	return f
}
