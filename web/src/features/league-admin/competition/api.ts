import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError, type PageParams } from '@/lib/api/client'
import { toast } from 'sonner'

import type {
  FinanceConfig,
  League,
  LeagueSummary,
  PlayerStats,
  Standings,
  Suspension,
  TeamBalance,
  Tournament,
  Transaction,
  WhatsAppLink,
} from './types'

export const competitionKeys = {
  all: ['competition'] as const,
  tournaments: (leagueId: string) => [...competitionKeys.all, 'tournaments', leagueId] as const,
  tournament: (tournamentId: string) => [...competitionKeys.all, 'tournament', tournamentId] as const,
  standings: (tournamentId: string) => [...competitionKeys.all, 'standings', tournamentId] as const,
  topScorers: (tournamentId: string) => [...competitionKeys.all, 'topScorers', tournamentId] as const,
  discipline: (tournamentId: string) => [...competitionKeys.all, 'discipline', tournamentId] as const,
  suspensions: (leagueId: string) => [...competitionKeys.all, 'suspensions', leagueId] as const,
  suspension: (suspensionId: string) => [...competitionKeys.all, 'suspension', suspensionId] as const,
  whatsappLinks: (leagueId: string) => [...competitionKeys.all, 'whatsappLinks', leagueId] as const,
  financeConfig: (leagueId: string) => [...competitionKeys.all, 'financeConfig', leagueId] as const,
  transactions: (leagueId: string, page: PageParams) =>
    [...competitionKeys.all, 'transactions', leagueId, page] as const,
  transaction: (transactionId: string) => [...competitionKeys.all, 'transaction', transactionId] as const,
  teamBalance: (leagueId: string, page: PageParams) =>
    [...competitionKeys.all, 'teamBalance', leagueId, page] as const,
  leagueSummary: (leagueId: string) => [...competitionKeys.all, 'leagueSummary', leagueId] as const,
  league: (leagueId: string) => [...competitionKeys.all, 'league', leagueId] as const,
}

// TOURNAMENTS

export function useTournaments(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.tournaments(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<Tournament>(`/leagues/${leagueId}/tournaments`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useCreateTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Tournament>) => api.post<Tournament>('/tournaments', data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournaments(data.league_id) })
      toast.success('Torneo creado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTournament(tournamentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Tournament>) => api.patch<Tournament>(`/tournaments/${tournamentId}`, data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournament(tournamentId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournaments(data.league_id) })
      toast.success('Torneo actualizado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// STANDINGS

export function useStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.standings(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<Standings>(`/tournaments/${tournamentId}/standings`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

export function useAdjustPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { team_id: string; tournament_id: string; points_adjustment: number; adjustment_reason: string }) =>
      api.post<void>('/standings/adjust', data),
    onSuccess: (_, { tournament_id }) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.standings(tournament_id) })
      toast.success('Puntos ajustados correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// TOP SCORERS

export function useTopScorers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.topScorers(tournamentId ?? ''),
    queryFn: ({ signal }) =>
      api.list<PlayerStats>(`/tournaments/${tournamentId}/top-scorers`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

// DISCIPLINE

export function useDiscipline(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.discipline(tournamentId ?? ''),
    queryFn: ({ signal }) =>
      api.list<PlayerStats>(`/tournaments/${tournamentId}/discipline`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

// SUSPENSIONS

export function useSuspensions(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.suspensions(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<Suspension>(`/leagues/${leagueId}/suspensions`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useCreateSuspension() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { player_id: string; team_id: string; suspension_type: string; reason: string; matches_to_serve: number; notes?: string }) =>
      api.post<Suspension>('/suspensions', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspensions('*') })
      toast.success('Suspensión creada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateSuspension(suspensionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { matches_to_serve?: number; notes?: string }) =>
      api.put<Suspension>(`/suspensions/${suspensionId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspension(suspensionId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspensions('*') })
      toast.success('Suspensión actualizada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useCancelSuspension(suspensionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Suspension>(`/suspensions/${suspensionId}/cancel`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspension(suspensionId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspensions('*') })
      toast.success('Suspensión cancelada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// WHATSAPP LINKS

export function useWhatsAppLinks(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.whatsappLinks(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<WhatsAppLink>(`/leagues/${leagueId}/whatsapp-links`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useCreateWhatsAppLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { phone_number: string; role: string; display_name?: string; preferred_language: string }) =>
      api.post<WhatsAppLink>('/leagues/{leagueId}/whatsapp-links', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.whatsappLinks('*') })
      toast.success('Enlace de WhatsApp creado correctamente')
    },
    onError: (error: ApiError) => {
      if (error.status === 409) {
        toast.error('Este número de teléfono ya está registrado')
      } else {
        toast.error(error.message)
      }
    },
  })
}

export function useUpdateWhatsAppLink(linkId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { is_active?: boolean; display_name?: string; preferred_language?: string }) =>
      api.put<WhatsAppLink>(`/whatsapp-links/${linkId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.whatsappLinks('*') })
      toast.success('Enlace actualizado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteWhatsAppLink(linkId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<void>(`/whatsapp-links/${linkId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.whatsappLinks('*') })
      toast.success('Enlace eliminado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// FINANCE

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
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useTransactions(leagueId: string | undefined, page: PageParams = { limit: 25, offset: 0 }) {
  return useQuery({
    queryKey: competitionKeys.transactions(leagueId ?? '', page),
    queryFn: ({ signal }) => api.list<Transaction>(`/leagues/${leagueId}/finance/transactions`, page, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Transaction>) => api.post<Transaction>('/leagues/{leagueId}/finance/transactions', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transactions('*', {}) })
      toast.success('Transacción creada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useRegisterPayment(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: string; payment_method: string; payment_reference?: string }) =>
      api.post<Transaction>(`/leagues/{leagueId}/finance/transactions/${transactionId}/pay`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transaction(transactionId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transactions('*', {}) })
      toast.success('Pago registrado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useCancelTransaction(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      api.post<Transaction>(`/leagues/{leagueId}/finance/transactions/${transactionId}/cancel`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transaction(transactionId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transactions('*', {}) })
      toast.success('Transacción cancelada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useWaiveTransaction(transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      api.post<Transaction>(`/leagues/{leagueId}/finance/transactions/${transactionId}/waive`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transaction(transactionId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.transactions('*', {}) })
      toast.success('Transacción condonada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
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

// LEAGUE SETTINGS

export function useLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.league(leagueId ?? ''),
    queryFn: ({ signal }) => api.get<League>(`/leagues/${leagueId}`, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useUpdateLeague(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<League>) => api.patch<League>(`/leagues/${leagueId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.league(leagueId) })
      toast.success('Liga actualizada correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUploadLogo(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'league')
      return api.post<{ url: string }>('/storage/objects', formData)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.league(leagueId) })
      toast.success('Logo cargado correctamente')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}
