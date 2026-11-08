import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type ApiError } from '@/lib/api/client'

import { competitionKeys } from './keys'

/** Manual (extemporaneous) stats of a player in a tournament: GET /tournaments/{id}/manual-stats. */
export interface ManualStats {
  player_id: string
  player_name: string
  jersey_number: number
  team_id: string
  team_name: string
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
}

export interface ManualStatsInput {
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
}

/** Body of PUT /tournaments/{id}/standings/{teamID}: the totals the table must show. */
export interface StandingsEditInput {
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  reason: string
}

const onError = (error: ApiError) => {
  toast.error(error.message)
}

export function useManualStats(tournamentId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.manualStats(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<ManualStats>(`/tournaments/${tournamentId}/manual-stats`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** All zeros deletes the player's manual stats. */
export function useSetManualStats(tournamentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ playerId, ...data }: ManualStatsInput & { playerId: string }) =>
      api.put<void>(`/tournaments/${tournamentId}/players/${playerId}/manual-stats`, data),
    onSuccess: (_, { goals, assists, yellow_cards, red_cards }) => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.manualStats(tournamentId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.topScorers(tournamentId) })
      void queryClient.invalidateQueries({ queryKey: competitionKeys.discipline(tournamentId) })
      const removed = goals + assists + yellow_cards + red_cards === 0
      toast.success(removed ? 'Estadísticas manuales eliminadas' : 'Estadísticas actualizadas correctamente')
    },
    // The dialogs show 422 field errors inline.
    onError: (error: ApiError) => {
      if (error.status !== 422) onError(error)
    },
  })
}

export function useSetStandings(tournamentId: string, teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StandingsEditInput) => api.put<void>(`/tournaments/${tournamentId}/standings/${teamId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.standings(tournamentId) })
      toast.success('Estadísticas del equipo actualizadas')
    },
    onError: (error: ApiError) => {
      if (error.status !== 422) onError(error)
    },
  })
}

/** DELETE /leagues/{id}/suspensions: removes every suspension of the league. */
export function useClearSuspensions(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ deleted: number }>(`/leagues/${leagueId}/suspensions`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.suspensions(leagueId) })
      toast.success('Todas las suspensiones han sido eliminadas')
    },
    onError,
  })
}
