import { createClientSupabaseClient } from '../supabase/client'
import { useTeamStore } from '../stores/team-store'
import { useAuthStore } from '../stores/auth-store'
import { generatePassword } from '../utils'
import { Database } from '../supabase/database.types'

type Team = Database['public']['Tables']['teams']['Row']
type TeamInsert = Database['public']['Tables']['teams']['Insert']
type TeamUpdate = Database['public']['Tables']['teams']['Update']
type Player = Database['public']['Tables']['players']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']

export const teamActions = {
  // Get teams by league (for league admin)
  async getTeamsByLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setTeams } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setTeams(teams || [])
      return teams
    } catch (error) {
      console.error('Get teams by league error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create team with owner assignment (for league admin use)
  async createTeamWithOwner(teamData: TeamInsert) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, addTeam } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert(teamData)
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .single()
      
      if (error) {
        throw error
      }
      
      if (addTeam) {
        addTeam(team)
      }
      return team
    } catch (error) {
      console.error('Create team with owner error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create team with new owner (for league admin use) - Creates both team and owner
  async createTeamWithNewOwner(teamData: Omit<TeamInsert, 'owner_id'>, ownerData: {
    name: string
    email: string
    phone?: string
    password?: string  // Contraseña opcional, se genera si no se proporciona
  }) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, addTeam } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔐 Iniciando creación de equipo con nuevo propietario...')
      
      // Usar la contraseña proporcionada o generar una nueva
      const ownerPassword = ownerData.password || generatePassword()
      console.log('🔑 Contraseña para propietario del equipo:', ownerData.password ? 'proporcionada' : 'generada')
      
      let ownerProfile: any
      
      // Intentar crear usuario con admin API primero
      try {
        console.log('🔵 Intentando crear usuario propietario con admin API...')
        
        const authResponse = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ownerData.email,
            password: ownerPassword,
            user_metadata: {
              name: ownerData.name,
              role: 'team_owner'
            }
          })
        })
        
        console.log('🔵 Response status:', authResponse.status)
        
        if (authResponse.ok) {
          const { user: authUser } = await authResponse.json()
          console.log('✅ Usuario de autenticación creado con admin API:', authUser)
          
          // Esperar un poco para que los triggers se ejecuten
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Crear el perfil del usuario propietario
          const { data: profile, error: profileError } = await (supabase
            .from('users') as any)
            .upsert({
              id: authUser.id,
              email: ownerData.email,
              name: ownerData.name,
              role: 'team_owner',
              phone: ownerData.phone || null,
              league_id: teamData.league_id, // Asignar la liga del equipo
              is_active: true
            }, { onConflict: 'id' })
            .select()
            .single()
          
          if (!profileError && profile) {
            ownerProfile = profile
            console.log('✅ Perfil de propietario creado:', ownerProfile)
          } else {
            console.error('❌ Error creando perfil:', profileError)
            throw new Error(`Profile creation failed: ${profileError?.message}`)
          }
        } else {
          const errorData = await authResponse.json()
          console.error('❌ Error en respuesta de admin API:', {
            status: authResponse.status,
            error: errorData
          })
          throw new Error(`Admin API failed: ${errorData.error || 'Unknown error'}`)
        }
      } catch (adminApiError) {
        console.error('❌ Error creando usuario propietario:', adminApiError)
        throw new Error(`Failed to create team owner: ${adminApiError.message}`)
      }
      
      // Crear el equipo con el nuevo propietario
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          ...teamData,
          owner_id: ownerProfile.id,
        })
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .single()
      
      if (teamError) {
        throw teamError
      }

      // Actualizar el perfil del propietario con el team_id
      const { error: updateOwnerError } = await (supabase
        .from('users') as any)
        .update({
          team_id: team.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ownerProfile.id)

      if (updateOwnerError) {
        console.warn('⚠️ Error asignando team_id al propietario:', updateOwnerError)
      }
      
      if (addTeam) {
        addTeam(team)
      }

      console.log('✅ Equipo y propietario creados correctamente')
      
      // Return both the team and the credentials for display
      return {
        team,
        ownerCredentials: {
          email: ownerData.email,
          password: ownerPassword,
          name: ownerData.name
        }
      }
    } catch (error) {
      console.error('Create team with new owner error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team and owner'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get teams for current user (team owner)
  async getTeamsByOwner() {
    const supabase = createClientSupabaseClient()
    const { user } = useAuthStore.getState()
    const { setLoading, setError, setTeams } = useTeamStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setTeams(teams || [])
      return teams
    } catch (error) {
      console.error('Get teams error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get team by slug
  async getTeamBySlug(slug: string, leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setCurrentTeam } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Team not found')
        }
        throw error
      }
      
      setCurrentTeam(team)
      return team
    } catch (error) {
      console.error('Get team error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team'
      setError(errorMessage)
      setCurrentTeam(null)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create team
  async createTeam(teamData: Omit<TeamInsert, 'owner_id'>) {
    const supabase = createClientSupabaseClient()
    const { user } = useAuthStore.getState()
    const { setLoading, setError } = useTeamStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          ...teamData,
          owner_id: user.id,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      return team
    } catch (error) {
      console.error('Create team error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update team
  async updateTeam(teamId: string, updates: TeamUpdate) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, updateTeam } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: team, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .single()
      
      if (error) {
        throw error
      }
      
      updateTeam(team)
      return team
    } catch (error) {
      console.error('Update team error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get players for a team
  async getPlayersByTeam(teamId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setPlayers } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('jersey_number', { ascending: true })
      
      if (error) {
        throw error
      }
      
      setPlayers(players || [])
      return players
    } catch (error) {
      console.error('Get players error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch players'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create player
  async createPlayer(playerData: PlayerInsert) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, addPlayer } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: player, error } = await supabase
        .from('players')
        .insert(playerData)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      addPlayer(player)
      return player
    } catch (error) {
      console.error('Create player error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create player'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update player
  async updatePlayer(playerId: string, updates: PlayerUpdate) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, updatePlayer } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: player, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      updatePlayer(player)
      return player
    } catch (error) {
      console.error('Update player error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update player'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Delete player (soft delete)
  async deletePlayer(playerId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, removePlayer } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', playerId)
      
      if (error) {
        throw error
      }
      
      removePlayer(playerId)
    } catch (error) {
      console.error('Delete player error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete player'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get matches for a team
  async getMatchesByTeam(teamId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setMatches } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
          tournament:tournaments(id, name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setMatches(matches || [])
      return matches
    } catch (error) {
      console.error('Get matches error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch matches'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get team by ID
  async getTeamById(teamId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setCurrentTeam } = useTeamStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: team, error } = await supabase
        .from('teams')
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .eq('id', teamId)
        .single()
      
      if (error) {
        throw error
      }
      
      if (setCurrentTeam) {
        setCurrentTeam(team)
      }
      return team
    } catch (error) {
      console.error('Get team by ID error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get team statistics
  async getTeamStats(teamId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      // Get players count
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true)
      
      // Get matches count
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      
      // Get wins, losses, draws
      const { data: matches } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id, home_score, away_score, status')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .eq('status', 'finished')
      
      let wins = 0, losses = 0, draws = 0
      
      matches?.forEach(match => {
        if (match.home_score === null || match.away_score === null) return
        
        const isHome = match.home_team_id === teamId
        const teamScore = isHome ? match.home_score : match.away_score
        const opponentScore = isHome ? match.away_score : match.home_score
        
        if (teamScore > opponentScore) wins++
        else if (teamScore < opponentScore) losses++
        else draws++
      })
      
      return {
        playersCount: playersCount || 0,
        matchesCount: matchesCount || 0,
        wins,
        losses,
        draws,
      }
    } catch (error) {
      console.error('Get team stats error:', error)
      throw error
    }
  }
}