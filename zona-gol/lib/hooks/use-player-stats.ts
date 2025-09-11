import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"

type PlayerStats = Database['public']['Tables']['player_stats']['Row']
type Player = Database['public']['Tables']['players']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

export function usePlayerStats() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  const getPlayerStatsByTeam = async (teamId: string): Promise<PlayerWithStats[] | null> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔵 Fetching player stats for team:', teamId)

      // First, let's get all players for this team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (playersError) {
        throw new Error(`Error fetching players: ${playersError.message}`)
      }

      if (!players || players.length === 0) {
        console.log('⚠️ No players found for team:', teamId)
        return []
      }

      console.log('📊 Found players:', players.length)

      // Now get aggregated stats for each player
      const playersWithStats: PlayerWithStats[] = []

      for (const player of players) {
        // Get aggregated stats for this player
        const { data: stats, error: statsError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('player_id', player.id)

        if (statsError) {
          console.warn('⚠️ Error fetching stats for player:', player.name, statsError)
          // Add player with zero stats if there's an error
          playersWithStats.push({
            ...player,
            total_games: 0,
            total_goals: 0,
            total_assists: 0,
            total_yellow_cards: 0,
            total_red_cards: 0,
            total_minutes_played: 0,
          })
          continue
        }

        // Aggregate the stats
        const totalGames = stats ? stats.length : 0
        const totalGoals = stats ? stats.reduce((sum, s) => sum + (s.goals || 0), 0) : 0
        const totalAssists = stats ? stats.reduce((sum, s) => sum + (s.assists || 0), 0) : 0
        const totalYellowCards = stats ? stats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0) : 0
        const totalRedCards = stats ? stats.reduce((sum, s) => sum + (s.red_cards || 0), 0) : 0
        const totalMinutesPlayed = stats ? stats.reduce((sum, s) => sum + (s.minutes_played || 0), 0) : 0

        playersWithStats.push({
          ...player,
          total_games: totalGames,
          total_goals: totalGoals,
          total_assists: totalAssists,
          total_yellow_cards: totalYellowCards,
          total_red_cards: totalRedCards,
          total_minutes_played: totalMinutesPlayed,
        })
      }

      console.log('✅ Player stats aggregated successfully')
      setPlayerStats(stats || [])
      return playersWithStats

    } catch (err: any) {
      console.error('❌ Error in getPlayerStatsByTeam:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const getPlayerStatsByMatch = async (matchId: string): Promise<PlayerStats[] | null> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔵 Fetching player stats for match:', matchId)

      const { data, error } = await supabase
        .from('player_stats')
        .select(`
          *,
          players!inner (
            id,
            name,
            jersey_number,
            position,
            photo,
            team_id
          )
        `)
        .eq('match_id', matchId)

      if (error) {
        throw new Error(`Error fetching match stats: ${error.message}`)
      }

      console.log('✅ Match player stats fetched successfully')
      setPlayerStats(data || [])
      return data

    } catch (err: any) {
      console.error('❌ Error in getPlayerStatsByMatch:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const getPlayerStatsById = async (playerId: string): Promise<PlayerStats[] | null> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔵 Fetching stats for player:', playerId)

      const { data, error } = await supabase
        .from('player_stats')
        .select(`
          *,
          matches!inner (
            id,
            home_team_id,
            away_team_id,
            match_date,
            status
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Error fetching player stats: ${error.message}`)
      }

      console.log('✅ Player stats fetched successfully')
      setPlayerStats(data || [])
      return data

    } catch (err: any) {
      console.error('❌ Error in getPlayerStatsById:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    playerStats,
    loading,
    error,
    getPlayerStatsByTeam,
    getPlayerStatsByMatch,
    getPlayerStatsById,
  }
}