import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { leagueKeys } from '@/features/leagues/api'
import { api, type ApiError } from '@/lib/api/client'

import { competitionKeys } from './keys'
import type { League, WhatsAppLink } from './types'

const onError = (error: ApiError) => {
  toast.error(error.message)
}

const whatsappKey = [...competitionKeys.all, 'whatsappLinks'] as const

// WHATSAPP LINKS

export function useWhatsAppLinks(leagueId: string | undefined) {
  return useQuery({
    queryKey: competitionKeys.whatsappLinks(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<WhatsAppLink>(`/leagues/${leagueId}/whatsapp-links`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

export function useCreateWhatsAppLink(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      phone_number: string
      role: string
      display_name?: string
      preferred_language: string
      user_id?: string
      tournament_id?: string
    }) =>
      api.post<WhatsAppLink>(`/leagues/${leagueId}/whatsapp-links`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: whatsappKey })
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
    // tournament_id: the nil UUID (NO_TOURNAMENT) clears the tournament.
    mutationFn: (data: { is_active?: boolean; display_name?: string; preferred_language?: string; tournament_id?: string }) =>
      api.put<WhatsAppLink>(`/whatsapp-links/${linkId}`, data),
    onSuccess: (_, { is_active }) => {
      void queryClient.invalidateQueries({ queryKey: whatsappKey })
      toast.success(
        is_active === undefined ? 'Enlace actualizado correctamente' : is_active ? 'Enlace activado' : 'Enlace desactivado',
      )
    },
    onError,
  })
}

export const NO_TOURNAMENT = '00000000-0000-0000-0000-000000000000'

/** A user of the league (GET /leagues/{id}/users), to link a number to an account. */
export interface LeagueUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

export function useLeagueUsers(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: [...competitionKeys.all, 'leagueUsers', leagueId] as const,
    queryFn: ({ signal }) => api.list<LeagueUser>(`/leagues/${leagueId}/users`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId) && enabled,
  })
}

export function useDeleteWhatsAppLink(linkId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<void>(`/whatsapp-links/${linkId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: whatsappKey })
      toast.success('Enlace eliminado correctamente')
    },
    onError,
  })
}

/** POST /notifications/leagues/{id}: sends the round's fixtures to every active link. */
export interface BroadcastSummary {
  sent: number
  failed: number
  skipped: number
}

export function useBroadcastRound(leagueId: string) {
  return useMutation({
    mutationFn: (data: { tournament_id: string; round: number }) =>
      api.post<BroadcastSummary>(`/notifications/leagues/${leagueId}`, { league_id: leagueId, ...data }),
    onError,
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
    mutationFn: (data: Partial<Pick<League, 'name' | 'slug' | 'description' | 'logo'>>) =>
      api.patch<League>(`/leagues/${leagueId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: competitionKeys.league(leagueId) })
      // The league selector and the rest of the app read the league from here.
      void queryClient.invalidateQueries({ queryKey: leagueKeys.all })
      toast.success('Liga actualizada correctamente')
    },
    onError,
  })
}

/** Uploads to POST /storage/objects (multipart: file, scope, scope_id) and returns the public URL. */
export function useUploadLogo(leagueId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'league')
      formData.append('scope_id', leagueId)
      return api.post<{ key: string; url?: string; is_public: boolean }>('/storage/objects', formData)
    },
    onError,
  })
}
