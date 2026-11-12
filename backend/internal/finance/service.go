package finance

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules and authorization. It depends on interfaces,
// so it's fully testable with fakes.
type Service struct {
	repo  Repository
	authz authz.Checker
}

// NewService builds the finance service.
func NewService(repo Repository, authz authz.Checker) *Service {
	return &Service{
		repo:  repo,
		authz: authz,
	}
}

// GetConfig fetches the financial configuration for a league.
func (s *Service) GetConfig(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) (*Config, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("get config: %w", err)
	}
	cfg, err := s.repo.GetConfigByLeague(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("get config: %w", err)
	}
	if cfg == nil {
		return nil, httpx.ErrNotFound
	}
	return cfg, nil
}

// SaveConfig updates the league's financial configuration, creating it with
// the defaults first when the league has none.
func (s *Service) SaveConfig(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, updates *UpdateConfigRequest) (*Config, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("save config: %w", err)
	}
	cfg, err := s.repo.GetConfigByLeague(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("save config: %w", err)
	}
	if cfg == nil {
		if err := s.repo.CreateDefaultConfig(ctx, leagueID, caller.UserID); err != nil {
			return nil, err
		}
		if cfg, err = s.repo.GetConfigByLeague(ctx, leagueID); err != nil || cfg == nil {
			return nil, fmt.Errorf("save config: created config not found: %w", err)
		}
	}
	return s.UpdateConfig(ctx, caller, leagueID, cfg.ID, updates)
}

// UpdateConfig updates the financial configuration for a league.
func (s *Service) UpdateConfig(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, configID uuid.UUID, updates *UpdateConfigRequest) (*Config, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("update config: %w", err)
	}

	cfg, err := s.repo.GetConfigByLeague(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("update config: %w", err)
	}
	if cfg == nil || cfg.ID != configID {
		return nil, httpx.ErrNotFound
	}

	if errs := updates.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	updated, err := s.repo.UpdateConfig(ctx, configID, updates, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("update config: %w", err)
	}
	return updated, nil
}

// GetTransaction fetches a single transaction.
func (s *Service) GetTransaction(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, transactionID uuid.UUID) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err == nil {
		return s.repo.GetTransactionByLeague(ctx, transactionID, leagueID)
	}
	return nil, httpx.ErrForbidden
}

// ListTransactions lists transactions for a league (league admins only).
func (s *Service) ListTransactions(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("list transactions: %w", err)
	}

	txns, err := s.repo.ListTransactions(ctx, leagueID, filters)
	if err != nil {
		return nil, fmt.Errorf("list transactions: %w", err)
	}

	return txns, nil
}

// ListTeamTransactions lists transactions for a specific team (team owner or league admin).
func (s *Service) ListTeamTransactions(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, teamID uuid.UUID, filters *ListTransactionsFilters) ([]Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err == nil {
		return s.repo.ListTeamTransactions(ctx, leagueID, teamID, filters)
	}

	if err := s.authz.CanManageTeam(ctx, caller, teamID); err == nil {
		return s.repo.ListTeamTransactions(ctx, leagueID, teamID, filters)
	}

	return nil, httpx.ErrForbidden
}

// CreateTransaction creates a new transaction.
func (s *Service) CreateTransaction(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *CreateTransactionRequest) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}

	if errs := req.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	txn, err := s.repo.CreateTransaction(ctx, leagueID, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}
	return txn, nil
}

// UpdateTransaction updates a transaction's mutable fields.
func (s *Service) UpdateTransaction(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, transactionID uuid.UUID, updates *UpdateTransactionRequest) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("update transaction: %w", err)
	}

	txn, err := s.repo.GetTransactionByLeague(ctx, transactionID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("update transaction: %w", err)
	}
	if txn == nil {
		return nil, httpx.ErrNotFound
	}

	if errs := updates.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	updated, err := s.repo.UpdateTransaction(ctx, transactionID, leagueID, updates, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("update transaction: %w", err)
	}
	return updated, nil
}

// CancelTransaction marks a transaction as cancelled.
func (s *Service) CancelTransaction(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, transactionID uuid.UUID, reason string) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("cancel transaction: %w", err)
	}

	txn, err := s.repo.GetTransactionByLeague(ctx, transactionID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("cancel transaction: %w", err)
	}
	if txn == nil {
		return nil, httpx.ErrNotFound
	}

	cancelled, err := s.repo.CancelTransaction(ctx, transactionID, leagueID, reason, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("cancel transaction: %w", err)
	}
	return cancelled, nil
}

// WaiveTransaction marks a transaction as waived (debt forgiven).
func (s *Service) WaiveTransaction(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, transactionID uuid.UUID, reason string) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("waive transaction: %w", err)
	}

	txn, err := s.repo.GetTransactionByLeague(ctx, transactionID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("waive transaction: %w", err)
	}
	if txn == nil {
		return nil, httpx.ErrNotFound
	}

	waived, err := s.repo.WaiveTransaction(ctx, transactionID, leagueID, reason, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("waive transaction: %w", err)
	}
	return waived, nil
}

// RegisterPayment records a payment against a transaction.
func (s *Service) RegisterPayment(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, transactionID uuid.UUID, req *RegisterPaymentRequest) (*Transaction, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("register payment: %w", err)
	}

	txn, err := s.repo.GetTransactionByLeague(ctx, transactionID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("register payment: %w", err)
	}
	if txn == nil {
		return nil, httpx.ErrNotFound
	}

	if errs := req.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	paid, err := s.repo.RegisterPayment(ctx, transactionID, leagueID, req, caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("register payment: %w", err)
	}
	return paid, nil
}

// GetTeamBalance fetches a team's financial balance.
func (s *Service) GetTeamBalance(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, teamID uuid.UUID) (*TeamBalance, error) {
	canManageLeague := s.authz.CanManageLeague(ctx, caller, leagueID) == nil
	canManageTeam := s.authz.CanManageTeam(ctx, caller, teamID) == nil

	if !canManageLeague && !canManageTeam {
		return nil, httpx.ErrForbidden
	}

	balance, err := s.repo.GetTeamBalance(ctx, teamID, leagueID)
	if err != nil {
		return nil, fmt.Errorf("get team balance: %w", err)
	}
	if balance == nil {
		return nil, httpx.ErrNotFound
	}
	return balance, nil
}

// ListTeamBalances lists all team balances for a league.
func (s *Service) ListTeamBalances(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) ([]TeamBalance, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("list team balances: %w", err)
	}

	balances, err := s.repo.ListTeamBalances(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("list team balances: %w", err)
	}
	return balances, nil
}

// GetLeagueSummary fetches the league-wide financial summary.
func (s *Service) GetLeagueSummary(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) (*LeagueSummary, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("get league summary: %w", err)
	}

	summary, err := s.repo.GetLeagueSummary(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("get league summary: %w", err)
	}
	if summary == nil {
		return nil, httpx.ErrNotFound
	}
	return summary, nil
}

// GenerateFinesFromMatch generates fines from a match's card statistics.
func (s *Service) GenerateFinesFromMatch(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, matchID uuid.UUID) (*GenerateFinesResult, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, fmt.Errorf("generate fines: %w", err)
	}

	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return nil, fmt.Errorf("generate fines: %w", err)
	}

	result, err := s.repo.GenerateFinesFromMatch(ctx, matchID, leagueID, &caller.UserID)
	if err != nil {
		return nil, fmt.Errorf("generate fines: %w", err)
	}
	return result, nil
}
