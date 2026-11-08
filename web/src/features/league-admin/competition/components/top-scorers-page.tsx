import { Loader2, Plus, Target, Trophy } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useDiscipline, useManualStats, useTopScorers, useTournaments, type ManualStats } from '../api'
import { DisciplineTable } from './discipline-table'
import { ManualStatsDialog } from './manual-stats-dialog'
import { ManualStatsList } from './manual-stats-list'
import { ScorersPodium } from './scorers-podium'

type ViewMode = 'scorers' | 'discipline'

const glass = 'backdrop-blur-xl bg-white/10 border-white/20'
const selectClass = 'h-9 bg-slate-800/50 border-white/10 text-white text-sm'

function PositionBadge({ position }: { position: number }) {
  if (position === 1) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🥇 1°</Badge>
  if (position === 2) return <Badge className="bg-gray-400 hover:bg-gray-500 text-white">🥈 2°</Badge>
  if (position === 3) return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">🥉 3°</Badge>
  return (
    <Badge variant="outline" className="font-bold text-white border-white/30">
      {position}°
    </Badge>
  )
}

export function TopScorersPage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const [chosen, setChosen] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('scorers')
  const [dialog, setDialog] = useState<{ editing?: ManualStats } | null>(null)

  const list = tournaments.data?.data ?? []
  const selectedTournament = chosen || (list.find((t) => t.is_active) ?? list[0])?.id || ''
  const scorers = useTopScorers(viewMode === 'scorers' ? selectedTournament || undefined : undefined)
  const manual = useManualStats(selectedTournament || undefined)
  const discipline = useDiscipline(viewMode === 'discipline' ? selectedTournament || undefined : undefined)

  if (tournaments.isPending) {
    return (
      <div role="status" className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" aria-hidden="true" />
        <span className="text-base sm:text-lg text-white drop-shadow">Cargando goleadores...</span>
      </div>
    )
  }
  if (tournaments.isError) return <ErrorState error={tournaments.error} onRetry={() => void tournaments.refetch()} />

  const title = viewMode === 'scorers' ? 'Tabla de Goleadores' : 'Tabla de Disciplina'
  const query = viewMode === 'scorers' ? scorers : discipline
  const rows = query.data?.data ?? []

  return (
    <section aria-labelledby="top-scorers-title" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="top-scorers-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            {title}
          </h2>
          <p className="text-white/80 drop-shadow">
            {viewMode === 'scorers' ? 'Ranking de goleadores de la liga' : 'Tarjetas amarillas y rojas de los jugadores'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {list.length > 0 && (
            <div>
              <Label htmlFor="tournament-select" className="text-gray-400 text-xs mb-1.5 block">
                Seleccionar Torneo
              </Label>
              <Select value={selectedTournament} onValueChange={setChosen}>
                <SelectTrigger id="tournament-select" className={`w-full sm:w-56 ${selectClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {list.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name} {tournament.is_active && '(Activo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="view-select" className="text-gray-400 text-xs mb-1.5 block">
              Vista
            </Label>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger id="view-select" className={`w-full sm:w-40 ${selectClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scorers">Goleadores</SelectItem>
                <SelectItem value="discipline">Disciplina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === 'scorers' && selectedTournament && (
            <Button
              onClick={() => setDialog({})}
              className="sm:self-end h-9 backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Agregar Goles
            </Button>
          )}
        </div>
      </div>

      {!selectedTournament ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 mx-auto text-white/50 mb-4" aria-hidden="true" />
          <p className="text-white/80 drop-shadow">Sin torneos</p>
          <p className="text-sm text-white/70">Crea un torneo para ver estadísticas</p>
        </div>
      ) : query.isPending ? (
        <div role="status" className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" aria-hidden="true" />
          <span className="text-base sm:text-lg text-white drop-shadow">
            {viewMode === 'scorers' ? 'Cargando goleadores…' : 'Cargando disciplina…'}
          </span>
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <Card className={glass}>
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/50 mb-4" aria-hidden="true" />
            <p className="text-white/80 drop-shadow">No hay jugadores en este torneo</p>
          </CardContent>
        </Card>
      ) : viewMode === 'discipline' ? (
        <DisciplineTable leagueId={leagueId} rows={rows} />
      ) : (
        <>
          <Card className={glass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                <Trophy className="w-5 h-5 text-yellow-300" aria-hidden="true" />
                Top Goleadores
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">{rows.length} jugadores con goles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-white/5">
                      <TableHead className="w-20 text-white/90">Posición</TableHead>
                      <TableHead className="text-white/90">Jugador</TableHead>
                      <TableHead className="text-center text-white/90">Dorsal</TableHead>
                      <TableHead className="text-white/90">Equipo</TableHead>
                      <TableHead className="text-center text-white/90">Partidos</TableHead>
                      <TableHead className="text-center text-white/90">Goles</TableHead>
                      <TableHead className="text-center text-white/90">Asistencias</TableHead>
                      <TableHead className="text-center text-white/90">Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((scorer, index) => (
                      <TableRow key={scorer.player_id} className={`border-white/20 ${index < 3 ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}>
                        <TableCell>
                          <PositionBadge position={index + 1} />
                        </TableCell>
                        <TableCell className="font-semibold text-white drop-shadow">{scorer.player_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="font-bold backdrop-blur-md bg-white/10 text-white border-white/30">#{scorer.jersey_number}</Badge>
                        </TableCell>
                        <TableCell className="text-white/80 drop-shadow">{scorer.team_name}</TableCell>
                        <TableCell className="text-center text-white/70">{scorer.matches_played}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0">⚽ {scorer.goals}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">{scorer.assists}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-white/70">
                          {scorer.matches_played > 0 ? (scorer.goals / scorer.matches_played).toFixed(2) : '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {rows.length >= 3 && <ScorersPodium scorers={rows} />}
        </>
      )}

      {viewMode === 'scorers' && selectedTournament && (manual.data?.data.length ?? 0) > 0 && (
        <ManualStatsList tournamentId={selectedTournament} entries={manual.data?.data ?? []} onEdit={(entry) => setDialog({ editing: entry })} />
      )}
      {dialog && selectedTournament && (
        <ManualStatsDialog
          leagueId={leagueId}
          tournamentId={selectedTournament}
          entries={manual.data?.data ?? []}
          editing={dialog.editing}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}
