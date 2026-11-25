import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api/client'

/** AI clients (MCP hosts) connected to the user's account through OAuth (#50). */
export interface ScopeInfo {
  scope: string
  description: string
}

export interface ConsentRequest {
  id: string
  client_name: string
  client_uri?: string
  redirect_host: string
  scopes: ScopeInfo[]
  expires_at: string
}

export interface Connection {
  id: string
  client_name: string
  client_uri?: string
  scopes: ScopeInfo[]
  created_at: string
  last_used_at: string | null
}

/**
 * The OAuth endpoints only exist when the API runs with
 * MCP_OAUTH_ENABLED=true; builds without VITE_MCP_OAUTH_ENABLED=true hide the
 * entry point to "Aplicaciones conectadas".
 */
export const connectionsEnabled = import.meta.env.VITE_MCP_OAUTH_ENABLED === 'true'

const connectionsKey = ['oauth', 'connections'] as const

export function useConsentRequest(requestId: string | null) {
  return useQuery({
    queryKey: ['oauth', 'request', requestId],
    queryFn: () => api.get<ConsentRequest>(`/oauth/requests/${requestId}`),
    enabled: !!requestId,
    retry: false,
    // A decided request no longer exists: never refetch it behind the user.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useDecide(requestId: string) {
  return useMutation({
    mutationFn: (approve: boolean) => api.post<{ redirect_to: string }>(`/oauth/requests/${requestId}/decision`, { approve }),
  })
}

export function useConnections(enabled: boolean) {
  return useQuery({
    queryKey: connectionsKey,
    queryFn: () => api.list<Connection>('/oauth/connections', { limit: 100 }),
    enabled,
  })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/oauth/connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionsKey }),
  })
}
