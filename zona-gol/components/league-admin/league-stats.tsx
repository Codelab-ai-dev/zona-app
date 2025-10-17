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
          <h2 className="text-2xl font-bold text-foreground">Estadísticas de la Liga</h2>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
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
        <h2 className="text-2xl font-bold text-foreground">Estadísticas de la Liga</h2>
        <p className="text-muted-foreground">Resumen de actividad y participación</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                  {stat.total > stat.value && <span className="text-sm font-normal text-muted-foreground">/{stat.total}</span>}
                </div>
                <CardDescription className="text-xs">
                  {stat.title === "Torneos" && stats.activeTournament ? "Torneo activo" : 
                   stat.value > 0 ? "Registrados" : "Sin datos"}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipos Recientes</CardTitle>
            <CardDescription>Últimos equipos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentTeams.length > 0 ? (
                stats.recentTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-muted">
                    <div>
                      <p className="font-medium text-foreground">{team.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Registrado el {new Date(team.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs font-medium ${
                        team.is_active ? "bg-soccer-green/20 text-soccer-green dark:bg-soccer-green/30 dark:text-soccer-green-light" : "bg-soccer-gold/20 text-soccer-gold dark:bg-soccer-gold/30 dark:text-soccer-gold-light"
                      }`}
                    >
                      {team.is_active ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No hay equipos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Partidos</CardTitle>
            <CardDescription>Calendario de partidos programados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingMatches.length > 0 ? (
                stats.upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-muted">
                    <div>
                      <p className="font-medium text-foreground">
                        {match.home_team?.name} vs {match.away_team?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{new Date(match.match_date).toLocaleDateString("es-ES")}</p>
                    </div>
                    <div className="px-2 py-1 text-xs bg-soccer-blue/30 text-soccer-blue border border-soccer-blue/50 dark:bg-soccer-blue/40 dark:text-white dark:border-soccer-blue font-medium rounded">
                      {match.status === 'scheduled' ? 'Programado' : match.status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No hay partidos programados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
