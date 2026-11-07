package leagues

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func TestInactiveLeagueVisibility(t *testing.T) {
	adminID := uuid.New()
	leagueID := uuid.New()
	tournamentID := uuid.New()
	repo := &fakeRepository{
		leagues:     map[uuid.UUID]League{leagueID: {ID: leagueID, AdminID: adminID, IsActive: false}},
		tournaments: map[uuid.UUID]Tournament{tournamentID: {ID: tournamentID, LeagueID: leagueID}},
	}
	svc := NewService(repo, &fakeChecker{})
	ctx := context.Background()

	tests := []struct {
		name    string
		caller  auth.Principal
		visible bool
	}{
		{"anonymous", auth.Principal{}, false},
		{"other league admin", auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, false},
		{"own admin", auth.Principal{UserID: adminID, Role: auth.RoleLeagueAdmin}, true},
		{"super admin", auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, errLeague := svc.GetLeagueByID(ctx, tt.caller, leagueID)
			_, errTournament := svc.GetTournamentByID(ctx, tt.caller, tournamentID)
			for name, err := range map[string]error{"league": errLeague, "tournament": errTournament} {
				if tt.visible && err != nil {
					t.Errorf("%s: unexpected error %v", name, err)
				}
				if !tt.visible && !errors.Is(err, httpx.ErrNotFound) {
					t.Errorf("%s: err = %v, want not found", name, err)
				}
			}
		})
	}
}
