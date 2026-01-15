"use client"

import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Session, AuthChangeEvent, AuthError } from '@supabase/supabase-js'
import { useAuthStore } from '../stores/auth-store'
import { createClientSupabaseClient } from '../supabase/client'

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientSupabaseClient>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// Helper para detectar errores de refresh token
function isRefreshTokenError(error: AuthError | Error | unknown): boolean {
  if (!error) return false

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = (error as any)?.code

  return (
    errorMessage?.includes('Refresh Token') ||
    errorMessage?.includes('refresh_token') ||
    errorCode === 'refresh_token_not_found' ||
    errorCode === 'invalid_refresh_token'
  )
}

// Helper para detectar errores de red
function isNetworkError(error: Error | unknown): boolean {
  if (!error) return false

  const errorMessage = error instanceof Error ? error.message : String(error)

  return (
    errorMessage?.includes('ETIMEDOUT') ||
    errorMessage?.includes('fetch failed') ||
    errorMessage?.includes('network') ||
    errorMessage?.includes('Failed to fetch') ||
    errorMessage?.includes('NetworkError')
  )
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientSupabaseClient()
  const router = useRouter()
  const { setUser, setSession, setProfile, setLoading, setError } = useAuthStore()
  const initializedRef = useRef(false)
  const isHandlingAuthErrorRef = useRef(false)

  // Función para manejar logout forzado cuando el refresh token es inválido
  const handleForceLogout = useCallback(async (reason: string) => {
    // Prevenir múltiples llamadas simultáneas
    if (isHandlingAuthErrorRef.current) return
    isHandlingAuthErrorRef.current = true

    console.warn(`[Auth] Force logout triggered: ${reason}`)

    try {
      // Limpiar estado local primero
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(null)

      // Intentar cerrar sesión en Supabase (ignorar errores)
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        // Ignorar errores de signOut
      }

      // Redirigir al login con parámetro de sesión expirada
      router.push('/login?expired=true')
    } finally {
      // Permitir nuevos intentos después de un delay
      setTimeout(() => {
        isHandlingAuthErrorRef.current = false
      }, 2000)
    }
  }, [router, setSession, setUser, setProfile, setError, supabase.auth])

  useEffect(() => {
    let isInitializing = true

    const initializeAuth = async () => {
      if (initializedRef.current) return
      
      try {
        console.log('Inicializando autenticación...')
        setLoading(true)
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)

          // Handle specific refresh token errors - force logout
          if (isRefreshTokenError(error)) {
            await handleForceLogout('refresh_token_invalid_on_init')
            return
          }

          // Para otros errores de auth, mostrar error pero no bloquear
          setError(error.message)
          return
        }
        
        // Set initial state
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Get user profile with retry logic for network issues
          let retries = 3
          let profile = null
          let profileError = null

          while (retries > 0 && !profile) {
            const result = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (result.data) {
              profile = result.data
              profileError = null
            } else if (result.error) {
              profileError = result.error

              // Check if it's an auth error (refresh token expired during profile fetch)
              if (isRefreshTokenError(result.error)) {
                await handleForceLogout('refresh_token_invalid_on_profile_fetch')
                return
              }

              // Only retry on network errors
              if (isNetworkError(result.error)) {
                retries--
                if (retries > 0) {
                  console.warn(`Profile fetch failed, retrying... (${retries} attempts left)`)
                  await new Promise(r => setTimeout(r, 1000)) // Wait 1 second before retry
                }
              } else {
                break // Don't retry on non-network errors
              }
            }
          }

          if (profile && !profileError) {
            setProfile(profile)
          } else {
            console.warn('No profile found for user:', session.user.id, profileError?.message)
          }
        }

        initializedRef.current = true
        setError(null)
      } catch (error) {
        console.error('Auth initialization error:', error)
        setError(error instanceof Error ? error.message : 'Authentication error')
      } finally {
        setLoading(false)
        isInitializing = false
      }
    }
    
    // Initialize auth
    initializeAuth()
    
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Skip state change during initialization
        if (isInitializing) return

        console.log('[Auth] State change:', event, session?.user?.email ?? 'no session')

        // Handle token refresh - update session silently
        if (event === 'TOKEN_REFRESHED') {
          if (session) {
            setSession(session)
            setUser(session.user)
            console.log('[Auth] Token refreshed successfully')
          } else {
            // Token refresh failed - session is null
            console.warn('[Auth] Token refresh returned no session')
            await handleForceLogout('token_refresh_failed')
          }
          return
        }

        // Skip initial session event
        if (event === 'INITIAL_SESSION') {
          return
        }

        // Get current state to avoid redundant operations
        const currentState = useAuthStore.getState()

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          router.push('/')
          return
        }

        // Only process SIGNED_IN if we don't already have this user
        if (event === 'SIGNED_IN') {
          // Skip if we already have the same user authenticated
          if (currentState.user?.id === session?.user?.id && currentState.isAuthenticated) {
            console.log('[Auth] User already authenticated, skipping SIGNED_IN handler')
            return
          }

          try {
            setLoading(true)
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
              // Get user profile with retry for network issues
              let retries = 2
              let profile = null

              while (retries > 0 && !profile) {
                const result = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()

                if (result.data) {
                  profile = result.data
                  setProfile(profile)
                } else if (result.error) {
                  // Check for refresh token errors
                  if (isRefreshTokenError(result.error)) {
                    await handleForceLogout('refresh_token_invalid_on_sign_in_profile')
                    return
                  }

                  // Retry on network errors
                  if (isNetworkError(result.error)) {
                    retries--
                    if (retries > 0) {
                      await new Promise(r => setTimeout(r, 1000))
                    }
                  } else {
                    break
                  }
                }
              }
            }

            setError(null)
          } catch (error) {
            console.error('[Auth] State change error:', error)

            // Check if it's a refresh token error
            if (isRefreshTokenError(error)) {
              await handleForceLogout('refresh_token_error_on_sign_in')
              return
            }

            setError(error instanceof Error ? error.message : 'Authentication error')
          } finally {
            setLoading(false)
          }
        }
      }
    )

    // Setup global error handler for uncaught auth errors
    const handleGlobalAuthError = (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (isRefreshTokenError(error)) {
        console.error('[Auth] Global refresh token error caught:', error)
        handleForceLogout('global_refresh_token_error')
        event.preventDefault()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleGlobalAuthError)
    }

    return () => {
      subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleGlobalAuthError)
      }
    }
  }, [handleForceLogout])

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}