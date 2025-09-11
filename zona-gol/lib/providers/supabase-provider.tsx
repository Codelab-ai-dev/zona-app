"use client"

import { createContext, useContext, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useAuthStore } from '../stores/auth-store'
import { createClientSupabaseClient } from '../supabase/client'

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientSupabaseClient>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientSupabaseClient()
  const router = useRouter()
  const { setUser, setSession, setProfile, setLoading, setError } = useAuthStore()
  const initializedRef = useRef(false)
  
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
          setError(error.message)
          return
        }
        
        // Set initial state
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profile && !profileError) {
            setProfile(profile)
          } else {
            console.warn('No profile found for user:', session.user.id)
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
        
        // Skip redundant events to avoid unnecessary reloads
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          return
        }
        
        console.log('Auth state changed:', event, session?.user?.email)
        
        // Get current state to avoid redundant operations
        const currentState = useAuthStore.getState()
        
        // Only handle significant auth changes
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
            console.log('User already authenticated, skipping SIGNED_IN handler')
            return
          }
          
          try {
            setLoading(true)
            setSession(session)
            setUser(session?.user ?? null)
            
            if (session?.user) {
              // Get user profile
              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
                
              if (profile && !profileError) {
                setProfile(profile)
              }
            }
            
            setError(null)
          } catch (error) {
            console.error('Auth state change error:', error)
            setError(error instanceof Error ? error.message : 'Authentication error')
          } finally {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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