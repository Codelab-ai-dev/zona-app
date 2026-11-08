//go:build integration

package superadmin

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestSuperAdminOperations(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(pool)
	sa := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}

	st, err := svc.Stats(ctx)
	if err != nil || st.Leagues.Total < 2 || st.Teams.Total < 4 || st.Players.Total < 2 || st.LeagueAdmins < 2 {
		t.Fatalf("stats = %+v %v", st, err)
	}

	// Assign the other league's admin to this league.
	if err := svc.SetLeagueAdmin(ctx, sa, f.LeagueID, other.LeagueAdminID); err != nil {
		t.Fatal(err)
	}
	var admin, userLeague uuid.UUID
	_ = pool.QueryRow(ctx, `SELECT admin_id FROM public.leagues WHERE id = $1`, f.LeagueID).Scan(&admin)
	_ = pool.QueryRow(ctx, `SELECT league_id FROM public.users WHERE id = $1`, other.LeagueAdminID).Scan(&userLeague)
	if admin != other.LeagueAdminID || userLeague != f.LeagueID {
		t.Fatalf("admin=%s userLeague=%s", admin, userLeague)
	}
	var e *httpx.Error
	if err := svc.SetLeagueAdmin(ctx, sa, f.LeagueID, f.TeamOwnerID); !errors.As(err, &e) || e.Status != 422 {
		t.Fatalf("team owner as admin: got %v, want 422", err)
	}

	// Deleting a league cascades and is not blocked by assistant conversations.
	if _, err := pool.Exec(ctx, `INSERT INTO public.agent_conversations (channel, user_identifier, user_message, league_id) VALUES ('web', 'u', 'hola', $1)`, f.LeagueID); err != nil {
		t.Fatal(err)
	}
	if err := svc.DeleteLeague(ctx, sa, f.LeagueID); err != nil {
		t.Fatalf("delete league: %v", err)
	}
	var teams, matches int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.teams WHERE league_id = $1`, f.LeagueID).Scan(&teams)
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.matches WHERE id = $1`, f.MatchID).Scan(&matches)
	if teams != 0 || matches != 0 {
		t.Fatalf("teams=%d matches=%d after delete", teams, matches)
	}
	if err := svc.DeleteLeague(ctx, sa, f.LeagueID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("delete again: got %v, want not found", err)
	}
}
