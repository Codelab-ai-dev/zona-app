import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api/client'

import type {
  DuplicateMatchGroup,
  GenerateFixturesRequest,
  GenerateFixturesResponse,
  GeneratePlayoffsRequest,
  Match,
} from './types'

export interface TeamListItem {
  id: string
  name: string
  slug: string
  league_id: string
  tournament_id?: string
  is_active: boolean
}

/** Query keys for fixtures & playoffs area. */
export const fixturesKeys = {
  all: ['fixtures'] as const,
  duplicates: (tournamentId: string) => [...fixturesKeys.all, 'duplicates', tournamentId] as const,
  matches: (tournamentId: string) => [...fixturesKeys.all, 'matches', tournamentId] as const,
  playoffMatches: (tournamentId: string) => [...fixturesKeys.matches(tournamentId), 'playoffs'] as const,
  teams: (leagueId: string) => [...fixturesKeys.all, 'teams', leagueId] as const,
}

/**
 * Get teams for a league (filtered by league_id and is_active).
 */
export function useTeamsByLeague(leagueId: string) {
  return useQuery({
    queryKey: fixturesKeys.teams(leagueId),
    queryFn: ({ signal }) => api.list<TeamListItem>('/teams', { limit: 100 }, { signal, query: { league_id: leagueId } }),
    enabled: Boolean(leagueId),
  })
}

/**
 * Generate fixtures for a tournament (round-robin algorithm runs on server).
 */
export function useGenerateFixtures() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: GenerateFixturesRequest) =>
      api.post<GenerateFixturesResponse>(`/tournaments/${req.tournament_id}/fixtures/generate`, {
        teams: req.teams,
        is_double_round: req.is_double_round,
        schedule: req.schedule,
      }),
    onSuccess: (data, req) => {
      // Invalidate tournament matches to refresh the list
      queryClient.invalidateQueries({ queryKey: fixturesKeys.matches(req.tournament_id) })
      toast.success(`Se generaron ${data.matches.length} partidos en ${data.rounds} jornadas`)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Error al generar fixtures'
      toast.error(message)
    },
  })
}

/**
 * Generate playoff bracket for a tournament.
 */
export function useGeneratePlayoffs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: GeneratePlayoffsRequest) =>
      api.post<Match[]>(`/tournaments/${req.tournament_id}/playoffs/generate`, {
        num_teams: req.num_teams,
        start_date: req.start_date,
        start_time: req.start_time,
        field_number: req.field_number,
        third_place_match: req.third_place_match,
        home_and_away: req.home_and_away,
      }),
    onSuccess: (data, req) => {
      // Invalidate tournament matches to refresh the playoff list
      queryClient.invalidateQueries({ queryKey: fixturesKeys.playoffMatches(req.tournament_id) })
      toast.success(`Llave generada con ${data.length} partidos`)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Error al generar llave'
      toast.error(message)
    },
  })
}

/**
 * Check for duplicate matches in a tournament.
 */
export function useDuplicateMatches(tournamentId: string) {
  return useQuery({
    queryKey: fixturesKeys.duplicates(tournamentId),
    queryFn: ({ signal }) => api.get<DuplicateMatchGroup[]>(`/tournaments/${tournamentId}/duplicates`, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/**
 * Get all matches for a tournament (for visualization).
 */
export function useTournamentMatches(tournamentId: string, filters?: { phase?: string }) {
  return useQuery({
    queryKey: fixturesKeys.matches(tournamentId),
    queryFn: ({ signal }) =>
      api.list<Match>(`/tournaments/${tournamentId}/matches`, { limit: 1000 }, { signal, query: filters }),
    enabled: Boolean(tournamentId),
  })
}

/**
 * Trigger knowledge base update for a round (optional, non-blocking).
 */
export function triggerJornadaEmbedding(leagueId: string, tournamentId: string, round: number) {
  return api
    .post(`/knowledge/triggers`, { trigger_type: 'jornada_update', league_id: leagueId, tournament_id: tournamentId, round })
    .catch((err) => {
      console.warn('Failed to trigger knowledge embedding:', err)
      toast.warning('No se pudo actualizar la base de conocimiento')
    })
}

/**
 * Send WhatsApp notification after fixture generation (optional, non-blocking).
 */
export function sendFixtureNotification(leagueId: string) {
  return api
    .post(`/notifications/leagues/${leagueId}`, { type: 'fixtures_generated' })
    .catch((err) => {
      console.warn('Failed to send notification:', err)
      toast.warning('No se pudo enviar la notificación')
    })
}
