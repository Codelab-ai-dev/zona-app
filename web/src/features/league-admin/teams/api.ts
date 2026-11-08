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

/** Raised when the team exists but its owner account could not be created. */
export class OwnerCreationError extends Error {
  readonly cause: unknown
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : 'No se pudo crear el propietario')
    this.name = 'OwnerCreationError'
    this.cause = cause
  }
}

/**
 * Create a team and then its owner account. If the owner fails, the team
 * already exists: callers retry with `skipTeam` so it is not created twice.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { team: CreateTeamRequest; owner: CreateUserRequest; skipTeam?: boolean }) => {
      if (!params.skipTeam) await api.post('/teams', params.team)
      try {
        await api.post('/admin/users', params.owner)
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
        throw new OwnerCreationError(error)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
      toast.success('Equipo creado exitosamente')
    },
  })
}

/** Update a team. Callers report the outcome (groups issues many PATCHes in a row). */
export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { teamId: string; team: UpdateTeamRequest }) =>
      api.patch<Team>(`/teams/${params.teamId}`, params.team),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
      queryClient.invalidateQueries({ queryKey: teamsKeys.byId(params.teamId) })
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
    },
  })
}

/** Permanently delete a team (players, matches and stats go with it). */
export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: string) => api.delete(`/teams/${teamId}`),
    onSuccess: () => {
      // Rivals' standings are rebuilt server-side; refresh everything.
      void queryClient.invalidateQueries()
      toast.success('Equipo eliminado')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al eliminar equipo'
      toast.error(msg)
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
    },
  })
}

/** Backend limits: max 200 players per qr-batch call, max 100 rows per page. */
const QR_CHUNK = 200
const PAGE = 100

export interface QRRunResult {
  updated: number
  failures: Array<{ label: string; error: string }>
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido')

async function fetchTeamPlayerIds(teamId: string): Promise<string[]> {
  const ids: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await api.list<{ id: string }>(`/teams/${teamId}/players`, { limit: PAGE, offset })
    ids.push(...res.data.map((p) => p.id))
    if (res.data.length < PAGE) return ids
  }
}

/**
 * Regenerate QR codes for every player of the given teams: reads each roster
 * (paginated), then POSTs `{ players: [{ id }] }` in chunks of 200. Failures
 * are collected per team / per chunk instead of aborting the run.
 */
export function useQRBatchUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      leagueId: string
      teams: Array<{ id: string; name: string }>
      onProgress?: (percent: number) => void
    }): Promise<QRRunResult> => {
      const failures: QRRunResult['failures'] = []
      const ids: string[] = []
      for (const [i, team] of params.teams.entries()) {
        try {
          ids.push(...(await fetchTeamPlayerIds(team.id)))
        } catch (error) {
          failures.push({ label: team.name, error: messageOf(error) })
        }
        params.onProgress?.(((i + 1) / params.teams.length) * 50)
      }
      let updated = 0
      const chunks = Math.ceil(ids.length / QR_CHUNK)
      for (let c = 0; c < chunks; c++) {
        const players = ids.slice(c * QR_CHUNK, (c + 1) * QR_CHUNK).map((id) => ({ id }))
        try {
          const res = await api.post<{ updated: number }>(`/leagues/${params.leagueId}/players/qr-batch`, {
            players,
          } satisfies QRBatchUpdateRequest)
          updated += res.updated
        } catch (error) {
          failures.push({ label: `Lote ${c + 1}`, error: messageOf(error) })
        }
        params.onProgress?.(50 + ((c + 1) / chunks) * 50)
      }
      return { updated, failures }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
    },
  })
}
