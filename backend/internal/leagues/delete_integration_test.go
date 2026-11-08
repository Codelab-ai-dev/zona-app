//go:build integration

package leagues

import (
	"context"
	"errors"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Deleting a tournament cascades to its matches and stats, unlinks its teams
// and is not blocked by assistant conversations that mention it.
func TestDeleteTournament_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}

	if _, err := pool.Exec(ctx, `UPDATE public.matches SET status = 'finished' WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO public.agent_conversations (channel, user_identifier, user_message, league_id, tournament_id)
		VALUES ('web', 'u', '¿tabla?', $1, $2)`, f.LeagueID, f.TournamentID); err != nil {
		t.Fatal(err)
	}

	if err := svc.DeleteTournament(ctx, owner, f.TournamentID); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("team owner: got %v, want forbidden", err)
	}
	if err := svc.DeleteTournament(ctx, admin, f.TournamentID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	var matches, stats, teams, linked int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.matches WHERE id = $1`, f.MatchID).Scan(&matches)
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.team_stats WHERE tournament_id = $1`, f.TournamentID).Scan(&stats)
	_ = pool.QueryRow(ctx, `SELECT count(*), count(tournament_id) FROM public.teams WHERE league_id = $1`, f.LeagueID).Scan(&teams, &linked)
	if matches != 0 || stats != 0 {
		t.Errorf("matches=%d stats=%d left after delete", matches, stats)
	}
	if teams != 2 || linked != 0 {
		t.Errorf("teams=%d linked=%d, want 2 teams kept and unlinked", teams, linked)
	}
	if err := svc.DeleteTournament(ctx, admin, f.TournamentID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("deleting again: got %v, want not found", err)
	}
}
