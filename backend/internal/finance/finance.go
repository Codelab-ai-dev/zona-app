// Package finance manages league accounting, fines, fees, and payments.
package finance

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// TransactionType represents the kind of financial transaction.
type TransactionType string

const (
	// Registration
	TransactionTypeTeamRegistration   TransactionType = "team_registration"
	TransactionTypePlayerRegistration TransactionType = "player_registration"

	// Fines
	TransactionTypeYellowCardFine   TransactionType = "yellow_card_fine"
	TransactionTypeRedCardFine      TransactionType = "red_card_fine"
	TransactionTypeDoubleYellowFine TransactionType = "double_yellow_fine"
	TransactionTypeAbsenceFine      TransactionType = "absence_fine"
	TransactionTypeLateArrivalFine  TransactionType = "late_arrival_fine"
	TransactionTypeMisconductFine   TransactionType = "misconduct_fine"
	TransactionTypeUniformViolation TransactionType = "uniform_violation_fine"

	// Operational costs (expenses)
	TransactionTypeReferee      TransactionType = "referee_fee"
	TransactionTypeFieldRental  TransactionType = "field_rental"
	TransactionTypeEquipmentFee TransactionType = "equipment_fee"

	// Income
	TransactionTypePaymentReceived TransactionType = "payment_received"
	TransactionTypePartialPayment  TransactionType = "partial_payment"
	TransactionTypeRefund          TransactionType = "refund"
	TransactionTypeDiscount        TransactionType = "discount"
	TransactionTypeAdjustment      TransactionType = "adjustment"
	TransactionTypeOtherIncome     TransactionType = "other_income"
	TransactionTypeSponsorship     TransactionType = "sponsorship"
	TransactionTypePrizeMoney      TransactionType = "prize_money"

	// Expenses
	TransactionTypeOtherExpense TransactionType = "other_expense"
)

// TransactionStatus represents the payment state of a transaction.
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"
	TransactionStatusPaid      TransactionStatus = "paid"
	TransactionStatusPartial   TransactionStatus = "partial"
	TransactionStatusOverdue   TransactionStatus = "overdue"
	TransactionStatusCancelled TransactionStatus = "cancelled"
	TransactionStatusWaived    TransactionStatus = "waived"
)

// PaymentMethod represents how a payment was made.
type PaymentMethod string

const (
	PaymentMethodCash        PaymentMethod = "cash"
	PaymentMethodTransfer    PaymentMethod = "bank_transfer"
	PaymentMethodCard        PaymentMethod = "card"
	PaymentMethodMercadoPago PaymentMethod = "mercadopago"
	PaymentMethodStripe      PaymentMethod = "stripe"
	PaymentMethodPayPal      PaymentMethod = "paypal"
	PaymentMethodOXXO        PaymentMethod = "oxxo"
	PaymentMethodSPEI        PaymentMethod = "spei"
	PaymentMethodOther       PaymentMethod = "other"
)

// Currency represents a supported currency code.
type Currency string

const (
	CurrencyMXN Currency = "MXN"
	CurrencyUSD Currency = "USD"
	CurrencyEUR Currency = "EUR"
	CurrencyCOP Currency = "COP"
	CurrencyARS Currency = "ARS"
	CurrencyCLP Currency = "CLP"
	CurrencyPEN Currency = "PEN"
)

// Config holds the financial settings for a league or tournament.
type Config struct {
	ID                        uuid.UUID   `json:"id"`
	LeagueID                  uuid.UUID   `json:"league_id"`
	TournamentID              *uuid.UUID  `json:"tournament_id,omitempty"`
	Name                      string      `json:"name"`
	TeamRegistrationFee       json.Number `json:"team_registration_fee"` // Stored as numeric(10,2) in DB
	PlayerRegistrationFee     json.Number `json:"player_registration_fee"`
	LateRegistrationSurcharge json.Number `json:"late_registration_surcharge"`
	YellowCardFine            json.Number `json:"yellow_card_fine"`
	RedCardFine               json.Number `json:"red_card_fine"`
	DoubleYellowFine          json.Number `json:"double_yellow_fine"`
	AbsenceFine               json.Number `json:"absence_fine"`
	LateArrivalFine           json.Number `json:"late_arrival_fine"`
	MisconductFine            json.Number `json:"misconduct_fine"`
	UniformViolationFine      json.Number `json:"uniform_violation_fine"`
	RefereeFeePerMatch        json.Number `json:"referee_fee_per_match"`
	AssistantRefereeFee       json.Number `json:"assistant_referee_fee"`
	FieldRentalPerMatch       json.Number `json:"field_rental_per_match"`
	Currency                  Currency    `json:"currency"`
	PaymentDueDays            int         `json:"payment_due_days"`
	AutoGenerateFines         bool        `json:"auto_generate_fines"`
	AutoGenerateRefereeFees   bool        `json:"auto_generate_referee_fees"`
	NotifyOnNewCharge         bool        `json:"notify_on_new_charge"`
	NotifyOnOverdue           bool        `json:"notify_on_overdue"`
	OverdueGraceDays          int         `json:"overdue_grace_days"`
	PaymentInstructions       *string     `json:"payment_instructions,omitempty"`
	BankAccountInfo           *string     `json:"bank_account_info,omitempty"`
	IsActive                  bool        `json:"is_active"`
	CreatedBy                 *uuid.UUID  `json:"created_by,omitempty"`
	UpdatedBy                 *uuid.UUID  `json:"updated_by,omitempty"`
	CreatedAt                 time.Time   `json:"created_at"`
	UpdatedAt                 time.Time   `json:"updated_at"`
}

// Validate returns validation errors for Config fields.
func (c *Config) Validate() map[string]string {
	errs := make(map[string]string)
	if c.LeagueID == uuid.Nil {
		errs["league_id"] = "requerido"
	}
	if c.Currency != CurrencyMXN && c.Currency != CurrencyUSD && c.Currency != CurrencyEUR &&
		c.Currency != CurrencyCOP && c.Currency != CurrencyARS && c.Currency != CurrencyCLP &&
		c.Currency != CurrencyPEN {
		errs["currency"] = "no válido"
	}
	if c.PaymentDueDays < 0 || c.PaymentDueDays > 90 {
		errs["payment_due_days"] = "debe estar entre 0 y 90"
	}
	if c.OverdueGraceDays < 0 {
		errs["overdue_grace_days"] = "no puede ser negativo"
	}
	return errs
}

// UpdateConfigRequest is the DTO for updating config.
type UpdateConfigRequest struct {
	TeamRegistrationFee       *json.Number `json:"team_registration_fee,omitempty"`
	PlayerRegistrationFee     *json.Number `json:"player_registration_fee,omitempty"`
	LateRegistrationSurcharge *json.Number `json:"late_registration_surcharge,omitempty"`
	YellowCardFine            *json.Number `json:"yellow_card_fine,omitempty"`
	RedCardFine               *json.Number `json:"red_card_fine,omitempty"`
	DoubleYellowFine          *json.Number `json:"double_yellow_fine,omitempty"`
	AbsenceFine               *json.Number `json:"absence_fine,omitempty"`
	LateArrivalFine           *json.Number `json:"late_arrival_fine,omitempty"`
	MisconductFine            *json.Number `json:"misconduct_fine,omitempty"`
	UniformViolationFine      *json.Number `json:"uniform_violation_fine,omitempty"`
	RefereeFeePerMatch        *json.Number `json:"referee_fee_per_match,omitempty"`
	AssistantRefereeFee       *json.Number `json:"assistant_referee_fee,omitempty"`
	FieldRentalPerMatch       *json.Number `json:"field_rental_per_match,omitempty"`
	PaymentDueDays            *int         `json:"payment_due_days,omitempty"`
	AutoGenerateFines         *bool        `json:"auto_generate_fines,omitempty"`
	AutoGenerateRefereeFees   *bool        `json:"auto_generate_referee_fees,omitempty"`
	NotifyOnNewCharge         *bool        `json:"notify_on_new_charge,omitempty"`
	NotifyOnOverdue           *bool        `json:"notify_on_overdue,omitempty"`
	OverdueGraceDays          *int         `json:"overdue_grace_days,omitempty"`
	PaymentInstructions       *string      `json:"payment_instructions,omitempty"`
	BankAccountInfo           *string      `json:"bank_account_info,omitempty"`
	Currency                  *Currency    `json:"currency,omitempty"`
}

// Validate returns validation errors for UpdateConfigRequest.
func (r *UpdateConfigRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Currency != nil {
		switch *r.Currency {
		case "MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN":
		default:
			errs["currency"] = "moneda no soportada"
		}
	}
	if r.PaymentDueDays != nil && (*r.PaymentDueDays < 0 || *r.PaymentDueDays > 90) {
		errs["payment_due_days"] = "debe estar entre 0 y 90"
	}
	if r.OverdueGraceDays != nil && *r.OverdueGraceDays < 0 {
		errs["overdue_grace_days"] = "no puede ser negativo"
	}
	return errs
}

// Transaction represents a financial transaction (charge, income, or adjustment).
type Transaction struct {
	ID                    uuid.UUID         `json:"id"`
	LeagueID              uuid.UUID         `json:"league_id"`
	TournamentID          *uuid.UUID        `json:"tournament_id,omitempty"`
	TeamID                *uuid.UUID        `json:"team_id,omitempty"`
	PlayerID              *uuid.UUID        `json:"player_id,omitempty"`
	PlayerName            *string           `json:"player_name,omitempty"`
	PlayerNumber          *int              `json:"player_number,omitempty"`
	MatchID               *uuid.UUID        `json:"match_id,omitempty"`
	TransactionType       TransactionType   `json:"transaction_type"`
	Description           string            `json:"description"`
	Notes                 *string           `json:"notes,omitempty"`
	Amount                string            `json:"amount"` // numeric stored as string to avoid float
	AmountPaid            string            `json:"amount_paid"`
	IsIncome              bool              `json:"is_income"`
	TransactionDate       time.Time         `json:"transaction_date"` // DATE stored as time.Time
	DueDate               *time.Time        `json:"due_date,omitempty"`
	PaidAt                *time.Time        `json:"paid_at,omitempty"`
	Status                TransactionStatus `json:"status"`
	PaymentMethod         *PaymentMethod    `json:"payment_method,omitempty"`
	PaymentReference      *string           `json:"payment_reference,omitempty"`
	ReceiptNumber         *string           `json:"receipt_number,omitempty"`
	ExternalPaymentID     *string           `json:"external_payment_id,omitempty"`
	ExternalPaymentStatus *string           `json:"external_payment_status,omitempty"`
	ExternalPaymentData   *json.RawMessage  `json:"external_payment_data,omitempty"`
	AutoGenerated         bool              `json:"auto_generated"`
	SourceStatID          *uuid.UUID        `json:"source_stat_id,omitempty"`
	ParentTransactionID   *uuid.UUID        `json:"parent_transaction_id,omitempty"`
	CreatedBy             *uuid.UUID        `json:"created_by,omitempty"`
	UpdatedBy             *uuid.UUID        `json:"updated_by,omitempty"`
	CancelledBy           *uuid.UUID        `json:"cancelled_by,omitempty"`
	CancelledAt           *time.Time        `json:"cancelled_at,omitempty"`
	CancellationReason    *string           `json:"cancellation_reason,omitempty"`
	CreatedAt             time.Time         `json:"created_at"`
	UpdatedAt             time.Time         `json:"updated_at"`
}

// Validate returns validation errors for Transaction.
func (t *Transaction) Validate() map[string]string {
	errs := make(map[string]string)
	if t.LeagueID == uuid.Nil {
		errs["league_id"] = "requerido"
	}
	if t.TransactionType == "" {
		errs["transaction_type"] = "requerido"
	}
	if !isValidTransactionType(t.TransactionType) {
		errs["transaction_type"] = "no válido"
	}
	if t.Description == "" {
		errs["description"] = "requerido"
	}
	if !isValidTransactionStatus(t.Status) {
		errs["status"] = "no válido"
	}
	return errs
}

// CreateTransactionRequest is the DTO for creating a transaction.
type CreateTransactionRequest struct {
	TournamentID    *uuid.UUID      `json:"tournament_id,omitempty"`
	TeamID          *uuid.UUID      `json:"team_id,omitempty"`
	PlayerID        *uuid.UUID      `json:"player_id,omitempty"`
	MatchID         *uuid.UUID      `json:"match_id,omitempty"`
	TransactionType TransactionType `json:"transaction_type"`
	Description     string          `json:"description"`
	Notes           *string         `json:"notes,omitempty"`
	Amount          json.Number     `json:"amount"`
	IsIncome        bool            `json:"is_income"`
	TransactionDate *time.Time      `json:"transaction_date,omitempty"`
	DueDate         *time.Time      `json:"due_date,omitempty"`
}

// Validate returns validation errors for CreateTransactionRequest.
func (r *CreateTransactionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TransactionType == "" {
		errs["transaction_type"] = "requerido"
	}
	if !isValidTransactionType(r.TransactionType) {
		errs["transaction_type"] = "no válido"
	}
	if r.Description == "" {
		errs["description"] = "requerido"
	}
	if r.Amount == "" {
		errs["amount"] = "requerido"
	}
	if err := validateAmount(r.Amount); err != nil {
		errs["amount"] = err.Error()
	}
	return errs
}

// validateAmount checks amount is positive, at most 2 decimals, and <= 999999.99.
func validateAmount(amount json.Number) error {
	str := string(amount)
	val, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return fmt.Errorf("no válido")
	}
	if val <= 0 {
		return fmt.Errorf("debe ser mayor a 0")
	}
	if val > 999999.99 {
		return fmt.Errorf("no puede exceder 999999.99")
	}
	// Check at most 2 decimals: multiply by 100 and check precision
	scaled := val * 100
	if scaled != float64(int64(scaled+0.5)) {
		return fmt.Errorf("máximo 2 decimales")
	}
	return nil
}

// UpdateTransactionRequest is the DTO for updating a transaction.
type UpdateTransactionRequest struct {
	Description *string            `json:"description,omitempty"`
	Notes       *string            `json:"notes,omitempty"`
	DueDate     *time.Time         `json:"due_date,omitempty"`
	Status      *TransactionStatus `json:"status,omitempty"`
}

// Validate returns validation errors for UpdateTransactionRequest.
func (r *UpdateTransactionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Status != nil && !isValidTransactionStatus(*r.Status) {
		errs["status"] = "no válido"
	}
	return errs
}

// RegisterPaymentRequest is the DTO for registering a payment.
type RegisterPaymentRequest struct {
	Amount           json.Number   `json:"amount"`
	PaymentMethod    PaymentMethod `json:"payment_method"`
	PaymentReference *string       `json:"payment_reference,omitempty"`
}

// Validate returns validation errors for RegisterPaymentRequest.
func (r *RegisterPaymentRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Amount == "" {
		errs["amount"] = "requerido"
	}
	if err := validateAmount(r.Amount); err != nil {
		errs["amount"] = err.Error()
	}
	if r.PaymentMethod == "" {
		errs["payment_method"] = "requerido"
	}
	if !isValidPaymentMethod(r.PaymentMethod) {
		errs["payment_method"] = "no válido"
	}
	return errs
}

// CancelTransactionRequest is the DTO for cancelling a transaction.
type CancelTransactionRequest struct {
	Reason string `json:"reason"`
}

// Validate returns validation errors for CancelTransactionRequest.
func (r *CancelTransactionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Reason == "" {
		errs["reason"] = "requerido"
	}
	return errs
}

// WaiveTransactionRequest is the DTO for waiving a transaction.
type WaiveTransactionRequest struct {
	Reason string `json:"reason"`
}

// Validate returns validation errors for WaiveTransactionRequest.
func (r *WaiveTransactionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Reason == "" {
		errs["reason"] = "requerido"
	}
	return errs
}

// TeamBalance holds a team's financial summary.
type TeamBalance struct {
	TeamID            uuid.UUID  `json:"team_id"`
	TeamName          string     `json:"team_name"`
	TeamSlug          string     `json:"team_slug"`
	TeamLogo          *string    `json:"team_logo,omitempty"`
	LeagueID          uuid.UUID  `json:"league_id"`
	LeagueName        string     `json:"league_name"`
	TournamentID      *uuid.UUID `json:"tournament_id,omitempty"`
	TotalCharges      string     `json:"total_charges"` // numeric stored as string
	TotalPaid         string     `json:"total_paid"`
	Balance           string     `json:"balance"` // negative = debt
	PendingBalance    string     `json:"pending_balance"`
	OverdueCount      int        `json:"overdue_count"`
	PendingFinesCount int        `json:"pending_fines_count"`
	LastTransactionAt *time.Time `json:"last_transaction_at,omitempty"`
}

// LeagueSummary holds league-wide financial data.
type LeagueSummary struct {
	LeagueID              uuid.UUID  `json:"league_id"`
	LeagueName            string     `json:"league_name"`
	LeagueSlug            string     `json:"league_slug"`
	TotalIncome           string     `json:"total_income"`
	TotalCharges          string     `json:"total_charges"`
	TotalCollected        string     `json:"total_collected"`
	TotalPending          string     `json:"total_pending"`
	TotalOverdue          string     `json:"total_overdue"`
	TeamsWithTransactions int        `json:"teams_with_transactions"`
	TotalTransactions     int        `json:"total_transactions"`
	OverdueTransactions   int        `json:"overdue_transactions"`
	TotalCardFines        int        `json:"total_card_fines"`
	FirstTransactionDate  *time.Time `json:"first_transaction_date,omitempty"`
	LastTransactionDate   *time.Time `json:"last_transaction_date,omitempty"`
}

// ListTransactionsFilters holds filter options for listing transactions.
type ListTransactionsFilters struct {
	Status          *TransactionStatus
	TransactionType *TransactionType
	TeamID          *uuid.UUID
	DateFrom        *time.Time
	DateTo          *time.Time
	IsIncome        *bool
	Search          string // matches description, notes, team or player name
	Limit           int
	Offset          int
}

// GenerateFinesResult holds the result of generating fines from a match.
type GenerateFinesResult struct {
	FinesCreated int              `json:"fines_created"`
	TotalAmount  sql.NullFloat64  `json:"total_amount"`
	Details      *json.RawMessage `json:"details,omitempty"`
}

// TxRunner executes operations in a transaction and provides WithUserTx support.
type TxRunner interface {
	WithUserTx(ctx context.Context, userID uuid.UUID, fn func(ctx context.Context, q Querier) error) error
}

// Querier is the interface for database operations.
type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (interface{}, error)
	Query(ctx context.Context, sql string, args ...any) (interface{}, error)
	QueryRow(ctx context.Context, sql string, args ...any) interface {
		Scan(...any) error
	}
}

// Repository defines the persistence contract for finance operations.
type Repository interface {
	// Config
	GetConfigByLeague(ctx context.Context, leagueID uuid.UUID) (*Config, error)
	GetConfigByLeagueAndTournament(ctx context.Context, leagueID uuid.UUID, tournamentID *uuid.UUID) (*Config, error)
	UpdateConfig(ctx context.Context, configID uuid.UUID, updates *UpdateConfigRequest, updatedBy uuid.UUID) (*Config, error)
	// CreateDefaultConfig creates the league's config with database defaults if it has none.
	CreateDefaultConfig(ctx context.Context, leagueID, createdBy uuid.UUID) error

	// Transactions
	GetTransaction(ctx context.Context, transactionID uuid.UUID) (*Transaction, error)
	GetTransactionByLeague(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID) (*Transaction, error)
	ListTransactions(ctx context.Context, leagueID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error)
	ListTeamTransactions(ctx context.Context, leagueID uuid.UUID, teamID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error)
	CreateTransaction(ctx context.Context, leagueID uuid.UUID, req *CreateTransactionRequest, createdBy uuid.UUID) (*Transaction, error)
	UpdateTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, updates *UpdateTransactionRequest, updatedBy uuid.UUID) (*Transaction, error)
	CancelTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, reason string, cancelledBy uuid.UUID) (*Transaction, error)
	WaiveTransaction(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, reason string, waivedBy uuid.UUID) (*Transaction, error)
	RegisterPayment(ctx context.Context, transactionID uuid.UUID, leagueID uuid.UUID, req *RegisterPaymentRequest, paidBy uuid.UUID) (*Transaction, error)

	// Balances and summaries
	GetTeamBalance(ctx context.Context, teamID uuid.UUID, leagueID uuid.UUID) (*TeamBalance, error)
	ListTeamBalances(ctx context.Context, leagueID uuid.UUID) ([]TeamBalance, error)
	GetLeagueSummary(ctx context.Context, leagueID uuid.UUID) (*LeagueSummary, error)

	// Auto-generation
	GenerateFinesFromMatch(ctx context.Context, matchID uuid.UUID, leagueID uuid.UUID, createdBy *uuid.UUID) (*GenerateFinesResult, error)
}

// Helpers

func isValidTransactionType(t TransactionType) bool {
	switch t {
	case TransactionTypeTeamRegistration, TransactionTypePlayerRegistration,
		TransactionTypeYellowCardFine, TransactionTypeRedCardFine,
		TransactionTypeDoubleYellowFine, TransactionTypeAbsenceFine,
		TransactionTypeLateArrivalFine, TransactionTypeMisconductFine,
		TransactionTypeUniformViolation, TransactionTypeReferee,
		TransactionTypeFieldRental, TransactionTypeEquipmentFee,
		TransactionTypePaymentReceived, TransactionTypePartialPayment,
		TransactionTypeRefund, TransactionTypeDiscount,
		TransactionTypeAdjustment, TransactionTypeOtherIncome,
		TransactionTypeOtherExpense, TransactionTypeSponsorship,
		TransactionTypePrizeMoney:
		return true
	}
	return false
}

func isValidTransactionStatus(s TransactionStatus) bool {
	switch s {
	case TransactionStatusPending, TransactionStatusPaid, TransactionStatusPartial,
		TransactionStatusOverdue, TransactionStatusCancelled, TransactionStatusWaived:
		return true
	}
	return false
}

func isValidPaymentMethod(m PaymentMethod) bool {
	switch m {
	case PaymentMethodCash, PaymentMethodTransfer, PaymentMethodCard,
		PaymentMethodMercadoPago, PaymentMethodStripe, PaymentMethodPayPal,
		PaymentMethodOXXO, PaymentMethodSPEI, PaymentMethodOther:
		return true
	}
	return false
}
