"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Trophy, Target, AlertTriangle, Clock, Users, Loader2 } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"

type Player = Database['public']['Tables']['players']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

interface PlayerStatisticsProps {
  teamId: string
}

export function PlayerStatistics({ teamId }: PlayerStatisticsProps) {
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const loadPlayerStats = async () => {
      if (!teamId) return

      try {
        setLoading(true)
        setError(null)

        console.log('🔵 Loading player stats for team:', teamId)

        // Load players for this team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true)

        if (playersError) {
          console.error('❌ Error loading players:', playersError)
          setError('Error cargando jugadores')
          return
        }

        console.log('✅ Players loaded:', players?.length || 0)

        // For each player, get their aggregated stats
        const playersWithStatsData: PlayerWithStats[] = []

        for (const player of players || []) {
          const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', player.id)

          if (statsError) {
            console.warn('⚠️ Error loading stats for player:', player.name, statsError)
          }

          // Calculate aggregated stats
          const totalGames = stats?.length || 0
          const totalGoals = stats?.reduce((sum, s) => sum + (s.goals || 0), 0) || 0
          const totalAssists = stats?.reduce((sum, s) => sum + (s.assists || 0), 0) || 0
          const totalYellowCards = stats?.reduce((sum, s) => sum + (s.yellow_cards || 0), 0) || 0
          const totalRedCards = stats?.reduce((sum, s) => sum + (s.red_cards || 0), 0) || 0
          const totalMinutesPlayed = stats?.reduce((sum, s) => sum + (s.minutes_played || 0), 0) || 0

          playersWithStatsData.push({
            ...player,
            total_games: totalGames,
            total_goals: totalGoals,
            total_assists: totalAssists,
            total_yellow_cards: totalYellowCards,
            total_red_cards: totalRedCards,
            total_minutes_played: totalMinutesPlayed,
          })
        }

        // Sort by total goals descending, then by total assists
        playersWithStatsData.sort((a, b) => {
          if (b.total_goals !== a.total_goals) {
            return b.total_goals - a.total_goals
          }
          return b.total_assists - a.total_assists
        })

        console.log('✅ Player stats calculated:', playersWithStatsData.length)
        setPlayersWithStats(playersWithStatsData)

      } catch (err: any) {
        console.error('❌ Error in loadPlayerStats:', err)
        setError(err.message || 'Error cargando estadísticas')
      } finally {
        setLoading(false)
      }
    }

    loadPlayerStats()
  }, [teamId, supabase])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const totalTeamGoals = playersWithStats.reduce((sum, player) => sum + player.total_goals, 0)
  const totalTeamYellowCards = playersWithStats.reduce((sum, player) => sum + player.total_yellow_cards, 0)
  const totalTeamRedCards = playersWithStats.reduce((sum, player) => sum + player.total_red_cards, 0)
  const totalTeamMinutes = playersWithStats.reduce((sum, player) => sum + player.total_minutes_played, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Cargando estadísticas de jugadores...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{playersWithStats.length}</p>
            <p className="text-sm text-gray-600">Jugadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{totalTeamGoals}</p>
            <p className="text-sm text-gray-600">Goles Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{totalTeamYellowCards}</p>
            <p className="text-sm text-gray-600">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{totalTeamRedCards}</p>
            <p className="text-sm text-gray-600">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Estadísticas de Jugadores
          </CardTitle>
          <CardDescription>
            Rendimiento individual de cada jugador del equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playersWithStats.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay jugadores registrados
              </h3>
              <p className="text-gray-600">
                Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">PJ</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asistencias</TableHead>
                    <TableHead className="text-center">TA</TableHead>
                    <TableHead className="text-center">TR</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playersWithStats.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center">
                              {player.name}
                              <span className="ml-2 text-sm font-bold text-green-600">
                                #{player.jersey_number}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">{player.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {player.total_games}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {player.total_goals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {player.total_assists}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_yellow_cards > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {player.total_yellow_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_red_cards > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {player.total_red_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {player.total_minutes_played}'
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}