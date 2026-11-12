//go:build integration

package directory

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestWhatsAppLinkTournamentMustBeOfTheLeague(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool) // another league
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	phone := fmt.Sprintf("+5215%08d", time.Now().UnixNano()%100000000)
	is422 := func(err error) bool {
		var e *httpx.Error
		return errors.As(err, &e) && e.Status == http.StatusUnprocessableEntity
	}

	if _, err := svc.CreateWhatsAppLink(ctx, admin, f.LeagueID, &CreateWhatsAppLinkRequest{
		PhoneNumber: phone, Role: "team_owner", PreferredLanguage: "es", TournamentID: &other.TournamentID}); !is422(err) {
		t.Fatalf("foreign tournament on create: got %v, want 422", err)
	}
	link, err := svc.CreateWhatsAppLink(ctx, admin, f.LeagueID, &CreateWhatsAppLinkRequest{
		PhoneNumber: phone, Role: "team_owner", PreferredLanguage: "es", TournamentID: &f.TournamentID})
	if err != nil || link.TournamentID == nil || *link.TournamentID != f.TournamentID {
		t.Fatalf("create: %+v %v", link, err)
	}
	if _, err := svc.UpdateWhatsAppLink(ctx, admin, link.ID, &UpdateWhatsAppLinkRequest{TournamentID: &other.TournamentID}); !is422(err) {
		t.Fatalf("foreign tournament on update: got %v, want 422", err)
	}
	cleared, err := svc.UpdateWhatsAppLink(ctx, admin, link.ID, &UpdateWhatsAppLinkRequest{TournamentID: &uuid.Nil})
	if err != nil || cleared.TournamentID != nil {
		t.Fatalf("clear tournament: %+v %v", cleared, err)
	}

	// The phone can be edited; a number already linked is a conflict.
	newPhone := fmt.Sprintf("+5216%08d", time.Now().UnixNano()%100000000)
	moved, err := svc.UpdateWhatsAppLink(ctx, admin, link.ID, &UpdateWhatsAppLinkRequest{PhoneNumber: &newPhone})
	if err != nil || moved.PhoneNumber != newPhone {
		t.Fatalf("edit phone: %+v %v", moved.PhoneNumber, err)
	}
	other2 := fmt.Sprintf("+5217%08d", time.Now().UnixNano()%100000000)
	second, err := svc.CreateWhatsAppLink(ctx, admin, f.LeagueID, &CreateWhatsAppLinkRequest{PhoneNumber: other2, Role: "team_owner", PreferredLanguage: "es"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UpdateWhatsAppLink(ctx, admin, second.ID, &UpdateWhatsAppLinkRequest{PhoneNumber: &newPhone}); !errors.Is(err, httpx.ErrConflict) {
		t.Fatalf("phone already linked: got %v, want conflict", err)
	}
	bad := "123"
	if errs := (&UpdateWhatsAppLinkRequest{PhoneNumber: &bad}).Validate(); errs["phone_number"] == "" {
		t.Fatal("invalid phone accepted")
	}
}
