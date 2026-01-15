import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  FinanceConfig,
  FinanceTransaction,
  FinanceTeamBalance,
  FinanceLeagueSummary,
  FinanceFilters,
  FinanceTransactionStatus,
} from '../types/finance'

// =====================================================
// STATE INTERFACE
// =====================================================

interface FinanceState {
  // Configuration
  config: FinanceConfig | null

  // Transactions
  transactions: FinanceTransaction[]
  selectedTransaction: FinanceTransaction | null

  // Balances
  teamBalances: FinanceTeamBalance[]
  selectedTeamBalance: FinanceTeamBalance | null

  // Summary
  leagueSummary: FinanceLeagueSummary | null

  // Filters
  filters: FinanceFilters

  // UI State
  loading: boolean
  error: string | null

  // Modal states
  isAddTransactionModalOpen: boolean
  isPaymentModalOpen: boolean
  isConfigModalOpen: boolean
}

// =====================================================
// ACTIONS INTERFACE
// =====================================================

interface FinanceActions {
  // Configuration
  setConfig: (config: FinanceConfig | null) => void
  updateConfig: (updates: Partial<FinanceConfig>) => void

  // Transactions
  setTransactions: (transactions: FinanceTransaction[]) => void
  addTransaction: (transaction: FinanceTransaction) => void
  updateTransaction: (transaction: FinanceTransaction) => void
  removeTransaction: (transactionId: string) => void
  setSelectedTransaction: (transaction: FinanceTransaction | null) => void

  // Balances
  setTeamBalances: (balances: FinanceTeamBalance[]) => void
  setSelectedTeamBalance: (balance: FinanceTeamBalance | null) => void
  updateTeamBalance: (balance: FinanceTeamBalance) => void

  // Summary
  setLeagueSummary: (summary: FinanceLeagueSummary | null) => void

  // Filters
  setFilters: (filters: FinanceFilters) => void
  updateFilter: <K extends keyof FinanceFilters>(key: K, value: FinanceFilters[K]) => void
  clearFilters: () => void

  // UI State
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Modals
  openAddTransactionModal: () => void
  closeAddTransactionModal: () => void
  openPaymentModal: (transaction: FinanceTransaction) => void
  closePaymentModal: () => void
  openConfigModal: () => void
  closeConfigModal: () => void

  // Reset
  reset: () => void
}

// =====================================================
// STORE TYPE
// =====================================================

type FinanceStore = FinanceState & FinanceActions

// =====================================================
// INITIAL STATE
// =====================================================

const initialFilters: FinanceFilters = {
  status: 'all',
  transaction_type: 'all',
  team_id: undefined,
  date_from: undefined,
  date_to: undefined,
  is_income: undefined,
}

const initialState: FinanceState = {
  config: null,
  transactions: [],
  selectedTransaction: null,
  teamBalances: [],
  selectedTeamBalance: null,
  leagueSummary: null,
  filters: initialFilters,
  loading: false,
  error: null,
  isAddTransactionModalOpen: false,
  isPaymentModalOpen: false,
  isConfigModalOpen: false,
}

// =====================================================
// STORE IMPLEMENTATION
// =====================================================

export const useFinanceStore = create<FinanceStore>()(
  immer((set) => ({
    ...initialState,

    // =====================
    // CONFIGURATION
    // =====================
    setConfig: (config) =>
      set((state) => {
        state.config = config
      }),

    updateConfig: (updates) =>
      set((state) => {
        if (state.config) {
          state.config = { ...state.config, ...updates }
        }
      }),

    // =====================
    // TRANSACTIONS
    // =====================
    setTransactions: (transactions) =>
      set((state) => {
        state.transactions = transactions
      }),

    addTransaction: (transaction) =>
      set((state) => {
        state.transactions.unshift(transaction) // Add to beginning (newest first)
      }),

    updateTransaction: (updatedTransaction) =>
      set((state) => {
        const index = state.transactions.findIndex((t) => t.id === updatedTransaction.id)
        if (index !== -1) {
          state.transactions[index] = updatedTransaction
        }
        if (state.selectedTransaction?.id === updatedTransaction.id) {
          state.selectedTransaction = updatedTransaction
        }
      }),

    removeTransaction: (transactionId) =>
      set((state) => {
        state.transactions = state.transactions.filter((t) => t.id !== transactionId)
        if (state.selectedTransaction?.id === transactionId) {
          state.selectedTransaction = null
        }
      }),

    setSelectedTransaction: (transaction) =>
      set((state) => {
        state.selectedTransaction = transaction
      }),

    // =====================
    // BALANCES
    // =====================
    setTeamBalances: (balances) =>
      set((state) => {
        state.teamBalances = balances
      }),

    setSelectedTeamBalance: (balance) =>
      set((state) => {
        state.selectedTeamBalance = balance
      }),

    updateTeamBalance: (updatedBalance) =>
      set((state) => {
        const index = state.teamBalances.findIndex((b) => b.team_id === updatedBalance.team_id)
        if (index !== -1) {
          state.teamBalances[index] = updatedBalance
        }
        if (state.selectedTeamBalance?.team_id === updatedBalance.team_id) {
          state.selectedTeamBalance = updatedBalance
        }
      }),

    // =====================
    // SUMMARY
    // =====================
    setLeagueSummary: (summary) =>
      set((state) => {
        state.leagueSummary = summary
      }),

    // =====================
    // FILTERS
    // =====================
    setFilters: (filters) =>
      set((state) => {
        state.filters = filters
      }),

    updateFilter: (key, value) =>
      set((state) => {
        state.filters[key] = value
      }),

    clearFilters: () =>
      set((state) => {
        state.filters = initialFilters
      }),

    // =====================
    // UI STATE
    // =====================
    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
      }),

    // =====================
    // MODALS
    // =====================
    openAddTransactionModal: () =>
      set((state) => {
        state.isAddTransactionModalOpen = true
      }),

    closeAddTransactionModal: () =>
      set((state) => {
        state.isAddTransactionModalOpen = false
      }),

    openPaymentModal: (transaction) =>
      set((state) => {
        state.selectedTransaction = transaction
        state.isPaymentModalOpen = true
      }),

    closePaymentModal: () =>
      set((state) => {
        state.isPaymentModalOpen = false
        state.selectedTransaction = null
      }),

    openConfigModal: () =>
      set((state) => {
        state.isConfigModalOpen = true
      }),

    closeConfigModal: () =>
      set((state) => {
        state.isConfigModalOpen = false
      }),

    // =====================
    // RESET
    // =====================
    reset: () =>
      set(() => ({ ...initialState })),
  }))
)

// =====================================================
// SELECTORS (for derived state)
// =====================================================

/**
 * Get filtered transactions from store
 */
export const selectFilteredTransactions = (state: FinanceState): FinanceTransaction[] => {
  let filtered = state.transactions

  if (state.filters.status && state.filters.status !== 'all') {
    filtered = filtered.filter((t) => t.status === state.filters.status)
  }

  if (state.filters.transaction_type && state.filters.transaction_type !== 'all') {
    filtered = filtered.filter((t) => t.transaction_type === state.filters.transaction_type)
  }

  if (state.filters.team_id) {
    filtered = filtered.filter((t) => t.team_id === state.filters.team_id)
  }

  if (state.filters.is_income !== undefined) {
    filtered = filtered.filter((t) => t.is_income === state.filters.is_income)
  }

  if (state.filters.date_from) {
    filtered = filtered.filter((t) => t.transaction_date >= state.filters.date_from!)
  }

  if (state.filters.date_to) {
    filtered = filtered.filter((t) => t.transaction_date <= state.filters.date_to!)
  }

  return filtered
}

/**
 * Get pending transactions count
 */
export const selectPendingCount = (state: FinanceState): number => {
  return state.transactions.filter(
    (t) => t.status === 'pending' || t.status === 'partial' || t.status === 'overdue'
  ).length
}

/**
 * Get overdue transactions count
 */
export const selectOverdueCount = (state: FinanceState): number => {
  return state.transactions.filter((t) => t.status === 'overdue').length
}

/**
 * Get teams with debt (negative balance)
 */
export const selectTeamsWithDebt = (state: FinanceState): FinanceTeamBalance[] => {
  return state.teamBalances.filter((b) => b.pending_balance > 0)
}

/**
 * Calculate total pending amount
 */
export const selectTotalPending = (state: FinanceState): number => {
  return state.transactions
    .filter((t) => !t.is_income && (t.status === 'pending' || t.status === 'partial' || t.status === 'overdue'))
    .reduce((sum, t) => sum + (t.amount - t.amount_paid), 0)
}

/**
 * Calculate total collected amount
 */
export const selectTotalCollected = (state: FinanceState): number => {
  return state.transactions
    .filter((t) => t.is_income && t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.amount, 0)
}
