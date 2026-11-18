//go:build integration

package matches

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

// The owners of the two teams of a match may read its referee report; owners
// of other teams may not, and only the league admin writes it (#65).
func TestRefereeReportAccess(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	b := testdb.Seed(t, pool) // another league
	c := testdb.Seed(t, pool) // supplies a third owner
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool), pool)
	as := func(id uuid.UUID, role auth.Role) auth.Principal {
		return auth.Principal{UserID: id, Role: role, IsActive: true}
	}

	// Each team of the match has its own owner; a third team of the same
	// league belongs to someone else.
	awayOwner := b.TeamOwnerID
	exec(`UPDATE public.teams SET owner_id = $2 WHERE id = $1`, f.AwayTeamID, awayOwner)
	thirdOwner := c.TeamOwnerID
	exec(`INSERT INTO public.teams (name, slug, league_id, tournament_id, owner_id) VALUES ('Tercero FC', $1, $2, $3, $4)`,
		"tercero-"+uuid.NewString()[:8], f.LeagueID, f.TournamentID, thirdOwner)

	referee := "Árbitro Central"
	if _, err := svc.CreateRefereeReport(ctx, as(f.LeagueAdminID, auth.RoleLeagueAdmin), f.MatchID, PostRefereeReportRequest{RefereeName: &referee}); err != nil {
		t.Fatalf("admin files the report: %v", err)
	}

	for _, c := range []struct {
		name   string
		caller auth.Principal
		match  uuid.UUID
		want   int
	}{
		{"league admin", as(f.LeagueAdminID, auth.RoleLeagueAdmin), f.MatchID, 200},
		{"home team owner", as(f.TeamOwnerID, auth.RoleTeamOwner), f.MatchID, 200},
		{"away team owner", as(awayOwner, auth.RoleTeamOwner), f.MatchID, 200},
		{"super admin", as(uuid.New(), auth.RoleSuperAdmin), f.MatchID, 200},
		{"owner of another team, same league", as(thirdOwner, auth.RoleTeamOwner), f.MatchID, 403},
		{"admin of another league", as(b.LeagueAdminID, auth.RoleLeagueAdmin), f.MatchID, 403},
		{"public user", as(uuid.New(), auth.RolePublic), f.MatchID, 403},
		{"unknown match", as(f.TeamOwnerID, auth.RoleTeamOwner), uuid.New(), 404},
	} {
		t.Run(c.name, func(t *testing.T) {
			got, err := svc.GetRefereeReport(ctx, c.caller, c.match)
			if reportStatus(err) != c.want {
				t.Fatalf("%v, want %d", err, c.want)
			}
			if c.want == 200 && (got.RefereeName == nil || *got.RefereeName != referee) {
				t.Fatalf("report = %+v", got)
			}
		})
	}

	t.Run("team owners cannot write it", func(t *testing.T) {
		forged := "Otro árbitro"
		if _, err := svc.CreateRefereeReport(ctx, as(f.TeamOwnerID, auth.RoleTeamOwner), f.MatchID, PostRefereeReportRequest{RefereeName: &forged}); reportStatus(err) != 403 {
			t.Fatalf("%v, want 403", err)
		}
	})
}

func reportStatus(err error) int {
	var he *httpx.Error
	if errors.As(err, &he) {
		return he.Status
	}
	if err == nil {
		return http.StatusOK
	}
	return http.StatusInternalServerError
}
