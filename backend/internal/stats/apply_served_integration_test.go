//go:build integration

package stats

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Applying a suspension by hand counts the match once, completes it when
// served, and never counts the match that caused it (#81).
func TestApplySuspensionCountsServedMatches(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}

	origin, next := f.MatchID, uuid.New()
	exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status)
		VALUES ($1, $2, $3, $4, now() + interval '7 days', 2, 'scheduled')`, next, f.TournamentID, f.HomeTeamID, f.AwayTeamID)
	sus := uuid.New()
	exec(`INSERT INTO public.player_suspensions (id, player_id, team_id, league_id, tournament_id, suspension_type, reason, matches_to_serve, match_id)
		VALUES ($1, $2, $3, $4, $5, 'red_card', 'Roja', 1, $6)`, sus, f.HomePlayerID, f.HomeTeamID, f.LeagueID, f.TournamentID, origin)

	var he *httpx.Error
	if err := svc.ApplySuspensionToMatch(ctx, admin, sus, origin); !errors.As(err, &he) || he.Status != 422 {
		t.Fatalf("origin match: %v, want 422", err)
	}

	if err := svc.ApplySuspensionToMatch(ctx, admin, sus, next); err != nil {
		t.Fatalf("apply: %v", err)
	}
	got, err := svc.repo.GetSuspensionByID(ctx, sus)
	if err != nil {
		t.Fatal(err)
	}
	if got.MatchesServed != 1 || got.Status != "completed" || got.EndDate == nil {
		t.Fatalf("after applying: served %d, status %s, end %v", got.MatchesServed, got.Status, got.EndDate)
	}

	// Applying again (e.g. a retry) neither duplicates nor overcounts; the
	// suspension is no longer active, so the service refuses it.
	if err := svc.ApplySuspensionToMatch(ctx, admin, sus, next); err == nil {
		t.Fatal("applying a completed suspension succeeded")
	}
	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.suspension_match_applications WHERE suspension_id = $1`, sus).Scan(&n); err != nil || n != 1 {
		t.Fatalf("applications = %d (%v), want 1", n, err)
	}
}
