"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/lib/supabase/database.types"
import { Users, Trophy, Target, Calendar, FileText, AlertTriangle, Clock, Ban } from "lucide-react"
import { RefereeReportModal } from "./referee-report-modal"

// Un solo hook combinado para TODO el resumen
import { useTeamOwnerSummary } from "@/lib/queries"

type Match = Database['public']['Tables']['matches']['Row']

interface TeamStatsProps {
  teamId: string
}

// Loading skeleton component
function TeamStatsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 bg-white/20 mb-2" />
        <Skeleton className="h-4 w-48 bg-white/10" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 bg-white/20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 bg-white/20 mb-2" />
              <Skeleton className="h-3 w-20 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-white/20" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TeamStats({ teamId }: TeamStatsProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [refereeModalOpen, setRefereeModalOpen] = useState(false)

  // UN SOLO HOOK que carga TODO en paralelo
  const { data, isLoading } = useTeamOwnerSummary(teamId)

  // Extraer datos del resultado
  const team = data?.team
  const playersWithStats = data?.players || []
  const matches = data?.matches || []
  const teamStats = data?.stats
  const suspensions = data?.suspensions || []

  // Derived data using useMemo
  const { activePlayers, finishedMatches, upcomingMatches, positionStats } = useMemo(() => {
    const active = playersWithStats.filter((p) => p.is_active)
    const finished = matches.filter((m) => m.status === "finished")
    // Solo mostrar partidos programados que estén publicados
    const upcoming = matches.filter((m) => m.status === "scheduled" && m.is_published === true)

    const getPositionCount = (position: string) => active.filter((p) => p.position === position).length

    const positions = [
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

    return {
      activePlayers: active,
      finishedMatches: finished,
      upcomingMatches: upcoming,
      positionStats: positions,
    }
  }, [playersWithStats, matches])

  // Top scorers
  const topScorers = useMemo(() => {
    return [...playersWithStats]
      .filter(p => p.total_goals > 0)
      .sort((a, b) => b.total_goals - a.total_goals)
      .slice(0, 3)
  }, [playersWithStats])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getSuspensionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      red_card: 'Tarjeta Roja',
      yellow_accumulation: 'Acum. Amarillas',
      disciplinary_committee: 'Comité Disciplinario',
      other: 'Otro',
    }
    return labels[type] || type
  }

  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Encontrado</h2>
        <p className="text-white/80 drop-shadow">No se pudo cargar la información del equipo.</p>
      </div>
    )
  }

  if (isLoading) {
    return <TeamStatsSkeleton />
  }

  const handleViewRefereeReport = (match: any) => {
    setSelectedMatch(match)
    setRefereeModalOpen(true)
  }

  const wins = teamStats?.wins || 0
  const draws = teamStats?.draws || 0
  const losses = teamStats?.losses || 0

  const stats = [
    {
      title: "Jugadores Activos",
      value: activePlayers.length,
      total: playersWithStats.length,
      icon: Users,
    },
    {
      title: "Partidos Jugados",
      value: finishedMatches.length,
      total: matches.length,
      icon: Calendar,
    },
    {
      title: "Victorias",
      value: wins,
      total: finishedMatches.length,
      icon: Trophy,
    },
    {
      title: "Próximos Partidos",
      value: upcomingMatches.length,
      total: upcomingMatches.length,
      icon: Target,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Estadísticas del Equipo</h2>
        <p className="text-white/80 drop-shadow">{team?.name || 'Mi Equipo'} - Resumen de rendimiento</p>
      </div>

      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90 drop-shadow">{stat.title}</CardTitle>
                <div className="p-2 rounded-full backdrop-blur-md bg-white/20 border border-white/30">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {stat.value}
                  {stat.total > 0 && stat.title !== "Próximos Partidos" && (
                    <span className="text-sm font-normal text-white/60">/{stat.total}</span>
                  )}
                </div>
                <CardDescription className="text-xs text-white/70 drop-shadow">
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
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 mr-2" />
              Estadísticas Detalladas del Equipo
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">
              Análisis completo del rendimiento colectivo e individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Rendimiento Ofensivo */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Target className="w-5 h-5 mr-2 text-green-400" />
                  Rendimiento Ofensivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-green-500/20 rounded-xl border border-green-300/30 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-1">Goles Totales</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_goals, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-purple-500/20 rounded-xl border border-purple-300/30 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-1">Goles por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-400 drop-shadow-lg">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_goals, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Máximos Goleadores */}
              {topScorers.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                    Máximos Goleadores
                  </h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {topScorers.map((player, index) => (
                      <div key={player.id} className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 hover:bg-white/15 hover:shadow-xl transition-all">
                        <div className="flex items-center space-x-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg backdrop-blur-md border ${
                            index === 0 ? 'bg-yellow-500/30 text-yellow-300 border-yellow-300/50' :
                            index === 1 ? 'bg-gray-500/30 text-gray-300 border-gray-300/50' :
                            'bg-orange-500/30 text-orange-300 border-orange-300/50'
                          }`}>
                            {index + 1}
                          </div>
                          <Avatar className="w-10 h-10">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="backdrop-blur-md bg-green-500/30 text-white border border-green-300/50">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-white drop-shadow">{player.name}</p>
                            <p className="text-xs text-white/70 drop-shadow">#{player.jersey_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400 drop-shadow-lg">{player.total_goals}</p>
                            <p className="text-xs text-white/70 drop-shadow">goles</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disciplina del Equipo */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                  Disciplina
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-yellow-500/20 rounded-xl border border-yellow-300/30 shadow-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-yellow-400 rounded"></div>
                      <p className="text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-red-500/20 rounded-xl border border-red-300/30 shadow-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-red-600 rounded"></div>
                      <p className="text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Tarjetas por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {((playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards + p.total_red_cards, 0)) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Jugadores sin Tarjetas</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
                      {playersWithStats.filter(p => p.total_yellow_cards === 0 && p.total_red_cards === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Clock className="w-5 h-5 mr-2 text-white/80" />
                  Participación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Partidos Jugados (Total)</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.matches_played, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Minutos Jugados (Total)</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0).toLocaleString()}'
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Promedio Minutos por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {Math.round(playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0) / playersWithStats.length)}'
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-sm text-white/80 drop-shadow mb-2">Jugadores Activos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
                      {playersWithStats.filter(p => p.matches_played > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:p-6 md:grid-cols-3">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Distribución por Posición</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Jugadores activos por posición</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positionStats.map((stat) => (
                <div key={stat.position} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 backdrop-blur-md bg-white/10 rounded-xl border border-white/20">
                  <span className="font-medium text-white drop-shadow">{stat.position}</span>
                  <span className="text-sm font-bold text-blue-400 drop-shadow">{stat.count} jugadores</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Últimos Resultados</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Resultados de partidos recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finishedMatches.slice(0, 3).map((match) => {
                const isHome = match.home_team_id === teamId
                const teamScore = isHome ? match.home_score : match.away_score
                const opponentScore = isHome ? match.away_score : match.home_score
                const opponentTeam = isHome ? match.away_team : match.home_team
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
                  <div key={match.id} className="p-3 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 space-y-2 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white drop-shadow">vs {opponentTeam?.name || 'Equipo Rival'}</p>
                        <p className="text-sm text-white/70 drop-shadow">
                          {teamScore} - {opponentScore}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/60 drop-shadow">
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
                          className="p-2 h-8 w-8 backdrop-blur-md bg-white/10 border-white/30 hover:bg-white/20"
                          title="Ver cédula arbitral"
                        >
                          <FileText className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {finishedMatches.length === 0 && (
                <p className="text-center text-white/70 drop-shadow py-4">No hay partidos jugados aún</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suspensions Panel - inline desde el mismo hook */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <Ban className="w-5 h-5" />
              Jugadores Suspendidos
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">
              {suspensions.length > 0
                ? `${suspensions.length} jugador${suspensions.length > 1 ? 'es' : ''} con suspensión activa`
                : 'No hay suspensiones activas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suspensions.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full backdrop-blur-md bg-green-500/20 border border-green-300/30 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-white/80 drop-shadow">
                  Todos los jugadores están habilitados para jugar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suspensions.map((suspension) => {
                  const matchesRemaining = suspension.matches_to_serve - suspension.matches_served
                  return (
                    <div
                      key={suspension.id}
                      className="p-4 backdrop-blur-md bg-red-500/20 border border-red-300/30 rounded-xl shadow-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white drop-shadow">
                            {suspension.player_name}
                          </span>
                          <Badge variant="outline" className="border-white/30 text-white">#{suspension.jersey_number}</Badge>
                          <Badge variant="destructive" className="text-xs bg-red-600/80 border-0">
                            SUSPENDIDO
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <span className="text-white/80 drop-shadow">Tipo:</span>
                          <Badge variant="secondary" className="text-xs backdrop-blur-md bg-white/20 border-white/30 text-white">
                            {getSuspensionTypeLabel(suspension.suspension_type)}
                          </Badge>
                        </div>
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <span className="text-white/80 drop-shadow">Partidos pendientes:</span>
                          <span className="font-bold text-red-300 drop-shadow">
                            {matchesRemaining} de {suspension.matches_to_serve}
                          </span>
                        </div>
                        {suspension.reason && (
                          <div className="pt-2 border-t border-red-300/30">
                            <p className="text-xs text-white/80 drop-shadow">
                              <span className="font-medium">Motivo:</span> {suspension.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referee Report Modal */}
      {selectedMatch && (
        <RefereeReportModal
          open={refereeModalOpen}
          onOpenChange={setRefereeModalOpen}
          match={selectedMatch as any}
        />
      )}
    </div>
  )
}
