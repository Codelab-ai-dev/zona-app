package finance

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Handler translates HTTP to service calls. It holds no business logic.
type Handler struct {
	svc *Service
}

// NewHandler builds the finance HTTP handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	// Config endpoints
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/config", h.getConfig)
	r.With(auth.RequireAuth).Put("/leagues/{leagueID}/finance/config", h.updateConfig)

	// Transaction endpoints
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/transactions", h.listTransactions)
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/finance/transactions", h.createTransaction)
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/transactions/{transactionID}", h.getTransaction)
	r.With(auth.RequireAuth).Put("/leagues/{leagueID}/finance/transactions/{transactionID}", h.updateTransaction)
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/finance/transactions/{transactionID}/cancel", h.cancelTransaction)
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/finance/transactions/{transactionID}/waive", h.waiveTransaction)
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/finance/transactions/{transactionID}/pay", h.registerPayment)

	// Team transactions endpoint
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/teams/{teamID}/transactions", h.listTeamTransactions)

	// Balance and summary endpoints
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/teams/{teamID}/balance", h.getTeamBalance)
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/balances", h.listTeamBalances)
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/finance/summary", h.getLeagueSummary)

	// Auto-generation endpoints
	r.With(auth.RequireAuth).Post("/leagues/{leagueID}/finance/matches/{matchID}/generate-fines", h.generateFinesFromMatch)
}

func (h *Handler) getConfig(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	cfg, err := h.svc.GetConfig(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, cfg)
}

func (h *Handler) updateConfig(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateConfigRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	cfg, err := h.svc.GetConfig(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	updated, err := h.svc.UpdateConfig(r.Context(), caller, leagueID, cfg.ID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) listTransactions(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	filters := parseTransactionFilters(r, page)

	txns, err := h.svc.ListTransactions(r.Context(), caller, leagueID, filters)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, txns, page)
}

func (h *Handler) listTeamTransactions(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	filters := parseTransactionFilters(r, page)

	txns, err := h.svc.ListTeamTransactions(r.Context(), caller, leagueID, teamID, filters)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, txns, page)
}

func (h *Handler) getTransaction(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	transactionID, err := httpx.UUIDParam(r, "transactionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	txn, err := h.svc.GetTransaction(r.Context(), caller, leagueID, transactionID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, txn)
}

func (h *Handler) createTransaction(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req CreateTransactionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	txn, err := h.svc.CreateTransaction(r.Context(), caller, leagueID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, txn)
}

func (h *Handler) updateTransaction(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	transactionID, err := httpx.UUIDParam(r, "transactionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req UpdateTransactionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	txn, err := h.svc.UpdateTransaction(r.Context(), caller, leagueID, transactionID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, txn)
}

func (h *Handler) cancelTransaction(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	transactionID, err := httpx.UUIDParam(r, "transactionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req CancelTransactionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	txn, err := h.svc.CancelTransaction(r.Context(), caller, leagueID, transactionID, req.Reason)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, txn)
}

func (h *Handler) waiveTransaction(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	transactionID, err := httpx.UUIDParam(r, "transactionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req WaiveTransactionRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	txn, err := h.svc.WaiveTransaction(r.Context(), caller, leagueID, transactionID, req.Reason)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, txn)
}

func (h *Handler) registerPayment(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	transactionID, err := httpx.UUIDParam(r, "transactionID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	var req RegisterPaymentRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	if errs := req.Validate(); len(errs) > 0 {
		httpx.WriteError(w, r, httpx.Validation(errs))
		return
	}

	txn, err := h.svc.RegisterPayment(r.Context(), caller, leagueID, transactionID, &req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, txn)
}

func (h *Handler) getTeamBalance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	balance, err := h.svc.GetTeamBalance(r.Context(), caller, leagueID, teamID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, balance)
}

func (h *Handler) listTeamBalances(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	balances, err := h.svc.ListTeamBalances(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	httpx.List(w, balances, page)
}

func (h *Handler) getLeagueSummary(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	summary, err := h.svc.GetLeagueSummary(r.Context(), caller, leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, summary)
}

func (h *Handler) generateFinesFromMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}

	result, err := h.svc.GenerateFinesFromMatch(r.Context(), caller, leagueID, matchID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}

// Helper

func parseTransactionFilters(r *http.Request, page httpx.Page) *ListTransactionsFilters {
	filters := &ListTransactionsFilters{
		Limit:  page.Limit,
		Offset: page.Offset,
	}

	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		s := TransactionStatus(status)
		filters.Status = &s
	}

	if txType := r.URL.Query().Get("transaction_type"); txType != "" && txType != "all" {
		t := TransactionType(txType)
		filters.TransactionType = &t
	}

	if dateFrom := r.URL.Query().Get("date_from"); dateFrom != "" {
		if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filters.DateFrom = &t
		}
	}

	if dateTo := r.URL.Query().Get("date_to"); dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			filters.DateTo = &t
		}
	}

	if isIncome := r.URL.Query().Get("is_income"); isIncome != "" {
		val := isIncome == "true"
		filters.IsIncome = &val
	}

	return filters
}
