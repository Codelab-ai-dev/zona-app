import { createClientSupabaseClient } from '../supabase/client'
import { createClient } from '@supabase/supabase-js'
import { useLeagueStore } from '../stores/league-store'
import { useAuthStore } from '../stores/auth-store'
import { Database } from '../supabase/database.types'

// Helper para crear cliente de Supabase en el servidor de forma lazy
// Evita errores durante el build cuando las env vars no están disponibles
function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(url, key)
}

type League = Database['public']['Tables']['leagues']['Row']
type LeagueInsert = Database['public']['Tables']['leagues']['Insert']
type LeagueUpdate = Database['public']['Tables']['leagues']['Update']
type Tournament = Database['public']['Tables']['tournaments']['Row']
type Team = Database['public']['Tables']['teams']['Row']

export const leagueActions = {
  // Get all active leagues (public)
  async getActiveLeagues() {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, setLeagues } = useLeagueStore.getState()

    try {
      setLoading(true)
      setError(null)

      // console.log('🔍 Fetching active leagues from database...')

      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .returns<League[]>()

      if (error) {
        // console.error('❌ Database error:', error)
        throw error
      }

      // console.log('✅ Database query successful. Found leagues:', leagues?.length || 0)
      // leagues?.forEach((league, index) => {
      //   console.log(`  ${index + 1}. ${league.name} (is_active: ${league.is_active})`)
      // })

      setLeagues(leagues || [])
      // console.log('📦 Store updated with leagues')

      return leagues
    } catch (error) {
      // console.error('Get leagues error:', error)
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
      // console.error('Get admin leagues error:', error)
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
        .returns<League[]>()

      if (error) {
        throw error
      }

      setLeagues(leagues || [])
      // console.log('📋 Todas las ligas obtenidas:', leagues?.map(l => ({
      //   name: l.name,
      //   is_active: l.is_active,
      //   created_at: l.created_at
      // })))
      return leagues || []
    } catch (error) {
      // console.error('Get all leagues error:', error)
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
      // console.error('Get league error:', error)
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

      // 1. Crear la liga con el usuario actual como administrador (asegurar que sea activa)
      const { data: league, error } = await (supabase
        .from('leagues') as any)
        .insert({
          ...leagueData,
          admin_id: user.id,
          is_active: leagueData.is_active !== undefined ? leagueData.is_active : true
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // console.log('🏆 Liga creada por administrador:', league)

      // 2. Asignar automáticamente la liga al administrador creador
      try {
        // console.log('🔄 Asignando liga al administrador creador:', {
        //   leagueId: league.id,
        //   adminId: user.id
        // })

        const { data: updatedAdmin, error: updateError } = await (supabase
          .from('users') as any)
          .update({
            league_id: league.id,
            role: 'league_admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single()

        if (updateError) {
          // console.warn('⚠️ Error asignando liga al administrador creador:', updateError)
        } else {
          // console.log('✅ Liga asignada automáticamente al administrador creador:', updatedAdmin)
          // Actualizar el perfil en el store de autenticación
          setProfile(updatedAdmin)
        }
      } catch (assignError) {
        // console.warn('⚠️ Excepción asignando liga al administrador creador:', assignError)
      }

      addLeague(league)
      return league
    } catch (error) {
      // console.error('Create league error:', error)
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

      // 1. Crear la liga (asegurar que siempre sea activa)
      const leagueDataWithDefaults = {
        ...leagueData,
        is_active: leagueData.is_active !== undefined ? leagueData.is_active : true
      }

      const { data: league, error } = await (supabase
        .from('leagues') as any)
        .insert(leagueDataWithDefaults)
        .select()
        .single()

      if (error) {
        throw error
      }

      // console.log('🏆 Liga creada:', league)
      // console.log('🔍 Estado is_active de la liga creada:', league.is_active)

      // 2. Asignar automáticamente la liga al administrador
      if (league && leagueData.admin_id) {
        try {
          // console.log('🔄 Asignando liga al administrador:', {
          //   leagueId: league.id,
          //   adminId: leagueData.admin_id
          // })

          const { data: updatedAdmin, error: updateError } = await (supabase
            .from('users') as any)
            .update({
              league_id: league.id,
              role: 'league_admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', leagueData.admin_id)
            .select()
            .single()

          if (updateError) {
            // console.warn('⚠️ Error asignando liga al administrador:', updateError)
            // No lanzar error aquí para no fallar la creación de la liga
          } else {
            // console.log('✅ Liga asignada automáticamente al administrador:', updatedAdmin)
          }
        } catch (assignError) {
          // console.warn('⚠️ Excepción asignando liga al administrador:', assignError)
          // No lanzar error aquí para no fallar la creación de la liga
        }
      }

      addLeague(league)
      return league
    } catch (error) {
      // console.error('Create league with admin error:', error)
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

      // console.log('🔄 Liga actualizada en BD:', {
      //   id: league.id,
      //   name: league.name,
      //   is_active: league.is_active,
      //   updated_at: league.updated_at
      // })

      updateLeague(league)

      // Forzar actualización del store solo con ligas activas para el directorio público
      setTimeout(async () => {
        try {
          const { data: activeLeagues } = await supabase
            .from('leagues')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          if (activeLeagues) {
            const { setLeagues } = useLeagueStore.getState()
            setLeagues(activeLeagues)
            // console.log('🔄 Store actualizado con ligas activas:', activeLeagues?.length)

            // Trigger a refresh event for the public directory
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('league-status-updated'))
            }
          }
        } catch (error) {
          // console.warn('⚠️ Error refrescando store:', error)
        }
      }, 100)

      return league
    } catch (error) {
      // console.error('Update league error:', error)
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
      // console.error('Delete league error:', error)
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
      // console.error('Get tournaments error:', error)
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
      // console.error('Get teams error:', error)
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
      // OPTIMIZACIÓN: Ejecutar queries independientes en paralelo
      const [teamsResult, tournamentsResult] = await Promise.all([
        // Get teams count and recent teams (solo campos necesarios)
        supabase
          .from('teams')
          .select('id, name, slug, created_at', { count: 'exact' })
          .eq('league_id', leagueId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10),

        // Get tournaments count and active tournament (solo campos necesarios)
        supabase
          .from('tournaments')
          .select('id, name, is_active, tournament_format, start_date, end_date', { count: 'exact' })
          .eq('league_id', leagueId)
          .order('created_at', { ascending: false })
      ])

      const { data: teams, count: teamsCount } = teamsResult
      const { data: tournaments, count: tournamentsCount } = tournamentsResult
      const activeTournament = tournaments?.find((t: any) => t.is_active)

      const teamIds = teams?.map((t: any) => t.id) || []
      const tournamentIds = tournaments?.map((t: any) => t.id) || []

      // OPTIMIZACIÓN: Ejecutar el segundo batch de queries en paralelo
      const [playersResult, matchesCountResult, recentMatchesResult] = await Promise.all([
        // Get players count for the league
        teamIds.length > 0
          ? supabase
              .from('players')
              .select('id', { count: 'exact', head: true })
              .in('team_id', teamIds)
              .eq('is_active', true)
          : Promise.resolve({ count: 0 }),

        // Get matches count for the league
        tournamentIds.length > 0
          ? supabase
              .from('matches')
              .select('id', { count: 'exact', head: true })
              .in('tournament_id', tournamentIds)
          : Promise.resolve({ count: 0 }),

        // Get upcoming matches (solo campos necesarios)
        tournamentIds.length > 0
          ? supabase
              .from('matches')
              .select(`
                id, match_date, match_time, status, round,
                home_team:teams!matches_home_team_id_fkey(id, name, slug),
                away_team:teams!matches_away_team_id_fkey(id, name, slug)
              `)
              .in('tournament_id', tournamentIds)
              .eq('status', 'scheduled')
              .order('match_date', { ascending: true })
              .limit(3)
          : Promise.resolve({ data: [] })
      ])

      return {
        teamsCount: teamsCount || 0,
        tournamentsCount: tournamentsCount || 0,
        playersCount: playersResult.count || 0,
        matchesCount: matchesCountResult.count || 0,
        activeTournament,
        recentTeams: teams?.slice(0, 3) || [],
        upcomingMatches: recentMatchesResult.data || [],
      }
    } catch (error) {
      // console.error('Get league stats error:', error)
      throw error
    }
  },

  // Get system-wide statistics (for super admin)
  async getSystemStats() {
    const supabase = createClientSupabaseClient()

    try {
      // OPTIMIZACIÓN: Ejecutar TODAS las queries en paralelo
      const [
        leaguesResult,
        totalTournamentsResult,
        activeTournamentsResult,
        totalTeamsResult,
        activeTeamsResult,
        totalPlayersResult,
        activePlayersResult
      ] = await Promise.all([
        // Get all leagues (solo campos necesarios)
        supabase
          .from('leagues')
          .select('id, name, slug, is_active, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(10),

        // Get total tournaments count
        supabase
          .from('tournaments')
          .select('id', { count: 'exact', head: true }),

        // Get active tournaments count
        supabase
          .from('tournaments')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),

        // Get total teams count
        supabase
          .from('teams')
          .select('id', { count: 'exact', head: true }),

        // Get active teams count
        supabase
          .from('teams')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),

        // Get total players count
        supabase
          .from('players')
          .select('id', { count: 'exact', head: true }),

        // Get active players count
        supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
      ])

      const { data: leagues, count: totalLeagues } = leaguesResult
      const activeLeagues = leagues?.filter((l: any) => l.is_active).length || 0

      return {
        leagues: {
          active: activeLeagues,
          total: totalLeagues || 0,
          recentLeagues: leagues?.slice(0, 3) || []
        },
        tournaments: {
          active: activeTournamentsResult.count || 0,
          total: totalTournamentsResult.count || 0
        },
        teams: {
          active: activeTeamsResult.count || 0,
          total: totalTeamsResult.count || 0
        },
        players: {
          active: activePlayersResult.count || 0,
          total: totalPlayersResult.count || 0
        }
      }
    } catch (error) {
      // console.error('Get system stats error:', error)
      throw error
    }
  }
}

// Server-side functions (no store dependencies)
// Usa getServerSupabaseClient() para crear el cliente de forma lazy
export const serverLeagueActions = {
  async getActiveLeagues() {
    const supabase = getServerSupabaseClient()

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
      // console.error('Get active leagues error:', error)
      return []
    }
  },

  async getLeagueBySlug(slug: string) {
    const supabase = getServerSupabaseClient()

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
      // console.error('Get league by slug error:', error)
      throw error
    }
  },

  async getTournamentsByLeague(leagueId: string) {
    const supabase = getServerSupabaseClient()

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
      // console.error('Get tournaments by league error:', error)
      return []
    }
  },

  async getTeamsByLeague(leagueId: string) {
    const supabase = getServerSupabaseClient()

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
      // console.error('Get teams by league error:', error)
      return []
    }
  },

  async getLeagueStats(leagueId: string) {
    const supabase = getServerSupabaseClient()

    try {
      // OPTIMIZACIÓN: Ejecutar queries independientes en paralelo
      const [teamsResult, tournamentsResult, playersResult] = await Promise.all([
        // Get teams count
        supabase
          .from('teams')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .eq('is_active', true),

        // Get tournaments
        supabase
          .from('tournaments')
          .select('id, name, is_active, tournament_format, start_date, end_date', { count: 'exact' })
          .eq('league_id', leagueId)
          .order('created_at', { ascending: false }),

        // Get players count
        supabase
          .from('players')
          .select('id, team:teams!inner(id)', { count: 'exact', head: true })
          .eq('team.league_id', leagueId)
      ])

      const teamsCount = teamsResult.count || 0
      const tournaments = tournamentsResult.data || []
      const tournamentsCount = tournamentsResult.count || 0
      const playersCount = playersResult.count || 0

      // Get tournament IDs for matches query
      const tournamentIds = tournaments.map((t: any) => t.id)

      // Get matches count and data (only if there are tournaments)
      let matches: any[] = []
      let matchesCount = 0

      if (tournamentIds.length > 0) {
        const { data: matchesData, count: matchesCountData } = await supabase
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
          .in('tournament_id', tournamentIds)
          .order('match_date', { ascending: false })

        matches = matchesData || []
        matchesCount = matchesCountData || 0
      }

      // Get upcoming matches
      const upcomingMatches = matches.filter(match => {
        const isScheduled = match.status === 'scheduled' || match.status === 'in_progress'
        const isFuture = new Date(match.match_date) > new Date()
        return isScheduled && isFuture
      }).slice(0, 5)

      // Get recent matches (finished matches, regardless of date)
      const recentMatches = matches.filter(match =>
        match.status === 'finished'
      ).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
        .slice(0, 5)

      // Organize matches by rounds/matchdays
      const matchesByRound = matches.reduce((acc: any, match) => {
        const round = match.round || 1 // Default to round 1 if not specified
        if (!acc[round]) {
          acc[round] = []
        }
        acc[round].push(match)
        return acc
      }, {})

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
      // console.log('🏆 Filtered matches:', {
      //   upcomingCount: upcomingMatches.length,
      //   recentCount: recentMatches.length,
      //   totalRounds: roundNumbers.length,
      //   matchesByRound: Object.keys(matchesByRound).map(round => ({
      //     round,
      //     matchCount: matchesByRound[round].length
      //   }))
      // })

      // Get all teams in the league
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name, slug, logo')
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .returns<Pick<Team, 'id' | 'name' | 'slug' | 'logo'>[]>()

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
        const existingStats = teamStatsData?.find((stats: any) => stats.team_id === team.id)

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
      // console.error('Get league stats error:', error)
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
  },

  async getTeamsByTournament(tournamentId: string) {
    const supabase = getServerSupabaseClient()

    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      return teams || []
    } catch (error) {
      // console.error('Get teams by tournament error:', error)
      return []
    }
  },

  async getTournamentStats(tournamentId: string) {
    const supabase = getServerSupabaseClient()

    try {
      // Parallelize teams and matches queries for better performance
      const [teamsResult, matchesResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, slug, logo')
          .eq('tournament_id', tournamentId)
          .eq('is_active', true),
        supabase
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
            phase,
            playoff_round,
            created_at,
            updated_at,
            home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
            tournament:tournaments(id, name)
          `, { count: 'exact' })
          .eq('tournament_id', tournamentId)
          .order('match_date', { ascending: false })
      ])

      const teams = teamsResult.data || []
      const teamsCount = teams.length
      const matches = matchesResult.data || []
      const matchesCount = matchesResult.count || 0

      const allMatches: any[] = matches

      // Get upcoming matches
      const upcomingMatches = allMatches.filter(match => {
        const isScheduled = match.status === 'scheduled' || match.status === 'in_progress'
        const isFuture = new Date(match.match_date) > new Date()
        return isScheduled && isFuture
      }).slice(0, 5)

      // Get recent matches
      const recentMatches = allMatches.filter(match =>
        match.status === 'finished'
      ).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
        .slice(0, 5)

      // Organize matches by rounds
      const matchesByRound = allMatches.reduce((acc: any, match) => {
        const round = match.round || 1
        if (!acc[round]) {
          acc[round] = []
        }
        acc[round].push(match)
        return acc
      }, {})

      // Sort matches within each round
      Object.keys(matchesByRound).forEach(round => {
        matchesByRound[round].sort((a: any, b: any) => {
          const dateA = new Date(a.match_date)
          const dateB = new Date(b.match_date)
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime()
          }
          if (a.match_time && b.match_time) {
            return a.match_time.localeCompare(b.match_time)
          }
          return 0
        })
      })

      const roundNumbers = Object.keys(matchesByRound)
        .map(r => parseInt(r))
        .sort((a, b) => a - b)

      // Calculate team standings using already-fetched data (avoids duplicate queries)
      const teamStandings = this.calculateStandingsFromData(teams, allMatches)

      return {
        teamsCount: teamsCount || 0,
        matchesCount: matchesCount || 0,
        upcomingMatches,
        recentMatches,
        allMatches,
        matchesByRound,
        roundNumbers,
        teamStandings
      }
    } catch (error) {
      // console.error('Get tournament stats error:', error)
      return {
        teamsCount: 0,
        matchesCount: 0,
        upcomingMatches: [],
        recentMatches: [],
        allMatches: [],
        matchesByRound: {},
        roundNumbers: [],
        teamStandings: []
      }
    }
  },

  // Helper function to calculate standings from pre-fetched data (no additional queries)
  calculateStandingsFromData(teams: any[], matches: any[]) {
    // Initialize standings
    const standings: any = {}
    teams.forEach(team => {
      standings[team.id] = {
        team,
        matches_played: 0,
        matches_won: 0,
        matches_drawn: 0,
        matches_lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0
      }
    })

    // Calculate standings from finished matches only
    matches.filter(m => m.status === 'finished').forEach(match => {
      if (match.home_score !== null && match.away_score !== null) {
        const homeId = match.home_team_id
        const awayId = match.away_team_id

        if (standings[homeId] && standings[awayId]) {
          standings[homeId].matches_played++
          standings[awayId].matches_played++

          standings[homeId].goals_for += match.home_score
          standings[homeId].goals_against += match.away_score
          standings[awayId].goals_for += match.away_score
          standings[awayId].goals_against += match.home_score

          if (match.home_score > match.away_score) {
            standings[homeId].matches_won++
            standings[homeId].points += 3
            standings[awayId].matches_lost++
          } else if (match.home_score < match.away_score) {
            standings[awayId].matches_won++
            standings[awayId].points += 3
            standings[homeId].matches_lost++
          } else {
            standings[homeId].matches_drawn++
            standings[awayId].matches_drawn++
            standings[homeId].points++
            standings[awayId].points++
          }

          standings[homeId].goal_difference = standings[homeId].goals_for - standings[homeId].goals_against
          standings[awayId].goal_difference = standings[awayId].goals_for - standings[awayId].goals_against
        }
      }
    })

    // Convert to array and sort
    return Object.values(standings).sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
      return a.team.name.localeCompare(b.team.name)
    })
  },

  async calculateTeamStandingsByTournament(tournamentId: string) {
    const supabase = getServerSupabaseClient()

    try {
      // Get all matches for this tournament
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo)
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'finished')

      // Get all teams in this tournament
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, slug, logo')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true)

      // Initialize standings (using same property names as team_stats table)
      const standings: any = {}
      const tournamentTeams: any[] = teams || []
      tournamentTeams.forEach(team => {
        standings[team.id] = {
          team,
          matches_played: 0,
          matches_won: 0,
          matches_drawn: 0,
          matches_lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0
        }
      })

      // Calculate standings from matches
      const tournamentMatches: any[] = matches || []
      tournamentMatches.forEach(match => {
        if (match.home_score !== null && match.away_score !== null) {
          const homeId = match.home_team_id
          const awayId = match.away_team_id

          if (standings[homeId] && standings[awayId]) {
            standings[homeId].matches_played++
            standings[awayId].matches_played++

            standings[homeId].goals_for += match.home_score
            standings[homeId].goals_against += match.away_score
            standings[awayId].goals_for += match.away_score
            standings[awayId].goals_against += match.home_score

            if (match.home_score > match.away_score) {
              standings[homeId].matches_won++
              standings[homeId].points += 3
              standings[awayId].matches_lost++
            } else if (match.home_score < match.away_score) {
              standings[awayId].matches_won++
              standings[awayId].points += 3
              standings[homeId].matches_lost++
            } else {
              standings[homeId].matches_drawn++
              standings[awayId].matches_drawn++
              standings[homeId].points++
              standings[awayId].points++
            }

            standings[homeId].goal_difference = standings[homeId].goals_for - standings[homeId].goals_against
            standings[awayId].goal_difference = standings[awayId].goals_for - standings[awayId].goals_against
          }
        }
      })

      // Convert to array and sort
      return Object.values(standings).sort((a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
        return a.team.name.localeCompare(b.team.name)
      })
    } catch (error) {
      // console.error('Calculate team standings error:', error)
      return []
    }
  }
}