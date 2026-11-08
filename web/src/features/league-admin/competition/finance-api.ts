import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type ApiError, type PageParams } from '@/lib/api/client'

import { competitionKeys } from './keys'
import type { FinanceConfig, LeagueSummary, TeamBalance, Transaction } from './types'

const onError = (error: ApiError) => {
  toast.error(error.message)
}

/** Any money movement changes the list, the summary cards and the balances. */
function invalidateFinance(queryClient: QueryClient) {
  for (const key of ['transactions', 'leagueSummary', 'teamBalance']) {
    void queryClient.invalidateQueries({ queryKey: [...competitionKeys.all, key] })
  }
}

export function useFinanceConfig(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.financeConfig(leagueId ?? ''),
    queryFn: ({ signal }) => api.get<FinanceConfig>(`/leagues/${leagueId}/finance/config`, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useUpdateFinanceConfig(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FinanceConfig>) => api.put<FinanceConfig>(`/leagues/${leagueId}/finance/config`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.financeConfig(leagueId) })
      toast.success('Configuración financiera actualizada correctamente')
    },
    onError,
  })
}

/** Server-side filters of GET /leagues/{id}/finance/transactions (empty or "all" = no filter). */
export interface TransactionFilters {
  status?: string
  transaction_type?: string
}

const activeFilters = (filters: TransactionFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'all'))

export function useTransactions(
  leagueId: string | undefined,
  page: PageParams = { limit: 25, offset: 0 },
  filters: TransactionFilters = {},
) {
  const query = activeFilters(filters)
  return useQuery({
    queryKey: competitionKeys.transactions(leagueId ?? '', page, query),
    queryFn: ({ signal }) => api.list<Transaction>(`/leagues/${leagueId}/finance/transactions`, page, { signal, query }),
    enabled: Boolean(leagueId),
  })
}

/** GET /leagues/{id}/finance/teams/{teamID}/transactions: the statement of one team. */
export function useTeamTransactions(leagueId: string, teamId: string) {
  return useQuery({
    queryKey: competitionKeys.teamTransactions(leagueId, teamId),
    queryFn: ({ signal }) =>
      api.list<Transaction>(`/leagues/${leagueId}/finance/teams/${teamId}/transactions`, { limit: 100, offset: 0 }, { signal }),
  })
}

/** GET /leagues/{id}/finance/teams/{teamID}/balance */
export function useTeamBalance(leagueId: string, teamId: string) {
  return useQuery({
    queryKey: competitionKeys.oneTeamBalance(leagueId, teamId),
    queryFn: ({ signal }) => api.get<TeamBalance>(`/leagues/${leagueId}/finance/teams/${teamId}/balance`, { signal }),
  })
}

/** Body of POST /leagues/{id}/finance/transactions. `amount` is a decimal string. */
export interface CreateTransactionInput {
  transaction_type: string
  description: string
  amount: string
  is_income: boolean
  team_id?: string
  notes?: string
}

export function useCreateTransaction(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      api.post<Transaction>(`/leagues/${leagueId}/finance/transactions`, data),
    onSuccess: () => {
      invalidateFinance(queryClient)
      toast.success('Movimiento creado correctamente')
    },
    onError,
  })
}

export function useRegisterPayment(leagueId: string, transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: string; payment_method: string; payment_reference?: string }) =>
      api.post<Transaction>(`/leagues/${leagueId}/finance/transactions/${transactionId}/pay`, data),
    onSuccess: () => {
      invalidateFinance(queryClient)
      toast.success('Pago registrado correctamente')
    },
    onError,
  })
}

export function useCancelTransaction(leagueId: string, transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      api.post<Transaction>(`/leagues/${leagueId}/finance/transactions/${transactionId}/cancel`, data),
    onSuccess: () => {
      invalidateFinance(queryClient)
      toast.success('Transacción cancelada correctamente')
    },
    onError,
  })
}

export function useWaiveTransaction(leagueId: string, transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      api.post<Transaction>(`/leagues/${leagueId}/finance/transactions/${transactionId}/waive`, data),
    onSuccess: () => {
      invalidateFinance(queryClient)
      toast.success('Transacción condonada correctamente')
    },
    onError,
  })
}

export function useTeamBalances(leagueId: string | undefined, page: PageParams = { limit: 25, offset: 0 }) {
  return useQuery({
    queryKey: competitionKeys.teamBalance(leagueId ?? '', page),
    queryFn: ({ signal }) => api.list<TeamBalance>(`/leagues/${leagueId}/finance/balances`, page, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useLeagueSummary(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.leagueSummary(leagueId ?? ''),
    queryFn: ({ signal }) => api.get<LeagueSummary>(`/leagues/${leagueId}/finance/summary`, { signal }),
    enabled: Boolean(leagueId),
  })
}
