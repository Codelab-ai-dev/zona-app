import { createClientSupabaseClient } from '../supabase/client'
import { useLeagueStore } from '../stores/league-store'
import { useAuthStore } from '../stores/auth-store'
import { Database } from '../supabase/database.types'

type League = Database['public']['Tables']['leagues']['Row']
type LeagueInsert = Database['public']['Tables']['leagues']['Insert']
type LeagueUpdate = Database['public']['Tables']['leagues']['Update']

export const leagueActions = {
  // Get all active leagues (public)
  async getActiveLeagues() {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setLeagues } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setLeagues(leagues || [])
      return leagues
    } catch (error) {
      console.error('Get leagues error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leagues'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get leagues by admin (for admin dashboard)
  async getLeaguesByAdmin() {
    const supabase = createClientSupabaseClient()
    const { user } = useAuthStore.getState()
    const { setLoading, setError, setLeagues } = useLeagueStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setLeagues(leagues || [])
      return leagues
    } catch (error) {
      console.error('Get admin leagues error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch admin leagues'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get all leagues (for super admin)
  async getAllLeagues() {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setLeagues } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setLeagues(leagues || [])
      return leagues || []
    } catch (error) {
      console.error('Get all leagues error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load leagues'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get league by slug
  async getLeagueBySlug(slug: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setCurrentLeague } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: league, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('League not found')
        }
        throw error
      }
      
      setCurrentLeague(league)
      return league
    } catch (error) {
      console.error('Get league error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch league'
      setError(errorMessage)
      setCurrentLeague(null)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create league (for league admin)
  async createLeague(leagueData: Omit<LeagueInsert, 'admin_id'>) {
    const supabase = createClientSupabaseClient()
    const { user, setProfile } = useAuthStore.getState()
    const { setLoading, setError, addLeague } = useLeagueStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // 1. Crear la liga con el usuario actual como administrador
      const { data: league, error } = await (supabase
        .from('leagues') as any)
        .insert({
          ...leagueData,
          admin_id: user.id,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      console.log('🏆 Liga creada por administrador:', league)
      
      // 2. Asignar automáticamente la liga al administrador creador
      try {
        console.log('🔄 Asignando liga al administrador creador:', { 
          leagueId: league.id, 
          adminId: user.id 
        })
        
        const { data: updatedAdmin, error: updateError } = await (supabase
          .from('users') as any)
          .update({
            league_id: league.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single()

        if (updateError) {
          console.warn('⚠️ Error asignando liga al administrador creador:', updateError)
        } else {
          console.log('✅ Liga asignada automáticamente al administrador creador:', updatedAdmin)
          // Actualizar el perfil en el store de autenticación
          setProfile(updatedAdmin)
        }
      } catch (assignError) {
        console.warn('⚠️ Excepción asignando liga al administrador creador:', assignError)
      }
      
      addLeague(league)
      return league
    } catch (error) {
      console.error('Create league error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create league'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create league with specific admin (for super admin use)
  async createLeagueWithAdmin(leagueData: LeagueInsert): Promise<League> {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, addLeague } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      // 1. Crear la liga
      const { data: league, error } = await (supabase
        .from('leagues') as any)
        .insert(leagueData)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      console.log('🏆 Liga creada:', league)
      
      // 2. Asignar automáticamente la liga al administrador
      if (league && leagueData.admin_id) {
        try {
          console.log('🔄 Asignando liga al administrador:', { 
            leagueId: league.id, 
            adminId: leagueData.admin_id 
          })
          
          const { data: updatedAdmin, error: updateError } = await (supabase
            .from('users') as any)
            .update({
              league_id: league.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', leagueData.admin_id)
            .select()
            .single()

          if (updateError) {
            console.warn('⚠️ Error asignando liga al administrador:', updateError)
            // No lanzar error aquí para no fallar la creación de la liga
          } else {
            console.log('✅ Liga asignada automáticamente al administrador:', updatedAdmin)
          }
        } catch (assignError) {
          console.warn('⚠️ Excepción asignando liga al administrador:', assignError)
          // No lanzar error aquí para no fallar la creación de la liga
        }
      }
      
      addLeague(league)
      return league
    } catch (error) {
      console.error('Create league with admin error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create league'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update league
  async updateLeague(leagueId: string, updates: LeagueUpdate) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, updateLeague } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: league, error } = await (supabase
        .from('leagues') as any)
        .update(updates)
        .eq('id', leagueId)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      updateLeague(league)
      return league
    } catch (error) {
      console.error('Update league error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update league'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Delete league
  async deleteLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, removeLeague } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      // Soft delete by setting is_active to false
      const { error } = await (supabase
        .from('leagues') as any)
        .update({ is_active: false })
        .eq('id', leagueId)
      
      if (error) {
        throw error
      }
      
      removeLeague(leagueId)
    } catch (error) {
      console.error('Delete league error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete league'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get tournaments for a league
  async getTournamentsByLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setTournaments } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setTournaments(tournaments || [])
      return tournaments
    } catch (error) {
      console.error('Get tournaments error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tournaments'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get teams for a league
  async getTeamsByLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setTeams } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
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

  // Get league statistics
  async getLeagueStats(leagueId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      // Get teams count and recent teams
      const { data: teams, count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      // Get tournaments count and active tournament
      const { data: tournaments, count: tournamentsCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact' })
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
      
      const activeTournament = tournaments?.find((t: any) => t.is_active)
      
      // Get players count for the league
      const { count: playersCount } = await supabase
        .from('players')
        .select('team_id', { count: 'exact', head: true })
        .in('team_id', teams?.map((t: any) => t.id) || [])
        .eq('is_active', true)
      
      // Get matches count for the league (through tournaments)
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .in('tournament_id', tournaments?.map((t: any) => t.id) || [])
      
      // Get recent matches
      const { data: recentMatches } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug),
          away_team:teams!matches_away_team_id_fkey(id, name, slug)
        `)
        .in('tournament_id', tournaments?.map((t: any) => t.id) || [])
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true })
        .limit(3)
      
      return {
        teamsCount: teamsCount || 0,
        tournamentsCount: tournamentsCount || 0,
        playersCount: playersCount || 0,
        matchesCount: matchesCount || 0,
        activeTournament,
        recentTeams: teams?.slice(0, 3) || [],
        upcomingMatches: recentMatches || [],
      }
    } catch (error) {
      console.error('Get league stats error:', error)
      throw error
    }
  },

  // Get system-wide statistics (for super admin)
  async getSystemStats() {
    const supabase = createClientSupabaseClient()
    
    try {
      // Get all leagues with counts
      const { data: leagues, count: totalLeagues } = await supabase
        .from('leagues')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      const activeLeagues = leagues?.filter((l: any) => l.is_active).length || 0
      
      // Get all tournaments
      const { count: totalTournaments } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
      
      const { count: activeTournaments } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      // Get all teams
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
      
      const { count: activeTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      // Get all players
      const { count: totalPlayers } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
      
      const { count: activePlayers } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      return {
        leagues: {
          active: activeLeagues,
          total: totalLeagues || 0,
          recentLeagues: leagues?.slice(0, 3) || []
        },
        tournaments: {
          active: activeTournaments || 0,
          total: totalTournaments || 0
        },
        teams: {
          active: activeTeams || 0,
          total: totalTeams || 0
        },
        players: {
          active: activePlayers || 0,
          total: totalPlayers || 0
        }
      }
    } catch (error) {
      console.error('Get system stats error:', error)
      throw error
    }
  }
}

// Server-side functions (no store dependencies)
export const serverLeagueActions = {
  async getActiveLeagues() {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      return leagues || []
    } catch (error) {
      console.error('Get active leagues error:', error)
      return []
    }
  },

  async getLeagueBySlug(slug: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data: league, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      
      if (error) {
        throw error
      }
      
      return league
    } catch (error) {
      console.error('Get league by slug error:', error)
      throw error
    }
  },

  async getTournamentsByLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      return tournaments || []
    } catch (error) {
      console.error('Get tournaments by league error:', error)
      return []
    }
  },

  async getTeamsByLeague(leagueId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (error) {
        throw error
      }
      
      return teams || []
    } catch (error) {
      console.error('Get teams by league error:', error)
      return []
    }
  },

  async getLeagueStats(leagueId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      // Get teams count
      const { count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('is_active', true)
      
      // Get tournaments
      const { data: tournaments, count: tournamentsCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact' })
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
      
      // Get players count
      const { count: playersCount } = await supabase
        .from('players')
        .select('*, team:teams!inner(*)', { count: 'exact', head: true })
        .eq('team.league_id', leagueId)
      
      // Get matches count and data
      const { data: matches, count: matchesCount } = await supabase
        .from('matches')
        .select(`
          id,
          tournament_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          match_date,
          match_time,
          field_number,
          round,
          status,
          created_at,
          updated_at,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
          tournament:tournaments(id, name)
        `, { count: 'exact' })
        .eq('home_team.league_id', leagueId)
        .order('match_date', { ascending: false })
      
      // Debug: Log all matches to understand the data
      console.log('🔍 All matches for league:', leagueId, {
        totalMatches: matches?.length || 0,
        statuses: matches?.map(m => ({ id: m.id, status: m.status, date: m.match_date })) || []
      })

      // Get upcoming matches
      const upcomingMatches = matches?.filter(match => {
        const isScheduled = match.status === 'scheduled' || match.status === 'in_progress'
        const isFuture = new Date(match.match_date) > new Date()
        return isScheduled && isFuture
      }).slice(0, 5) || []
      
      // Get recent matches (finished matches, regardless of date)
      const recentMatches = matches?.filter(match => 
        match.status === 'finished'
      ).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, 5) || []

      // Organize matches by rounds/matchdays
      const matchesByRound = matches?.reduce((acc: any, match) => {
        const round = match.round || 1 // Default to round 1 if not specified
        if (!acc[round]) {
          acc[round] = []
        }
        acc[round].push(match)
        return acc
      }, {}) || {}

      // Sort matches within each round by date and time
      Object.keys(matchesByRound).forEach(round => {
        matchesByRound[round].sort((a: any, b: any) => {
          const dateA = new Date(a.match_date)
          const dateB = new Date(b.match_date)
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime()
          }
          // If same date, sort by time
          if (a.match_time && b.match_time) {
            return a.match_time.localeCompare(b.match_time)
          }
          return 0
        })
      })

      // Get round numbers sorted
      const roundNumbers = Object.keys(matchesByRound)
        .map(r => parseInt(r))
        .sort((a, b) => a - b)

      // Debug: Log filtered matches
      console.log('🏆 Filtered matches:', {
        upcomingCount: upcomingMatches.length,
        recentCount: recentMatches.length,
        totalRounds: roundNumbers.length,
        matchesByRound: Object.keys(matchesByRound).map(round => ({
          round,
          matchCount: matchesByRound[round].length
        }))
      })

      // Get all teams in the league
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name, slug, logo')
        .eq('league_id', leagueId)
        .eq('is_active', true)

      // Get team standings from team_stats table
      const { data: teamStatsData } = await supabase
        .from('team_stats')
        .select(`
          *,
          team:teams(id, name, slug, logo)
        `)
        .eq('league_id', leagueId)
        .order('points', { ascending: false })
        .order('goal_difference', { ascending: false })
        .order('goals_for', { ascending: false })

      // Create a complete team standings list that includes all teams
      const teamStandings = (allTeams || []).map(team => {
        // Find existing stats for this team
        const existingStats = teamStatsData?.find(stats => stats.team_id === team.id)
        
        if (existingStats) {
          // Return existing stats with team info
          return existingStats
        } else {
          // Create empty stats entry for teams without statistics
          return {
            team_id: team.id,
            tournament_id: null,
            league_id: leagueId,
            matches_played: 0,
            matches_won: 0,
            matches_drawn: 0,
            matches_lost: 0,
            goals_for: 0,
            goals_against: 0,
            goal_difference: 0,
            points: 0,
            clean_sheets: 0,
            biggest_win_margin: 0,
            biggest_loss_margin: 0,
            yellow_cards: 0,
            red_cards: 0,
            total_attendance: 0,
            average_attendance: 0,
            recent_form: '',
            last_match_date: null,
            last_win_date: null,
            team: team,
            created_at: null,
            updated_at: null
          }
        }
      })

      // Sort the complete standings by points, goal difference, and goals for
      teamStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
        return b.goals_for - a.goals_for
      })
      
      return {
        teamsCount: teamsCount || 0,
        tournamentsCount: tournamentsCount || 0,
        playersCount: playersCount || 0,
        matchesCount: matchesCount || 0,
        upcomingMatches,
        recentMatches,
        allMatches: matches || [],
        matchesByRound,
        roundNumbers,
        teamStandings: teamStandings || [],
        activeTournament: tournaments?.find(t => t.is_active) || null
      }
    } catch (error) {
      console.error('Get league stats error:', error)
      return {
        teamsCount: 0,
        tournamentsCount: 0,
        playersCount: 0,
        matchesCount: 0,
        upcomingMatches: [],
        recentMatches: [],
        allMatches: [],
        matchesByRound: {},
        roundNumbers: [],
        teamStandings: [],
        activeTournament: null
      }
    }
  }
}