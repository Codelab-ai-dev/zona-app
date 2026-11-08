//go:build integration

package teams

import (
	"context"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestLeagueVerificationView(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), pool, authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	if _, err := pool.Exec(ctx, `
		INSERT INTO public.players (name, team_id, position, jersey_number, id_document_url) VALUES
			('Con Documento', $1, 'Medio', 10, 'player_document/x'),
			('Verificado', $2, 'Portero', 1, 'player_document/y')`, f.HomeTeamID, f.AwayTeamID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.players SET id_verified = true WHERE name = 'Verificado' AND team_id = $1`, f.AwayTeamID); err != nil {
		t.Fatal(err)
	}

	sum, err := svc.LeagueVerificationSummary(ctx, admin, f.LeagueID)
	if err != nil {
		t.Fatal(err)
	}
	if sum != (VerificationSummary{Total: 3, Pending: 1, Verified: 1, NoDocument: 1}) {
		t.Fatalf("summary = %+v", sum)
	}
	page := httpx.Page{Limit: 50}
	pending, total, err := svc.ListLeagueVerification(ctx, admin, f.LeagueID, VerificationPending, nil, "", page)
	if err != nil || total != 1 || pending[0].Name != "Con Documento" || pending[0].TeamName == "" {
		t.Fatalf("pending = %+v total=%d %v", pending, total, err)
	}
	found, _, err := svc.ListLeagueVerification(ctx, admin, f.LeagueID, "", &f.AwayTeamID, "verif", page)
	if err != nil || len(found) != 1 || found[0].Status != VerificationVerified {
		t.Fatalf("team+search = %+v %v", found, err)
	}
	owner := auth.Principal{UserID: f.TeamOwnerID, Role: auth.RoleTeamOwner, IsActive: true}
	if _, err := svc.LeagueVerificationSummary(ctx, owner, f.LeagueID); err == nil {
		t.Fatal("team owner read the league verification")
	}
}
