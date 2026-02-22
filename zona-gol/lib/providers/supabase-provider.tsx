"use client"

import { createContext, useContext, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Session, AuthChangeEvent, AuthError } from '@supabase/supabase-js'
import { useAuthStore } from '../stores/auth-store'
import { createClientSupabaseClient } from '../supabase/client'

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientSupabaseClient>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// Singleton instance - created once at module level for the browser
const getSupabaseInstance = () => createClientSupabaseClient()

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
    errorMessage?.includes('ECONNRESET') ||
    errorMessage?.includes('ECONNREFUSED') ||
    errorMessage?.includes('fetch failed') ||
    errorMessage?.includes('network') ||
    errorMessage?.includes('Failed to fetch') ||
    errorMessage?.includes('NetworkError') ||
    errorMessage?.includes('ConnectTimeoutError')
  )
}

// Rate limiter para errores de red - evita ciclos infinitos de logs
const networkErrorState = {
  lastError: 0,
  errorCount: 0,
  isInCooldown: false,
}

function shouldSkipNetworkRequest(): boolean {
  const now = Date.now()
  const COOLDOWN_MS = 30000 // 30 segundos de cooldown después de múltiples errores
  const MAX_ERRORS_BEFORE_COOLDOWN = 3

  // Si estamos en cooldown, verificar si ya pasó
  if (networkErrorState.isInCooldown) {
    if (now - networkErrorState.lastError > COOLDOWN_MS) {
      networkErrorState.isInCooldown = false
      networkErrorState.errorCount = 0
      return false
    }
    return true // Aún en cooldown
  }

  return false
}

function recordNetworkError(): void {
  const now = Date.now()
  const RESET_WINDOW_MS = 60000 // Reset contador después de 1 minuto sin errores

  // Reset si ha pasado suficiente tiempo desde el último error
  if (now - networkErrorState.lastError > RESET_WINDOW_MS) {
    networkErrorState.errorCount = 0
  }

  networkErrorState.lastError = now
  networkErrorState.errorCount++

  if (networkErrorState.errorCount >= 3) {
    networkErrorState.isInCooldown = true
    console.warn('[Auth] Network errors detected, entering cooldown mode for 30s')
  }
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Use memoized instance to prevent re-creation on every render
  const supabase = useMemo(() => getSupabaseInstance(), [])
  const router = useRouter()
  const { setUser, setSession, setProfile, setLoading, setError } = useAuthStore()
  const initializedRef = useRef(false)
  const isHandlingAuthErrorRef = useRef(false)

  // Store router in a ref to avoid dependency issues
  const routerRef = useRef(router)
  routerRef.current = router

  // Función para manejar logout forzado cuando el refresh token es inválido
  // Using refs to avoid recreating the callback on every render
  const handleForceLogout = async (reason: string) => {
    // Prevenir múltiples llamadas simultáneas
    if (isHandlingAuthErrorRef.current) return
    isHandlingAuthErrorRef.current = true

    console.warn(`[Auth] Force logout triggered: ${reason}`)

    try {
      // Limpiar estado local primero (use getState for latest)
      const { setSession, setUser, setProfile, setError } = useAuthStore.getState()
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
      routerRef.current.push('/login?expired=true')
    } finally {
      // Permitir nuevos intentos después de un delay
      setTimeout(() => {
        isHandlingAuthErrorRef.current = false
      }, 2000)
    }
  }

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
          // Skip profile fetch if we're in network cooldown
          if (shouldSkipNetworkRequest()) {
            console.log('[Auth] Skipping profile fetch - in network cooldown')
          } else {
            // Get user profile with limited retry (solo 1 retry para evitar ciclos)
            let retries = 1
            let profile = null
            let profileError = null

            while (retries >= 0 && !profile) {
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

                // On network errors, record and maybe retry once
                if (isNetworkError(result.error)) {
                  recordNetworkError()
                  retries--
                  if (retries >= 0) {
                    await new Promise(r => setTimeout(r, 2000)) // 2 segundos entre reintentos
                  }
                } else {
                  break // Don't retry on non-network errors
                }
              }
            }

            if (profile && !profileError) {
              setProfile(profile)
            } else if (profileError) {
              // Solo log una vez, no repetir
              console.warn('[Auth] Profile fetch failed:', profileError.message)
            }
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
          // Usar window.location para forzar recarga completa y limpiar estado
          window.location.href = '/'
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

            if (session?.user && !shouldSkipNetworkRequest()) {
              // Get user profile - sin retry excesivo para evitar ciclos
              const result = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (result.data) {
                setProfile(result.data)
              } else if (result.error) {
                // Check for refresh token errors
                if (isRefreshTokenError(result.error)) {
                  await handleForceLogout('refresh_token_invalid_on_sign_in_profile')
                  return
                }

                // Record network error for rate limiting
                if (isNetworkError(result.error)) {
                  recordNetworkError()
                }
                console.warn('[Auth] Profile fetch on sign in failed:', result.error.message)
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

    // Setup global error handler for uncaught auth errors (con rate limiting)
    let lastGlobalErrorTime = 0
    const GLOBAL_ERROR_COOLDOWN = 10000 // 10 segundos entre manejos de errores globales

    const handleGlobalAuthError = (event: PromiseRejectionEvent) => {
      const now = Date.now()
      // Rate limit: solo procesar 1 error global cada 10 segundos
      if (now - lastGlobalErrorTime < GLOBAL_ERROR_COOLDOWN) {
        return
      }

      const error = event.reason
      if (isRefreshTokenError(error)) {
        lastGlobalErrorTime = now
        console.error('[Auth] Global refresh token error caught')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]) // Only depend on supabase instance which is stable

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