import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type PageParams } from '@/lib/api/client'

import type {
  Team,
  Player,
  CoachingStaff,
  Match,
  Standings,
  TeamStats,
  PlayerStats,
  Suspension,
  Finance,
  FinanceTransaction,
  MyTeam,
  PlayerRegistrationRequest,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  CreateCoachingStaffRequest,
  UpdateCoachingStaffRequest,
  UpdateTeamRequest,
  CreatePlayerRegistrationRequestRequest,
} from './types'

/** Query keys follow TanStack Query convention: base, filters, mutations. */
export const teamOwnerKeys = {
  all: ['team-owner'] as const,
  myTeams: () => [...teamOwnerKeys.all, 'my-teams'] as const,
  teams: () => [...teamOwnerKeys.all, 'teams'] as const,
  team: (teamId: string) => [...teamOwnerKeys.teams(), teamId] as const,
  players: (teamId: string) => [...teamOwnerKeys.team(teamId), 'players'] as const,
  player: (playerId: string) => [...teamOwnerKeys.all, 'players', playerId] as const,
  coaching: (teamId: string) => [...teamOwnerKeys.team(teamId), 'coaching-staff'] as const,
  staff: (staffId: string) => [...teamOwnerKeys.all, 'coaching-staff', staffId] as const,
  matches: (teamId: string) => [...teamOwnerKeys.team(teamId), 'matches'] as const,
  standings: (tournamentId: string) => [...teamOwnerKeys.all, 'standings', tournamentId] as const,
  topScorers: (tournamentId: string) => [...teamOwnerKeys.all, 'top-scorers', tournamentId] as const,
  stats: (teamId: string) => [...teamOwnerKeys.team(teamId), 'stats'] as const,
  playerStats: (teamId: string) => [...teamOwnerKeys.team(teamId), 'player-stats'] as const,
  suspensions: (teamId: string) => [...teamOwnerKeys.team(teamId), 'suspensions'] as const,
  finance: (teamId: string, leagueId: string) => [...teamOwnerKeys.team(teamId), 'finance', leagueId] as const,
  transactions: (leagueId: string, teamId: string) => [...teamOwnerKeys.finance(teamId, leagueId), 'transactions'] as const,
  registrationRequests: (teamId: string) => [...teamOwnerKeys.team(teamId), 'registration-requests'] as const,
}

/** GET /my-teams - list teams owned by the user. */
export function useMyTeams() {
  return useQuery({
    queryKey: teamOwnerKeys.myTeams(),
    queryFn: ({ signal }) => api.list<MyTeam>('/my-teams', { limit: 100 }, { signal }),
  })
}

/** GET /teams/{teamID} - fetch single team. */
export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.team(teamId ?? ''),
    queryFn: ({ signal }) => api.get<Team>(`/teams/${teamId}`, { signal }),
    enabled: Boolean(teamId),
  })
}

/** PATCH /teams/{teamID} - update team info. */
export function useUpdateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { teamId: string; data: UpdateTeamRequest }) =>
      api.patch<Team>(`/teams/${vars.teamId}`, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.team(vars.teamId) })
      toast.success('Equipo actualizado')
    },
    onError: (error) => {
      toast.error('Error al actualizar equipo')
      console.error(error)
    },
  })
}

/** GET /teams/{teamID}/players - list team players. */
export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.players(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Player>(`/teams/${teamId}/players`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** POST /teams/{teamID}/players - create player. */
export function useCreatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { teamId: string; data: CreatePlayerRequest }) =>
      api.post<Player>(`/teams/${vars.teamId}/players`, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.players(vars.teamId) })
      toast.success('Jugador agregado')
    },
    onError: (error) => {
      toast.error('Error al agregar jugador')
      console.error(error)
    },
  })
}

/** PATCH /players/{playerID} - update player. */
export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { playerId: string; data: UpdatePlayerRequest }) =>
      api.patch<Player>(`/players/${vars.playerId}`, vars.data),
    onSuccess: (updatedPlayer) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.player(updatedPlayer.id) })
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.players(updatedPlayer.team_id) })
      toast.success('Jugador actualizado')
    },
    onError: (error) => {
      toast.error('Error al actualizar jugador')
      console.error(error)
    },
  })
}

/** POST /players/{playerID}/deactivate - deactivate player. */
export function useDeactivatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (playerId: string) => api.post<void>(`/players/${playerId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.all })
      toast.success('Jugador desactivado')
    },
    onError: (error) => {
      toast.error('Error al desactivar jugador')
      console.error(error)
    },
  })
}

/** GET /teams/{teamID}/coaching-staff - list team coaching staff. */
export function useTeamCoachingStaff(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.coaching(teamId ?? ''),
    queryFn: ({ signal }) => api.list<CoachingStaff>(`/teams/${teamId}/coaching-staff`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** POST /teams/{teamID}/coaching-staff - create coaching staff member. */
export function useCreateCoachingStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { teamId: string; data: CreateCoachingStaffRequest }) =>
      api.post<CoachingStaff>(`/teams/${vars.teamId}/coaching-staff`, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.coaching(vars.teamId) })
      toast.success('Cuerpo técnico agregado')
    },
    onError: (error) => {
      toast.error('Error al agregar cuerpo técnico')
      console.error(error)
    },
  })
}

/** PATCH /coaching-staff/{staffID} - update coaching staff member. */
export function useUpdateCoachingStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { staffId: string; data: UpdateCoachingStaffRequest }) =>
      api.patch<CoachingStaff>(`/coaching-staff/${vars.staffId}`, vars.data),
    onSuccess: (updatedStaff) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.staff(updatedStaff.id) })
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.coaching(updatedStaff.team_id) })
      toast.success('Cuerpo técnico actualizado')
    },
    onError: (error) => {
      toast.error('Error al actualizar cuerpo técnico')
      console.error(error)
    },
  })
}

/** POST /coaching-staff/{staffID}/deactivate - deactivate coaching staff. */
export function useDeactivateCoachingStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (staffId: string) => api.post<void>(`/coaching-staff/${staffId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.all })
      toast.success('Cuerpo técnico desactivado')
    },
    onError: (error) => {
      toast.error('Error al desactivar cuerpo técnico')
      console.error(error)
    },
  })
}

/** GET /teams/{teamID}/matches - list team matches. */
export function useTeamMatches(teamId: string | undefined, page?: PageParams) {
  return useQuery({
    queryKey: teamOwnerKeys.matches(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Match>(`/teams/${teamId}/matches`, page, { signal }),
    enabled: Boolean(teamId),
  })
}

/** GET /tournaments/{tournamentID}/standings - get tournament standings. */
export function useTournamentStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.standings(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<Standings>(`/tournaments/${tournamentId}/standings`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** GET /tournaments/{tournamentID}/top-scorers - get top scorers. */
export function useTopScorers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.topScorers(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<PlayerStats>(`/tournaments/${tournamentId}/top-scorers`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** GET /teams/{teamID}/stats - get team stats for a tournament. */
export function useTeamStats(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.stats(teamId ?? ''),
    queryFn: ({ signal }) => api.list<TeamStats>(`/teams/${teamId}/stats`, { limit: 10 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** GET /players/{playerID}/stats - get player stats. */
export function usePlayerStats(playerId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.all,
    queryFn: ({ signal }) => api.get<PlayerStats>(`/players/${playerId}/stats`, { signal }),
    enabled: Boolean(playerId),
  })
}

/** GET /teams/{teamID}/suspensions - list team suspensions. */
export function useTeamSuspensions(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.suspensions(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Suspension>(`/teams/${teamId}/suspensions`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** GET /leagues/{leagueID}/finance/teams/{teamID}/balance - get team financial balance. */
export function useTeamFinanceBalance(leagueId: string | undefined, teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.finance(teamId ?? '', leagueId ?? ''),
    queryFn: ({ signal }) => api.get<Finance>(`/leagues/${leagueId}/finance/teams/${teamId}/balance`, { signal }),
    enabled: Boolean(leagueId && teamId),
  })
}

/** GET /leagues/{leagueID}/finance/teams/{teamID}/transactions - list team transactions. */
export function useTeamTransactions(leagueId: string | undefined, teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.transactions(leagueId ?? '', teamId ?? ''),
    queryFn: ({ signal }) => api.list<FinanceTransaction>(`/leagues/${leagueId}/finance/teams/${teamId}/transactions`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId && teamId),
  })
}

/** GET /teams/{teamID}/player-registration-requests - list registration requests. */
export function usePlayerRegistrationRequests(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.registrationRequests(teamId ?? ''),
    queryFn: ({ signal }) => api.list<PlayerRegistrationRequest>(`/teams/${teamId}/player-registration-requests`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** POST /teams/{teamID}/tournaments/{tournamentID}/player-registration-requests - request player registration. */
export function useCreatePlayerRegistrationRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { teamId: string; tournamentId: string; data: CreatePlayerRegistrationRequestRequest }) =>
      api.post<PlayerRegistrationRequest>(
        `/teams/${vars.teamId}/tournaments/${vars.tournamentId}/player-registration-requests`,
        vars.data,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: teamOwnerKeys.registrationRequests(vars.teamId) })
      toast.success('Solicitud de registro enviada')
    },
    onError: (error) => {
      toast.error('Error al enviar solicitud de registro')
      console.error(error)
    },
  })
}

/** POST /storage/objects - upload file to storage. */
export function useUploadFile() {
  return useMutation({
    mutationFn: (vars: { file: File; scope: string; scopeId: string }) => {
      const formData = new FormData()
      formData.append('file', vars.file)
      formData.append('scope', vars.scope)
      formData.append('scope_id', vars.scopeId)
      return api.post<StorageObject>('/storage/objects', formData)
    },
    onSuccess: () => {
      toast.success('Archivo subido')
    },
    onError: (error) => {
      toast.error('Error al subir archivo')
      console.error(error)
    },
  })
}

interface StorageObject {
  id: string
  bucket: string
  name: string
  owner: string
  created_at: string
  updated_at: string
}
