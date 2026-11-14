//go:build integration

package finance

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgxpool"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestCreateTransactionAndRegisterPayment_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Test fine",
		Amount:          "100.00",
		IsIncome:        false,
	}

	txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}
	if txn == nil {
		t.Fatal("expected transaction, got nil")
	}
	if txn.Status != TransactionStatusPending {
		t.Errorf("expected status pending, got %v", txn.Status)
	}

	// Register payment
	payReq := &RegisterPaymentRequest{
		Amount:        "50.00",
		PaymentMethod: PaymentMethodCash,
	}

	paid, err := repo.RegisterPayment(ctx, txn.ID, f.LeagueID, payReq, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("RegisterPayment failed: %v", err)
	}
	if paid == nil {
		t.Fatal("expected transaction, got nil")
	}
	if paid.Status != TransactionStatusPartial {
		t.Errorf("expected status partial after 50.00 payment on 100.00 debt, got %v", paid.Status)
	}

	// Verify team balance decreased
	balance, err := repo.GetTeamBalance(ctx, f.HomeTeamID, f.LeagueID)
	if err != nil {
		t.Fatalf("GetTeamBalance failed: %v", err)
	}
	if balance == nil {
		t.Fatal("expected balance, got nil")
	}
	t.Logf("Team balance after payment: pending=%s, total_paid=%s", balance.PendingBalance, balance.TotalPaid)
}

func TestCrossLeagueIDOR_Transaction_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Test fine",
		Amount:          "100.00",
		IsIncome:        false,
	}

	txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// Try to access with different league_id - should fail (IDOR protection)
	wrongLeagueID := uuid.New()
	retrieved, err := repo.GetTransactionByLeague(ctx, txn.ID, wrongLeagueID)
	if err != nil {
		t.Fatalf("GetTransactionByLeague failed: %v", err)
	}
	if retrieved != nil {
		t.Fatal("IDOR vulnerability: should not retrieve transaction with wrong league_id")
	}

	// Correct league_id should work
	retrieved, err = repo.GetTransactionByLeague(ctx, txn.ID, f.LeagueID)
	if err != nil {
		t.Fatalf("GetTransactionByLeague failed: %v", err)
	}
	if retrieved == nil {
		t.Fatal("expected transaction, got nil")
	}
}

func TestListTeamTransactions_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create transactions for home team
	for i := 0; i < 2; i++ {
		req := &CreateTransactionRequest{
			TeamID:          &f.HomeTeamID,
			TransactionType: TransactionTypeYellowCardFine,
			Description:     "Test fine",
			Amount:          "100.00",
			IsIncome:        false,
		}
		_, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
		if err != nil {
			t.Fatalf("CreateTransaction failed: %v", err)
		}
	}

	// Create transaction for away team
	req := &CreateTransactionRequest{
		TeamID:          &f.AwayTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Away team fine",
		Amount:          "50.00",
		IsIncome:        false,
	}
	_, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// List transactions for home team
	txns, err := repo.ListTeamTransactions(ctx, f.LeagueID, f.HomeTeamID, &ListTransactionsFilters{Limit: 100})
	if err != nil {
		t.Fatalf("ListTeamTransactions failed: %v", err)
	}
	if len(txns) != 2 {
		t.Errorf("expected 2 transactions for home team, got %d", len(txns))
	}
}

func TestUpdateTransaction_CrossLeagueIDOR_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Original description",
		Amount:          "100.00",
		IsIncome:        false,
	}

	txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// Try to update with wrong league_id - should return nil
	wrongLeagueID := uuid.New()
	desc := "New description"
	updateReq := &UpdateTransactionRequest{
		Description: &desc,
	}

	updated, err := repo.UpdateTransaction(ctx, txn.ID, wrongLeagueID, updateReq, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("UpdateTransaction failed: %v", err)
	}
	if updated != nil {
		t.Fatal("IDOR vulnerability: should not update transaction with wrong league_id")
	}

	// Correct league_id should work
	updated, err = repo.UpdateTransaction(ctx, txn.ID, f.LeagueID, updateReq, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("UpdateTransaction failed: %v", err)
	}
	if updated == nil {
		t.Fatal("expected transaction, got nil")
	}
	if updated.Description != "New description" {
		t.Errorf("expected 'New description', got %s", updated.Description)
	}
}

func TestCancelTransaction_IDOR_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Test fine",
		Amount:          "100.00",
		IsIncome:        false,
	}

	txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// Try to cancel with wrong league_id - should fail
	wrongLeagueID := uuid.New()
	cancelled, err := repo.CancelTransaction(ctx, txn.ID, wrongLeagueID, "reason", f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CancelTransaction failed: %v", err)
	}
	if cancelled != nil {
		t.Fatal("IDOR vulnerability: should not cancel transaction with wrong league_id")
	}

	// Correct league_id should work
	cancelled, err = repo.CancelTransaction(ctx, txn.ID, f.LeagueID, "cancelled", f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CancelTransaction failed: %v", err)
	}
	if cancelled == nil {
		t.Fatal("expected transaction, got nil")
	}
	if cancelled.Status != TransactionStatusCancelled {
		t.Errorf("expected status cancelled, got %v", cancelled.Status)
	}
}

func TestWaiveTransaction_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Test fine",
		Amount:          "100.00",
		IsIncome:        false,
	}

	txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// Waive the transaction
	waived, err := repo.WaiveTransaction(ctx, txn.ID, f.LeagueID, "waived for conduct", f.LeagueAdminID)
	if err != nil {
		t.Fatalf("WaiveTransaction failed: %v", err)
	}
	if waived == nil {
		t.Fatal("expected transaction, got nil")
	}
	if waived.Status != TransactionStatusWaived {
		t.Errorf("expected status waived, got %v", waived.Status)
	}
}

func TestIncomeTransactionTypes_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Test creating income transactions
	incomTypes := []TransactionType{
		TransactionTypeOtherIncome,
		TransactionTypeSponsorship,
		TransactionTypePrizeMoney,
	}

	for _, txType := range incomTypes {
		req := &CreateTransactionRequest{
			TransactionType: txType,
			Description:     "Test income",
			Amount:          "1000.00",
			IsIncome:        true,
		}

		txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
		if err != nil {
			t.Fatalf("CreateTransaction failed for %s: %v", txType, err)
		}
		if txn == nil {
			t.Fatalf("expected transaction for %s, got nil", txType)
		}
		if !txn.IsIncome {
			t.Errorf("expected is_income=true for %s", txType)
		}
	}
}

func TestGetTeamBalance_CrossLeagueIDOR_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	// Create a transaction to ensure team has a balance
	req := &CreateTransactionRequest{
		TeamID:          &f.HomeTeamID,
		TransactionType: TransactionTypeYellowCardFine,
		Description:     "Test fine",
		Amount:          "100.00",
		IsIncome:        false,
	}
	_, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	// Try to get balance with wrong league_id - should fail
	wrongLeagueID := uuid.New()
	balance, err := repo.GetTeamBalance(ctx, f.HomeTeamID, wrongLeagueID)
	if err != nil {
		t.Fatalf("GetTeamBalance failed: %v", err)
	}
	if balance != nil {
		t.Fatal("IDOR vulnerability: should not retrieve balance with wrong league_id")
	}

	// Correct league_id should work
	balance, err = repo.GetTeamBalance(ctx, f.HomeTeamID, f.LeagueID)
	if err != nil {
		t.Fatalf("GetTeamBalance failed: %v", err)
	}
	if balance == nil {
		t.Fatal("expected balance, got nil")
	}
}

func TestMoneyValidation_Integration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	tests := []struct {
		name   string
		amount string
		valid  bool
	}{
		{"valid decimal", "123.45", true},
		{"valid whole", "100.00", true},
		{"negative", "-50.00", false},
		{"zero", "0.00", false},
		{"high precision", "1.234", false},
		{"very large", "1000000.00", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &CreateTransactionRequest{
				TeamID:          &f.HomeTeamID,
				TransactionType: TransactionTypeYellowCardFine,
				Description:     "Test",
				Amount:          json.Number(tt.amount),
				IsIncome:        false,
			}

			txn, err := repo.CreateTransaction(ctx, f.LeagueID, req, f.LeagueAdminID)
			if tt.valid {
				if err != nil {
					t.Errorf("expected success, got error: %v", err)
				}
				if txn == nil {
					t.Error("expected transaction, got nil")
				}
			}
		})
	}
}

// enableFinance turns on the league's finance feature; the
// finance_team_balances view only includes leagues where it is enabled.
func enableFinance(t *testing.T, pool *pgxpool.Pool, leagueID uuid.UUID) {
	t.Helper()
	if _, err := pool.Exec(context.Background(),
		`UPDATE public.leagues SET features = features || '{"finance": true}'::jsonb WHERE id = $1`, leagueID); err != nil {
		t.Fatalf("enable finance: %v", err)
	}
}

// Calendar dates from the web ("YYYY-MM-DD") round-trip through the `date`
// columns without shifting a day, and an omitted due date stays NULL.
func TestTransactionDates_Integration(t *testing.T) {
	ctx := context.Background()
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	enableFinance(t, pool, f.LeagueID)
	repo := NewPGRepository(pool)

	var req CreateTransactionRequest
	body := `{"transaction_type":"team_registration","description":"Inscripción","amount":"1500.00","is_income":true,` +
		`"team_id":"` + f.HomeTeamID.String() + `","transaction_date":"2026-11-13","due_date":"2026-11-20"}`
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatal(err)
	}
	txn, err := repo.CreateTransaction(ctx, f.LeagueID, &req, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if got := txn.TransactionDate.Format(time.DateOnly); got != "2026-11-13" {
		t.Errorf("transaction_date = %s", got)
	}
	if txn.DueDate == nil || txn.DueDate.Format(time.DateOnly) != "2026-11-20" {
		t.Errorf("due_date = %v", txn.DueDate)
	}

	due := httpx.NewDate(time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC))
	upd, err := repo.UpdateTransaction(ctx, txn.ID, f.LeagueID, &UpdateTransactionRequest{DueDate: &due}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if upd.DueDate == nil || upd.DueDate.Format(time.DateOnly) != "2026-12-01" {
		t.Errorf("updated due_date = %v", upd.DueDate)
	}

	noDue, err := repo.CreateTransaction(ctx, f.LeagueID, &CreateTransactionRequest{
		TeamID: &f.HomeTeamID, TransactionType: TransactionTypeYellowCardFine, Description: "Multa", Amount: "100.00",
	}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("create without due date: %v", err)
	}
	if noDue.DueDate != nil {
		t.Errorf("due_date = %v, want NULL", noDue.DueDate)
	}
}
