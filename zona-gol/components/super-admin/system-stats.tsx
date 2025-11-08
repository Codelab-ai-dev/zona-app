"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { leagueActions } from "@/lib/actions/league-actions"
import { Trophy, Users, Shield, Target } from "lucide-react"

interface SystemStatsData {
  leagues: {
    active: number
    total: number
    recentLeagues: any[]
  }
  tournaments: {
    active: number
    total: number
  }
  teams: {
    active: number
    total: number
  }
  players: {
    active: number
    total: number
  }
}

export function SystemStats() {
  const [stats, setStats] = useState<SystemStatsData>({
    leagues: { active: 0, total: 0, recentLeagues: [] },
    tournaments: { active: 0, total: 0 },
    teams: { active: 0, total: 0 },
    players: { active: 0, total: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSystemStats = async () => {
      try {
        setLoading(true)
        const systemStats = await leagueActions.getSystemStats()
        setStats(systemStats)
      } catch (error) {
        console.error('Error loading system stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSystemStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Estadísticas del Sistema</h2>
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
      title: "Ligas Activas",
      value: stats.leagues.active,
      total: stats.leagues.total,
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Torneos",
      value: stats.tournaments.active,
      total: stats.tournaments.total,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Equipos",
      value: stats.teams.active,
      total: stats.teams.total,
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Jugadores",
      value: stats.players.active,
      total: stats.players.total,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">Estadísticas del Sistema</h2>
        <p className="text-white/80 drop-shadow">Resumen general de todas las ligas</p>
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
                  <span className="text-sm font-normal text-white/70">/{stat.total}</span>
                </div>
                <CardDescription className="text-xs text-white/70 drop-shadow">
                  {stat.value === stat.total ? "Todos activos" : `${stat.total - stat.value} inactivos`}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Ligas Recientes</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Últimas ligas creadas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.leagues.recentLeagues.length > 0 ? (
                stats.leagues.recentLeagues.map((league) => (
                  <div key={league.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                    <div>
                      <p className="font-medium text-white drop-shadow">{league.name}</p>
                      <p className="text-sm text-white/70 drop-shadow">/{league.slug}</p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs backdrop-blur-md ${
                        league.is_active ? "bg-green-500/80 text-white" : "bg-white/20 text-white/80"
                      }`}
                    >
                      {league.is_active ? "Activa" : "Inactiva"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70 drop-shadow py-4">No hay ligas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Actividad Reciente</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg"></div>
                <div>
                  <p className="text-sm font-medium text-white drop-shadow">Nueva liga creada</p>
                  <p className="text-xs text-white/70 drop-shadow">Liga Premier Mexicana - hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-blue-400 rounded-full shadow-lg"></div>
                <div>
                  <p className="text-sm font-medium text-white drop-shadow">Torneo iniciado</p>
                  <p className="text-xs text-white/70 drop-shadow">Temporada 2024 - Apertura - hace 1 día</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-purple-400 rounded-full shadow-lg"></div>
                <div>
                  <p className="text-sm font-medium text-white drop-shadow">Nuevo equipo registrado</p>
                  <p className="text-xs text-white/70 drop-shadow">Águilas FC - hace 3 días</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
