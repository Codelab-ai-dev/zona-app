import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type PageParams } from '@/lib/api/client'

import type { Clip, DirectUploadResponse, Recording, Stream } from './types'

export const playKeys = {
  recordings: ['play', 'recordings'] as const,
  recordingsList: (page: PageParams, filters?: { q?: string; teamId?: string; leagueId?: string }) =>
    [...playKeys.recordings, 'list', page, filters] as const,
  recordingsDetail: (id: string) => [...playKeys.recordings, id] as const,
  clips: ['play', 'clips'] as const,
  clipsList: (page: PageParams) => [...playKeys.clips, 'list', page] as const,
  clipsDetail: (id: string) => [...playKeys.clips, id] as const,
  streams: ['play', 'streams'] as const,
  streamsList: (page: PageParams) => [...playKeys.streams, 'list', page] as const,
  streamsDetail: (id: string) => [...playKeys.streams, id] as const,
}

// ===== Recordings (Videos) =====

export function useRecordings(
  page: PageParams = { limit: 10, offset: 0 },
  filters?: { q?: string; teamId?: string; leagueId?: string },
) {
  return useQuery({
    queryKey: playKeys.recordingsList(page, filters),
    queryFn: ({ signal }) => {
      const query: Record<string, string> = {}
      if (filters?.q) query.q = filters.q
      if (filters?.teamId) query.team_id = filters.teamId
      if (filters?.leagueId) query.league_id = filters.leagueId
      return api.list<Recording>('/play/videos', page, { signal, query })
    },
    placeholderData: keepPreviousData,
  })
}

export function useRecording(id: string) {
  return useQuery({
    queryKey: playKeys.recordingsDetail(id),
    queryFn: ({ signal }) => api.get<Recording>(`/play/videos/${encodeURIComponent(id)}`, { signal }),
    enabled: id !== '',
  })
}

export function useCreateRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; description?: string; league_id?: string; match_id?: string; tournament_id?: string; source_type: string }) => {
      return api.post<DirectUploadResponse>('/play/upload', body)
    },
    onSuccess: () => {
      toast.success('Video subido exitosamente')
      void queryClient.invalidateQueries({ queryKey: playKeys.recordings })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al subir el video'
      toast.error(message)
    },
  })
}

export function useUpdateRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string; thumbnail_url?: string; visibility?: string; is_premium?: boolean; price_cents?: number; home_score?: number; away_score?: number; published_at?: string }) => {
      return api.patch<Recording>(`/play/videos/${encodeURIComponent(id)}`, body)
    },
    onSuccess: (data) => {
      toast.success('Video actualizado')
      void queryClient.invalidateQueries({ queryKey: playKeys.recordings })
      void queryClient.setQueryData(playKeys.recordingsDetail(data.id), data)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar el video'
      toast.error(message)
    },
  })
}

export function useDeleteRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/play/videos/${encodeURIComponent(id)}`)
    },
    onSuccess: () => {
      toast.success('Video eliminado')
      void queryClient.invalidateQueries({ queryKey: playKeys.recordings })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al eliminar el video'
      toast.error(message)
    },
  })
}

export function useRefreshRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<Recording>(`/play/videos/${encodeURIComponent(id)}/refresh`)
    },
    onSuccess: (data) => {
      toast.success('Video actualizado')
      void queryClient.setQueryData(playKeys.recordingsDetail(data.id), data)
      void queryClient.invalidateQueries({ queryKey: playKeys.recordings })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar el video'
      toast.error(message)
    },
  })
}

// ===== Clips =====

export function useClips(page: PageParams = { limit: 20, offset: 0 }) {
  return useQuery({
    queryKey: playKeys.clipsList(page),
    queryFn: ({ signal }) => api.list<Clip>('/play/clips', page, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useClip(id: string) {
  return useQuery({
    queryKey: playKeys.clipsDetail(id),
    queryFn: ({ signal }) => api.get<Clip>(`/play/clips/${encodeURIComponent(id)}`, { signal }),
    enabled: id !== '',
  })
}

export function useCreateClip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; recording_id?: string; start_time_seconds: number; end_time_seconds: number; description?: string; clip_type?: string; match_minute?: number; player_id?: string; team_id?: string; ai_generated?: boolean; ai_confidence?: number }) => {
      return api.post<Clip>('/play/clips', body)
    },
    onSuccess: () => {
      toast.success('Clip creado exitosamente')
      void queryClient.invalidateQueries({ queryKey: playKeys.clips })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al crear el clip'
      toast.error(message)
    },
  })
}

export function useDeleteClip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/play/clips/${encodeURIComponent(id)}`)
    },
    onSuccess: () => {
      toast.success('Clip eliminado')
      void queryClient.invalidateQueries({ queryKey: playKeys.clips })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al eliminar el clip'
      toast.error(message)
    },
  })
}

// ===== Streams =====

export function useStreams(page: PageParams = { limit: 20, offset: 0 }) {
  return useQuery({
    queryKey: playKeys.streamsList(page),
    queryFn: ({ signal }) => api.list<Stream>('/play/streams', page, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useStream(id: string) {
  return useQuery({
    queryKey: playKeys.streamsDetail(id),
    queryFn: ({ signal }) => api.get<Stream>(`/play/streams/${encodeURIComponent(id)}`, { signal }),
    enabled: id !== '',
  })
}

export function useCreateStream() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; description?: string; source_type: string; league_id?: string; match_id?: string; is_pay_per_view?: boolean; price_cents?: number; scheduled_start?: string }) => {
      return api.post<Stream>('/play/streams', body)
    },
    onSuccess: () => {
      toast.success('Transmisión creada exitosamente')
      void queryClient.invalidateQueries({ queryKey: playKeys.streams })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al crear la transmisión'
      toast.error(message)
    },
  })
}

export function useUpdateStream() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string; status?: string }) => {
      return api.patch<Stream>(`/play/streams/${encodeURIComponent(id)}`, body)
    },
    onSuccess: (data) => {
      toast.success('Transmisión actualizada')
      void queryClient.invalidateQueries({ queryKey: playKeys.streams })
      void queryClient.setQueryData(playKeys.streamsDetail(data.id), data)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al actualizar la transmisión'
      toast.error(message)
    },
  })
}

export function useDeleteStream() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/play/streams/${encodeURIComponent(id)}`)
    },
    onSuccess: () => {
      toast.success('Transmisión eliminada')
      void queryClient.invalidateQueries({ queryKey: playKeys.streams })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al eliminar la transmisión'
      toast.error(message)
    },
  })
}
