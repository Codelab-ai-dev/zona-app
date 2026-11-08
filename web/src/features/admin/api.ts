import { useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type PageParams } from '@/lib/api/client'
import type { CreateLeagueRequest, ProductMode, CreateUserRequest, League, SystemStatsData, UpdateLeagueRequest, UpdateUserRequest, User } from './types'

export const adminKeys = {
  all: ['admin'] as const,
  leagues: ['admin', 'leagues'] as const,
  leaguesPage: (page: PageParams) => ['admin', 'leagues', 'list', page] as const,
  league: (id: string) => ['admin', 'leagues', id] as const,
  allUsers: ['admin', 'users'] as const,
  users: (page: PageParams) => ['admin', 'users', page] as const,
  user: (id: string) => ['admin', 'users', 'detail', id] as const,
  stats: ['admin', 'stats'] as const,
}

/** Fetch all leagues (admin view) */
export function useAdminLeagues(page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: adminKeys.leaguesPage(page),
    queryFn: ({ signal }) => api.list<League>('/leagues/admin', page, { signal }),
    placeholderData: keepPreviousData,
  })
}

/** Platform-wide counts computed by the API (never capped by pagination). */
export function useSystemStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: ({ signal }) => api.get<SystemStatsData>('/admin/stats', { signal }),
  })
}

/** One user, to prefill the edit form of a league's admin. */
export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.user(id ?? ''),
    queryFn: ({ signal }) => api.get<User>(`/admin/users/${id}`, { signal }),
    enabled: !!id,
  })
}

/** Fetch users with optional filters */
export function useAdminUsers(page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: adminKeys.users(page),
    queryFn: ({ signal }) => api.list<User>('/users', page, { signal }),
    placeholderData: keepPreviousData,
  })
}

/** Active league admins (server-side role filter, not capped by the first page). */
export function useLeagueAdminCandidates(enabled = true) {
  return useQuery({
    queryKey: [...adminKeys.users({ limit: 100 }), 'league_admin'] as const,
    queryFn: ({ signal }) =>
      api.list<User>('/users', { limit: 100 }, { signal, query: { role: 'league_admin' } }),
    enabled,
  })
}

export type LeagueAdminChoice = { kind: 'existing'; id: string } | { kind: 'new'; data: CreateUserRequest }

export interface CreateLeagueFlowInput {
  league: Omit<CreateLeagueRequest, 'admin_id' | 'product_mode'>
  product_mode: ProductMode
  /** Flags of the chosen plan, applied together with a non-default mode. */
  features?: Record<string, boolean>
  admin: LeagueAdminChoice
}

export interface CreateLeagueFlowResult {
  league: League
  /** One-time credentials, only when a new admin was created. */
  credentials?: { email: string; password: string }
}

/** The step of the flow that failed, with the API error that caused it. */
export class CreateLeagueFlowError extends Error {
  constructor(
    readonly step: 'admin' | 'league' | 'link' | 'mode',
    readonly cause: unknown,
    /** What the earlier steps already left behind on the server. */
    readonly created: { adminEmail?: string; leagueName?: string },
  ) {
    super(cause instanceof Error ? cause.message : 'Error')
  }
}

interface FlowProgress {
  adminId?: string
  credentials?: { email: string; password: string }
  league?: League
  linked?: boolean
}

/**
 * Creates a league together with its admin. The API has no single endpoint, so
 * it runs: POST /admin/users (new admin) -> POST /leagues -> PUT /leagues/{id}/admin
 * (links the admin to the league) -> PATCH product-mode (non-default mode).
 * What was already created is remembered, so retrying after a failure never
 * duplicates the user or the league.
 */
export function useCreateLeague() {
  const queryClient = useQueryClient()
  const progress = useRef<FlowProgress>({})

  const mutation = useMutation({
    mutationFn: async ({ league: data, product_mode, features, admin }: CreateLeagueFlowInput): Promise<CreateLeagueFlowResult> => {
      const p = progress.current
      const created = () => ({ adminEmail: p.credentials?.email, leagueName: p.league?.name })

      if (admin.kind === 'existing') {
        p.adminId = admin.id
      } else if (!p.adminId) {
        try {
          const user = await api.post<User>('/admin/users', { ...admin.data, role: 'league_admin' })
          p.adminId = user.id
          p.credentials = { email: user.email, password: admin.data.password }
        } catch (err) {
          throw new CreateLeagueFlowError('admin', err, created())
        }
      }
      if (!p.league) {
        try {
          p.league = await api.post<League>('/leagues', { ...data, admin_id: p.adminId })
        } catch (err) {
          throw new CreateLeagueFlowError('league', err, created())
        }
      }
      if (!p.linked) {
        try {
          await api.put<void>(`/leagues/${p.league.id}/admin`, { admin_id: p.adminId })
          p.linked = true
        } catch (err) {
          throw new CreateLeagueFlowError('link', err, created())
        }
      }
      if (product_mode !== p.league.product_mode) {
        try {
          p.league = await api.patch<League>(`/leagues/${p.league.id}/product-mode`, { product_mode, features })
        } catch (err) {
          throw new CreateLeagueFlowError('mode', err, created())
        }
      }
      const result = { league: p.league, credentials: p.credentials }
      progress.current = {}
      return result
    },
    // Even a half-done flow changes what the lists show.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
    },
  })
  return mutation
}

/** Update a league */
export function useUpdateLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeagueRequest }) =>
      api.patch<League>(`/leagues/${id}`, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.league(id) })
    },
  })
}

/** Toggle league status (activate/deactivate) */
export function useToggleLeagueStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch<League>(`/leagues/${id}/status`, { is_active }),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.league(id) })
    },
  })
}

/** Update league product mode and features */
export function useUpdateLeagueProductMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { product_mode: ProductMode; features?: Record<string, boolean> } }) =>
      api.patch<League>(`/leagues/${id}/product-mode`, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.league(id) })
    },
  })
}

/** Create a league admin user */
export function useCreateLeagueAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => api.post<User>('/admin/users', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
    },
  })
}

/** Update a user */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      api.patch<User>(`/admin/users/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
    },
  })
}

/** Delete/deactivate a user */
export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<User>(`/admin/users/${id}`, { is_active: false }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
    },
  })
}

/** Upload storage object (APK) */
export function useUploadStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData) => api.post<{ key: string; url?: string }>('/storage/objects', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminStorageKeys.objects })
    },
  })
}

/** Mirrors storage.Object in the Go API. */
export interface StorageObject {
  key: string
  size: number
  content_type: string
  created_at: string
  etag?: string
}

export const adminStorageKeys = {
  objects: ['storage', 'objects'] as const,
}

/** Get storage objects listing for a scope */
export function useStorageObjects(scope: string, scopeId: string, page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: [...adminStorageKeys.objects, scope, scopeId, page],
    queryFn: ({ signal }) =>
      api.list<StorageObject>('/storage/objects', page, { signal, query: { scope, scope_id: scopeId } }),
    enabled: !!scopeId,
  })
}

/** Get public URL for storage object */
export function useGetStorageUrl() {
  return useMutation({
    mutationFn: (key: string) => api.get<{ url: string }>('/storage/url', { query: { key } }),
  })
}

/** Delete storage object */
export function useDeleteStorageObject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => api.delete('/storage/objects', { body: { key } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminStorageKeys.objects })
    },
  })
}

/** Make an active league_admin user the admin of a league. */
export function useSetLeagueAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, admin_id }: { id: string; admin_id: string }) => api.put<void>(`/leagues/${id}/admin`, { admin_id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
    },
  })
}

/** Permanently delete a league (super admin). */
export function useDeleteLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leagues/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.allUsers })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
    },
  })
}

export interface ActivateAllResult {
  activated: number
  failed: { league: League; message: string }[]
}

/** Activate several leagues one by one, collecting the ones that fail. */
export function useActivateLeagues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leagues: League[]): Promise<ActivateAllResult> => {
      const result: ActivateAllResult = { activated: 0, failed: [] }
      for (const league of leagues) {
        try {
          await api.patch<League>(`/leagues/${league.id}/status`, { is_active: true })
          result.activated++
        } catch (err) {
          result.failed.push({ league, message: err instanceof Error ? err.message : 'Error desconocido' })
        }
      }
      return result
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
    },
  })
}
