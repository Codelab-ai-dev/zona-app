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

import { useTeamPlayerStats, useTeamStats } from '../api'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import type { TeamPlayerStats } from '../types'
import { initials } from '../utils'

const columns: { key: keyof Pick<TeamPlayerStats, 'matches_played' | 'goals' | 'assists' | 'yellow_cards' | 'red_cards' | 'minutes_played'>; label: string; title: string }[] = [
  { key: 'matches_played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'goals', label: 'Goles', title: 'Goles' },
  { key: 'assists', label: 'Asist.', title: 'Asistencias' },
  { key: 'yellow_cards', label: 'TA', title: 'Tarjetas amarillas' },
  { key: 'red_cards', label: 'TR', title: 'Tarjetas rojas' },
  { key: 'minutes_played', label: 'Min.', title: 'Minutos jugados' },
]

export function PlayerStatisticsPage({ teamId }: { teamId: string }) {
  const players = useTeamPlayerStats(teamId)
  const stats = useTeamStats(teamId)

  // Most goals first; ties keep the jersey order so the table is stable.
  const playersWithStats = useMemo(
    () => [...(players.data?.data ?? [])].sort((a, b) => b.goals - a.goals || a.jersey_number - b.jersey_number),
    [players.data],
  )

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className={pageTitle}>Estadísticas de Jugadores</h2>
        <p className={pageSubtitle}>Rendimiento individual de cada jugador del equipo.</p>
      </div>

      {stats.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-300/30 bg-red-500/20 text-white p-3 text-sm">
          <span>No se pudieron cargar las estadísticas del equipo.</span>
          <Button variant="outline" size="sm" className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => void stats.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={glassCard}>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{playersWithStats.length}</p>
            <p className="text-sm text-white/80 drop-shadow">Jugadores</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.goals}</p>
            <p className="text-sm text-white/80 drop-shadow">Goles Totales</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.yellowCards}</p>
            <p className="text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{teamTotals.redCards}</p>
            <p className="text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="flex items-center text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 mr-2" />
            Plantilla
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">Jugadores registrados en el equipo, ordenados por goles</CardDescription>
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
            {() => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white/90 drop-shadow">Jugador</TableHead>
                      <TableHead className="text-center text-white/90 drop-shadow">Posición</TableHead>
                      <TableHead className="text-center text-white/90 drop-shadow">Número</TableHead>
                      {columns.map((c) => (
                        <TableHead key={c.key} className="text-center text-white/90 drop-shadow" title={c.title}>
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playersWithStats.map((player) => (
                      <TableRow key={player.player_id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">{initials(player.name)}</AvatarFallback>
                              )}
                            </Avatar>
                            <p className="font-medium text-white drop-shadow">{player.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-white/80">{player.position}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="backdrop-blur-md bg-white/20 border-white/30 text-white">#{player.jersey_number}</Badge>
                        </TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.key} className={`text-center ${c.key === 'goals' ? 'font-bold text-green-400' : 'text-white/90'}`}>
                            {player[c.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
