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
          <h2 className="text-2xl font-bold text-gray-900">Estadísticas del Sistema</h2>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
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
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas del Sistema</h2>
        <p className="text-gray-600">Resumen general de todas las ligas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
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
                  <span className="text-sm font-normal text-gray-500">/{stat.total}</span>
                </div>
                <CardDescription className="text-xs">
                  {stat.value === stat.total ? "Todos activos" : `${stat.total - stat.value} inactivos`}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ligas Recientes</CardTitle>
            <CardDescription>Últimas ligas creadas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.leagues.recentLeagues.length > 0 ? (
                stats.leagues.recentLeagues.map((league) => (
                  <div key={league.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{league.name}</p>
                      <p className="text-sm text-gray-500">/{league.slug}</p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs ${
                        league.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {league.is_active ? "Activa" : "Inactiva"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 py-4">No hay ligas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Nueva liga creada</p>
                  <p className="text-xs text-gray-500">Liga Premier Mexicana - hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Torneo iniciado</p>
                  <p className="text-xs text-gray-500">Temporada 2024 - Apertura - hace 1 día</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Nuevo equipo registrado</p>
                  <p className="text-xs text-gray-500">Águilas FC - hace 3 días</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
