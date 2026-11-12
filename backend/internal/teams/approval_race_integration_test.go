//go:build integration

package teams

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func insertPendingRequest(t *testing.T, ctx context.Context, f testdb.Fixture, exec func(string, ...any), name string, jersey int) uuid.UUID {
	t.Helper()
	id := uuid.New()
	exec(`INSERT INTO public.player_registration_requests (id, team_id, tournament_id, player_name, player_position, jersey_number, reason, status, requested_by)
		VALUES ($1, $2, $3, $4, 'Defensa', $5, 'Alta', 'pending', $6)`, id, f.HomeTeamID, f.TournamentID, name, jersey, f.TeamOwnerID)
	return id
}

func statusOf(err error) int {
	var apiErr *httpx.Error
	if errors.As(err, &apiErr) {
		return apiErr.Status
	}
	if err == nil {
		return http.StatusOK
	}
	return http.StatusInternalServerError
}

// Approving the same request several times at once creates exactly one
// player; the others get 409 (previously each could create a player).
func TestConcurrentApprovalOfSameRequest(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	reqID := insertPendingRequest(t, ctx, f, exec, "Doble Clic", 21)

	codes := make([]int, 5)
	var wg sync.WaitGroup
	for i := range codes {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := svc.ReviewPlayerRegistration(ctx, admin, reqID, "approved", nil)
			codes[i] = statusOf(err)
		}(i)
	}
	wg.Wait()

	ok := 0
	for _, c := range codes {
		switch c {
		case http.StatusOK:
			ok++
		case http.StatusConflict:
		default:
			t.Errorf("unexpected status %d (want 200 or 409): %v", c, codes)
		}
	}
	var players int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.players WHERE team_id = $1 AND name = 'Doble Clic'`, f.HomeTeamID).Scan(&players)
	if ok != 1 || players != 1 {
		t.Fatalf("successes=%d players=%d, want exactly 1 and 1 (codes %v)", ok, players, codes)
	}

	if _, err := svc.ReviewPlayerRegistration(ctx, admin, reqID, "rejected", nil); statusOf(err) != http.StatusConflict {
		t.Fatalf("re-reviewing an approved request: got %v, want 409", err)
	}
	if _, err := svc.ReviewPlayerRegistration(ctx, admin, reqID, "maybe", nil); statusOf(err) != http.StatusUnprocessableEntity {
		t.Fatalf("invalid status: got %v, want 422", err)
	}
}

// Two different requests for a team one spot below its limit, approved at
// the same time: only one fits.
func TestConcurrentApprovalsRespectRosterLimit(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	// The seed team has 1 player; with max_players = 2 there is one spot.
	exec(`UPDATE public.tournaments SET max_players = 2 WHERE id = $1`, f.TournamentID)
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	reqs := []uuid.UUID{
		insertPendingRequest(t, ctx, f, exec, "Uno", 31),
		insertPendingRequest(t, ctx, f, exec, "Dos", 32),
	}

	codes := make([]int, len(reqs))
	var wg sync.WaitGroup
	for i, id := range reqs {
		wg.Add(1)
		go func(i int, id uuid.UUID) {
			defer wg.Done()
			_, err := svc.ReviewPlayerRegistration(ctx, admin, id, "approved", nil)
			codes[i] = statusOf(err)
		}(i, id)
	}
	wg.Wait()

	var active int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM public.players WHERE team_id = $1 AND is_active`, f.HomeTeamID).Scan(&active)
	if active != 2 {
		t.Fatalf("active players = %d, want 2 (limit); codes %v", active, codes)
	}
	if !(codes[0] == http.StatusOK) != (codes[1] == http.StatusOK) {
		t.Fatalf("want exactly one approval, got codes %v", codes)
	}
}
