//go:build integration

package leaguedata

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

func TestLeagueData(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, LeagueID: &f.LeagueID, IsActive: true}
	stranger := auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, LeagueID: &other.LeagueID, IsActive: true}

	// Finished but unpublished match with stats for the home player.
	if _, err := pool.Exec(ctx, `UPDATE public.matches SET status = 'finished' WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO public.player_stats (player_id, match_id, tournament_id, goals, assists, yellow_cards, minutes_played)
	        VALUES ($1, $2, $3, 2, 1, 1, 90)`, f.HomePlayerID, f.MatchID, f.TournamentID); err != nil {
		t.Fatal(err)
	}

	st, err := svc.Stats(ctx, &admin, f.LeagueID)
	if err != nil || st.Teams != 2 || st.Players != 1 || st.FinishedMatches != 1 || st.Goals != 3 || st.YellowCards != 1 {
		t.Fatalf("admin stats = %+v %v", st, err)
	}
	if st.TopScorer == nil || st.TopScorer.PlayerID != f.HomePlayerID || st.TopScorer.Goals != 2 || len(st.MatchesPerMonth) != 1 {
		t.Fatalf("top scorer / months = %+v %+v", st.TopScorer, st.MatchesPerMonth)
	}
	// The public does not see unpublished matches.
	pub, err := svc.Stats(ctx, nil, f.LeagueID)
	if err != nil || pub.Matches != 0 || pub.Goals != 0 {
		t.Fatalf("public stats = %+v %v", pub, err)
	}
	hist, err := svc.PlayerMatches(ctx, nil, f.HomePlayerID, httpx.Page{Limit: 10})
	if err != nil || len(hist) != 0 {
		t.Fatalf("public history before publish = %+v %v", hist, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.matches SET is_published = true WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}
	hist, err = svc.PlayerMatches(ctx, nil, f.HomePlayerID, httpx.Page{Limit: 10})
	if err != nil || len(hist) != 1 || !hist[0].IsHome || hist[0].Goals != 2 || hist[0].AwayTeamName != "Visita FC" || hist[0].MatchTime == nil || *hist[0].MatchTime != "18:30" {
		t.Fatalf("history = %+v %v", hist, err)
	}

	scorers, err := svc.Totals(ctx, nil, f.LeagueID, "goals", 5)
	if err != nil || len(scorers) != 1 || scorers[0].Goals != 2 {
		t.Fatalf("scorers = %+v %v", scorers, err)
	}
	disc, err := svc.Totals(ctx, nil, f.LeagueID, "discipline", 5)
	if err != nil || len(disc) != 1 || disc[0].YellowCards != 1 {
		t.Fatalf("discipline = %+v %v", disc, err)
	}

	// Player list: admins of the league only.
	list, total, err := svc.Players(ctx, admin, f.LeagueID, "jug", nil, false, httpx.Page{Limit: 10})
	if err != nil || total != 1 || len(list) != 1 || list[0].TeamName != "Local FC" {
		t.Fatalf("players = %+v %d %v", list, total, err)
	}
	if _, _, err := svc.Players(ctx, stranger, f.LeagueID, "", nil, false, httpx.Page{Limit: 10}); !errors.Is(err, httpx.ErrForbidden) && !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("stranger players: got %v, want forbidden", err)
	}

	// Inactive and unknown leagues are hidden from the public.
	if _, err := pool.Exec(ctx, `UPDATE public.leagues SET is_active = false WHERE id = $1`, f.LeagueID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Stats(ctx, nil, f.LeagueID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("inactive league: got %v", err)
	}
	if _, err := svc.Stats(ctx, &admin, f.LeagueID); err != nil {
		t.Fatalf("admin on inactive league: %v", err)
	}
	if _, err := svc.Stats(ctx, nil, uuid.New()); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("unknown league: got %v", err)
	}
}
