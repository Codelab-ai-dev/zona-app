import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type PageParams } from '@/lib/api/client'

import type {
  CreateTeamRequest,
  CreateUserRequest,
  PlayerRegistrationRequest,
  QRBatchUpdateRequest,
  ReviewPlayerRegistrationRequest,
  Team,
  UpdateTeamRequest,
} from './types'

/** Query keys for teams feature. */
export const teamsKeys = {
  all: ['teams'] as const,
  list: (leagueId: string, page: PageParams) => [...teamsKeys.all, 'list', leagueId, page] as const,
  byId: (teamId: string) => [...teamsKeys.all, teamId] as const,
  requests: (tournamentId: string, page: PageParams) => [...teamsKeys.all, 'requests', tournamentId, page] as const,
}

/** Get all teams in a league (paginated). */
export function useTeamsByLeague(leagueId: string, page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: teamsKeys.list(leagueId, page),
    queryFn: ({ signal }) =>
      api.list<Team>('/teams', { limit: page.limit, offset: page.offset }, { query: { league_id: leagueId }, signal }),
    enabled: Boolean(leagueId),
  })
}

/** Get a single team by ID. */
export function useTeamById(teamId: string) {
  return useQuery({
    queryKey: teamsKeys.byId(teamId),
    queryFn: ({ signal }) => api.get<Team>(`/teams/${teamId}`, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Get player registration requests for a tournament. */
export function usePlayerRegistrationRequests(
  tournamentId: string,
  page: PageParams = { limit: 100 },
) {
  return useQuery({
    queryKey: teamsKeys.requests(tournamentId, page),
    queryFn: ({ signal }) =>
      api.list<PlayerRegistrationRequest>(
        `/tournaments/${tournamentId}/player-registration-requests`,
        { limit: page.limit, offset: page.offset },
        { signal },
      ),
    enabled: Boolean(tournamentId),
  })
}

/** Create a new team with an owner account. */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { team: CreateTeamRequest; owner: CreateUserRequest }) => {
      // 1. Create team
      await api.post('/teams', params.team)
      // 2. Create owner user
      await api.post('/admin/users', params.owner)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'list'],
      })
      toast.success('Equipo creado exitosamente')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al crear equipo'
      toast.error(msg)
      throw error // re-throw for caller to handle
    },
  })
}

/** Update a team. */
export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { teamId: string; team: UpdateTeamRequest }) =>
      api.patch<Team>(`/teams/${params.teamId}`, params.team),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'list'],
      })
      queryClient.invalidateQueries({
        queryKey: teamsKeys.byId(params.teamId),
      })
      toast.success('Equipo actualizado exitosamente')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al actualizar equipo'
      toast.error(msg)
      throw error
    },
  })
}

/** Activate a team. */
export function useActivateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: string) => api.post<Team>(`/teams/${teamId}/activate`),
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'list'],
      })
      queryClient.invalidateQueries({
        queryKey: teamsKeys.byId(teamId),
      })
      toast.success('Equipo activado')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al activar equipo'
      toast.error(msg)
      throw error
    },
  })
}

/** Deactivate a team. */
export function useDeactivateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: string) => api.post<Team>(`/teams/${teamId}/deactivate`),
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'list'],
      })
      queryClient.invalidateQueries({
        queryKey: teamsKeys.byId(teamId),
      })
      toast.success('Equipo desactivado')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al desactivar equipo'
      toast.error(msg)
      throw error
    },
  })
}

/** Approve/reject a player registration request. */
export function useReviewPlayerRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { requestId: string; review: ReviewPlayerRegistrationRequest }) =>
      api.patch<PlayerRegistrationRequest>(
        `/player-registration-requests/${params.requestId}/review`,
        params.review,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'requests'],
      })
      toast.success('Solicitud revisada')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al revisar solicitud'
      toast.error(msg)
      throw error
    },
  })
}

/** Batch update QR codes for players in a league. */
export function useQRBatchUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { leagueId: string; batch: QRBatchUpdateRequest }) =>
      api.post<{ updated: number }>(`/leagues/${params.leagueId}/players/qr-batch`, params.batch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...teamsKeys.all, 'list'],
      })
      toast.success('QR actualizado exitosamente')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al actualizar QR'
      toast.error(msg)
      throw error
    },
  })
}
