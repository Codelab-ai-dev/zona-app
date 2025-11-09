"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTeams } from "@/lib/hooks/use-teams"
import { Trophy, Target, TrendingUp, TrendingDown, Loader2 } from "lucide-react"

interface TeamRecordProps {
  teamId: string
}

export function TeamRecord({ teamId }: TeamRecordProps) {
  const { getTeamStats } = useTeams()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    matchesCount: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
  } | null>(null)

  useEffect(() => {
    loadStats()
  }, [teamId])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await getTeamStats(teamId)
      setStats(data)
    } catch (error) {
      console.error('Error loading team record:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5" />
            Récord del Equipo
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">Estadísticas generales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-white" />
            <span className="text-white drop-shadow">Cargando estadísticas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5" />
            Récord del Equipo
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">Estadísticas generales</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/70 drop-shadow py-8">No hay estadísticas disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const recordStats = [
    {
      label: "Partidos Jugados",
      value: stats.matchesCount,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    {
      label: "Victorias",
      value: stats.wins,
      color: "text-green-700",
      bgColor: "bg-green-100",
    },
    {
      label: "Empates",
      value: stats.draws,
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
    },
    {
      label: "Derrotas",
      value: stats.losses,
      color: "text-red-700",
      bgColor: "bg-red-100",
    },
  ]

  const goalStats = [
    {
      label: "Goles a Favor",
      value: stats.goalsFor,
      icon: TrendingUp,
      color: "text-green-700",
      bgColor: "bg-green-100",
    },
    {
      label: "Goles en Contra",
      value: stats.goalsAgainst,
      icon: TrendingDown,
      color: "text-red-700",
      bgColor: "bg-red-100",
    },
    {
      label: "Diferencia de Goles",
      value: stats.goalDifference >= 0 ? `+${stats.goalDifference}` : stats.goalDifference,
      icon: Target,
      color: stats.goalDifference >= 0 ? "text-green-700" : "text-red-700",
      bgColor: stats.goalDifference >= 0 ? "bg-green-100" : "bg-red-100",
    },
  ]

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Trophy className="w-5 h-5" />
          Récord del Equipo
        </CardTitle>
        <CardDescription className="text-white/70 drop-shadow">Estadísticas de la temporada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points Display */}
        <div className="p-6 backdrop-blur-md bg-gradient-to-r from-blue-500/80 to-blue-600/80 rounded-xl text-white border border-blue-300/30 shadow-lg">
          <div className="text-center">
            <p className="text-sm font-medium opacity-90">Puntos Totales</p>
            <p className="text-5xl font-bold mt-2">{stats.points}</p>
            <p className="text-xs opacity-75 mt-2">
              {stats.wins} victorias × 3 pts + {stats.draws} empates × 1 pt
            </p>
          </div>
        </div>

        {/* Match Record */}
        <div>
          <h3 className="text-sm font-semibold text-white drop-shadow-lg mb-3">Récord de Partidos</h3>
          <div className="grid grid-cols-2 gap-3">
            {recordStats.map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-xl backdrop-blur-md border shadow-lg ${
                  stat.label === "Partidos Jugados" ? "bg-gray-500/20 border-gray-300/30" :
                  stat.label === "Victorias" ? "bg-green-500/20 border-green-300/30" :
                  stat.label === "Empates" ? "bg-yellow-500/20 border-yellow-300/30" :
                  "bg-red-500/20 border-red-300/30"
                }`}
              >
                <p className="text-xs text-white/80 drop-shadow mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold drop-shadow-lg ${
                  stat.label === "Partidos Jugados" ? "text-white" :
                  stat.label === "Victorias" ? "text-green-400" :
                  stat.label === "Empates" ? "text-yellow-400" :
                  "text-red-400"
                }`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Stats */}
        <div>
          <h3 className="text-sm font-semibold text-white drop-shadow-lg mb-3">Estadísticas de Goles</h3>
          <div className="space-y-3">
            {goalStats.map((stat) => {
              const Icon = stat.icon
              const isPositive = stat.label === "Goles a Favor" || (stat.label === "Diferencia de Goles" && stats.goalDifference >= 0)
              return (
                <div
                  key={stat.label}
                  className={`flex items-center justify-between p-4 rounded-xl backdrop-blur-md border shadow-lg ${
                    isPositive ? "bg-green-500/20 border-green-300/30" : "bg-red-500/20 border-red-300/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full backdrop-blur-md border ${
                      isPositive ? "bg-green-500/30 border-green-300/50" : "bg-red-500/30 border-red-300/50"
                    }`}>
                      <Icon className={`w-4 h-4 ${isPositive ? "text-green-300" : "text-red-300"}`} />
                    </div>
                    <span className="text-sm font-medium text-white drop-shadow">{stat.label}</span>
                  </div>
                  <span className={`text-2xl font-bold drop-shadow-lg ${isPositive ? "text-green-400" : "text-red-400"}`}>{stat.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Win Percentage */}
        {stats.matchesCount > 0 && (
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80 drop-shadow">Porcentaje de Victorias</span>
              <span className="font-bold text-green-400 drop-shadow">
                {((stats.wins / stats.matchesCount) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 backdrop-blur-md bg-white/20 rounded-full overflow-hidden border border-white/30">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(stats.wins / stats.matchesCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
