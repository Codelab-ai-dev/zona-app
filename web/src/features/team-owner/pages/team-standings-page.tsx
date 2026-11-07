import { useMemo } from 'react'
import { QueryState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTeam } from '../api'
import { useTournamentStandings } from '../api'

export function TeamStandingsPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)

  // Derive tournament ID from team data
  const tournamentId = useMemo(() => {
    return team.data?.tournament_id
  }, [team.data?.tournament_id])

  const standings = useTournamentStandings(tournamentId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Posiciones</h2>
        <p className="text-muted-foreground">Visualiza la tabla de posiciones del torneo.</p>
      </div>

      <QueryState query={standings} isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Posiciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead className="text-center">PJ</TableHead>
                      <TableHead className="text-center">G</TableHead>
                      <TableHead className="text-center">E</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">GF</TableHead>
                      <TableHead className="text-center">GC</TableHead>
                      <TableHead className="text-center">DG</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.map((standing) => (
                      <TableRow key={standing.team_id}>
                        <TableCell className="text-center font-semibold">{standing.position}</TableCell>
                        <TableCell className="font-medium">{standing.team_name}</TableCell>
                        <TableCell className="text-center">{standing.matches_played}</TableCell>
                        <TableCell className="text-center">{standing.matches_won}</TableCell>
                        <TableCell className="text-center">{standing.matches_drawn}</TableCell>
                        <TableCell className="text-center">{standing.matches_lost}</TableCell>
                        <TableCell className="text-center">{standing.goals_for}</TableCell>
                        <TableCell className="text-center">{standing.goals_against}</TableCell>
                        <TableCell className="text-center">{standing.goal_difference}</TableCell>
                        <TableCell className="text-center font-bold text-primary">{standing.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>
    </div>
  )
}
