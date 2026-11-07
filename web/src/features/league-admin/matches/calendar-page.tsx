import { useEffect, useMemo, useRef, useState } from 'react'

import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { QueryState, LoadingState } from '@/components/states'
import { toast } from 'sonner'

import { useLeagueTournaments } from '@/features/leagues/api'

import { useTournamentMatches, useDeleteMatch, usePublishRound, usePostMatchFinalizedNotification } from './api'
import { MatchCard } from './components/match-card'
import { MatchScheduleDialog } from './components/match-schedule-dialog'
import { MatchResultDialog } from './components/match-result-dialog'
import type { MatchWithRelations } from './types'

interface CalendarPageProps {
  leagueId: string
}

/** Calendar view for match scheduling, results entry, and publishing. */
export function CalendarPage({ leagueId }: CalendarPageProps) {
  const tournaments = useLeagueTournaments(leagueId)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const hasAutoSelected = useRef(false)

  const matches = useTournamentMatches(selectedTournamentId || undefined)
  const deleteMatch = useDeleteMatch()
  const publishRound = usePublishRound()
  const postNotification = usePostMatchFinalizedNotification()

  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all')
  const [editingMatch, setEditingMatch] = useState<MatchWithRelations | null>(null)
  const [resultMatch, setResultMatch] = useState<MatchWithRelations | null>(null)
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)

  // Auto-select first active tournament on initial load
  useEffect(() => {
    if (!hasAutoSelected.current && tournaments.data?.data && tournaments.data.data.length > 0) {
      hasAutoSelected.current = true
      const active = tournaments.data.data.find((t) => t.is_active) || tournaments.data.data[0]
      if (active) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTournamentId(active.id)
      }
    }
  }, [tournaments.data?.data])

  // Filter rounds and teams
  const availableRounds = useMemo(() => {
    const data = matches.data?.data
    if (!data) return []
    return Array.from(new Set(data.map((m) => m.round).filter((r): r is number => r !== null)))
      .sort((a, b) => a - b)
  }, [matches.data])

  const availableTeams = useMemo(() => {
    const data = matches.data?.data
    if (!data) return []
    const map = new Map<string, { id: string; name: string }>()
    data.forEach((m) => {
      if (m.home_team) {
        map.set(m.home_team.id, m.home_team)
      }
      if (m.away_team) {
        map.set(m.away_team.id, m.away_team)
      }
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
    return filtered.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
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

  const handlePublishRound = async (round: number) => {
    if (!selectedTournamentId) return
    try {
      await publishRound.mutateAsync({ tournamentId: selectedTournamentId, round })
      toast.success(`Jornada ${round} publicada exitosamente`)
      void matches.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al publicar la jornada')
    }
  }

  const handleDeleteMatch = async () => {
    if (!deletingMatchId) return
    try {
      await deleteMatch.mutateAsync(deletingMatchId)
      toast.success('Partido eliminado exitosamente')
      void matches.refetch()
      setDeletingMatchId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el partido')
    }
  }

  const handleMatchSaved = () => {
    void matches.refetch()
    setEditingMatch(null)
  }

  const handleResultSaved = async (matchId: string) => {
    void matches.refetch()
    setResultMatch(null)
    // Fire-and-forget notifications
    postNotification.mutate(matchId)
  }

  if (!selectedTournamentId && tournaments.isPending) {
    return <LoadingState label="Cargando torneos…" />
  }

  return (
    <section aria-labelledby="calendar-title" className="space-y-6 pb-8">
      <header>
        <h1 id="calendar-title" className="text-2xl font-bold tracking-tight">
          Calendario y Resultados
        </h1>
        <p className="mt-1 text-muted-foreground">Gestiona la programación, resultados y publicación de jornadas.</p>
      </header>

      {/* Tournament selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Selecciona un torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            query={tournaments}
            isEmpty={(res) => res.data.length === 0}
            empty={<p className="text-sm text-muted-foreground">No hay torneos disponibles</p>}
          >
            {(res) => (
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {res.data.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {/* Filters */}
      {selectedTournamentId && (
        <div className="flex flex-wrap gap-3">
          <Select value={String(selectedRound)} onValueChange={(v) => setSelectedRound(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las jornadas</SelectItem>
              {availableRounds.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  Jornada {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Matches by round */}
      <QueryState
        query={matches}
        isEmpty={(res) => res.data.length === 0}
        empty={<p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No hay partidos para este torneo.</p>}
      >
        {() => (
          <div className="space-y-6">
            {matchesByRound.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No hay partidos que coincidan con los filtros.</p>
            ) : (
              matchesByRound.map(([round, roundMatches]) => {
                const isRoundPublished = roundMatches.every((m) => m.is_published)
                const roundNum = round as number
                return (
                  <div key={round ?? 'bye'} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">
                        {roundNum === -1 ? 'Partidos sin jornada' : `Jornada ${roundNum}`}
                      </h2>
                      {roundNum !== -1 && (
                        <Button
                          size="sm"
                          variant={isRoundPublished ? 'outline' : 'default'}
                          onClick={() => void handlePublishRound(roundNum)}
                          disabled={publishRound.isPending || roundMatches.length === 0}
                        >
                          {isRoundPublished ? 'Publicada' : 'Publicar jornada'}
                        </Button>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {roundMatches.map((match) => (
                        <li key={match.id}>
                          <MatchCard
                            match={match}
                            onEdit={() => setEditingMatch(match)}
                            onResult={() => setResultMatch(match)}
                            onDelete={() => setDeletingMatchId(match.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            )}
          </div>
        )}
      </QueryState>

      {/* Dialogs */}
      {editingMatch && <MatchScheduleDialog match={editingMatch} open onOpenChange={() => setEditingMatch(null)} onSaved={handleMatchSaved} />}
      {resultMatch && <MatchResultDialog match={resultMatch} open onOpenChange={() => setResultMatch(null)} onSaved={handleResultSaved} />}

      {/* Delete confirmation */}
      <AlertDialog open={deletingMatchId !== null} onOpenChange={(open) => !open && setDeletingMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar partido</AlertDialogTitle>
          <AlertDialogDescription className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p>Esto elimina el partido de forma permanente. Esta acción no se puede deshacer.</p>
              <p className="mt-2 text-sm font-semibold">¿Continuar?</p>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatch}
              disabled={deleteMatch.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMatch.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
