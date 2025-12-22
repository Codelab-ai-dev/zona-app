"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Shield, Calendar } from "lucide-react"
import { useLeagueStats, useTeamsByLeague, useActiveTournament, useUpcomingMatches } from "@/lib/queries"

interface LeagueStatsProps {
  leagueId: string
}

export function LeagueStats({ leagueId }: LeagueStatsProps) {
  // Usar TanStack Query para todas las queries
  const { data: stats, isLoading: loadingStats } = useLeagueStats(leagueId)
  const { data: teams = [], isLoading: loadingTeams } = useTeamsByLeague(leagueId)
  const { data: activeTournament, isLoading: loadingTournament } = useActiveTournament(leagueId)
  const { data: upcomingMatches = [] } = useUpcomingMatches(activeTournament?.id, 5)

  const isLoading = loadingStats || loadingTeams || loadingTournament

  // Obtener equipos recientes (últimos 5)
  const recentTeams = useMemo(() => {
    return [...teams]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [teams])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Estadísticas de la Liga</h2>
          <p className="text-white/80 drop-shadow">Cargando datos...</p>
        </div>
        <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader>
                <div className="h-4 bg-white/20 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-white/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statsData = [
    {
      title: "Torneos",
      value: activeTournament ? 1 : 0,
      total: stats?.tournamentsCount || 0,
      icon: Trophy,
      color: "text-soccer-gold dark:text-soccer-gold-light",
      bgColor: "bg-soccer-gold/10 dark:bg-soccer-gold/20",
    },
    {
      title: "Equipos",
      value: stats?.teamsCount || 0,
      total: stats?.teamsCount || 0,
      icon: Shield,
      color: "text-soccer-blue dark:text-soccer-blue-light",
      bgColor: "bg-soccer-blue/10 dark:bg-soccer-blue/20",
    },
    {
      title: "Jugadores",
      value: stats?.playersCount || 0,
      total: stats?.playersCount || 0,
      icon: Users,
      color: "text-soccer-green dark:text-soccer-green-light",
      bgColor: "bg-soccer-green/10 dark:bg-soccer-green/20",
    },
    {
      title: "Partidos",
      value: stats?.matchesCount || 0,
      total: stats?.matchesCount || 0,
      icon: Calendar,
      color: "text-soccer-red dark:text-soccer-red-light",
      bgColor: "bg-soccer-red/10 dark:bg-soccer-red/20",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Estadísticas de la Liga</h2>
        <p className="text-white/80 drop-shadow">Resumen de actividad y participación</p>
      </div>

      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90 drop-shadow">{stat.title}</CardTitle>
                <div className="p-2 rounded-full backdrop-blur-md bg-white/20">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {stat.value}
                  {stat.total > stat.value && <span className="text-sm font-normal text-white/70">/{stat.total}</span>}
                </div>
                <CardDescription className="text-xs text-white/70 drop-shadow">
                  {stat.title === "Torneos" && activeTournament ? "Torneo activo" :
                   stat.value > 0 ? "Registrados" : "Sin datos"}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Equipos Recientes</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Últimos equipos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTeams.length > 0 ? (
                recentTeams.map((team) => (
                  <div key={team.id} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                    <div>
                      <p className="font-medium text-white drop-shadow">{team.name}</p>
                      <p className="text-sm text-white/70 drop-shadow">
                        Registrado el {new Date(team.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-md ${
                        team.is_active ? "bg-green-500/80 text-white" : "bg-yellow-500/80 text-white"
                      }`}
                    >
                      {team.is_active ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70 drop-shadow py-4">No hay equipos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Próximos Partidos</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Calendario de partidos programados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.map((match) => (
                  <div key={match.id} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                    <div>
                      <p className="font-medium text-white drop-shadow">
                        {match.home_team?.name} vs {match.away_team?.name}
                      </p>
                      <p className="text-sm text-white/70 drop-shadow">
                        {match.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : 'Fecha por definir'}
                      </p>
                    </div>
                    <div className="px-2 py-1 text-xs backdrop-blur-md bg-blue-500/80 text-white border border-white/20 font-medium rounded-full">
                      {match.status === 'scheduled' ? 'Programado' : match.status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70 drop-shadow py-4">No hay partidos programados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
