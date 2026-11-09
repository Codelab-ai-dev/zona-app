import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type PageParams } from '@/lib/api/client'

import { hasProblematicChars, normalizeForQR } from './qr-text'
import type {
  CreateTeamRequest,
  CreateUserRequest,
  PlayerRegistrationRequest,
  QRBatchUpdateRequest,
  ReviewPlayerRegistrationRequest,
  AccountUser,
  Team,
  UpdateTeamRequest,
  UpdateUserRequest,
} from './types'

const PAGE = 100

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

/** Requests of every tournament of a league, newest first (the original screen listed them all together). */
export function useLeagueRegistrationRequests(tournamentIds: string[], page: PageParams = { limit: 100 }) {
  const queries = useQueries({
    queries: tournamentIds.map((tournamentId) => ({
      queryKey: teamsKeys.requests(tournamentId, page),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.list<PlayerRegistrationRequest>(
          `/tournaments/${tournamentId}/player-registration-requests`,
          { limit: page.limit, offset: page.offset },
          { signal },
        ),
    })),
  })
  const failed = queries.find((q) => q.isError)
  return {
    isPending: queries.some((q) => q.isPending),
    error: failed?.error ?? null,
    refetch: () => queries.forEach((q) => void q.refetch()),
    requests: queries
      .flatMap((q) => q.data?.data ?? [])
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
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

/** POST /storage/objects (scope "team"): returns the public URL of the uploaded logo. */
export async function uploadTeamLogo(teamId: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('scope', 'team')
  form.append('scope_id', teamId)
  const res = await api.post<{ url?: string }>('/storage/objects', form)
  if (!res.url) throw new Error('El servidor no devolvió la URL del logo')
  return res.url
}

export interface CreateTeamResult {
  /** Set when the team and owner exist but the logo could not be stored. */
  logoError?: string
}

/**
 * Create a team and then its owner account. If the owner fails, the team
 * already exists: callers retry with `skipTeam` so it is not created twice.
 * The logo (optional) is uploaded once the team has an id; a failed logo does
 * not undo the team.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      team: CreateTeamRequest
      owner: CreateUserRequest
      skipTeam?: boolean
      logo?: File | null
    }): Promise<CreateTeamResult> => {
      let logoError: string | undefined
      if (!params.skipTeam) {
        const created = await api.post<Team>('/teams', params.team)
        if (params.logo) {
          try {
            const logo = await uploadTeamLogo(created.id, params.logo)
            await api.patch(`/teams/${created.id}`, { logo } satisfies UpdateTeamRequest)
          } catch (error) {
            logoError = error instanceof Error ? error.message : 'No se pudo subir el logo'
          }
        }
      }
      try {
        await api.post('/admin/users', params.owner)
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
        throw new OwnerCreationError(error)
      }
      return { logoError }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
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

/** Owner account (GET /admin/users/{id}); 403 for users the admin cannot manage. */
export function useOwnerUser(userId: string) {
  return useQuery({
    queryKey: [...teamsKeys.all, 'owner', userId],
    queryFn: ({ signal }) => api.get<AccountUser>(`/admin/users/${userId}`, { signal }),
    retry: false,
  })
}

/**
 * id -> name of the users of a league (GET /leagues/{id}/users, league admin).
 * One request set replaces a lookup per card / per request.
 */
export function useLeagueUserNames(leagueId: string) {
  return useQuery({
    queryKey: [...teamsKeys.all, 'league-users', leagueId],
    queryFn: async ({ signal }) => {
      const names: Record<string, string> = {}
      for (let offset = 0; ; offset += PAGE) {
        const res = await api.list<{ id: string; name: string }>(`/leagues/${leagueId}/users`, { limit: PAGE, offset }, { signal })
        for (const u of res.data) names[u.id] = u.name
        if (res.data.length < PAGE) return names
      }
    },
    enabled: Boolean(leagueId),
    retry: false,
  })
}

/** Edit a team owner's account (league admins may edit team_owner users of their league). */
export function useUpdateOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; user: UpdateUserRequest }) =>
      api.patch(`/admin/users/${params.userId}`, params.user),
    onSuccess: (_, params) => queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'owner', params.userId] }),
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

/** Approve (creates the player server-side) or reject a player registration request. */
export function useReviewPlayerRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { requestId: string; review: ReviewPlayerRegistrationRequest }) =>
      api.patch<PlayerRegistrationRequest>(
        `/player-registration-requests/${params.requestId}/review`,
        params.review,
      ),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'requests'] })
      // Approval adds a player to the roster.
      queryClient.invalidateQueries({ queryKey: ['players'] })
      if (params.review.status === 'approved') {
        toast.success('Solicitud aprobada', { description: 'El jugador ha sido registrado exitosamente' })
      } else {
        toast.success('Solicitud rechazada')
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Error al revisar solicitud'
      toast.error(msg)
    },
  })
}

/** Backend limits: max 200 players per qr-batch call, max 100 rows per page. */
const QR_CHUNK = 200

export interface QRNormalizedName {
  id: string
  name: string
  /** The name as it goes inside the QR (no accents or eñes). */
  inQR: string
}

export interface QRRunResult {
  updated: number
  failures: Array<{ label: string; error: string }>
  /** Players whose name has accents/eñes and was normalized for the scanner. */
  normalized: QRNormalizedName[]
}

export interface QRProgress {
  percent: number
  /** Players found so far (0 while rosters are still being read). */
  total: number
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido')

interface RosterPlayer {
  id: string
  name: string
  is_active: boolean
}

async function fetchTeamPlayers(teamId: string): Promise<RosterPlayer[]> {
  const players: RosterPlayer[] = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await api.list<RosterPlayer>(`/teams/${teamId}/players`, { limit: PAGE, offset })
    players.push(...res.data)
    if (res.data.length < PAGE) return players
  }
}

/**
 * Regenerate QR codes for every active player of the given teams: reads each
 * roster (paginated), then POSTs `{ players: [{ id }] }` in chunks of 200.
 * Failures are collected per team / per player instead of aborting the run.
 */
export function useQRBatchUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      leagueId: string
      teams: Array<{ id: string; name: string }>
      onProgress?: (progress: QRProgress) => void
    }): Promise<QRRunResult> => {
      const failures: QRRunResult['failures'] = []
      const players: RosterPlayer[] = []
      for (const [i, team] of params.teams.entries()) {
        try {
          players.push(...(await fetchTeamPlayers(team.id)).filter((p) => p.is_active !== false))
        } catch (error) {
          failures.push({ label: team.name, error: messageOf(error) })
        }
        params.onProgress?.({ percent: ((i + 1) / params.teams.length) * 50, total: 0 })
      }
      let updated = 0
      const normalized: QRNormalizedName[] = []
      const chunks = Math.ceil(players.length / QR_CHUNK)
      for (let c = 0; c < chunks; c++) {
        const chunk = players.slice(c * QR_CHUNK, (c + 1) * QR_CHUNK)
        try {
          const res = await api.post<{ updated: number }>(`/leagues/${params.leagueId}/players/qr-batch`, {
            players: chunk.map((p) => ({ id: p.id })),
          } satisfies QRBatchUpdateRequest)
          updated += res.updated
          for (const p of chunk) {
            if (hasProblematicChars(p.name)) normalized.push({ id: p.id, name: p.name, inQR: normalizeForQR(p.name) })
          }
        } catch (error) {
          for (const p of chunk) failures.push({ label: p.name, error: messageOf(error) })
        }
        params.onProgress?.({ percent: 50 + ((c + 1) / chunks) * 50, total: players.length })
      }
      return { updated, failures, normalized }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...teamsKeys.all, 'list'] })
    },
  })
}
