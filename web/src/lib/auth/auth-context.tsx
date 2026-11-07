import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, configureApiClient } from '@/lib/api/client'
import { supabaseAuth } from '@/lib/auth/supabase'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const auth = supabaseAuth().auth
    configureApiClient({
      getToken: async () => (await auth.getSession()).data.session?.access_token ?? null,
      onUnauthorized: () => {
        void auth.signOut()
      },
    })
    void auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
    const { data } = auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session))
      if (!session) queryClient.clear() // never keep another user's cached data
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const me = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => api.get<Profile>('/me', { signal }),
    enabled: hasSession === true,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseAuth().auth.signInWithPassword({ email, password })
    if (error) throw new Error('Correo o contraseña incorrectos')
  }, [])

  const signOut = useCallback(async () => {
    await supabaseAuth().auth.signOut()
  }, [])

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
