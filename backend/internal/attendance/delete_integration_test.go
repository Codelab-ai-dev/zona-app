//go:build integration

package attendance

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func httpStatus(err error) int {
	var he *httpx.Error
	if errors.As(err, &he) {
		return he.Status
	}
	if err == nil {
		return http.StatusOK
	}
	return http.StatusInternalServerError
}

// A league admin removes a wrong attendance from a match that is not
// finished; the "played" stat goes with it and the change is audited (#53).
func TestDeleteAttendance(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	checker := authz.NewPGChecker(pool)
	svc := NewService(NewPGRepository(pool), checker)
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	reason := DeleteAttendanceRequest{Reason: "Escaneó la credencial de su hermano"}

	exec(`INSERT INTO public.asistencias_qr (player_id, match_id) VALUES ($1, $2)`, f.HomePlayerID, f.MatchID)
	count := func(q string) int {
		t.Helper()
		var n int
		if err := pool.QueryRow(ctx, q, f.MatchID, f.HomePlayerID).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if count(`SELECT count(*) FROM public.player_stats WHERE match_id = $1 AND player_id = $2`) != 1 {
		t.Fatal("the QR trigger did not record the played match; the test proves nothing")
	}

	t.Run("denied", func(t *testing.T) {
		for name, c := range map[string]struct {
			caller auth.Principal
			match  uuid.UUID
			req    DeleteAttendanceRequest
			want   int
		}{
			"admin of another league": {auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}, f.MatchID, reason, 403},
			"team owner":              {auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}, f.MatchID, reason, 403},
			"unknown match":           {admin, uuid.New(), reason, 404},
			"reason too short":        {admin, f.MatchID, DeleteAttendanceRequest{Reason: "no"}, 422},
		} {
			if _, err := svc.DeleteAttendance(ctx, c.caller, c.match, f.HomePlayerID, c.req); httpStatus(err) != c.want {
				t.Errorf("%s: %v, want %d", name, err, c.want)
			}
		}
		if count(`SELECT count(*) FROM public.asistencias_qr WHERE match_id = $1 AND player_id = $2`) != 1 {
			t.Fatal("a denied call deleted the attendance")
		}
	})

	t.Run("deletes, drops the played stat and audits", func(t *testing.T) {
		res, err := svc.DeleteAttendance(ctx, admin, f.MatchID, f.HomePlayerID, reason)
		if err != nil || res.QRRemoved != 1 {
			t.Fatalf("delete: %+v %v", res, err)
		}
		if n := count(`SELECT count(*) FROM public.asistencias_qr WHERE match_id = $1 AND player_id = $2`); n != 0 {
			t.Fatalf("%d attendance rows left", n)
		}
		if n := count(`SELECT count(*) FROM public.player_stats WHERE match_id = $1 AND player_id = $2`); n != 0 {
			t.Fatalf("played stat left (%d)", n)
		}
		var action, why string
		var actor uuid.UUID
		if err := pool.QueryRow(ctx, `SELECT action, reason, actor_id FROM public.match_audit_log
			WHERE match_id = $1 AND details->>'player_id' = $2::text`, f.MatchID, f.HomePlayerID).Scan(&action, &why, &actor); err != nil {
			t.Fatalf("audit: %v", err)
		}
		if action != "delete_attendance" || why != reason.Reason || actor != f.LeagueAdminID {
			t.Fatalf("audit = %s %q %s", action, why, actor)
		}
	})

	t.Run("nothing left to delete", func(t *testing.T) {
		if _, err := svc.DeleteAttendance(ctx, admin, f.MatchID, f.HomePlayerID, reason); httpStatus(err) != 404 {
			t.Fatalf("%v, want 404", err)
		}
	})

	t.Run("finished match is refused", func(t *testing.T) {
		exec(`INSERT INTO public.asistencias_qr (player_id, match_id) VALUES ($1, $2)`, f.HomePlayerID, f.MatchID)
		exec(`UPDATE public.matches SET status = 'finished' WHERE id = $1`, f.MatchID)
		if _, err := svc.DeleteAttendance(ctx, admin, f.MatchID, f.HomePlayerID, reason); httpStatus(err) != 409 {
			t.Fatalf("%v, want 409", err)
		}
		if count(`SELECT count(*) FROM public.asistencias_qr WHERE match_id = $1 AND player_id = $2`) != 1 {
			t.Fatal("attendance of a finished match was deleted")
		}
	})
}
