import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTeamsByLeague } from './api'
import { LeaguePicker } from './components/league-picker'
import { VerificationPlayerRow } from './components/verification-player-row'
import { useSelectedLeague } from './use-selected-league'
import { useTeamPlayers } from './verification-api'

export function VerificationPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  // The team choice belongs to a league: switching league clears it.
  const [choice, setChoice] = useState({ leagueId: '', teamId: '' })
  const teamId = choice.leagueId === leagueId ? choice.teamId : ''
  const teamsQuery = useTeamsByLeague(leagueId)
  const playersQuery = useTeamPlayers(teamId)

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Verificación de Jugadores</h1>
        <p className="mt-1 text-muted-foreground">
          Revisa el documento de identidad de cada jugador y márcalo como verificado. Los documentos son privados.
        </p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
            >
              {(teamsRes) => (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="verification-team">Equipo</Label>
                    <Select value={teamId} onValueChange={(id) => setChoice({ leagueId, teamId: id })}>
                      <SelectTrigger id="verification-team">
                        <SelectValue placeholder="Selecciona un equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamsRes.data.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {teamId && (
                    <QueryState
                      query={playersQuery}
                      isEmpty={(data) => data.data.length === 0}
                      loadingLabel="Cargando jugadores…"
                      empty={<EmptyState title="No hay jugadores" description="Este equipo aún no tiene jugadores" />}
                    >
                      {(playersRes) => (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Jugador</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {playersRes.data.map((player) => (
                                <VerificationPlayerRow key={player.id} player={player} teamId={teamId} />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </QueryState>
                  )}
                </div>
              )}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
