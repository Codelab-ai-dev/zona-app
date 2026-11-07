import { useMemo } from 'react'
import { QueryState, EmptyState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTeam, useTopScorers } from '../api'
import type { PlayerStats } from '../types'

export function TeamScorersPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)

  const tournamentId = useMemo(() => {
    return team.data?.tournament_id
  }, [team.data?.tournament_id])

  const topScorers = useTopScorers(tournamentId)

  // Filter to only show players from this team
  const teamScorers = useMemo(() => {
    if (!topScorers.data?.data) return []
    return topScorers.data.data.filter((scorer: PlayerStats) => scorer.team_id === teamId).slice(0, 10)
  }, [topScorers.data, teamId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Goleadores</h2>
        <p className="text-muted-foreground">Visualiza los goleadores del torneo y tus jugadores destacados.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Goleadores del Torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            query={topScorers}
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="Sin goleadores" description="No hay datos de goles disponibles." />}
          >
            {(res) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead className="text-center">Goles</TableHead>
                      <TableHead className="text-center">Asistencias</TableHead>
                      <TableHead className="text-center">Partidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.slice(0, 10).map((scorer, index) => (
                      <TableRow key={scorer.player_id} className={scorer.team_id === teamId ? 'bg-primary/5' : ''}>
                        <TableCell className="font-semibold">{index + 1}</TableCell>
                        <TableCell className="font-medium">{scorer.player_name}</TableCell>
                        <TableCell>{scorer.team_name}</TableCell>
                        <TableCell className="text-center font-bold text-primary">{scorer.goals}</TableCell>
                        <TableCell className="text-center">{scorer.assists}</TableCell>
                        <TableCell className="text-center">{scorer.matches_played}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {teamScorers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goleadores de Tu Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamScorers.map((scorer) => (
                <div key={scorer.player_id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-semibold">{scorer.player_name}</p>
                    <p className="text-sm text-muted-foreground">#{scorer.jersey_number}</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{scorer.goals}</p>
                      <p className="text-xs text-muted-foreground">goles</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{scorer.assists}</p>
                      <p className="text-xs text-muted-foreground">asistencias</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
