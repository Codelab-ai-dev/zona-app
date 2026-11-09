import { useQueryClient } from '@tanstack/react-query'
import { ImageDown, RefreshCw, Settings, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'

import { matchKeys, useDeleteTournamentMatches, useLeagueTeams } from '../api'
import type { MatchWithRelations } from '../types'
import { AdjustCalendarDialog } from './adjust-calendar-dialog'
import { MatchPosterGenerator } from './match-poster-generator'

interface CalendarActionsProps {
  leagueId: string
  tournamentId: string
  tournamentName: string
  matches: MatchWithRelations[]
}

type Scope = 'regular' | 'playoffs'

const COPY: Record<Scope, { label: string; name: string; consequences: string[] }> = {
  regular: {
    label: 'Eliminar Calendario',
    name: 'el calendario de fase regular',
    consequences: [
      'Todos los partidos de la fase regular, programados y finalizados',
      'Sus resultados, goles y tarjetas',
      'La tabla de posiciones se recalcula sin esos partidos',
    ],
  },
  playoffs: {
    label: 'Eliminar Liguilla',
    name: 'la llave de liguilla',
    consequences: ['Todos los partidos de liguilla, programados y finalizados', 'Sus resultados, goles y tarjetas'],
  },
}

/** Calendar-wide actions: adjust (add missing pairings) and delete the calendar or the playoffs. */
export function CalendarActions({ leagueId, tournamentId, tournamentName, matches }: CalendarActionsProps) {
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [deleting, setDeleting] = useState<Scope | null>(null)
  const [posterOpen, setPosterOpen] = useState(false)
  const queryClient = useQueryClient()
  const teams = useLeagueTeams(adjustOpen ? leagueId : undefined)
  const deleteMatches = useDeleteTournamentMatches()

  const count = (scope: Scope) => matches.filter((m) => m.phase === scope).length
  const tournamentTeams = (teams.data?.data ?? []).filter((t) => t.tournament_id === tournamentId)

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      const res = await deleteMatches.mutateAsync({ tournamentId, phase: deleting })
      toast.success(`Se eliminaron ${res.deleted} ${res.deleted === 1 ? 'partido' : 'partidos'} del torneo "${tournamentName}"`)
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar el calendario')
    }
  }

  const outline = 'h-8 border-white/10 bg-slate-700/50 text-xs text-gray-300 hover:bg-slate-700 hover:text-white'
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setAdjustOpen(true)} className={outline}>
        <Settings className="mr-1.5 h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
        {adjustOpen && teams.isPending ? 'Cargando equipos…' : 'Ajustar Calendario'}
      </Button>
      <Button
        size="sm"
        onClick={() => setPosterOpen(true)}
        disabled={!matches.some((m) => m.status === 'scheduled')}
        className={outline}
      >
        <ImageDown className="mr-1.5 h-3.5 w-3.5 text-green-400" aria-hidden="true" />
        Generar Imagen
      </Button>
      {(['regular', 'playoffs'] as const).map(
        (scope) =>
          count(scope) > 0 && (
            <Button
              key={scope}
              size="sm"
              onClick={() => setDeleting(scope)}
              className="h-8 border border-red-500/40 bg-transparent text-xs text-red-400 hover:bg-red-500/20"
            >
              <Trash className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {COPY[scope].label}
            </Button>
          ),
      )}

      <Button
        size="sm"
        onClick={() => void queryClient.invalidateQueries({ queryKey: matchKeys.byTournament(tournamentId) })}
        className={outline}
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Actualizar
      </Button>
      {posterOpen && (
        <MatchPosterGenerator open onOpenChange={setPosterOpen} matches={matches} tournamentName={tournamentName} />
      )}

      {adjustOpen && teams.isError && (
        <p role="alert" className="w-full text-xs text-red-400">
          No se pudieron cargar los equipos para analizar el calendario.{' '}
          <button type="button" className="underline" onClick={() => setAdjustOpen(false)}>Cerrar</button>
        </p>
      )}
      {adjustOpen && teams.data && (
        <AdjustCalendarDialog
          open
          onOpenChange={setAdjustOpen}
          tournamentId={tournamentId}
          leagueId={leagueId}
          teams={tournamentTeams}
          matches={matches}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          name={`${COPY[deleting].name} de ${tournamentName}`}
          consequences={[`${count(deleting)} partidos`, ...COPY[deleting].consequences]}
          hint="Esta acción no se puede deshacer."
          pending={deleteMatches.isPending}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  )
}
