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

interface TopScorerProps {
  leagueId: string
}

interface ScorerData {
  player_id: string
  player_name: string
  jersey_number: number
  team_name: string
  total_goals: number
  total_assists: number
  matches_played: number
  goals_per_match: number
}

export function TopScorers({ leagueId }: TopScorerProps) {
  const [scorers, setScorers] = useState<ScorerData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadTopScorers()
  }, [leagueId])

  const loadTopScorers = async () => {
    setLoading(true)
    try {
      console.log('🔍 Loading top scorers for league:', leagueId)

      // First, get all teams in this league
      const { data: leagueTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)

      if (teamsError) {
        console.error('❌ Error loading league teams:', teamsError)
        return
      }

      const teamIds = leagueTeams?.map(t => t.id) || []
      console.log('🏟️ Teams in league:', teamIds.length, teamIds)

      if (teamIds.length === 0) {
        console.warn('⚠️ No teams found in this league')
        setScorers([])
        return
      }

      // Query to get all player stats for players in these teams
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
            team_id,
            team:teams(
              name,
              league_id
            )
          )
        `)
        .in('player.team_id', teamIds)
        .gt('goals', 0)
        .order('goals', { ascending: false })

      console.log('📊 Player stats query result:', {
        count: statsData?.length,
        error,
        sample: statsData?.[0]
      })

      if (error) {
        console.error('❌ Error loading scorers:', error)
        return
      }

      // Aggregate stats by player (no filtering needed, query already filtered)
      const playerStatsMap = new Map<string, {
        player_id: string
        player_name: string
        jersey_number: number
        team_name: string
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
            team_name: player.team?.name || 'Sin equipo',
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
          team: p.team_name,
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

      console.log('⚽ Final scorers array:', {
        totalScorers: scorersArray.length,
        topScorer: scorersArray[0]?.player_name,
        topGoals: scorersArray[0]?.total_goals,
        allScorers: scorersArray.map(s => `${s.player_name}: ${s.total_goals} goals`)
      })

      setScorers(scorersArray)
    } catch (error) {
      console.error('Error loading scorers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
          🥇 1°
        </Badge>
      )
    } else if (position === 2) {
      return (
        <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
          🥈 2°
        </Badge>
      )
    } else if (position === 3) {
      return (
        <Badge className="bg-orange-600 hover:bg-orange-700 text-white">
          🥉 3°
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="font-bold">
          {position}°
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">Tabla de Goleadores</h2>
        <p className="text-white/80 drop-shadow">Ranking de goleadores de la liga</p>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-300" />
            Top Goleadores
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            {scorers.length > 0 ? `${scorers.length} jugadores con goles` : 'No hay goles registrados aún'}
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
              <Target className="w-16 h-16 mx-auto text-white/50 mb-4" />
              <p className="text-white/80 drop-shadow">No hay goles registrados en la liga todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="w-20 text-white/90">Posición</TableHead>
                    <TableHead className="text-white/90">Jugador</TableHead>
                    <TableHead className="text-center text-white/90">Dorsal</TableHead>
                    <TableHead className="text-white/90">Equipo</TableHead>
                    <TableHead className="text-center text-white/90">Partidos</TableHead>
                    <TableHead className="text-center text-white/90">Goles</TableHead>
                    <TableHead className="text-center text-white/90">Asistencias</TableHead>
                    <TableHead className="text-center text-white/90">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorers.map((scorer, index) => {
                    const position = index + 1
                    const isTopThree = position <= 3
                    return (
                      <TableRow
                        key={scorer.player_id}
                        className={`border-white/20 ${isTopThree ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}
                      >
                        <TableCell>{getPositionBadge(position)}</TableCell>
                        <TableCell className="font-semibold text-white drop-shadow">
                          {scorer.player_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="font-bold backdrop-blur-md bg-white/10 text-white border-white/30">
                            #{scorer.jersey_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80 drop-shadow">
                          {scorer.team_name}
                        </TableCell>
                        <TableCell className="text-center text-white/70">
                          {scorer.matches_played}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0">
                            ⚽ {scorer.total_goals}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">
                            {scorer.total_assists}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-white/70">
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
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 text-yellow-300" />
              Podio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* 2nd Place */}
              <div className="text-center order-1">
                <div className="h-32 backdrop-blur-md bg-gray-400/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-4xl">🥈</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-gray-300">
                  <p className="font-bold text-lg text-white drop-shadow">{scorers[1].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[1].team_name}</p>
                  <p className="text-2xl font-bold text-gray-300 mt-2 drop-shadow">
                    {scorers[1].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center order-2">
                <div className="h-40 backdrop-blur-md bg-yellow-400/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-5xl">🥇</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-yellow-400">
                  <p className="font-bold text-xl text-white drop-shadow">{scorers[0].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[0].team_name}</p>
                  <p className="text-3xl font-bold text-yellow-300 mt-2 drop-shadow">
                    {scorers[0].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center order-3">
                <div className="h-24 backdrop-blur-md bg-orange-500/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-3xl">🥉</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-orange-500">
                  <p className="font-bold text-lg text-white drop-shadow">{scorers[2].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[2].team_name}</p>
                  <p className="text-2xl font-bold text-orange-400 mt-2 drop-shadow">
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
