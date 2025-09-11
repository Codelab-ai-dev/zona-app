import { createClientSupabaseClient } from '../supabase/client'
import { useAuthStore } from '../stores/auth-store'
import { Database } from '../supabase/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']
type UsersTable = Database['public']['Tables']['users']

export const authActions = {
  // Initialize auth state
  async initialize() {
    const supabase = createClientSupabaseClient()
    const { setLoading, setUser, setSession, setProfile, setError } = useAuthStore.getState()
    
    // Evitar inicialización si ya hay una sesión activa
    const currentState = useAuthStore.getState()
    if (currentState.isAuthenticated && currentState.user && currentState.session) {
      console.log('Ya existe una sesión activa, omitiendo inicialización')
      return
    }
    
    try {
      setLoading(true)
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error al obtener sesión:', sessionError)
        setError(sessionError.message)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Get user profile if authenticated
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (!profileError && profile) {
            setProfile(profile)
          } else if (profileError) {
            console.warn('Error al obtener perfil:', profileError)
            // No establecer error global para evitar bloquear la autenticación
          }
        } catch (profileError) {
          console.error('Error al obtener perfil:', profileError)
          // No establecer error global para evitar bloquear la autenticación
        }
      }
      
      setError(null)
    } catch (error) {
      console.error('Auth initialization error:', error)
      setError(error instanceof Error ? error.message : 'Authentication error')
    } finally {
      setLoading(false)
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setUser, setSession, setProfile } = useAuthStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      setUser(user)
      setSession(session)
      
      // Get user profile
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (!profileError && profile) {
          setProfile(profile)
        }
      }
      
      return { user, session }
    } catch (error) {
      console.error('Sign in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Sign up with email and password
  async signUp(email: string, password: string, userData: Partial<UserInsert>) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError } = useAuthStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) {
        throw error
      }
      
      // Create user profile
      if (user) {
        // Crear un objeto que cumpla con el tipo esperado por .insert()
        const userProfile: UserInsert = {
          id: user.id,
          email: user.email!,
          name: userData.name || '',
          role: userData.role || 'public',
          phone: userData.phone || null,
          league_id: userData.league_id || null,
          team_id: userData.team_id || null,
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        try {
          // Use explicit typing for the from method to fix the type error
          const { error: profileError } = await (supabase
            .from('users') as any)
            .insert(userProfile)
            
          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        } catch (insertError) {
          console.error('Error al insertar perfil de usuario:', insertError)
          // No lanzar el error para permitir que el flujo de registro continúe
        }
      }
      
      return { user }
    } catch (error) {
      console.error('Sign up error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Sign out
  async signOut() {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, signOut } = useAuthStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update user profile
  async updateProfile(updates: Partial<UserUpdate>) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setProfile, user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Asegurarse de que el objeto de actualización tenga el tipo correcto
      const validUpdates: UserUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      const { data: profile, error } = await (supabase
        .from('users') as any)
        .update(validUpdates)
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      setProfile(profile)
      return profile
    } catch (error) {
      console.error('Profile update error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get user profile
  async getProfile(userId?: string) {
    const supabase = createClientSupabaseClient()
    const { user } = useAuthStore.getState()
    const targetUserId = userId || user?.id
    
    if (!targetUserId) {
      throw new Error('User ID required')
    }
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single()
    
    if (error) {
      throw error
    }
    
    return profile
  },

  // Reset password
  async resetPassword(email: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError } = useAuthStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Password reset error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update password
  async updatePassword(newPassword: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError } = useAuthStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Password update error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Password update failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create new user (for super admin use) - Preserves current session
  async createUser(userData: {
    email: string
    password: string
    name: string
    role: 'super_admin' | 'league_admin' | 'team_owner' | 'public'
    phone?: string
    league_id?: string
    team_id?: string
  }) {
    const supabase = createClientSupabaseClient()
    
    try {
      console.log('🔐 Iniciando creación de usuario sin redirecciones...')
      
      // Guardar la sesión actual
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        throw new Error('No hay sesión activa de super admin')
      }
      
      // Crear el nuevo usuario (esto cambiará temporalmente la sesión)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone
          }
        }
      })

      if (authError) {
        console.error('Error creando usuario:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('User creation failed')
      }
      
      console.log('👤 Usuario creado con ID:', authData.user.id)
      
      // Restaurar inmediatamente la sesión original
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      })

      if (restoreError) {
        console.error('Error restaurando sesión:', restoreError)
        // No lanzar error aquí, el usuario se creó correctamente
      }

      // Esperar un momento para que los triggers de la base de datos se completen
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Crear o actualizar el perfil del usuario
      const { data: profile, error: profileError } = await (supabase
        .from('users') as any)
        .upsert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          league_id: userData.league_id,
          team_id: userData.team_id,
          is_active: true
        }, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation/update error:', profileError)
        throw new Error(`Profile operation failed: ${profileError.message}`)
      }

      console.log('✅ Usuario creado correctamente sin redirecciones')
      
      // Return both the profile and the credentials for display
      const result = {
        profile,
        credentials: {
          email: userData.email,
          password: userData.password
        }
      }
      
      console.log('🔐 Returning credentials:', result.credentials)
      return result
    } catch (error) {
      console.error('Create user error:', error)
      throw error
    }
  },

  // Get all user profiles (for super admin use)
  async getAllProfiles() {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get all profiles error:', error)
      throw error
    }
  },

  // Update user profile by ID (for super admin use)
  async updateProfileById(userId: string, updates: Partial<UserUpdate>) {
    const supabase = createClientSupabaseClient()
    
    try {
      console.log('🔄 Actualizando perfil de usuario:', { userId, updates })
      
      // Add updated_at to ensure schema consistency
      const validUpdates = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await (supabase
        .from('users') as any)
        .update(validUpdates)
        .eq('id', userId)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Update profile error:', error)
        throw error
      }

      console.log('✅ Perfil actualizado:', data)
      return data
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  },

  // Assign league to current user (for when super admin becomes league admin temporarily)
  async assignLeagueToCurrentUser(leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { user, setProfile } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      console.log('🔄 Asignando liga al usuario actual:', { userId: user.id, leagueId })
      
      const { data, error } = await (supabase
        .from('users') as any)
        .update({
          league_id: leagueId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error asignando liga:', error)
        throw error
      }

      // Actualizar el estado local
      setProfile(data)
      
      console.log('✅ Liga asignada al usuario actual:', data)
      return data
    } catch (error) {
      console.error('Assign league error:', error)
      throw error
    }
  }
}