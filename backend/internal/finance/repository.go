package finance

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository creates a database-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// GetConfigByLeague fetches the default (league-wide) finance config.
func (r *PGRepository) GetConfigByLeague(ctx context.Context, leagueID uuid.UUID) (*Config, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			id, league_id, tournament_id, name,
			team_registration_fee, player_registration_fee, late_registration_surcharge,
			yellow_card_fine, red_card_fine, double_yellow_fine,
			absence_fine, late_arrival_fine, misconduct_fine, uniform_violation_fine,
			referee_fee_per_match, assistant_referee_fee, field_rental_per_match,
			currency, payment_due_days, auto_generate_fines, auto_generate_referee_fees,
			notify_on_new_charge, notify_on_overdue, overdue_grace_days,
			payment_instructions, bank_account_info, is_active,
			created_by, updated_by, created_at, updated_at
		FROM public.finance_config
		WHERE league_id = $1 AND tournament_id IS NULL AND is_active = true
		LIMIT 1
	`, leagueID)
	return scanConfig(row)
}

// GetConfigByLeagueAndTournament fetches config for a tournament, with league fallback.
func (r *PGRepository) GetConfigByLeagueAndTournament(ctx context.Context, leagueID uuid.UUID, tournamentID *uuid.UUID) (*Config, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			id, league_id, tournament_id, name,
			team_registration_fee, player_registration_fee, late_registration_surcharge,
			yellow_card_fine, red_card_fine, double_yellow_fine,
			absence_fine, late_arrival_fine, misconduct_fine, uniform_violation_fine,
			referee_fee_per_match, assistant_referee_fee, field_rental_per_match,
			currency, payment_due_days, auto_generate_fines, auto_generate_referee_fees,
			notify_on_new_charge, notify_on_overdue, overdue_grace_days,
			payment_instructions, bank_account_info, is_active,
			created_by, updated_by, created_at, updated_at
		FROM public.finance_config
		WHERE league_id = $1 AND is_active = true
		  AND (tournament_id = $2 OR tournament_id IS NULL)
		ORDER BY tournament_id DESC NULLS LAST
		LIMIT 1
	`, leagueID, tournamentID)
	return scanConfig(row)
}

// UpdateConfig updates finance configuration.
func (r *PGRepository) UpdateConfig(ctx context.Context, configID uuid.UUID, updates *UpdateConfigRequest, updatedBy uuid.UUID) (*Config, error) {
	cols := []string{}
	args := []any{configID}
	argIndex := 2

	if updates.TeamRegistrationFee != nil {
		cols = append(cols, fmt.Sprintf("team_registration_fee = $%d", argIndex))
		args = append(args, updates.TeamRegistrationFee)
		argIndex++
	}
	if updates.PlayerRegistrationFee != nil {
		cols = append(cols, fmt.Sprintf("player_registration_fee = $%d", argIndex))
		args = append(args, updates.PlayerRegistrationFee)
		argIndex++
	}
	if updates.LateRegistrationSurcharge != nil {
		cols = append(cols, fmt.Sprintf("late_registration_surcharge = $%d", argIndex))
		args = append(args, updates.LateRegistrationSurcharge)
		argIndex++
	}
	if updates.YellowCardFine != nil {
		cols = append(cols, fmt.Sprintf("yellow_card_fine = $%d", argIndex))
		args = append(args, updates.YellowCardFine)
		argIndex++
	}
	if updates.RedCardFine != nil {
		cols = append(cols, fmt.Sprintf("red_card_fine = $%d", argIndex))
		args = append(args, updates.RedCardFine)
		argIndex++
	}
	if updates.DoubleYellowFine != nil {
		cols = append(cols, fmt.Sprintf("double_yellow_fine = $%d", argIndex))
		args = append(args, updates.DoubleYellowFine)
		argIndex++
	}
	if updates.AbsenceFine != nil {
		cols = append(cols, fmt.Sprintf("absence_fine = $%d", argIndex))
		args = append(args, updates.AbsenceFine)
		argIndex++
	}
	if updates.LateArrivalFine != nil {
		cols = append(cols, fmt.Sprintf("late_arrival_fine = $%d", argIndex))
		args = append(args, updates.LateArrivalFine)
		argIndex++
	}
	if updates.MisconductFine != nil {
		cols = append(cols, fmt.Sprintf("misconduct_fine = $%d", argIndex))
		args = append(args, updates.MisconductFine)
		argIndex++
	}
	if updates.UniformViolationFine != nil {
		cols = append(cols, fmt.Sprintf("uniform_violation_fine = $%d", argIndex))
		args = append(args, updates.UniformViolationFine)
		argIndex++
	}
	if updates.RefereeFeePerMatch != nil {
		cols = append(cols, fmt.Sprintf("referee_fee_per_match = $%d", argIndex))
		args = append(args, updates.RefereeFeePerMatch)
		argIndex++
	}
	if updates.AssistantRefereeFee != nil {
		cols = append(cols, fmt.Sprintf("assistant_referee_fee = $%d", argIndex))
		args = append(args, updates.AssistantRefereeFee)
		argIndex++
	}
	if updates.FieldRentalPerMatch != nil {
		cols = append(cols, fmt.Sprintf("field_rental_per_match = $%d", argIndex))
		args = append(args, updates.FieldRentalPerMatch)
		argIndex++
	}
	if updates.PaymentDueDays != nil {
		cols = append(cols, fmt.Sprintf("payment_due_days = $%d", argIndex))
		args = append(args, *updates.PaymentDueDays)
		argIndex++
	}
	if updates.AutoGenerateFines != nil {
		cols = append(cols, fmt.Sprintf("auto_generate_fines = $%d", argIndex))
		args = append(args, *updates.AutoGenerateFines)
		argIndex++
	}
	if updates.AutoGenerateRefereeFees != nil {
		cols = append(cols, fmt.Sprintf("auto_generate_referee_fees = $%d", argIndex))
		args = append(args, *updates.AutoGenerateRefereeFees)
		argIndex++
	}
	if updates.NotifyOnNewCharge != nil {
		cols = append(cols, fmt.Sprintf("notify_on_new_charge = $%d", argIndex))
		args = append(args, *updates.NotifyOnNewCharge)
		argIndex++
	}
	if updates.NotifyOnOverdue != nil {
		cols = append(cols, fmt.Sprintf("notify_on_overdue = $%d", argIndex))
		args = append(args, *updates.NotifyOnOverdue)
		argIndex++
	}
	if updates.OverdueGraceDays != nil {
		cols = append(cols, fmt.Sprintf("overdue_grace_days = $%d", argIndex))
		args = append(args, *updates.OverdueGraceDays)
		argIndex++
	}
	if updates.Currency != nil {
		cols = append(cols, fmt.Sprintf("currency = $%d", argIndex))
		args = append(args, string(*updates.Currency))
		argIndex++
	}
	if updates.PaymentInstructions != nil {
		cols = append(cols, fmt.Sprintf("payment_instructions = $%d", argIndex))
		args = append(args, *updates.PaymentInstructions)
		argIndex++
	}
	if updates.BankAccountInfo != nil {
		cols = append(cols, fmt.Sprintf("bank_account_info = $%d", argIndex))
		args = append(args, *updates.BankAccountInfo)
		argIndex++
	}

	cols = append(cols, fmt.Sprintf("updated_by = $%d", argIndex))
	args = append(args, updatedBy)
	argIndex++
	cols = append(cols, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())

	query := `
		UPDATE public.finance_config
		SET ` + joinCols(cols) + `
		WHERE id = $1
		RETURNING
			id, league_id, tournament_id, name,
			team_registration_fee, player_registration_fee, late_registration_surcharge,
			yellow_card_fine, red_card_fine, double_yellow_fine,
			absence_fine, late_arrival_fine, misconduct_fine, uniform_violation_fine,
			referee_fee_per_match, assistant_referee_fee, field_rental_per_match,
			currency, payment_due_days, auto_generate_fines, auto_generate_referee_fees,
			notify_on_new_charge, notify_on_overdue, overdue_grace_days,
			payment_instructions, bank_account_info, is_active,
			created_by, updated_by, created_at, updated_at
	`

	row := r.db.QueryRow(ctx, query, args...)
	cfg, err := scanConfig(row)
	if err != nil {
		return nil, fmt.Errorf("update config: %w", err)
	}
	return cfg, nil
}

// GetTransaction fetches a single transaction by ID.
func (r *PGRepository) GetTransaction(ctx context.Context, transactionID uuid.UUID) (*Transaction, error) {
	row := r.db.QueryRow(ctx, `SELECT `+transactionCols+` FROM public.finance_transactions WHERE id = $1`, transactionID)
	return scanTransaction(row)
}

// GetTransactionByLeague fetches a transaction and verifies it belongs to the league (IDOR check).
func (r *PGRepository) GetTransactionByLeague(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID) (*Transaction, error) {
	row := r.db.QueryRow(ctx, `SELECT `+transactionCols+` FROM public.finance_transactions WHERE id = $1 AND league_id = $2`, transactionID, leagueID)
	return scanTransaction(row)
}

// ListTransactions fetches transactions for a league with optional filters.
func (r *PGRepository) ListTransactions(ctx context.Context, leagueID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error) {
	if filters == nil {
		filters = &ListTransactionsFilters{Limit: 100}
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 100
	}

	query := `SELECT ` + transactionCols + ` FROM public.finance_transactions WHERE league_id = $1`
	args := []any{leagueID}
	argIndex := 2

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, string(*filters.Status))
		argIndex++
	}
	if filters.TransactionType != nil {
		query += fmt.Sprintf(" AND transaction_type = $%d", argIndex)
		args = append(args, string(*filters.TransactionType))
		argIndex++
	}
	if filters.TeamID != nil {
		query += fmt.Sprintf(" AND team_id = $%d", argIndex)
		args = append(args, *filters.TeamID)
		argIndex++
	}
	if filters.DateFrom != nil {
		query += fmt.Sprintf(" AND transaction_date >= $%d", argIndex)
		args = append(args, filters.DateFrom)
		argIndex++
	}
	if filters.DateTo != nil {
		query += fmt.Sprintf(" AND transaction_date <= $%d", argIndex)
		args = append(args, filters.DateTo)
		argIndex++
	}
	if filters.Search != "" {
		query += fmt.Sprintf(` AND (description ILIKE $%[1]d OR notes ILIKE $%[1]d
			OR EXISTS (SELECT 1 FROM public.teams tm WHERE tm.id = finance_transactions.team_id AND tm.name ILIKE $%[1]d)
			OR EXISTS (SELECT 1 FROM public.players pl WHERE pl.id = finance_transactions.player_id AND pl.name ILIKE $%[1]d))`, argIndex)
		args = append(args, "%"+strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(filters.Search)+"%")
		argIndex++
	}
	if filters.IsIncome != nil {
		query += fmt.Sprintf(" AND is_income = $%d", argIndex)
		args = append(args, *filters.IsIncome)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, filters.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.(interface{ Close() }).Close()

	var transactions []Transaction
	for rows.(interface{ Next() bool }).Next() {
		txn, err := scanTransactionRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, *txn)
	}
	if err := rows.(interface{ Err() error }).Err(); err != nil {
		return nil, fmt.Errorf("iterate transactions: %w", err)
	}

	return transactions, nil
}

// ListTeamTransactions fetches transactions for a specific team in a league.
func (r *PGRepository) ListTeamTransactions(ctx context.Context, leagueID uuid.UUID, teamID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error) {
	if filters == nil {
		filters = &ListTransactionsFilters{Limit: 100}
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 100
	}

	query := `SELECT ` + transactionCols + ` FROM public.finance_transactions WHERE league_id = $1 AND team_id = $2`
	args := []any{leagueID, teamID}
	argIndex := 3

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, string(*filters.Status))
		argIndex++
	}
	if filters.TransactionType != nil {
		query += fmt.Sprintf(" AND transaction_type = $%d", argIndex)
		args = append(args, string(*filters.TransactionType))
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, filters.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query team transactions: %w", err)
	}
	defer rows.(interface{ Close() }).Close()

	var transactions []Transaction
	for rows.(interface{ Next() bool }).Next() {
		txn, err := scanTransactionRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, *txn)
	}
	if err := rows.(interface{ Err() error }).Err(); err != nil {
		return nil, fmt.Errorf("iterate transactions: %w", err)
	}

	return transactions, nil
}

// CreateTransaction creates a new transaction.
func (r *PGRepository) CreateTransaction(ctx context.Context, leagueID uuid.UUID, req *CreateTransactionRequest, createdBy uuid.UUID) (*Transaction, error) {
	transactionDate := time.Now()
	if req.TransactionDate != nil {
		transactionDate = *req.TransactionDate
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO public.finance_transactions (
			league_id, tournament_id, team_id, player_id, match_id,
			transaction_type, description, notes,
			amount, amount_paid, is_income,
			transaction_date, due_date, status,
			auto_generated, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, '0.00', $10,
			$11, $12, 'pending',
			false, $13, NOW(), NOW()
		)
		RETURNING `+transactionCols, leagueID, req.TournamentID, req.TeamID, req.PlayerID, req.MatchID,
		string(req.TransactionType), req.Description, req.Notes,
		req.Amount, req.IsIncome,
		transactionDate, req.DueDate, createdBy)

	return scanTransaction(row)
}

// UpdateTransaction updates a transaction's mutable fields.
func (r *PGRepository) UpdateTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, updates *UpdateTransactionRequest, updatedBy uuid.UUID) (*Transaction, error) {
	cols := []string{}
	args := []any{transactionID, leagueID}
	argIndex := 3

	if updates.Description != nil {
		cols = append(cols, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Notes != nil {
		cols = append(cols, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *updates.Notes)
		argIndex++
	}
	if updates.DueDate != nil {
		cols = append(cols, fmt.Sprintf("due_date = $%d", argIndex))
		args = append(args, *updates.DueDate)
		argIndex++
	}
	if updates.Status != nil {
		cols = append(cols, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, string(*updates.Status))
		argIndex++
	}

	cols = append(cols, fmt.Sprintf("updated_by = $%d", argIndex))
	args = append(args, updatedBy)
	argIndex++
	cols = append(cols, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())

	if len(cols) == 2 {
		// No updates, return the transaction as-is
		return r.GetTransactionByLeague(ctx, transactionID, leagueID)
	}

	query := `UPDATE public.finance_transactions SET ` + joinCols(cols) + ` WHERE id = $1 AND league_id = $2 RETURNING ` + transactionCols

	row := r.db.QueryRow(ctx, query, args...)
	txn, err := scanTransaction(row)
	if err != nil {
		return nil, fmt.Errorf("update transaction: %w", err)
	}
	return txn, nil
}

// CancelTransaction marks a transaction as cancelled.
func (r *PGRepository) CancelTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, reason string, cancelledBy uuid.UUID) (*Transaction, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE public.finance_transactions
		SET
			status = 'cancelled',
			cancelled_at = NOW(),
			cancelled_by = $2,
			cancellation_reason = $3,
			updated_by = $2,
			updated_at = NOW()
		WHERE id = $1 AND league_id = $4
		RETURNING `+transactionCols, transactionID, cancelledBy, reason, leagueID)
	return scanTransaction(row)
}

// WaiveTransaction marks a transaction as waived (forgiven).
func (r *PGRepository) WaiveTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, reason string, waivedBy uuid.UUID) (*Transaction, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE public.finance_transactions
		SET
			status = 'waived',
			cancelled_at = NOW(),
			cancelled_by = $2,
			cancellation_reason = $3,
			updated_by = $2,
			updated_at = NOW()
		WHERE id = $1 AND league_id = $4
		RETURNING `+transactionCols, transactionID, waivedBy, reason, leagueID)
	return scanTransaction(row)
}

// RegisterPayment calls the SQL function to record a payment.
func (r *PGRepository) RegisterPayment(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, req *RegisterPaymentRequest, paidBy uuid.UUID) (*Transaction, error) {
	// Get transaction first to verify league_id
	txn, err := r.GetTransactionByLeague(ctx, transactionID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("register payment: %w", err)
	}
	if txn == nil {
		return nil, fmt.Errorf("transaction not found")
	}

	// Call register_payment SQL function
	row := r.db.QueryRow(ctx, `
		SELECT * FROM public.register_payment($1, $2, $3, $4, $5)
	`, transactionID, string(req.Amount), string(req.PaymentMethod), req.PaymentReference, paidBy)
	return scanTransaction(row)
}

// GetTeamBalance fetches a team's balance summary.
func (r *PGRepository) GetTeamBalance(ctx context.Context, teamID uuid.UUID, leagueID uuid.UUID) (*TeamBalance, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			team_id, team_name, team_slug, team_logo, league_id, league_name,
			tournament_id, total_charges, total_paid, balance,
			pending_balance, overdue_count, pending_fines_count, last_transaction_at
		FROM public.finance_team_balances
		WHERE team_id = $1 AND league_id = $2
	`, teamID, leagueID)

	return scanTeamBalance(row)
}

// ListTeamBalances fetches all team balances for a league.
func (r *PGRepository) ListTeamBalances(ctx context.Context, leagueID uuid.UUID) ([]TeamBalance, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			team_id, team_name, team_slug, team_logo, league_id, league_name,
			tournament_id, total_charges, total_paid, balance,
			pending_balance, overdue_count, pending_fines_count, last_transaction_at
		FROM public.finance_team_balances
		WHERE league_id = $1
		ORDER BY pending_balance DESC
	`, leagueID)
	if err != nil {
		return nil, fmt.Errorf("query team balances: %w", err)
	}
	defer rows.(interface{ Close() }).Close()

	var balances []TeamBalance
	for rows.(interface{ Next() bool }).Next() {
		bal, err := scanTeamBalanceRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan team balance: %w", err)
		}
		balances = append(balances, *bal)
	}
	if err := rows.(interface{ Err() error }).Err(); err != nil {
		return nil, fmt.Errorf("iterate team balances: %w", err)
	}

	return balances, nil
}

// GetLeagueSummary fetches the league-wide financial summary.
func (r *PGRepository) GetLeagueSummary(ctx context.Context, leagueID uuid.UUID) (*LeagueSummary, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			league_id, league_name, league_slug,
			total_income, total_charges, total_collected, total_pending, total_overdue,
			teams_with_transactions, total_transactions, overdue_transactions, total_card_fines,
			first_transaction_date, last_transaction_date
		FROM public.finance_league_summary
		WHERE league_id = $1
	`, leagueID)

	return scanLeagueSummary(row)
}

// GenerateFinesFromMatch calls the SQL function to generate fines from a match.
func (r *PGRepository) GenerateFinesFromMatch(ctx context.Context, matchID uuid.UUID, leagueID uuid.UUID, createdBy *uuid.UUID) (*GenerateFinesResult, error) {
	var createdByStr *string
	if createdBy != nil {
		s := createdBy.String()
		createdByStr = &s
	}

	row := r.db.QueryRow(ctx, `
		SELECT fines_created, total_amount, details
		FROM public.generate_fines_from_match($1, $2)
		WHERE league_id_check = $3
	`, matchID, createdByStr, leagueID)

	var finesCreated int
	var totalAmount sql.NullFloat64
	var details *json.RawMessage

	err := row.Scan(&finesCreated, &totalAmount, &details)
	if database.IsNoRows(err) {
		return nil, fmt.Errorf("match not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("scan generate fines result: %w", err)
	}

	return &GenerateFinesResult{
		FinesCreated: finesCreated,
		TotalAmount:  totalAmount,
		Details:      details,
	}, nil
}

// Helpers

const transactionCols = `
	id, league_id, tournament_id, team_id, player_id, match_id,
	transaction_type, description, notes,
	amount::text, amount_paid::text, is_income,
	transaction_date, due_date, paid_at, status,
	payment_method, payment_reference, receipt_number,
	external_payment_id, external_payment_status, external_payment_data,
	auto_generated, source_stat_id, parent_transaction_id,
	created_by, updated_by, cancelled_by, cancelled_at, cancellation_reason,
	created_at, updated_at,
	(SELECT p.name FROM public.players p WHERE p.id = finance_transactions.player_id),
	(SELECT p.jersey_number FROM public.players p WHERE p.id = finance_transactions.player_id)`

func joinCols(cols []string) string {
	result := ""
	for i, col := range cols {
		if i > 0 {
			result += ", "
		}
		result += col
	}
	return result
}

func scanConfig(row interface{ Scan(...any) error }) (*Config, error) {
	cfg := &Config{}
	var teamRegFee, playerRegFee, lateRegSurcharge string
	var yellowFine, redFine, doubleFine string
	var absenceFine, lateFine, misconductFine, uniformFine string
	var refereeFee, assistantFee, fieldRental string

	err := row.Scan(
		&cfg.ID, &cfg.LeagueID, &cfg.TournamentID, &cfg.Name,
		&teamRegFee, &playerRegFee, &lateRegSurcharge,
		&yellowFine, &redFine, &doubleFine,
		&absenceFine, &lateFine, &misconductFine, &uniformFine,
		&refereeFee, &assistantFee, &fieldRental,
		&cfg.Currency, &cfg.PaymentDueDays, &cfg.AutoGenerateFines, &cfg.AutoGenerateRefereeFees,
		&cfg.NotifyOnNewCharge, &cfg.NotifyOnOverdue, &cfg.OverdueGraceDays,
		&cfg.PaymentInstructions, &cfg.BankAccountInfo, &cfg.IsActive,
		&cfg.CreatedBy, &cfg.UpdatedBy, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan config: %w", err)
	}

	cfg.TeamRegistrationFee = json.Number(teamRegFee)
	cfg.PlayerRegistrationFee = json.Number(playerRegFee)
	cfg.LateRegistrationSurcharge = json.Number(lateRegSurcharge)
	cfg.YellowCardFine = json.Number(yellowFine)
	cfg.RedCardFine = json.Number(redFine)
	cfg.DoubleYellowFine = json.Number(doubleFine)
	cfg.AbsenceFine = json.Number(absenceFine)
	cfg.LateArrivalFine = json.Number(lateFine)
	cfg.MisconductFine = json.Number(misconductFine)
	cfg.UniformViolationFine = json.Number(uniformFine)
	cfg.RefereeFeePerMatch = json.Number(refereeFee)
	cfg.AssistantRefereeFee = json.Number(assistantFee)
	cfg.FieldRentalPerMatch = json.Number(fieldRental)

	return cfg, nil
}

func scanTransaction(row interface{ Scan(...any) error }) (*Transaction, error) {
	t := &Transaction{}

	err := row.Scan(
		&t.ID, &t.LeagueID, &t.TournamentID, &t.TeamID, &t.PlayerID, &t.MatchID,
		&t.TransactionType, &t.Description, &t.Notes,
		&t.Amount, &t.AmountPaid, &t.IsIncome,
		&t.TransactionDate, &t.DueDate, &t.PaidAt, &t.Status,
		&t.PaymentMethod, &t.PaymentReference, &t.ReceiptNumber,
		&t.ExternalPaymentID, &t.ExternalPaymentStatus, &t.ExternalPaymentData,
		&t.AutoGenerated, &t.SourceStatID, &t.ParentTransactionID,
		&t.CreatedBy, &t.UpdatedBy, &t.CancelledBy, &t.CancelledAt, &t.CancellationReason,
		&t.CreatedAt, &t.UpdatedAt,
		&t.PlayerName, &t.PlayerNumber,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan transaction: %w", err)
	}

	return t, nil
}

func scanTransactionRow(row interface{ Scan(...any) error }) (*Transaction, error) {
	return scanTransaction(row)
}

func scanTeamBalance(row interface{ Scan(...any) error }) (*TeamBalance, error) {
	b := &TeamBalance{}
	var totalCharges, totalPaid, balance, pendingBalance string

	err := row.Scan(
		&b.TeamID, &b.TeamName, &b.TeamSlug, &b.TeamLogo, &b.LeagueID, &b.LeagueName,
		&b.TournamentID, &totalCharges, &totalPaid, &balance,
		&pendingBalance, &b.OverdueCount, &b.PendingFinesCount, &b.LastTransactionAt,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan team balance: %w", err)
	}

	b.TotalCharges = totalCharges
	b.TotalPaid = totalPaid
	b.Balance = balance
	b.PendingBalance = pendingBalance
	return b, nil
}

func scanTeamBalanceRow(row interface{ Scan(...any) error }) (*TeamBalance, error) {
	return scanTeamBalance(row)
}

func scanLeagueSummary(row interface{ Scan(...any) error }) (*LeagueSummary, error) {
	s := &LeagueSummary{}
	var totalIncome, totalCharges, totalCollected, totalPending, totalOverdue string

	err := row.Scan(
		&s.LeagueID, &s.LeagueName, &s.LeagueSlug,
		&totalIncome, &totalCharges, &totalCollected, &totalPending, &totalOverdue,
		&s.TeamsWithTransactions, &s.TotalTransactions, &s.OverdueTransactions, &s.TotalCardFines,
		&s.FirstTransactionDate, &s.LastTransactionDate,
	)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan league summary: %w", err)
	}

	s.TotalIncome = totalIncome
	s.TotalCharges = totalCharges
	s.TotalCollected = totalCollected
	s.TotalPending = totalPending
	s.TotalOverdue = totalOverdue
	return s, nil
}

// CreateDefaultConfig creates a league's finance config with the database
// defaults (used when a league enables finance after the fact).
func (r *PGRepository) CreateDefaultConfig(ctx context.Context, leagueID, createdBy uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO public.finance_config (league_id, created_by)
		SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM public.finance_config WHERE league_id = $1)`, leagueID, createdBy)
	if err != nil {
		return fmt.Errorf("create default config: %w", err)
	}
	return nil
}
