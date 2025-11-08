"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Shield, Calendar } from "lucide-react"
import { leagueActions } from "@/lib/actions/league-actions"
import { teamActions } from "@/lib/actions/team-actions"

interface LeagueStatsProps {
  leagueId: string
}

interface LeagueStatsData {
  teamsCount: number
  tournamentsCount: number
  playersCount: number
  matchesCount: number
  activeTournament: any
  recentTeams: any[]
  upcomingMatches: any[]
}

export function LeagueStats({ leagueId }: LeagueStatsProps) {
  const [stats, setStats] = useState<LeagueStatsData>({
    teamsCount: 0,
    tournamentsCount: 0,
    playersCount: 0,
    matchesCount: 0,
    activeTournament: null,
    recentTeams: [],
    upcomingMatches: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const leagueStats = await leagueActions.getLeagueStats(leagueId)
        setStats(leagueStats)
      } catch (error) {
        console.error('Error loading league stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (leagueId) {
      loadStats()
    }
  }, [leagueId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Estadísticas de la Liga</h2>
          <p className="text-white/80 drop-shadow">Cargando datos...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      value: stats.activeTournament ? 1 : 0,
      total: stats.tournamentsCount,
      icon: Trophy,
      color: "text-soccer-gold dark:text-soccer-gold-light",
      bgColor: "bg-soccer-gold/10 dark:bg-soccer-gold/20",
    },
    {
      title: "Equipos",
      value: stats.teamsCount,
      total: stats.teamsCount,
      icon: Shield,
      color: "text-soccer-blue dark:text-soccer-blue-light",
      bgColor: "bg-soccer-blue/10 dark:bg-soccer-blue/20",
    },
    {
      title: "Jugadores",
      value: stats.playersCount,
      total: stats.playersCount,
      icon: Users,
      color: "text-soccer-green dark:text-soccer-green-light",
      bgColor: "bg-soccer-green/10 dark:bg-soccer-green/20",
    },
    {
      title: "Partidos",
      value: stats.matchesCount,
      total: stats.matchesCount,
      icon: Calendar,
      color: "text-soccer-red dark:text-soccer-red-light",
      bgColor: "bg-soccer-red/10 dark:bg-soccer-red/20",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">Estadísticas de la Liga</h2>
        <p className="text-white/80 drop-shadow">Resumen de actividad y participación</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="text-2xl font-bold text-white drop-shadow-lg">
                  {stat.value}
                  {stat.total > stat.value && <span className="text-sm font-normal text-white/70">/{stat.total}</span>}
                </div>
                <CardDescription className="text-xs text-white/70 drop-shadow">
                  {stat.title === "Torneos" && stats.activeTournament ? "Torneo activo" : 
                   stat.value > 0 ? "Registrados" : "Sin datos"}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Equipos Recientes</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Últimos equipos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentTeams.length > 0 ? (
                stats.recentTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
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
              {stats.upcomingMatches.length > 0 ? (
                stats.upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                    <div>
                      <p className="font-medium text-white drop-shadow">
                        {match.home_team?.name} vs {match.away_team?.name}
                      </p>
                      <p className="text-sm text-white/70 drop-shadow">{new Date(match.match_date).toLocaleDateString("es-ES")}</p>
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
