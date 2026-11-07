import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api/client'

import { teamsKeys } from './api'
import type { Player, PlayerVerification, VerifyPlayerRequest } from './types'

export const verificationKeys = {
  players: (teamId: string) => [...teamsKeys.all, 'players', teamId] as const,
  player: (playerId: string) => [...teamsKeys.all, 'verification', playerId] as const,
}

/** Roster of a team (GET /teams/{id}/players, public). */
export function useTeamPlayers(teamId: string) {
  return useQuery({
    queryKey: verificationKeys.players(teamId),
    queryFn: ({ signal }) => api.list<Player>(`/teams/${teamId}/players`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Verification status and (private) document key of one player. */
export function usePlayerVerification(playerId: string) {
  return useQuery({
    queryKey: verificationKeys.player(playerId),
    queryFn: ({ signal }) => api.get<PlayerVerification>(`/players/${playerId}/verification`, { signal }),
  })
}

/**
 * Upload the identity document to the private `player_document` scope, then
 * attach it to the player (PATCH with verified:false) so it can be reviewed.
 */
export function useUploadPlayerDocument(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      form.append('scope', 'player_document')
      form.append('scope_id', playerId)
      const object = await api.post<{ key: string }>('/storage/objects', form)
      const body: VerifyPlayerRequest = { verified: false, document_key: object.key }
      return api.patch<PlayerVerification>(`/players/${playerId}/verification`, body)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: verificationKeys.player(playerId) }),
  })
}

/** League admin decision. Verifying requires the player's own document key. */
export function useDecideVerification(playerId: string, teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: VerifyPlayerRequest) => api.patch<PlayerVerification>(`/players/${playerId}/verification`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.player(playerId) })
      queryClient.invalidateQueries({ queryKey: verificationKeys.players(teamId) })
    },
  })
}

/** Short-lived presigned link to a private document. Never store or build it. */
export function useDocumentUrl() {
  return useMutation({
    mutationFn: (key: string) => api.get<{ url: string }>('/storage/url', { query: { key } }),
  })
}
