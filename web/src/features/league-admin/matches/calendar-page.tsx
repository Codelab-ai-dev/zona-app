import { useMemo, useState } from 'react'

import { AlertTriangle, Calendar as CalendarIcon, Trophy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { QueryState, LoadingState } from '@/components/states'
import { toast } from 'sonner'

import { useLeagueTournaments } from '@/features/leagues/api'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'

import { useTournamentMatches, useDeleteMatch } from './api'
import { CalendarActions } from './components/calendar-actions'
import { useRoundActions } from './use-round-actions'
import { CalendarFilters } from './components/calendar-filters'
import { RoundSection } from './components/round-section'
import { MatchScheduleDialog } from './components/match-schedule-dialog'
import { MatchResultDialog } from './components/match-result-dialog'
import { MatchQRGenerator } from './components/match-qr-generator'
import { AttendanceDialog } from './components/attendance-dialog'
import { RefereeReportDialog } from './components/referee-report-dialog'
import { MatchPosterGenerator } from './components/match-poster-generator'
import type { MatchWithRelations } from './types'

interface CalendarPageProps {
  leagueId: string
  /** Slug of the league, embedded in the match QR payload. */
  leagueSlug?: string
}

/** Calendar view for match scheduling, results entry, and publishing. */
export function CalendarPage({ leagueId, leagueSlug = '' }: CalendarPageProps) {
  const tournaments = useLeagueTournaments(leagueId)
  const [pickedTournamentId, setPickedTournamentId] = useState<string>('')
  // Until the admin picks one, default to the active tournament (or the first).
  const tournamentList = tournaments.data?.data
  const defaultTournamentId = tournamentList ? (tournamentList.find((t) => t.is_active) ?? tournamentList[0])?.id ?? '' : ''
  const selectedTournamentId = pickedTournamentId || defaultTournamentId

  const tournamentName = tournamentList?.find((t) => t.id === selectedTournamentId)?.name ?? ''

  const matches = useTournamentMatches(selectedTournamentId || undefined)
  const deleteMatch = useDeleteMatch()
  const rounds = useRoundActions(leagueId, selectedTournamentId)

  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all')
  const [editingMatch, setEditingMatch] = useState<MatchWithRelations | null>(null)
  const [resultMatch, setResultMatch] = useState<MatchWithRelations | null>(null)
  const [qrMatch, setQrMatch] = useState<MatchWithRelations | null>(null)
  const [attendanceMatch, setAttendanceMatch] = useState<MatchWithRelations | null>(null)
  const [reportMatch, setReportMatch] = useState<MatchWithRelations | null>(null)
  const [posterRound, setPosterRound] = useState<number | null>(null)
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)

  // Filter rounds and teams
  const availableRounds = useMemo(() => {
    const data = matches.data?.data
    if (!data) return []
    return Array.from(new Set(data.map((m) => m.round).filter((r): r is number => r !== undefined)))
      .sort((a, b) => a - b)
  }, [matches.data])

  const availableTeams = useMemo(() => {
    const data = matches.data?.data
    if (!data) return []
    const map = new Map<string, { id: string; name: string }>()
    data.forEach((m) => {
      map.set(m.home_team_id, { id: m.home_team_id, name: m.home_team_name })
      map.set(m.away_team_id, { id: m.away_team_id, name: m.away_team_name })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [matches.data])

  // Filter matches
  const filteredMatches = useMemo(() => {
    let filtered = matches.data?.data ?? []
    if (selectedRound !== 'all') filtered = filtered.filter((m) => m.round === selectedRound)
    if (selectedTeam !== 'all') {
      filtered = filtered.filter((m) => m.home_team_id === selectedTeam || m.away_team_id === selectedTeam)
    }
    return [...filtered].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  }, [matches.data?.data, selectedRound, selectedTeam])

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, MatchWithRelations[]>()
    filteredMatches.forEach((m) => {
      const round = m.round ?? -1
      if (!grouped.has(round)) grouped.set(round, [])
      grouped.get(round)!.push(m)
    })
    return Array.from(grouped.entries())
      .sort(([a], [b]) => ((a === -1 ? Infinity : a) - (b === -1 ? Infinity : b)))
  }, [filteredMatches])

  const handleDeleteMatch = async () => {
    if (!deletingMatchId) return
    try {
      await deleteMatch.mutateAsync(deletingMatchId)
      toast.success('Partido eliminado exitosamente')
      setDeletingMatchId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el partido')
    }
  }

  // Mutations invalidate the matches queries, so the list refreshes on its own.
  const handleMatchSaved = () => setEditingMatch(null)
  const handleResultSaved = () => setResultMatch(null)

  if (tournaments.isPending) {
    return <LoadingState label="Cargando torneos…" />
  }

  return (
    <section aria-labelledby="calendar-title" className="space-y-6 pb-8">
      <header>
        <h1 id="calendar-title" className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">
          Calendario y Resultados
        </h1>
        <p className="text-white/80 drop-shadow">Gestiona la programación, resultados y publicación de jornadas.</p>
      </header>

      {/* Tournament selector */}
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-lg">Seleccionar Torneo</CardTitle>
          <CardDescription className="text-white/80 drop-shadow">Elige el torneo para ver sus partidos</CardDescription>
        </CardHeader>
        <CardContent>
          <QueryState
            query={tournaments}
            isEmpty={(res) => res.data.length === 0}
            empty={<p className="text-sm text-gray-400">No hay torneos disponibles</p>}
          >
            {(res) => (
              <div className="max-w-md">
                <Select value={selectedTournamentId} onValueChange={(id) => { setPickedTournamentId(id); setSelectedRound('all') }}>
                  <SelectTrigger aria-label="Torneo" className="w-full rounded-lg border-white/30 bg-white/10 text-white backdrop-blur-md">
                    <SelectValue placeholder="Selecciona un torneo" />
                  </SelectTrigger>
                  <SelectContent className="border-white/20 bg-gray-700/95 backdrop-blur-xl">
                    {res.data.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-white">
                        <span className="flex items-center gap-2">
                          <Trophy className={`h-4 w-4 ${t.is_active ? 'text-green-300' : 'text-white/50'}`} aria-hidden="true" />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {selectedTournamentId && (
        <CalendarActions
          leagueId={leagueId}
          tournamentId={selectedTournamentId}
          tournamentName={tournamentName}
          matches={matches.data?.data ?? []}
        />
      )}

      {/* Filters */}
      {selectedTournamentId && (
        <CalendarFilters
          round={selectedRound}
          team={selectedTeam}
          rounds={availableRounds}
          teams={availableTeams}
          onRound={setSelectedRound}
          onTeam={setSelectedTeam}
        />
      )}

      {/* Matches by round */}
      <QueryState
        query={matches}
        isEmpty={(res) => res.data.length === 0}
        empty={
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center">
            <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-gray-500" aria-hidden="true" />
            <h3 className="mb-1 text-sm font-medium text-white">No hay partidos programados</h3>
            <p className="text-xs text-gray-500">No hay partidos para este torneo. Genera las jornadas en la sección Jornadas.</p>
          </div>
        }
      >
        {() => (
          <div className="space-y-4">
            {matchesByRound.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center">
                <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-gray-500" aria-hidden="true" />
                <h3 className="mb-1 text-sm font-medium text-white">No hay partidos con estos filtros</h3>
                <p className="mb-4 text-xs text-gray-500">No hay partidos que coincidan con los filtros.</p>
                <Button
                  size="sm"
                  onClick={() => { setSelectedRound('all'); setSelectedTeam('all') }}
                  className="border-white/10 bg-slate-700/50 text-xs text-gray-400 hover:text-white"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              matchesByRound.map(([round, roundMatches]) => {
                const roundNum = round as number
                return (
                  <RoundSection
                    key={round}
                    round={roundNum}
                    matches={roundMatches}
                    publishing={rounds.publishing}
                    onPoster={() => setPosterRound(roundNum)}
                    onPublish={(publish) => void rounds.togglePublish(roundNum, publish)}
                    onDeleteRound={() => rounds.setDeletingRound(roundNum)}
                    onEdit={setEditingMatch}
                    onResult={setResultMatch}
                    onDelete={(m) => setDeletingMatchId(m.id)}
                    onQr={setQrMatch}
                    onAttendance={setAttendanceMatch}
                    onReport={setReportMatch}
                  />
                )
              })
            )}
          </div>
        )}
      </QueryState>

      {/* Dialogs */}
      {editingMatch && <MatchScheduleDialog match={editingMatch} leagueId={leagueId} open onOpenChange={() => setEditingMatch(null)} onSaved={handleMatchSaved} />}
      {resultMatch && <MatchResultDialog match={resultMatch} leagueId={leagueId} open onOpenChange={() => setResultMatch(null)} onSaved={handleResultSaved} />}

      {qrMatch && (
        <MatchQRGenerator match={qrMatch} tournamentName={tournamentName} leagueSlug={leagueSlug} open onOpenChange={() => setQrMatch(null)} />
      )}
      {reportMatch && <RefereeReportDialog match={reportMatch} open onOpenChange={() => setReportMatch(null)} />}
      {attendanceMatch && <AttendanceDialog match={attendanceMatch} onClose={() => setAttendanceMatch(null)} />}
      {posterRound !== null && (
        <MatchPosterGenerator
          open
          onOpenChange={() => setPosterRound(null)}
          matches={(matches.data?.data ?? []).filter((m) => m.round === posterRound)}
          tournamentName={tournamentName}
          initialRound={posterRound}
        />
      )}

      {rounds.deletingRound !== null && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => !open && rounds.setDeletingRound(null)}
          name={`Jornada ${rounds.deletingRound}`}
          consequences={[
            'Todos los partidos de la jornada, incluidos los ya finalizados',
            'Sus resultados, goles y tarjetas',
            'La tabla de posiciones se recalcula sin esos partidos',
          ]}
          hint="Los demás partidos del torneo no se tocan."
          pending={rounds.deletePending}
          onConfirm={() => void rounds.confirmDeleteRound()}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deletingMatchId !== null} onOpenChange={(open) => !open && setDeletingMatchId(null)}>
        <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
          <AlertDialogTitle>Eliminar partido</AlertDialogTitle>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-red-400" aria-hidden="true" />
            <div className="space-y-2">
              <AlertDialogDescription className="text-gray-400">Esto elimina el partido de forma permanente. Esta acción no se puede deshacer.</AlertDialogDescription>
              <p className="text-sm font-semibold text-white">¿Continuar?</p>
            </div>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatch}
              disabled={deleteMatch.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMatch.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
