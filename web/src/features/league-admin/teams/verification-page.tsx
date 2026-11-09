import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLeagueTournaments } from '@/features/leagues/api'

import { useTeamsByLeague } from './api'
import { checkAge } from './age'
import { BirthDateDialog } from './components/birth-date-dialog'
import { DocumentDialog } from './components/document-dialog'
import { LeaguePicker } from './components/league-picker'
import { VerificationFilters } from './components/verification-filters'
import { VerificationRow } from './components/verification-row'
import { VerificationSummary } from './components/verification-summary'
import type { LeaguePlayerVerification, VerificationStatus } from './types'
import { useSelectedLeague } from './use-selected-league'
import { useDecideVerification, useLeagueVerification, useVerificationSummary } from './verification-api'
import { toast } from 'sonner'

const PAGE_SIZE = 20

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function VerificationPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const [status, setStatus] = useState<VerificationStatus | ''>('pending')
  const [teamId, setTeamId] = useState('')
  const [search, setSearch] = useState('')
  const [ageOnly, setAgeOnly] = useState(true)
  const [offset, setOffset] = useState(0)
  const [viewing, setViewing] = useState<LeaguePlayerVerification | null>(null)
  const [editing, setEditing] = useState<LeaguePlayerVerification | null>(null)
  const q = useDebounced(search.trim())

  const listQuery = useLeagueVerification(leagueId, { status, teamId, q, ageOnly, limit: PAGE_SIZE, offset })
  const summaryQuery = useVerificationSummary(leagueId, ageOnly)
  const teams = useTeamsByLeague(leagueId).data?.data ?? []
  const tournaments = useLeagueTournaments(leagueId).data?.data ?? []
  const decide = useDecideVerification(leagueId)

  const rulesOf = (teamIdOfRow: string) => {
    const tournamentId = teams.find((t) => t.id === teamIdOfRow)?.tournament_id
    return tournaments.find((t) => t.id === tournamentId)
  }
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setOffset(0)
  }

  const approve = async (row: LeaguePlayerVerification) => {
    setViewing(null)
    try {
      await decide.mutateAsync({ playerId: row.player_id, body: { verified: true, document_key: row.document_key } })
      toast.success(`${row.name} verificado`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la verificación')
    }
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">Verificación de Jugadores</h1>
        <p className="text-white/80 drop-shadow">Revisa y verifica los documentos de identidad. Los documentos son privados.</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={reset(setLeagueId)} />
            <VerificationSummary summary={summaryQuery.data} />

            <Card className="border-white/20 bg-white/10 shadow-xl backdrop-blur-xl">
              <CardHeader className="space-y-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                  <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  Lista de Jugadores
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch id="age-only" checked={ageOnly} onCheckedChange={reset(setAgeOnly)} />
                  <Label htmlFor="age-only" className="text-white/90">Solo torneos con validación de edad</Label>
                </div>
                <VerificationFilters
                  status={status}
                  teamId={teamId}
                  search={search}
                  teams={teams}
                  onStatus={reset(setStatus)}
                  onTeam={reset(setTeamId)}
                  onSearch={reset(setSearch)}
                />
              </CardHeader>
              <CardContent>
                <QueryState
                  query={listQuery}
                  isEmpty={(data) => data.data.length === 0}
                  loadingLabel="Cargando jugadores…"
                  empty={
                    <EmptyState
                      title="No hay jugadores"
                      description={
                        ageOnly
                          ? 'No hay jugadores en esta categoría. Solo se muestran jugadores de torneos con validación de edad: desactiva «Solo torneos con validación de edad» para ver a todos.'
                          : 'No hay jugadores en esta categoría'
                      }
                    />
                  }
                >
                  {(res) => {
                    const total = res.page.total ?? res.data.length
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-white/90">Jugador</TableHead>
                                <TableHead className="text-white/90">Equipo</TableHead>
                                <TableHead className="text-white/90">Edad</TableHead>
                                <TableHead className="text-white/90">Estado</TableHead>
                                <TableHead className="text-right text-white/90">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {res.data.map((row) => (
                                <VerificationRow
                                  key={row.player_id}
                                  row={row}
                                  leagueId={leagueId}
                                  age={checkAge(row.birth_date, rulesOf(row.team_id))}
                                  teamLogo={teams.find((t) => t.id === row.team_id)?.logo}
                                  onView={setViewing}
                                  onEditBirthDate={setEditing}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <nav aria-label="Paginación" className="flex items-center justify-between text-sm text-white/80">
                          <span>{offset + 1}–{offset + res.data.length} de {total}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                              Anterior
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                              Siguiente
                            </Button>
                          </div>
                        </nav>
                      </div>
                    )
                  }}
                </QueryState>
              </CardContent>
            </Card>
          </div>
        )}
      </QueryState>

      {viewing && <DocumentDialog row={viewing} onClose={() => setViewing(null)} onApprove={(r) => void approve(r)} />}
      {editing && <BirthDateDialog key={editing.player_id} row={editing} leagueId={leagueId} onClose={() => setEditing(null)} />}
    </div>
  )
}
