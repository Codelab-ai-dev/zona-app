import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { leagueKeys } from '@/features/leagues/api'
import { api, type ApiError } from '@/lib/api/client'

import { competitionKeys } from './keys'
import type { PlayerStats, Standings, Suspension, Tournament } from './types'

export * from './admin-api'
export * from './finance-api'
export * from './stats-api'
export { competitionKeys } from './keys'

const onError = (error: ApiError) => {
  toast.error(error.message)
}

// TOURNAMENTS

export function useTournaments(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.tournaments(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<Tournament>(`/leagues/${leagueId}/tournaments`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

export type TournamentInput = Partial<Omit<Tournament, 'id' | 'created_at' | 'updated_at'>>

export function useCreateTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TournamentInput) => api.post<Tournament>('/tournaments', data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournaments(data.league_id) })
      void queryClient.invalidateQueries({ queryKey: leagueKeys.all })
      toast.success(`Torneo "${data.name}" creado exitosamente`)
    },
    onError,
  })
}

/** `message` builds the success toast from the updated tournament (default: generic update text). */
export function useUpdateTournament(tournamentId: string, message?: (updated: Tournament) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TournamentInput) => api.patch<Tournament>(`/tournaments/${tournamentId}`, data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournament(tournamentId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.tournaments(data.league_id) })
      void queryClient.invalidateQueries({ queryKey: leagueKeys.all })
      toast.success(message ? message(data) : `Torneo "${data.name}" actualizado exitosamente`)
    },
    onError,
  })
}

/** Permanently deletes a tournament (its matches and stats go with it). */
export function useDeleteTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tournamentId: string) => api.delete(`/tournaments/${tournamentId}`),
    onSuccess: () => {
      // Matches, standings and team links of several areas change at once.
      void queryClient.invalidateQueries()
      toast.success('Torneo eliminado')
    },
    onError,
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
    onError,
  })
}

// TOP SCORERS / DISCIPLINE

export function useTopScorers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.topScorers(tournamentId ?? ''),
    queryFn: ({ signal }) =>
      api.list<PlayerStats>(`/tournaments/${tournamentId}/top-scorers`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

export function useDiscipline(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.discipline(tournamentId ?? ''),
    queryFn: ({ signal }) =>
      api.list<PlayerStats>(`/tournaments/${tournamentId}/discipline`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

// SUSPENSIONS

const suspensionsKey = [...competitionKeys.all, 'suspensions'] as const

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
    mutationFn: (data: {
      player_id: string
      team_id: string
      suspension_type: string
      reason: string
      matches_to_serve: number
      notes?: string
    }) => api.post<Suspension>('/suspensions', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suspensionsKey })
      toast.success('Suspensión creada exitosamente')
    },
    onError,
  })
}

export function useUpdateSuspension(suspensionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { matches_to_serve?: number; notes?: string }) =>
      api.put<Suspension>(`/suspensions/${suspensionId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suspensionsKey })
      toast.success('Suspensión actualizada exitosamente')
    },
    onError,
  })
}

export function useCancelSuspension(suspensionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Suspension>(`/suspensions/${suspensionId}/cancel`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suspensionsKey })
      toast.success('Suspensión cancelada exitosamente')
    },
    onError,
  })
}

export function useCompleteSuspension(suspensionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Suspension>(`/suspensions/${suspensionId}/complete`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suspensionsKey })
      toast.success('Suspensión completada exitosamente')
    },
    onError,
  })
}
