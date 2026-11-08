import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">Verificación de Jugadores</h1>
        <p className="text-white/80 drop-shadow">
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
                    <Label htmlFor="verification-team" className="text-white/90">Equipo</Label>
                    <Select value={teamId} onValueChange={(id) => setChoice({ leagueId, teamId: id })}>
                      <SelectTrigger id="verification-team" className="w-full border-white/10 bg-slate-800/50 text-white sm:w-72">
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
                        <Card className="border-white/20 bg-white/10 shadow-xl backdrop-blur-xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                              <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
                              Lista de Jugadores
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-white/90">Jugador</TableHead>
                                    <TableHead className="text-white/90">Estado</TableHead>
                                    <TableHead className="text-white/90">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {playersRes.data.map((player) => (
                                    <VerificationPlayerRow key={player.id} player={player} teamId={teamId} />
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
              )}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
