import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTournaments, useStandings } from '../api'
import type { Standings } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PointsAdjustmentDialog } from './points-adjustment-dialog'

export function StandingsPage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const standings = useStandings(selectedTournament || undefined)
  const [selectedStanding, setSelectedStanding] = useState<Standings | null>(null)

  // Auto-select first tournament
  if (tournaments.data?.data?.length && !selectedTournament && tournaments.data.data[0]) {
    setSelectedTournament(tournaments.data.data[0].id)
  }

  return (
    <section aria-labelledby="standings-title" className="space-y-6">
      <header>
        <h2 id="standings-title" className="text-2xl font-bold">
          Posiciones
        </h2>
        <p className="text-sm text-muted-foreground">Tabla de posiciones de los torneos</p>
      </header>

      <div className="space-y-4">
        <div className="max-w-xs">
          <label htmlFor="tournament-select" className="text-sm font-medium">Seleccionar Torneo</label>
          <QueryState
            query={tournaments}
            isEmpty={(res) => res.data.length === 0}
            empty={<p className="text-sm text-muted-foreground">Sin torneos disponibles</p>}
          >
            {(res) => (
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger id="tournament-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {res.data.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </QueryState>
        </div>

        {selectedStanding && (
          <PointsAdjustmentDialog
            standing={selectedStanding}
            tournamentId={selectedTournament}
            onClose={() => setSelectedStanding(null)}
          />
        )}

        {!selectedTournament ? (
          tournaments.isSuccess && (
            <EmptyState title="Sin torneos" description="Crea un torneo para ver la tabla" />
          )
        ) : (
        <QueryState
          query={standings}
          loadingLabel="Cargando posiciones…"
          isEmpty={(res) => res.data.length === 0}
          empty={<EmptyState title="Sin datos" description="No hay equipos en este torneo" />}
        >
          {(res) => (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tabla de Posiciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Pos.</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead className="text-center">PJ</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">E</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">GF</TableHead>
                        <TableHead className="text-center">GC</TableHead>
                        <TableHead className="text-center">DG</TableHead>
                        <TableHead className="text-center">Pts</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {res.data.map((standing) => (
                        <TableRow key={standing.team_id}>
                          <TableCell className="text-center font-medium">{standing.position}</TableCell>
                          <TableCell className="font-medium">{standing.team_name}</TableCell>
                          <TableCell className="text-center">{standing.matches_played}</TableCell>
                          <TableCell className="text-center">{standing.matches_won}</TableCell>
                          <TableCell className="text-center">{standing.matches_drawn}</TableCell>
                          <TableCell className="text-center">{standing.matches_lost}</TableCell>
                          <TableCell className="text-center">{standing.goals_for}</TableCell>
                          <TableCell className="text-center">{standing.goals_against}</TableCell>
                          <TableCell className="text-center">{standing.goal_difference}</TableCell>
                          <TableCell className="text-center font-bold">
                            {standing.points}
                            {standing.points_adjustment !== 0 && (
                              <span className="text-xs text-muted-foreground">
                                {' '}
                                ({standing.points_adjustment > 0 ? '+' : ''}{standing.points_adjustment})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStanding(standing)}
                              aria-label={`Ajustar puntos de ${standing.team_name}`}
                            >
                              Ajustar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </QueryState>
        )}
      </div>
    </section>
  )
}
