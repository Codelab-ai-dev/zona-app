"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Trophy, Target, AlertTriangle, Clock, Users, Loader2 } from "lucide-react"
import { usePlayerStatsByTeam } from "@/lib/queries"

interface PlayerStatisticsProps {
  teamId: string
}

export function PlayerStatistics({ teamId }: PlayerStatisticsProps) {
  // Usar TanStack Query - resuelve N+1 y cachea automáticamente
  const { data: playersWithStats = [], isLoading, error } = usePlayerStatsByTeam(teamId)

  // Ordenar por goles (memoizado para evitar recalcular en cada render)
  const sortedPlayers = useMemo(() => {
    return [...playersWithStats].sort((a, b) => {
      if (b.total_goals !== a.total_goals) {
        return b.total_goals - a.total_goals
      }
      return b.total_minutes_played - a.total_minutes_played
    })
  }, [playersWithStats])

  // Calcular totales del equipo (memoizado)
  const teamTotals = useMemo(() => {
    if (!playersWithStats.length) {
      return { goals: 0, yellowCards: 0, redCards: 0, minutes: 0 }
    }
    return {
      goals: playersWithStats.reduce((sum, p) => sum + p.total_goals, 0),
      yellowCards: playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0),
      redCards: playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0),
      minutes: playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0),
    }
  }, [playersWithStats])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando estadísticas de jugadores...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white drop-shadow-lg mb-2">Error</h3>
            <p className="text-red-400 drop-shadow">
              {error instanceof Error ? error.message : "Error cargando estadísticas"}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{sortedPlayers.length}</p>
            <p className="text-sm text-white/80 drop-shadow">Jugadores</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.goals}</p>
            <p className="text-sm text-white/80 drop-shadow">Goles Totales</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.yellowCards}</p>
            <p className="text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.redCards}</p>
            <p className="text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 mr-2" />
            Estadísticas de Jugadores
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">
            Rendimiento individual de cada jugador del equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-white drop-shadow-lg mb-2">
                No hay jugadores registrados
              </h3>
              <p className="text-white/80 drop-shadow">
                Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/90 drop-shadow">Jugador</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PJ</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Goles</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">TA</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">TR</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-white drop-shadow flex items-center">
                              {player.name}
                              <span className="ml-2 text-sm font-bold text-green-400 drop-shadow">
                                #{player.jersey_number}
                              </span>
                            </p>
                            <p className="text-sm text-white/70 drop-shadow">{player.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-white drop-shadow">
                        {player.matches_played}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="backdrop-blur-md bg-green-500/20 text-green-300 border-green-300/50">
                          {player.total_goals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_yellow_cards > 0 && (
                          <Badge variant="outline" className="backdrop-blur-md bg-yellow-500/20 text-yellow-300 border-yellow-300/50">
                            {player.total_yellow_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_red_cards > 0 && (
                          <Badge variant="outline" className="backdrop-blur-md bg-red-500/20 text-red-300 border-red-300/50">
                            {player.total_red_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-white/80 drop-shadow">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {player.total_minutes_played}'
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
