//go:build integration

package matches

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// A dry run returns the calendar without saving it; a group stage plays a
// round robin per group and never mixes groups.
func TestFixturesPreviewAndGroups(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	team := func(name string) TeamFixtureData {
		id := uuid.New()
		if _, err := pool.Exec(ctx, `INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, $2, $3, $4, $5, $6)`,
			id, name, "t-"+id.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID); err != nil {
			t.Fatal(err)
		}
		return TeamFixtureData{ID: id, Name: name}
	}
	a := []TeamFixtureData{team("A1"), team("A2"), team("A3"), team("A4")}
	b := []TeamFixtureData{team("B1"), team("B2"), team("B3"), team("B4")}
	sched := &FixtureSchedule{StartDate: time.Now().AddDate(0, 0, 7).Format(time.DateOnly), MatchDays: []string{"saturday", "sunday"}, StartTime: "09:00",
		FieldsAvailable: 2, HalfMinutes: 25, HalftimeBreakMinutes: 10, BreakBetweenMatches: 10}
	count := func() int {
		var n int
		_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.matches WHERE tournament_id = $1`, f.TournamentID).Scan(&n)
		return n
	}
	before := count()

	req := GenerateFixturesRequest{TournamentID: f.TournamentID, Schedule: sched, DryRun: true,
		Groups: []FixtureGroup{{Name: "A", Teams: a}, {Name: "B", Teams: b}}}
	preview, err := svc.GenerateFixtures(ctx, admin, req)
	if err != nil {
		t.Fatalf("dry run: %v", err)
	}
	if count() != before {
		t.Fatal("dry run saved matches")
	}
	planned := preview["matches"].([]CreateMatchRequest)
	if preview["rounds"] != 3 || len(planned) != 12 {
		t.Fatalf("rounds=%v matches=%d, want 3 rounds of 4 matches (6 per group)", preview["rounds"], len(planned))
	}
	groupOf := map[uuid.UUID]string{}
	for _, t := range a {
		groupOf[t.ID] = "A"
	}
	for _, t := range b {
		groupOf[t.ID] = "B"
	}
	slots := map[string]bool{}
	for _, m := range planned {
		if groupOf[m.HomeTeamID] != groupOf[m.AwayTeamID] {
			t.Fatalf("cross-group match %v vs %v", m.HomeTeamID, m.AwayTeamID)
		}
		key := fmt.Sprint(m.MatchDate.Format(time.DateOnly), *m.MatchTime, *m.FieldNumber)
		if slots[key] {
			t.Fatalf("two matches in the same slot %s", key)
		}
		slots[key] = true
	}

	req.DryRun = false
	if _, err := svc.GenerateFixtures(ctx, admin, req); err != nil {
		t.Fatalf("generate: %v", err)
	}
	if count() != before+12 {
		t.Fatalf("saved %d matches, want 12", count()-before)
	}
}
