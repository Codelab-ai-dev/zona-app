import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api/client'
import { matchKeys } from '@/features/league-admin/matches/api'

import type {
  DuplicateMatchGroup,
  GenerateFixturesRequest,
  GenerateFixturesResponse,
  GeneratePlayoffsRequest,
  Match,
  StandingRow,
} from './types'

export interface TeamListItem {
  id: string
  name: string
  slug: string
  league_id: string
  tournament_id?: string
  is_active: boolean
  group_name?: string
}

/** Query keys for fixtures & playoffs area. */
export const fixturesKeys = {
  all: ['fixtures'] as const,
  duplicates: (tournamentId: string) => [...fixturesKeys.all, 'duplicates', tournamentId] as const,
  matches: (tournamentId: string, phase?: string) =>
    [...fixturesKeys.all, 'matches', tournamentId, phase ?? 'all'] as const,
  tournamentMatches: (tournamentId: string) => [...fixturesKeys.all, 'matches', tournamentId] as const,
  teams: (leagueId: string) => [...fixturesKeys.all, 'teams', leagueId] as const,
  standings: (tournamentId: string) => [...fixturesKeys.all, 'standings', tournamentId] as const,
}

/** Refreshes every matches query of the tournament, here and in the calendar. */
function invalidateTournamentMatches(queryClient: QueryClient, tournamentId: string) {
  queryClient.invalidateQueries({ queryKey: fixturesKeys.tournamentMatches(tournamentId) })
  queryClient.invalidateQueries({ queryKey: matchKeys.byTournament(tournamentId) })
}

/** Field-level 422s are rendered next to the fields by the caller; everything else is toasted. */
function showUnlessFieldErrors(fallback: string) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.isValidation && Object.keys(error.fields).length > 0) return
    toast.error(error instanceof ApiError ? error.message : fallback)
  }
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
        tournament_id: req.tournament_id,
        teams: req.teams,
        groups: req.groups,
        is_double_round: req.is_double_round,
        schedule: req.schedule,
        dry_run: req.dry_run,
      }),
    onSuccess: (data, req) => {
      // A preview saves nothing: no refresh and no toast.
      if (req.dry_run) return
      invalidateTournamentMatches(queryClient, req.tournament_id)
      queryClient.invalidateQueries({ queryKey: fixturesKeys.duplicates(req.tournament_id) })
      toast.success(`Se generaron ${data.matches.length} partidos en ${data.rounds} jornadas`)
    },
    onError: showUnlessFieldErrors('Error al generar fixtures'),
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
        tournament_id: req.tournament_id,
        num_teams: req.num_teams,
        // The Go API decodes start_date into time.Time (RFC 3339), not a bare date.
        start_date: `${req.start_date}T00:00:00Z`,
        start_time: req.start_time,
        field_number: req.field_number,
        third_place_match: req.third_place_match,
        home_and_away: req.home_and_away,
        ...(req.team_ids ? { team_ids: req.team_ids } : {}),
      }),
    onSuccess: (data, req) => {
      invalidateTournamentMatches(queryClient, req.tournament_id)
      toast.success(`Llave generada con ${data.length} partidos`)
    },
    onError: showUnlessFieldErrors('Error al generar llave'),
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
    queryKey: fixturesKeys.matches(tournamentId, filters?.phase),
    queryFn: ({ signal }) =>
      api.list<Match>(`/tournaments/${tournamentId}/matches`, { limit: 1000 }, { signal, query: filters }),
    enabled: Boolean(tournamentId),
  })
}

/**
 * Optional follow-ups after generating fixtures (knowledge base refresh and
 * WhatsApp notification). Never throws; resolves false if any of them failed.
 */
export async function runFixtureFollowUps(leagueId: string, tournamentId: string, round: number): Promise<boolean> {
  const results = await Promise.allSettled([
    api.post('/knowledge/triggers', {
      trigger_type: 'jornada_update',
      league_id: leagueId,
      tournament_id: tournamentId,
      round,
    }),
    api.post(`/notifications/leagues/${leagueId}`, { league_id: leagueId, tournament_id: tournamentId, round }),
  ])
  return results.every((r) => r.status === 'fulfilled')
}

/** Standings of a tournament in table order (used to load the teams qualified from the groups). */
export function useTournamentStandings(tournamentId: string, enabled = true) {
  return useQuery({
    queryKey: fixturesKeys.standings(tournamentId),
    queryFn: ({ signal }) => api.list<StandingRow>(`/tournaments/${tournamentId}/standings`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId) && enabled,
  })
}
