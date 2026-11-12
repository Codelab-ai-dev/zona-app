import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'

import { api } from '@/lib/api/client'

import { teamsKeys } from './api'
import type {
  LeaguePlayerVerification,
  PlayerVerification,
  VerificationStatus,
  VerificationSummary,
  VerifyPlayerRequest,
} from './types'

export interface VerificationFilters {
  status: VerificationStatus | ''
  teamId: string
  q: string
  /** Only players of tournaments with age validation (the original's behaviour). */
  ageOnly: boolean
  limit: number
  offset: number
}

const leagueRoot = (leagueId: string) => [...teamsKeys.all, 'league-verification', leagueId] as const

export const verificationKeys = {
  league: leagueRoot,
  list: (leagueId: string, filters: VerificationFilters) => [...leagueRoot(leagueId), 'list', filters] as const,
  summary: (leagueId: string, ageOnly: boolean) => [...leagueRoot(leagueId), 'summary', ageOnly] as const,
}

/** League-wide verification list (GET /leagues/{id}/players/verification). */
export function useLeagueVerification(leagueId: string, filters: VerificationFilters) {
  return useQuery({
    queryKey: verificationKeys.list(leagueId, filters),
    queryFn: ({ signal }) =>
      api.list<LeaguePlayerVerification>(
        `/leagues/${leagueId}/players/verification`,
        { limit: filters.limit, offset: filters.offset },
        { query: { status: filters.status, team_id: filters.teamId, q: filters.q, age_validation: filters.ageOnly ? 'true' : '' }, signal },
      ),
    enabled: Boolean(leagueId),
    placeholderData: keepPreviousData,
  })
}

/** Counters of the league (GET /leagues/{id}/players/verification/summary). */
export function useVerificationSummary(leagueId: string, ageOnly: boolean) {
  return useQuery({
    queryKey: verificationKeys.summary(leagueId, ageOnly),
    queryFn: ({ signal }) => api.get<VerificationSummary>(`/leagues/${leagueId}/players/verification/summary`, { query: { age_validation: ageOnly ? 'true' : '' }, signal }),
    enabled: Boolean(leagueId),
  })
}

function useRefreshLeagueVerification(leagueId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: verificationKeys.league(leagueId) })
}

/**
 * Upload the identity document to the private `player_document` scope, then
 * attach it to the player (PATCH with verified:false) so it can be reviewed.
 */
export function useUploadPlayerDocument(leagueId: string) {
  const refresh = useRefreshLeagueVerification(leagueId)
  return useMutation({
    mutationFn: async ({ playerId, file }: { playerId: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('scope', 'player_document')
      form.append('scope_id', playerId)
      const object = await api.post<{ key: string }>('/storage/objects', form)
      const body: VerifyPlayerRequest = { verified: false, document_key: object.key }
      return api.patch<PlayerVerification>(`/players/${playerId}/verification`, body)
    },
    onSuccess: refresh,
  })
}

/** League admin decision. Verifying requires the player's own document key. */
export function useDecideVerification(leagueId: string) {
  const refresh = useRefreshLeagueVerification(leagueId)
  return useMutation({
    mutationFn: ({ playerId, body }: { playerId: string; body: VerifyPlayerRequest }) =>
      api.patch<PlayerVerification>(`/players/${playerId}/verification`, body),
    onSuccess: refresh,
  })
}

/**
 * Original flow: save the birth date (PATCH /players/{id}) and, when asked and
 * a document exists, verify the player right after.
 */
export function useSaveBirthDate(leagueId: string) {
  const refresh = useRefreshLeagueVerification(leagueId)
  return useMutation({
    mutationFn: async (params: { playerId: string; birthDate: string; verifyWith?: string }) => {
      await api.patch(`/players/${params.playerId}`, { birth_date: params.birthDate })
      if (!params.verifyWith) return
      const body: VerifyPlayerRequest = { verified: true, document_key: params.verifyWith }
      await api.patch<PlayerVerification>(`/players/${params.playerId}/verification`, body)
    },
    // The date is saved even when verifying fails: refresh in both cases.
    onSettled: refresh,
  })
}

/** Short-lived presigned link to a private document. Never store or build it. */
export function useDocumentUrl(key: string | undefined) {
  return useQuery({
    queryKey: [...teamsKeys.all, 'document-url', key],
    queryFn: ({ signal }) => api.get<{ url: string }>('/storage/url', { query: { key }, signal }),
    enabled: Boolean(key),
    staleTime: 0,
    gcTime: 0,
  })
}
