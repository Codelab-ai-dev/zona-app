import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api/client'

import { teamOwnerKeys } from './keys'
import type {
  Team,
  Player,
  CoachingStaff,
  PlayerRegistrationRequest,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  CreateCoachingStaffRequest,
  UpdateCoachingStaffRequest,
  UpdateTeamRequest,
  CreatePlayerRegistrationRequestRequest,
  UploadResult,
} from './types'
import { notifyMutationError } from './utils'

export { teamOwnerKeys } from './keys'
export * from './api-reads'

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
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.team(vars.teamId) })
      toast.success('Equipo actualizado')
    },
    onError: (error) => notifyMutationError(error, 'Error al actualizar equipo'),
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
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.players(vars.teamId) })
      toast.success('Jugador agregado')
    },
    onError: (error) => notifyMutationError(error, 'Error al agregar jugador'),
  })
}

/** PATCH /players/{playerID} - update player. */
export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { playerId: string; data: UpdatePlayerRequest }) =>
      api.patch<Player>(`/players/${vars.playerId}`, vars.data),
    onSuccess: (updatedPlayer) => {
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.player(updatedPlayer.id) })
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.players(updatedPlayer.team_id) })
    },
    onError: (error) => notifyMutationError(error, 'Error al actualizar jugador'),
  })
}

/** POST /players/{playerID}/deactivate - deactivate player. */
export function useDeactivatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (playerId: string) => api.post<void>(`/players/${playerId}/deactivate`),
    onSuccess: () => {
      // Player lists live under ['team-owner', 'teams', teamId, 'players'].
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.teams() })
      toast.success('Jugador desactivado')
    },
    onError: (error) => notifyMutationError(error, 'Error al desactivar jugador'),
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
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.coaching(vars.teamId) })
      toast.success('Cuerpo técnico agregado')
    },
    onError: (error) => notifyMutationError(error, 'Error al agregar cuerpo técnico'),
  })
}

/** PATCH /coaching-staff/{staffID} - update coaching staff member. */
export function useUpdateCoachingStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { staffId: string; data: UpdateCoachingStaffRequest }) =>
      api.patch<CoachingStaff>(`/coaching-staff/${vars.staffId}`, vars.data),
    onSuccess: (updatedStaff) => {
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.staff(updatedStaff.id) })
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.coaching(updatedStaff.team_id) })
      toast.success('Cuerpo técnico actualizado')
    },
    onError: (error) => notifyMutationError(error, 'Error al actualizar cuerpo técnico'),
  })
}

/** POST /coaching-staff/{staffID}/deactivate - deactivate coaching staff. */
export function useDeactivateCoachingStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (staffId: string) => api.post<void>(`/coaching-staff/${staffId}/deactivate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.teams() })
      toast.success('Cuerpo técnico desactivado')
    },
    onError: (error) => notifyMutationError(error, 'Error al desactivar cuerpo técnico'),
  })
}

/** GET /teams/{teamID}/player-registration-requests - list registration requests. */
export function usePlayerRegistrationRequests(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.registrationRequests(teamId ?? ''),
    queryFn: ({ signal }) =>
      api.list<PlayerRegistrationRequest>(`/teams/${teamId}/player-registration-requests`, { limit: 100 }, { signal }),
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
      void queryClient.invalidateQueries({ queryKey: teamOwnerKeys.registrationRequests(vars.teamId) })
      toast.success('Solicitud de registro enviada')
    },
    onError: (error) => notifyMutationError(error, 'Error al enviar solicitud de registro'),
  })
}

/** POST /storage/objects - upload a file (multipart). Public scopes return a `url`. */
export function useUploadFile() {
  return useMutation({
    mutationFn: (vars: { file: File; scope: 'player' | 'team' | 'league'; scopeId: string }) => {
      const formData = new FormData()
      formData.append('file', vars.file)
      formData.append('scope', vars.scope)
      formData.append('scope_id', vars.scopeId)
      return api.post<UploadResult>('/storage/objects', formData)
    },
    onError: (error) => notifyMutationError(error, 'Error al subir archivo'),
  })
}
