"use client"

import { useEffect, useState } from "react"
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
        // console.error('Error loading system stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSystemStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Estadísticas del Sistema</h2>
          <p className="text-gray-500 text-sm">Cargando datos...</p>
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
              <div className="h-4 bg-slate-700/50 rounded animate-pulse mb-3" />
              <div className="h-8 bg-slate-700/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statsData = [
    {
      title: "Ligas",
      value: stats.leagues.active,
      total: stats.leagues.total,
      icon: Trophy,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: "Torneos",
      value: stats.tournaments.active,
      total: stats.tournaments.total,
      icon: Target,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Equipos",
      value: stats.teams.active,
      total: stats.teams.total,
      icon: Shield,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Jugadores",
      value: stats.players.active,
      total: stats.players.total,
      icon: Users,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Estadísticas del Sistema</h2>
        <p className="text-gray-500 text-sm">Resumen general de todas las ligas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className={`rounded-xl ${stat.bgColor} border ${stat.borderColor} p-3 md:p-4 hover:bg-opacity-20 transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm text-gray-400">{stat.title}</span>
                <div className={`p-1.5 md:p-2 rounded-lg bg-slate-800/50`}>
                  <Icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs md:text-sm text-gray-500">/{stat.total}</span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                {stat.value === stat.total ? "Todos activos" : `${stat.total - stat.value} inactivos`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Recent Leagues & Activity */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recent Leagues */}
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
          <h3 className="text-sm md:text-base font-semibold text-white mb-3">Ligas Recientes</h3>
          <div className="space-y-2">
            {stats.leagues.recentLeagues.length > 0 ? (
              stats.leagues.recentLeagues.map((league) => (
                <div
                  key={league.id}
                  className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-xs md:text-sm truncate">{league.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">/{league.slug}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs flex-shrink-0 ml-2 ${
                      league.is_active
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {league.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs md:text-sm text-gray-500 py-4 text-center">No hay ligas registradas</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
          <h3 className="text-sm md:text-base font-semibold text-white mb-3">Actividad Reciente</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5">
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-white truncate">Nueva liga creada</p>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">Liga Premier - hace 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5">
              <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-white truncate">Torneo iniciado</p>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">Temporada 2024 - hace 1 día</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5">
              <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-white truncate">Nuevo equipo registrado</p>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">Águilas FC - hace 3 días</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
