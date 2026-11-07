import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTournaments, useTopScorers, useDiscipline } from '../api'

type ViewMode = 'scorers' | 'discipline'

export function TopScorersPage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('scorers')
  const scorers = useTopScorers(viewMode === 'scorers' ? selectedTournament || undefined : undefined)
  const discipline = useDiscipline(viewMode === 'discipline' ? selectedTournament || undefined : undefined)

  // Auto-select first tournament
  if (tournaments.data?.data?.length && !selectedTournament && tournaments.data.data[0]) {
    setSelectedTournament(tournaments.data.data[0].id)
  }

  const query = viewMode === 'scorers' ? scorers : discipline
  const title = viewMode === 'scorers' ? 'Goleadores' : 'Disciplina'

  return (
    <section aria-labelledby="top-scorers-title" className="space-y-6">
      <header>
        <h2 id="top-scorers-title" className="text-2xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">Estadísticas de jugadores</p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="max-w-xs flex-1">
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

          <div className="max-w-xs">
            <label htmlFor="view-select" className="text-sm font-medium">Vista</label>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger id="view-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scorers">Goleadores</SelectItem>
                <SelectItem value="discipline">Disciplina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedTournament ? (
          tournaments.isSuccess && (
            <EmptyState title="Sin torneos" description="Crea un torneo para ver estadísticas" />
          )
        ) : (
        <QueryState
          query={query}
          loadingLabel={`Cargando ${title.toLowerCase()}…`}
          isEmpty={(res) => res.data.length === 0}
          empty={<EmptyState title="Sin datos" description="No hay jugadores en este torneo" />}
        >
          {(res) => (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">#</TableHead>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead className="text-center">PJ</TableHead>
                        {viewMode === 'scorers' ? (
                          <>
                            <TableHead className="text-center">Goles</TableHead>
                            <TableHead className="text-center">Asistencias</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-center">Amarillas</TableHead>
                            <TableHead className="text-center">Rojas</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {res.data.map((player, idx) => (
                        <TableRow key={player.player_id}>
                          <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{player.player_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{player.team_name}</TableCell>
                          <TableCell className="text-center text-sm">{player.matches_played}</TableCell>
                          {viewMode === 'scorers' ? (
                            <>
                              <TableCell className="text-center font-bold">{player.goals}</TableCell>
                              <TableCell className="text-center">{player.assists}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center text-yellow-600">{player.yellow_cards}</TableCell>
                              <TableCell className="text-center text-red-600">{player.red_cards}</TableCell>
                            </>
                          )}
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
