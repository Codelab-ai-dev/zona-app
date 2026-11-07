import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api/client'

import type {
  MatchWithRelations,
  UpdateMatchScheduleRequest,
  PostMatchResultRequest,
  PostRefereeReportRequest,
  TriggerEmbeddingRequest,
  AttendanceRecord,
} from './types'

export const matchKeys = {
  all: ['matches'] as const,
  byTournament: (tournamentId: string) => [...matchKeys.all, 'tournament', tournamentId] as const,
  byId: (id: string) => [...matchKeys.all, 'id', id] as const,
  attendance: (id: string) => [...matchKeys.all, 'id', id, 'attendance'] as const,
  refereeReport: (id: string) => [...matchKeys.all, 'id', id, 'referee-report'] as const,
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

/** Get attendance for a match (requires token). */
export function useMatchAttendance(matchId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.attendance(matchId ?? ''),
    queryFn: ({ signal }) => api.list<AttendanceRecord>(`/matches/${matchId}/attendance`, { limit: 1000 }, { signal }),
    enabled: Boolean(matchId),
  })
}

/** Get referee report for a match (requires token). */
export function useMatchRefereeReport(matchId: string | undefined) {
  return useQuery({
    queryKey: matchKeys.refereeReport(matchId ?? ''),
    queryFn: ({ signal }) => api.get<PostRefereeReportRequest>(`/matches/${matchId}/referee-report`, { signal }),
    enabled: Boolean(matchId),
  })
}

/** Update match schedule (date, time, field, round). */
export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: UpdateMatchScheduleRequest }) =>
      api.patch<MatchWithRelations>(`/matches/${matchId}/schedule`, data),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.byId(matchId) })
    },
  })
}

/** Delete match (DELETE /matches/{matchID}). */
export function useDeleteMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => api.delete(`/matches/${matchId}`),
    onSuccess: () => {
      // Invalidate all tournament matches; caller provides tournament context
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/** Post match result (goals, cards, incidents) — replaces semantics. */
export function usePostMatchResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: PostMatchResultRequest }) =>
      api.post<MatchWithRelations>(`/matches/${matchId}/result`, data),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.byId(matchId) })
    },
  })
}

/** Publish match (PATCH /matches/{matchID}/publish). */
export function usePublishMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, isPublished }: { matchId: string; isPublished: boolean }) =>
      api.patch<MatchWithRelations>(`/matches/${matchId}/publish`, { is_published: isPublished }),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.byId(matchId) })
    },
  })
}

/** Publish all matches in a round (POST /tournaments/{tournamentID}/rounds/{round}/publish). */
export function usePublishRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tournamentId, round }: { tournamentId: string; round: number }) =>
      api.post(`/tournaments/${tournamentId}/rounds/${round}/publish`, {}),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.byTournament(tournamentId) })
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
      queryClient.invalidateQueries({ queryKey: matchKeys.refereeReport(matchId) })
    },
  })
}

/** Trigger knowledge embedding (async, fire-and-forget). */
export function useTriggerEmbedding() {
  return useMutation({
    mutationFn: (data: TriggerEmbeddingRequest) => api.post(`/knowledge/triggers`, data),
  })
}

/** Post match finalized notification (optional, fire-and-forget). */
export function usePostMatchFinalizedNotification() {
  return useMutation({
    mutationFn: (matchId: string) => api.post(`/notifications/matches/${matchId}/finalized`, {}),
  })
}

/** Get stream of attendance updates via EventSource. Returns abort controller for cleanup. */
export function useAttendanceStream(matchId: string | undefined, onData: (record: AttendanceRecord) => void) {
  return useQuery({
    queryKey: matchKeys.attendance(matchId ?? 'stream'),
    queryFn: () => {
      return new Promise<void>((_resolve, reject) => {
        if (!matchId) {
          reject(new Error('Match ID required'))
          return
        }

        // EventSource cannot send Authorization headers, so if it fails, caller should fall back to polling
        const eventSource = new EventSource(`/api/v1/matches/${matchId}/attendance/stream`)
        eventSource.onmessage = (event) => {
          try {
            const record = JSON.parse(event.data) as AttendanceRecord
            onData(record)
          } catch (err) {
            console.error('Error parsing attendance event:', err)
          }
        }
        eventSource.onerror = () => {
          eventSource.close()
          reject(new Error('Attendance stream error — fall back to polling'))
        }
        // Keep stream open; this function never resolves unless there's an error
      })
    },
    enabled: Boolean(matchId),
    retry: false,
  })
}
