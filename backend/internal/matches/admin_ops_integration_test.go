//go:build integration

package matches

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func apiStatus(err error) int {
	var e *httpx.Error
	if errors.As(err, &e) {
		return e.Status
	}
	if err == nil {
		return 200
	}
	return 500
}

// Correcting the score of a finished match updates the standings (the stats
// trigger alone ignores it), and deleting a round rebuilds them.
func TestScoreEditAndRoundDeleteKeepStandingsRight(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	points := func() (home, away int) {
		t.Helper()
		_ = pool.QueryRow(ctx, `SELECT COALESCE((SELECT points FROM public.team_stats WHERE team_id = $1 AND tournament_id = $3), -1),
		                               COALESCE((SELECT points FROM public.team_stats WHERE team_id = $2 AND tournament_id = $3), -1)`,
			f.HomeTeamID, f.AwayTeamID, f.TournamentID).Scan(&home, &away)
		return
	}

	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 1, AwayScore: 0,
		Goals: []PostGoalRequest{{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, Minute: 10}}}); err != nil {
		t.Fatal(err)
	}
	if h, a := points(); h != 3 || a != 0 {
		t.Fatalf("after first result: home=%d away=%d, want 3/0", h, a)
	}
	// The score was wrong: it was a draw.
	if err := svc.PostResult(ctx, admin, f.MatchID, PostMatchResultRequest{HomeScore: 0, AwayScore: 0}); err != nil {
		t.Fatal(err)
	}
	if h, a := points(); h != 1 || a != 1 {
		t.Fatalf("after corrected score: home=%d away=%d, want 1/1", h, a)
	}

	round := 1
	n, err := svc.DeleteTournamentMatches(ctx, admin, f.TournamentID, &round, nil)
	if err != nil || n != 1 {
		t.Fatalf("delete round: %d, %v", n, err)
	}
	if h, a := points(); h != 0 || a != 0 {
		t.Fatalf("after deleting the round: home=%d away=%d, want 0/0", h, a)
	}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	if _, err := svc.DeleteTournamentMatches(ctx, owner, f.TournamentID, nil, nil); apiStatus(err) != http.StatusForbidden {
		t.Fatalf("team owner bulk delete: got %v, want 403", err)
	}
}

// Playoffs can be seeded explicitly; foreign teams are rejected.
func TestPlayoffsWithExplicitSeeding(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	ids := []uuid.UUID{f.HomeTeamID, f.AwayTeamID}
	for i := range 2 {
		id := uuid.New()
		if _, err := pool.Exec(ctx, `INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, $2, $3, $4, $5, $6)`,
			id, "Extra "+id.String()[:4], "extra-"+id.String()[:8], f.LeagueID, f.TournamentID, f.TeamOwnerID); err != nil {
			t.Fatal(err)
		}
		_ = i
		ids = append(ids, id)
	}
	req := GeneratePlayoffsRequest{TournamentID: f.TournamentID, NumTeams: 4, StartDate: httpx.NewDate(time.Now()),
		StartTime: "18:00", FieldNumber: 1, TeamIDs: ids}
	created, err := svc.GeneratePlayoffs(ctx, admin, req)
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	semis := 0
	for _, m := range created {
		if m.PlayoffRound != nil && string(*m.PlayoffRound) == "semifinals" {
			semis++
			// Seed 1 plays seed 4.
			if m.HomeTeamID == ids[0] && m.AwayTeamID != ids[3] {
				t.Errorf("seed 1 plays %s, want seed 4", m.AwayTeamID)
			}
		}
	}
	if semis != 2 {
		t.Fatalf("semifinals = %d, want 2 (%d matches)", semis, len(created))
	}

	req.TeamIDs = []uuid.UUID{ids[0], ids[1], ids[2], uuid.New()}
	if _, err := svc.GeneratePlayoffs(ctx, admin, req); apiStatus(err) != http.StatusUnprocessableEntity {
		t.Fatalf("foreign team: got %v, want 422", err)
	}
}

// Teams of a scheduled match can change; of a finished one, not.
func TestChangeMatchTeams(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}

	m, err := svc.UpdateSchedule(ctx, admin, f.MatchID, UpdateMatchScheduleRequest{HomeTeamID: &f.AwayTeamID, AwayTeamID: &f.HomeTeamID})
	if err != nil || m.HomeTeamID != f.AwayTeamID {
		t.Fatalf("swap teams: %+v %v", m.HomeTeamID, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.matches SET status = 'finished' WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UpdateSchedule(ctx, admin, f.MatchID, UpdateMatchScheduleRequest{HomeTeamID: &f.HomeTeamID, AwayTeamID: &f.AwayTeamID}); apiStatus(err) != http.StatusUnprocessableEntity {
		t.Fatalf("finished match: got %v, want 422", err)
	}
}
