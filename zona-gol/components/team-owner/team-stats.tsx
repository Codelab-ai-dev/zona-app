"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTeams } from "@/lib/hooks/use-teams"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Users, Trophy, Target, Calendar, Loader2, FileText, AlertTriangle, Clock } from "lucide-react"
import { RefereeReportModal } from "./referee-report-modal"
import { TeamSuspensionsPanel } from "./team-suspensions-panel"

type Player = Database['public']['Tables']['players']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

interface TeamStatsProps {
  teamId: string
}

export function TeamStats({ teamId }: TeamStatsProps) {
  const {
    currentTeam,
    players,
    matches,
    loading,
    error,
    getPlayersByTeam,
    getMatchesByTeam,
    getTeamStats
  } = useTeams()

  const supabase = createClientSupabaseClient()
  const [teamStats, setTeamStats] = useState<{
    playersCount: number
    matchesCount: number
    wins: number
    losses: number
    draws: number
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [refereeModalOpen, setRefereeModalOpen] = useState(false)
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])

  // Load team data when component mounts or teamId changes
  useEffect(() => {
    if (teamId) {
      console.log('🔵 Loading team stats for teamId:', teamId)
      loadTeamData()
    } else {
      console.warn('⚠️ No teamId provided to TeamStats')
    }
  }, [teamId])

  const loadTeamData = async () => {
    setLoadingStats(true)
    try {
      // Load players, matches, and stats in parallel
      const [playersData, matchesData, statsData] = await Promise.all([
        getPlayersByTeam(teamId),
        getMatchesByTeam(teamId),
        getTeamStats(teamId)
      ])

      setTeamStats(statsData)

      // Load player statistics
      const { data: playersFromDb, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (playersError) {
        console.error('❌ Error loading players:', playersError)
      } else {
        // For each player, get their aggregated stats
        const playersWithStatsData: PlayerWithStats[] = []

        for (const player of playersFromDb || []) {
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

        setPlayersWithStats(playersWithStatsData)
      }

      console.log('✅ Team data loaded successfully')
    } catch (error) {
      console.error('❌ Error loading team data:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Don't render if no teamId
  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Encontrado</h2>
        <p className="text-gray-600">
          No se pudo cargar la información del equipo.
        </p>
      </div>
    )
  }

  if (loadingStats || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <span className="text-lg">Cargando estadísticas del equipo...</span>
      </div>
    )
  }

  const handleViewRefereeReport = (match: Match) => {
    setSelectedMatch(match)
    setRefereeModalOpen(true)
  }

  const activePlayers = players.filter((p) => p.is_active)
  const finishedMatches = matches.filter((m) => m.status === "finished")
  const upcomingMatches = matches.filter((m) => m.status === "scheduled")

  // Use stats from API or fallback to calculated values
  const wins = teamStats?.wins || 0
  const draws = teamStats?.draws || 0
  const losses = teamStats?.losses || 0

  const stats = [
    {
      title: "Jugadores Activos",
      value: activePlayers.length,
      total: players.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Partidos Jugados",
      value: finishedMatches.length,
      total: matches.length,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Victorias",
      value: wins,
      total: finishedMatches.length,
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Próximos Partidos",
      value: upcomingMatches.length,
      total: upcomingMatches.length,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]

  const getPositionCount = (position: string) => {
    return activePlayers.filter((p) => p.position === position).length
  }

  const positionStats = [
    { position: "Portero", count: getPositionCount("Portero") },
    { position: "Defensa Central", count: getPositionCount("Defensa Central") },
    { position: "Lateral Derecho", count: getPositionCount("Lateral Derecho") },
    { position: "Lateral Izquierdo", count: getPositionCount("Lateral Izquierdo") },
    {
      position: "Mediocampista",
      count:
        getPositionCount("Mediocampista Central") +
        getPositionCount("Mediocampista Defensivo") +
        getPositionCount("Mediocampista Ofensivo"),
    },
    {
      position: "Delantero",
      count:
        getPositionCount("Delantero") + getPositionCount("Extremo Derecho") + getPositionCount("Extremo Izquierdo"),
    },
  ].filter((stat) => stat.count > 0)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas del Equipo</h2>
        <p className="text-gray-600">{currentTeam?.name || 'Mi Equipo'} - Resumen de rendimiento</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                  {stat.total > 0 && stat.title !== "Próximos Partidos" && (
                    <span className="text-sm font-normal text-gray-500">/{stat.total}</span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {stat.title === "Victorias" && finishedMatches.length > 0
                    ? `${draws} empates, ${losses} derrotas`
                    : stat.title === "Próximos Partidos"
                      ? "Partidos programados"
                      : "Total registrados"}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Team Detailed Statistics Section */}
      {playersWithStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Estadísticas Detalladas del Equipo
            </CardTitle>
            <CardDescription>
              Análisis completo del rendimiento colectivo e individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Rendimiento Ofensivo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Rendimiento Ofensivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground mb-1">Goles Totales</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_goals, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground mb-1">Asistencias Totales</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_assists, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-muted-foreground mb-1">Goles por Jugador</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_goals, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <p className="text-sm text-muted-foreground mb-1">Asistencias por Jugador</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_assists, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Máximos Goleadores */}
              {(() => {
                const topScorers = [...playersWithStats]
                  .filter(p => p.total_goals > 0)
                  .sort((a, b) => b.total_goals - a.total_goals)
                  .slice(0, 3)

                return topScorers.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                      Máximos Goleadores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topScorers.map((player, index) => (
                        <div key={player.id} className="p-4 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-green-100 text-green-800">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{player.name}</p>
                              <p className="text-xs text-muted-foreground">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{player.total_goals}</p>
                              <p className="text-xs text-muted-foreground">goles</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Máximos Asistidores */}
              {(() => {
                const topAssisters = [...playersWithStats]
                  .filter(p => p.total_assists > 0)
                  .sort((a, b) => b.total_assists - a.total_assists)
                  .slice(0, 3)

                return topAssisters.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-blue-600" />
                      Máximos Asistidores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topAssisters.map((player, index) => (
                        <div key={player.id} className="p-4 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-blue-100 text-blue-800">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{player.name}</p>
                              <p className="text-xs text-muted-foreground">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{player.total_assists}</p>
                              <p className="text-xs text-muted-foreground">asist.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Disciplina del Equipo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                  Disciplina
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-yellow-400 rounded"></div>
                      <p className="text-sm text-muted-foreground">Tarjetas Amarillas</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-red-600 rounded"></div>
                      <p className="text-sm text-muted-foreground">Tarjetas Rojas</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Tarjetas por Jugador</p>
                    <p className="text-3xl font-bold text-gray-700">
                      {((playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards + p.total_red_cards, 0)) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Jugadores sin Tarjetas</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.filter(p => p.total_yellow_cards === 0 && p.total_red_cards === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600" />
                  Participación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Partidos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {playersWithStats.reduce((sum, p) => sum + p.total_games, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Minutos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0).toLocaleString()}'
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Promedio Minutos por Jugador</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Math.round(playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0) / playersWithStats.length)}'
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Jugadores Activos</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.filter(p => p.total_games > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Posición</CardTitle>
            <CardDescription>Jugadores activos por posición</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positionStats.map((stat) => (
                <div key={stat.position} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{stat.position}</span>
                  <span className="text-sm font-bold text-blue-600">{stat.count} jugadores</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Resultados</CardTitle>
            <CardDescription>Resultados de partidos recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finishedMatches.slice(-3).reverse().map((match) => {
                const isHome = match.home_team_id === teamId
                const teamScore = isHome ? match.home_score : match.away_score
                const opponentScore = isHome ? match.away_score : match.home_score
                // Get opponent team info from match relations
                const opponentTeam = isHome ? (match as any).away_team : (match as any).home_team
                const tournament = (match as any).tournament
                const matchDate = new Date(match.match_date)

                const result =
                  teamScore! > opponentScore! ? "Victoria" : teamScore === opponentScore ? "Empate" : "Derrota"
                const resultColor =
                  result === "Victoria"
                    ? "bg-green-100 text-green-800"
                    : result === "Empate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"

                return (
                  <div key={match.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">vs {opponentTeam?.name || 'Equipo Rival'}</p>
                        <p className="text-sm text-gray-500">
                          {teamScore} - {opponentScore}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                          {match.round && <span>• Jornada {match.round}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${resultColor}`}>
                          {result}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRefereeReport(match)}
                          className="p-2 h-8 w-8"
                          title="Ver cédula arbitral"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {finishedMatches.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay partidos jugados aún</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Suspensions Panel */}
        <TeamSuspensionsPanel teamId={teamId} />
      </div>

      {/* Referee Report Modal */}
      {selectedMatch && (
        <RefereeReportModal
          open={refereeModalOpen}
          onOpenChange={setRefereeModalOpen}
          match={selectedMatch}
        />
      )}
    </div>
  )
}
