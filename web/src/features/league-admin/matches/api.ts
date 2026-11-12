import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api/client'

import type {
  MatchWithRelations,
  UpdateMatchScheduleRequest,
  PostMatchResultRequest,
  PostRefereeReportRequest,
  TriggerEmbeddingRequest,
  AttendanceRecord,
  BulkCreateMatchesRequest,
  DeleteMatchesResponse,
  TeamSummary,
} from './types'

export interface Player {
  id: string
  name: string
  team_id?: string
  jersey_number?: number
}

export const matchKeys = {
  all: ['matches'] as const,
  byTournament: (tournamentId: string) => [...matchKeys.all, 'tournament', tournamentId] as const,
  byId: (id: string) => [...matchKeys.all, 'id', id] as const,
  attendance: (id: string) => [...matchKeys.all, 'id', id, 'attendance'] as const,
  refereeReport: (id: string) => [...matchKeys.all, 'id', id, 'referee-report'] as const,
}

export const teamKeys = {
  all: ['teams'] as const,
  players: (teamId: string) => [...teamKeys.all, 'players', teamId] as const,
}

/** Get all matches for a tournament (public, no auth required but filtered by publication). */
export function useTournamentMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.byTournament(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<MatchWithRelations>(`/tournaments/${tournamentId}/matches`, { limit: 1000 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** Get single match by ID (public). */
export function useMatchById(matchId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.byId(matchId ?? ''),
    queryFn: ({ signal }) => api.get<MatchWithRelations>(`/matches/${matchId}`, { signal }),
    enabled: Boolean(matchId),
  })
}

/** Get players for a team (public, used for result dialog roster selection). */
export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.players(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Player>(`/teams/${teamId}/players`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** How often the attendance monitor refreshes. */
export const ATTENDANCE_POLL_MS = 5000

/** Get attendance for a match (requires token). Polls while the monitor is mounted. */
export function useMatchAttendance(matchId: string | undefined) {
  return useQuery({
    refetchInterval: ATTENDANCE_POLL_MS,
    queryKey: matchKeys.attendance(matchId ?? ''),
    queryFn: ({ signal }) => api.list<AttendanceRecord>(`/matches/${matchId}/attendance`, { limit: 1000 }, { signal }),
    enabled: Boolean(matchId),
  })
}

/** Get referee report for a match (requires token). A 404 means "no report yet" and resolves to null. */
export function useMatchRefereeReport(matchId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.refereeReport(matchId ?? ''),
    queryFn: async ({ signal }): Promise<PostRefereeReportRequest | null> => {
      try {
        return await api.get<PostRefereeReportRequest>(`/matches/${matchId}/referee-report`, { signal })
      } catch (err) {
        if (err instanceof ApiError && err.isNotFound) return null
        throw err
      }
    },
    enabled: Boolean(matchId),
  })
}

/** Update match schedule (date, time, field, round). */
export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: UpdateMatchScheduleRequest }) =>
      api.patch<MatchWithRelations>(`/matches/${matchId}/schedule`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/** Delete match (DELETE /matches/{matchID}). */
export function useDeleteMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => api.delete(`/matches/${matchId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/** Post match result (goals, cards, incidents) — replaces semantics. */
export function usePostMatchResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: PostMatchResultRequest }) =>
      api.post<MatchWithRelations>(`/matches/${matchId}/result`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/** Publish match (PATCH /matches/{matchID}/publish). */
export function usePublishMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, isPublished }: { matchId: string; isPublished: boolean }) =>
      api.patch<MatchWithRelations>(`/matches/${matchId}/publish`, { is_published: isPublished }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/** Publish or unpublish all matches in a round (POST /tournaments/{tournamentID}/rounds/{round}/publish). */
export function usePublishRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tournamentId, round, isPublished = true }: { tournamentId: string; round: number; isPublished?: boolean }) =>
      api.post(`/tournaments/${tournamentId}/rounds/${round}/publish`, { is_published: isPublished }),
    onSuccess: (_, { tournamentId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.byTournament(tournamentId) })
    },
  })
}

/** Post referee report. */
export function usePostRefereeReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: PostRefereeReportRequest }) =>
      api.post<PostRefereeReportRequest>(`/matches/${matchId}/referee-report`, data),
    onSuccess: (_, { matchId }) => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.refereeReport(matchId) })
    },
  })
}

/** Trigger knowledge embedding (optional follow-up). */
export function useTriggerEmbedding() {
  return useMutation({
    mutationFn: (data: TriggerEmbeddingRequest) => api.post(`/knowledge/triggers`, data),
  })
}

/** Post match finalized notification (optional follow-up). */
export function usePostMatchFinalizedNotification() {
  return useMutation({
    mutationFn: (matchId: string) => api.post(`/notifications/matches/${matchId}/finalized`, {}),
  })
}

/**
 * Delete the matches of a tournament, optionally one round or one phase
 * (DELETE /tournaments/{id}/matches?round=N | ?phase=regular|playoffs). Finished
 * matches go too and the API rebuilds the standings.
 */
export function useDeleteTournamentMatches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tournamentId, round, phase }: { tournamentId: string; round?: number; phase?: 'regular' | 'playoffs' }) =>
      api.delete<DeleteMatchesResponse>(`/tournaments/${tournamentId}/matches`, {
        query: { round, phase },
      }),
    onSuccess: () => {
      // Matches, standings, stats and fixtures views all change.
      void queryClient.invalidateQueries()
    },
  })
}

/** Create several matches at once (POST /tournaments/{id}/matches/bulk). */
export function useBulkCreateMatches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tournamentId, matches }: { tournamentId: string; matches: BulkCreateMatchesRequest['matches'] }) =>
      api.post<unknown[]>(`/tournaments/${tournamentId}/matches/bulk`, { tournament_id: tournamentId, matches }),
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })
}

/** Teams of a league (id, name, tournament, active flag), used to analyse a calendar. */
export function useLeagueTeams(leagueId: string | undefined) {
  return useQuery({
    queryKey: [...teamKeys.all, 'league', leagueId ?? ''] as const,
    queryFn: ({ signal }) => api.list<TeamSummary>('/teams', { limit: 100 }, { signal, query: { league_id: leagueId } }),
    enabled: Boolean(leagueId),
  })
}
