//go:build integration

package teams

import (
	"context"
	"testing"
	"time"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Team owners follow the tournament's rules when adding players or staff
// directly (they could bypass them before); league admins may override.
func TestOwnerRegistrationRules(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatal(err)
		}
	}
	kid := httpx.NewDate(time.Now().AddDate(-10, 0, 0))
	adult := httpx.NewDate(time.Now().AddDate(-25, 0, 0))

	exec(`UPDATE public.tournaments SET registration_open = false WHERE id = $1`, f.TournamentID)
	if _, err := svc.CreatePlayer(ctx, owner, f.HomeTeamID, CreatePlayerRequest{Name: "Cerrado", Position: "Medio", JerseyNumber: 20, BirthDate: &adult}); statusOf(err) != 422 {
		t.Fatalf("owner with closed registration: got %v, want 422", err)
	}
	if _, err := svc.CreatePlayer(ctx, admin, f.HomeTeamID, CreatePlayerRequest{Name: "Por admin", Position: "Medio", JerseyNumber: 21}); err != nil {
		t.Fatalf("league admin with closed registration: %v", err)
	}

	exec(`UPDATE public.tournaments SET registration_open = true, age_validation_enabled = true, min_age = 18 WHERE id = $1`, f.TournamentID)
	if _, err := svc.CreatePlayer(ctx, owner, f.HomeTeamID, CreatePlayerRequest{Name: "Nino", Position: "Medio", JerseyNumber: 22, BirthDate: &kid}); statusOf(err) != 422 {
		t.Fatalf("underage by owner: got %v, want 422", err)
	}
	if _, err := svc.CreatePlayer(ctx, owner, f.HomeTeamID, CreatePlayerRequest{Name: "Sin fecha", Position: "Medio", JerseyNumber: 23}); statusOf(err) != 422 {
		t.Fatalf("no birth date with age rules: got %v, want 422", err)
	}
	if _, err := svc.CreatePlayer(ctx, owner, f.HomeTeamID, CreatePlayerRequest{Name: "Adulto", Position: "Medio", JerseyNumber: 24, BirthDate: &adult}); err != nil {
		t.Fatalf("valid player by owner: %v", err)
	}

	// Staff limit, also when reactivating.
	exec(`UPDATE public.tournaments SET max_coaching_staff = 1 WHERE id = $1`, f.TournamentID)
	first, err := svc.CreateCoachingStaff(ctx, owner, f.HomeTeamID, CreateCoachingStaffRequest{Name: "DT", Role: "head_coach"})
	if err != nil {
		t.Fatalf("first staff: %v", err)
	}
	if _, err := svc.CreateCoachingStaff(ctx, owner, f.HomeTeamID, CreateCoachingStaffRequest{Name: "Auxiliar", Role: "assistant_coach"}); statusOf(err) != 422 {
		t.Fatalf("over staff limit: got %v, want 422", err)
	}
	if _, err := svc.DeactivateCoachingStaff(ctx, owner, first.ID); err != nil {
		t.Fatal(err)
	}
	second, err := svc.CreateCoachingStaff(ctx, owner, f.HomeTeamID, CreateCoachingStaffRequest{Name: "Nuevo DT", Role: "head_coach"})
	if err != nil {
		t.Fatalf("staff after freeing a spot: %v", err)
	}
	on := true
	if _, err := svc.UpdateCoachingStaff(ctx, owner, first.ID, UpdateCoachingStaffRequest{IsActive: &on}); statusOf(err) != 422 {
		t.Fatalf("reactivating over the limit: got %v, want 422", err)
	}
	if _, err := svc.DeactivateCoachingStaff(ctx, owner, second.ID); err != nil {
		t.Fatal(err)
	}
	if s, err := svc.UpdateCoachingStaff(ctx, owner, first.ID, UpdateCoachingStaffRequest{IsActive: &on}); err != nil || !s.IsActive {
		t.Fatalf("reactivate: %+v %v", s, err)
	}
}

func TestTeamPlayerStats(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	if _, err := pool.Exec(ctx, `INSERT INTO public.player_stats (player_id, match_id, goals, yellow_cards, minutes_played) VALUES ($1, $2, 2, 1, 90)`,
		f.HomePlayerID, f.MatchID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO public.player_stats (player_id, tournament_id, goals, is_extemporaneous) VALUES ($1, $2, 3, true)`,
		f.HomePlayerID, f.TournamentID); err != nil {
		t.Fatal(err)
	}
	all, err := svc.ListTeamPlayerStats(ctx, f.HomeTeamID, nil)
	if err != nil || len(all) != 1 {
		t.Fatalf("stats = %+v, %v", all, err)
	}
	if p := all[0]; p.Goals != 5 || p.MatchesPlayed != 1 || p.YellowCards != 1 || p.MinutesPlayed != 90 {
		t.Fatalf("totals = %+v, want 5 goals (2+3 manual), 1 match, 1 yellow, 90'", p)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.leagues SET is_active = false WHERE id = $1`, f.LeagueID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ListTeamPlayerStats(ctx, f.HomeTeamID, nil); statusOf(err) != 404 {
		t.Fatalf("inactive league: got %v, want 404", err)
	}
}
