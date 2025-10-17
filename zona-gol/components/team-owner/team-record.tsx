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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Récord del Equipo
          </CardTitle>
          <CardDescription>Estadísticas generales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando estadísticas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Récord del Equipo
          </CardTitle>
          <CardDescription>Estadísticas generales</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No hay estadísticas disponibles</p>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Récord del Equipo
        </CardTitle>
        <CardDescription>Estadísticas de la temporada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points Display */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Récord de Partidos</h3>
          <div className="grid grid-cols-2 gap-3">
            {recordStats.map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-lg ${stat.bgColor} border border-gray-200`}
              >
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Estadísticas de Goles</h3>
          <div className="space-y-3">
            {goalStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className={`flex items-center justify-between p-4 rounded-lg ${stat.bgColor} border border-gray-200`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-white`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Win Percentage */}
        {stats.matchesCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Porcentaje de Victorias</span>
              <span className="font-bold text-green-600">
                {((stats.wins / stats.matchesCount) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
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
