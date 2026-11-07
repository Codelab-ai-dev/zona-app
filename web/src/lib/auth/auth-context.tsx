import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ApiError, api, configureApiClient } from '@/lib/api/client'
import * as session from '@/lib/auth/session'

export type Role = 'super_admin' | 'league_admin' | 'team_owner' | 'public'

/** Profile returned by GET /me (backend/internal/users). */
export interface Profile {
  id: string
  name: string
  email: string
  phone?: string
  role: Role
  league_id?: string
  team_id?: string
  is_active: boolean
  created_at: string
}

type Status = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: Status
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const CHANNEL = 'zg-auth'

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
}

function signInMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Correo o contraseña incorrectos'
    if (err.status === 403) return 'Tu cuenta está desactivada'
    if (err.status === 429) return 'Demasiados intentos. Espera un minuto.'
    return err.message
  }
  return 'No se pudo iniciar sesión'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)

  /** Drops every trace of the session in this tab (never keep another user's cache). */
  const clearLocal = useCallback(() => {
    session.clearSession()
    queryClient.clear()
    setHasSession(false)
  }, [queryClient])

  useEffect(() => {
    configureApiClient({ onUnauthorized: clearLocal })
    channel.current = openChannel()
    const ch = channel.current
    if (ch) ch.onmessage = (e: MessageEvent) => {
      if (e.data === 'logout') clearLocal()
    }
    let active = true
    void session.refresh().then((token) => {
      if (active) setHasSession(token !== null)
    })
    return () => {
      active = false
      ch?.close()
      channel.current = null
    }
  }, [clearLocal])

  const me = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => api.get<Profile>('/me', { signal }),
    enabled: hasSession === true,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        session.setSession(await api.post<session.TokenResponse>('/auth/login', { email, password }))
      } catch (err) {
        throw new Error(signInMessage(err))
      }
      await queryClient.resetQueries({ queryKey: ['me'] })
      setHasSession(true)
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // the local session is dropped regardless
    }
    clearLocal()
    channel.current?.postMessage('logout')
  }, [clearLocal])

  const value = useMemo<AuthContextValue>(() => {
    let status: Status = 'loading'
    if (hasSession === false || me.isError) status = 'anonymous'
    else if (hasSession && me.data) status = 'authenticated'
    return { status, profile: me.data ?? null, signIn, signOut }
  }, [hasSession, me.data, me.isError, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
