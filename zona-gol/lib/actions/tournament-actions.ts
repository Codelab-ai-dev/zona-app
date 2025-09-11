import { createClientSupabaseClient } from '../supabase/client'
import { useLeagueStore } from '../stores/league-store'
import { useAuthStore } from '../stores/auth-store'
import { Database } from '../supabase/database.types'

type Tournament = Database['public']['Tables']['tournaments']['Row']
type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']

export const tournamentActions = {
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
      return tournaments || []
    } catch (error) {
      console.error('Get tournaments error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tournaments'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Create tournament
  async createTournament(tournamentData: Omit<TournamentInsert, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClientSupabaseClient()
    const { user } = useAuthStore.getState()
    const { setLoading, setError, addTournament } = useLeagueStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert({
          ...tournamentData,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      addTournament(tournament)
      return tournament
    } catch (error) {
      console.error('Create tournament error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tournament'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Update tournament
  async updateTournament(tournamentId: string, updates: TournamentUpdate) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, updateTournament } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      updateTournament(tournament)
      return tournament
    } catch (error) {
      console.error('Update tournament error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tournament'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Delete tournament (soft delete)
  async deleteTournament(tournamentId: string) {
    const supabase = createClientSupabaseClient()
    const { setLoading, setError, removeTournament } = useLeagueStore.getState()
    
    try {
      setLoading(true)
      setError(null)
      
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('tournaments')
        .update({ is_active: false })
        .eq('id', tournamentId)
      
      if (error) {
        throw error
      }
      
      removeTournament(tournamentId)
    } catch (error) {
      console.error('Delete tournament error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete tournament'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Get single tournament
  async getTournament(tournamentId: string) {
    const supabase = createClientSupabaseClient()
    
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()
      
      if (error) {
        throw error
      }
      
      return tournament
    } catch (error) {
      console.error('Get tournament error:', error)
      throw error
    }
  }
}