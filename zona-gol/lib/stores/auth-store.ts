import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { User, Session } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => void
  reset: () => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  isAuthenticated: false,
}

export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    ...initialState,

    setUser: (user) =>
      set((state) => {
        state.user = user
        state.isAuthenticated = !!user
      }),

    setProfile: (profile) =>
      set((state) => {
        state.profile = profile
      }),

    setSession: (session) =>
      set((state) => {
        state.session = session
        state.isAuthenticated = !!session
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
      }),

    signOut: () =>
      set((state) => {
        state.user = null
        state.profile = null
        state.session = null
        state.isAuthenticated = false
        state.error = null
      }),

    reset: () =>
      set(() => ({ ...initialState })),
  }))
)