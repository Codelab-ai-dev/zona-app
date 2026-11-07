import { useMemo } from 'react'
import { QueryState, EmptyState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, Target, AlertTriangle, Users } from 'lucide-react'

import { useTeamPlayers, useTeamStats } from '../api'

export function PlayerStatisticsPage({ teamId }: { teamId: string }) {
  const players = useTeamPlayers(teamId)
  const stats = useTeamStats(teamId)

  const playersWithStats = useMemo(() => {
    return players.data?.data ?? []
  }, [players.data])

  const teamTotals = useMemo(() => {
    const totalStats = stats.data?.data[0]
    if (!totalStats) {
      return { goals: 0, yellowCards: 0, redCards: 0 }
    }
    return {
      goals: totalStats.goals_for || 0,
      yellowCards: totalStats.yellow_cards || 0,
      redCards: totalStats.red_cards || 0,
    }
  }, [stats.data])

  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estadísticas de Jugadores</h2>
        <p className="text-muted-foreground">Rendimiento individual de cada jugador del equipo.</p>
      </div>

      {stats.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
          <span>No se pudieron cargar las estadísticas del equipo.</span>
          <Button variant="outline" size="sm" onClick={() => void stats.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold">{playersWithStats.length}</p>
            <p className="text-sm text-muted-foreground">Jugadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold">{teamTotals.goals}</p>
            <p className="text-sm text-muted-foreground">Goles Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold">{teamTotals.yellowCards}</p>
            <p className="text-sm text-muted-foreground">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold">{teamTotals.redCards}</p>
            <p className="text-sm text-muted-foreground">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Plantilla
          </CardTitle>
          <CardDescription>Jugadores registrados en el equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <QueryState
            query={players}
            isEmpty={(res) => res.data.length === 0}
            empty={
              <EmptyState
                title="Sin jugadores registrados"
                description="Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo"
              />
            }
          >
            {(res) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead className="text-center">Posición</TableHead>
                      <TableHead className="text-center">Número</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.map((player) => (
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
                              <p className="font-medium">{player.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{player.position}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">#{player.jersey_number}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {/* Note about stats availability */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Las estadísticas detalladas (goles, asistencias, tarjetas, etc.) se mostrarán cuando el árbitro
            publique los reportes de los partidos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
