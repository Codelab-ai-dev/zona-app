import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type PageParams } from '@/lib/api/client'
import type { CreateLeagueRequest, ProductMode, CreateUserRequest, League, UpdateLeagueRequest, UpdateUserRequest, User } from './types'

export const adminKeys = {
  all: ['admin'] as const,
  leagues: ['admin', 'leagues'] as const,
  leaguesPage: (page: PageParams) => ['admin', 'leagues', 'list', page] as const,
  league: (id: string) => ['admin', 'leagues', id] as const,
  allUsers: ['admin', 'users'] as const,
  users: (page: PageParams) => ['admin', 'users', page] as const,
}

/** Fetch all leagues (admin view) */
export function useAdminLeagues(page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: adminKeys.leaguesPage(page),
    queryFn: ({ signal }) => api.list<League>('/leagues/admin', page, { signal }),
    placeholderData: keepPreviousData,
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

/** Create a new league */
export function useCreateLeague() {
  const queryClient = useQueryClient()
  return useMutation({
    // The API has no product mode on creation (unknown JSON fields are
    // rejected), so a non-default mode is applied right after creating.
    mutationFn: async ({ product_mode, ...data }: CreateLeagueRequest) => {
      const league = await api.post<League>('/leagues', data)
      if (product_mode && product_mode !== league.product_mode) {
        return api.patch<League>(`/leagues/${league.id}/product-mode`, { product_mode })
      }
      return league
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.leagues })
    },
  })
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
