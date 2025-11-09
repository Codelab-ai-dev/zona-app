"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Loader2, Trophy, Target } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TeamScorersProps {
  teamId: string
}

interface ScorerData {
  player_id: string
  player_name: string
  jersey_number: number
  total_goals: number
  total_assists: number
  matches_played: number
  goals_per_match: number
}

export function TeamScorers({ teamId }: TeamScorersProps) {
  const [scorers, setScorers] = useState<ScorerData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadTeamScorers()
  }, [teamId])

  const loadTeamScorers = async () => {
    setLoading(true)
    try {
      console.log('🔍 Loading scorers for team:', teamId)

      // Query to get all player stats for this team's players
      const { data: statsData, error } = await supabase
        .from('player_stats')
        .select(`
          player_id,
          goals,
          assists,
          match_id,
          player:players!inner(
            name,
            jersey_number,
            team_id
          )
        `)
        .eq('player.team_id', teamId)
        .gt('goals', 0)
        .order('goals', { ascending: false })

      console.log('📊 Player stats query result:', {
        count: statsData?.length,
        error,
        sample: statsData?.[0]
      })

      if (error) {
        console.error('❌ Error loading team scorers:', error)
        return
      }

      // Aggregate stats by player
      const playerStatsMap = new Map<string, {
        player_id: string
        player_name: string
        jersey_number: number
        total_goals: number
        total_assists: number
        matches_played: number
      }>()

      statsData?.forEach((stat: any) => {
        const player = stat.player

        if (!player) {
          console.warn('⚠️ Stat without player:', stat)
          return
        }

        const playerId = stat.player_id
        const existing = playerStatsMap.get(playerId)

        if (existing) {
          existing.total_goals += stat.goals || 0
          existing.total_assists += stat.assists || 0
          existing.matches_played += 1
        } else {
          playerStatsMap.set(playerId, {
            player_id: playerId,
            player_name: player.name,
            jersey_number: player.jersey_number || 0,
            total_goals: stat.goals || 0,
            total_assists: stat.assists || 0,
            matches_played: 1,
          })
        }
      })

      console.log('📈 Stats processing:', {
        totalStats: statsData?.length,
        uniquePlayers: playerStatsMap.size,
        playersList: Array.from(playerStatsMap.values()).map(p => ({
          name: p.player_name,
          goals: p.total_goals
        }))
      })

      // Convert map to array and calculate goals per match
      const scorersArray = Array.from(playerStatsMap.values())
        .map(scorer => ({
          ...scorer,
          goals_per_match: scorer.matches_played > 0
            ? Number((scorer.total_goals / scorer.matches_played).toFixed(2))
            : 0,
        }))
        .sort((a, b) => {
          // Sort by total goals (descending), then by assists
          if (b.total_goals !== a.total_goals) {
            return b.total_goals - a.total_goals
          }
          return b.total_assists - a.total_assists
        })

      console.log('⚽ Final team scorers array:', {
        totalScorers: scorersArray.length,
        topScorer: scorersArray[0]?.player_name,
        topGoals: scorersArray[0]?.total_goals,
        allScorers: scorersArray.map(s => `${s.player_name}: ${s.total_goals} goals`)
      })

      setScorers(scorersArray)
    } catch (error) {
      console.error('Error loading team scorers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Badge className="backdrop-blur-md bg-yellow-500/80 hover:bg-yellow-500/90 text-white border-0">
          🥇 1°
        </Badge>
      )
    } else if (position === 2) {
      return (
        <Badge className="backdrop-blur-md bg-gray-400/80 hover:bg-gray-400/90 text-white border-0">
          🥈 2°
        </Badge>
      )
    } else if (position === 3) {
      return (
        <Badge className="backdrop-blur-md bg-orange-600/80 hover:bg-orange-600/90 text-white border-0">
          🥉 3°
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="font-bold backdrop-blur-md bg-white/20 border-white/30 text-white">
          {position}°
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">Goleadores del Equipo</h2>
        <p className="text-white/80 drop-shadow">Tabla de goleo de tus jugadores</p>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Máximos Goleadores
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">
            {scorers.length > 0 ? `${scorers.length} jugador${scorers.length > 1 ? 'es' : ''} con goles` : 'No hay goles registrados aún'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
              <span className="text-lg text-white drop-shadow">Cargando goleadores...</span>
            </div>
          ) : scorers.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 mx-auto text-white/60 mb-4" />
              <p className="text-white/80 drop-shadow">No hay goles registrados todavía</p>
              <p className="text-sm text-white/70 drop-shadow mt-2">Los goles aparecerán aquí cuando se registren en los partidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-white/90 drop-shadow">Posición</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Jugador</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Dorsal</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Partidos</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Goles</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Asistencias</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorers.map((scorer, index) => {
                    const position = index + 1
                    const isTopThree = position <= 3
                    return (
                      <TableRow
                        key={scorer.player_id}
                        className={isTopThree ? 'bg-yellow-500/10' : ''}
                      >
                        <TableCell>{getPositionBadge(position)}</TableCell>
                        <TableCell className="font-semibold text-white drop-shadow">
                          {scorer.player_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold backdrop-blur-md bg-white/20 border-white/30 text-white">
                            #{scorer.jersey_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-white/80 drop-shadow">
                          {scorer.matches_played}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 border-0">
                            ⚽ {scorer.total_goals}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="backdrop-blur-md bg-blue-500/30 text-blue-300 border-blue-300/50">
                            {scorer.total_assists}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-white/80 drop-shadow">
                          {scorer.goals_per_match.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {scorers.length >= 3 && (
        <Card className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-300/30 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Podio del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* 2nd Place */}
              <div className="text-center order-1">
                <div className="h-32 backdrop-blur-md bg-gray-400/30 border border-gray-300/50 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-4xl">🥈</span>
                </div>
                <div className="backdrop-blur-md bg-white/10 p-4 rounded-b-xl border-t-4 border-gray-400/50 border border-white/20">
                  <p className="font-bold text-lg truncate text-white drop-shadow">{scorers[1].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">#{scorers[1].jersey_number}</p>
                  <p className="text-2xl font-bold text-gray-300 drop-shadow-lg mt-2">
                    {scorers[1].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center order-2">
                <div className="h-40 backdrop-blur-md bg-yellow-500/40 border border-yellow-300/50 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-5xl">🥇</span>
                </div>
                <div className="backdrop-blur-md bg-white/10 p-4 rounded-b-xl border-t-4 border-yellow-400/50 border border-white/20">
                  <p className="font-bold text-xl truncate text-white drop-shadow-lg">{scorers[0].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">#{scorers[0].jersey_number}</p>
                  <p className="text-3xl font-bold text-yellow-400 drop-shadow-lg mt-2">
                    {scorers[0].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center order-3">
                <div className="h-24 backdrop-blur-md bg-orange-600/40 border border-orange-400/50 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-3xl">🥉</span>
                </div>
                <div className="backdrop-blur-md bg-white/10 p-4 rounded-b-xl border-t-4 border-orange-500/50 border border-white/20">
                  <p className="font-bold text-lg truncate text-white drop-shadow">{scorers[2].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">#{scorers[2].jersey_number}</p>
                  <p className="text-2xl font-bold text-orange-400 drop-shadow-lg mt-2">
                    {scorers[2].total_goals} ⚽
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
