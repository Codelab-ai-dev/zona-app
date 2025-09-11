"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTeams } from "@/lib/hooks/use-teams"
import { Database } from "@/lib/supabase/database.types"
import { Users, Trophy, Target, Calendar, Loader2 } from "lucide-react"

type Player = Database['public']['Tables']['players']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Team = Database['public']['Tables']['teams']['Row']

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
  
  const [teamStats, setTeamStats] = useState<{
    playersCount: number
    matchesCount: number
    wins: number
    losses: number
    draws: number
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

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
      console.log('✅ Team data loaded successfully')
    } catch (error) {
      console.error('❌ Error loading team data:', error)
    } finally {
      setLoadingStats(false)
    }
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

      <div className="grid gap-6 md:grid-cols-2">
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
              {finishedMatches.slice(-3).map((match) => {
                const isHome = match.home_team_id === teamId
                const teamScore = isHome ? match.home_score : match.away_score
                const opponentScore = isHome ? match.away_score : match.home_score
                // Get opponent team info from match relations
                const opponentTeam = isHome ? (match as any).away_team : (match as any).home_team

                const result =
                  teamScore! > opponentScore! ? "Victoria" : teamScore === opponentScore ? "Empate" : "Derrota"
                const resultColor =
                  result === "Victoria"
                    ? "bg-green-100 text-green-800"
                    : result === "Empate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"

                return (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">vs {opponentTeam?.name || 'Equipo Rival'}</p>
                      <p className="text-sm text-gray-500">
                        {teamScore} - {opponentScore}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${resultColor}`}>{result}</div>
                  </div>
                )
              })}
              {finishedMatches.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay partidos jugados aún</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
