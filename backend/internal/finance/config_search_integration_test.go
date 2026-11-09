//go:build integration

package finance

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Saving the config works (it always answered 500) and creates it when the
// league had none; currency is editable; transactions carry the player and
// can be searched by text.
func TestFinanceConfigAndSearch(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	if _, err := pool.Exec(ctx, `DELETE FROM public.finance_config WHERE league_id = $1`, f.LeagueID); err != nil {
		t.Fatal(err)
	}

	fine := json.Number("75.50")
	usd := Currency("USD")
	cfg, err := svc.SaveConfig(ctx, admin, f.LeagueID, &UpdateConfigRequest{YellowCardFine: &fine, Currency: &usd})
	if err != nil {
		t.Fatalf("save config without existing config: %v", err)
	}
	if cfg.Currency != "USD" || cfg.YellowCardFine.String() != "75.5" && cfg.YellowCardFine.String() != "75.50" {
		t.Fatalf("saved config = currency %s, yellow %s", cfg.Currency, cfg.YellowCardFine)
	}
	days := 15
	if cfg, err = svc.SaveConfig(ctx, admin, f.LeagueID, &UpdateConfigRequest{PaymentDueDays: &days}); err != nil || cfg.PaymentDueDays != 15 {
		t.Fatalf("second save (update): %+v %v", cfg, err)
	}
	bad := Currency("BTC")
	var apiErr *httpx.Error
	if _, err := svc.SaveConfig(ctx, admin, f.LeagueID, &UpdateConfigRequest{Currency: &bad}); !errors.As(err, &apiErr) || apiErr.Status != 422 {
		t.Fatalf("unsupported currency: got %v, want 422", err)
	}

	tx, err := svc.CreateTransaction(ctx, admin, f.LeagueID, &CreateTransactionRequest{
		TeamID: &f.HomeTeamID, PlayerID: &f.HomePlayerID, TransactionType: TransactionTypeYellowCardFine,
		Description: "Multa por amarilla", Amount: "75.50",
	})
	if err != nil {
		t.Fatalf("create transaction: %v", err)
	}
	if tx.PlayerName == nil || *tx.PlayerName != "Jugador" || tx.PlayerNumber == nil || *tx.PlayerNumber != 9 {
		t.Fatalf("player on transaction = %v #%v", tx.PlayerName, tx.PlayerNumber)
	}
	if _, err := svc.CreateTransaction(ctx, admin, f.LeagueID, &CreateTransactionRequest{
		TeamID: &f.AwayTeamID, TransactionType: TransactionTypeTeamRegistration, Description: "Inscripción", Amount: "500",
	}); err != nil {
		t.Fatal(err)
	}

	for q, want := range map[string]int{"amarilla": 1, "jugador": 1, "visita": 1, "nada-coincide": 0, "%": 0} {
		got, err := svc.ListTransactions(ctx, admin, f.LeagueID, &ListTransactionsFilters{Search: q, Limit: 50})
		if err != nil || len(got) != want {
			t.Errorf("search %q: %d results (%v), want %d", q, len(got), err, want)
		}
	}
}
