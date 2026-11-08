import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Settings, Users } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api/client'

import { useBulkCreateMatches } from '../api'
import { analyzeCalendar, buildMissingMatches } from '../calendar-analysis'
import type { MatchWithRelations, TeamSummary } from '../types'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface AdjustCalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  /** Teams of the tournament (active or not). */
  teams: TeamSummary[]
  matches: MatchWithRelations[]
}

/**
 * "Ajustar Calendario": compares the active teams with the round-robin
 * already scheduled and creates the missing matches in new rounds.
 */
export function AdjustCalendarDialog({ open, onOpenChange, tournamentId, teams, matches }: AdjustCalendarDialogProps) {
  const bulkCreate = useBulkCreateMatches()
  const analysis = useMemo(() => analyzeCalendar(teams, matches), [teams, matches])
  const missing = analysis.missingPairs.length
  const rounds = missing > 0 ? new Set(buildMissingMatches(analysis, matches).map((m) => m.round)).size : 0

  const handleCreate = async () => {
    try {
      const created = await bulkCreate.mutateAsync({ tournamentId, matches: buildMissingMatches(analysis, matches) })
      toast.success(`Se crearon ${created.length} partidos faltantes`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear los partidos faltantes')
    }
  }

  const tone = !analysis.hasCalendar ? 'orange' : missing > 0 ? 'yellow' : 'green'
  const message = !analysis.hasCalendar
    ? 'Este torneo aún no tiene calendario de fase regular. Genéralo desde la sección Jornadas.'
    : missing > 0
      ? `Faltan ${missing} ${missing === 1 ? 'partido' : 'partidos'} para completar ${analysis.doubleRound ? 'la ida y vuelta' : 'el todos contra todos'} entre los equipos activos.`
      : 'El calendario ya incluye todos los enfrentamientos de los equipos activos. No hay nada que ajustar.'
  const toneClass = {
    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
    yellow: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    green: 'border-green-500/20 bg-green-500/10 text-green-400',
  }[tone]

  return (
    <Dialog open={open} onOpenChange={(next) => !bulkCreate.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto border-white/10 bg-slate-900 md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm text-white md:text-base">
            <Settings className="h-4 w-4 text-yellow-400 md:h-5 md:w-5" aria-hidden="true" />
            Ajustar Calendario
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 md:text-sm">
            Analiza los equipos activos y crea los partidos que faltan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div role="status" className={`flex items-start gap-2 rounded-lg border p-3 ${toneClass}`}>
            {tone === 'green' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            )}
            <p className="text-xs text-gray-300 md:text-sm">{message}</p>
          </div>

          {analysis.finishedRounds > 0 && (
            <div className="rounded-lg border border-blue-500/20 bg-slate-800/50 p-3 text-xs md:text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Jornadas finalizadas:</span><span className="font-medium text-blue-400">{analysis.finishedRounds}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Última jornada finalizada:</span><span className="font-medium text-blue-400">Jornada {analysis.lastFinishedRound}</span></div>
              <p className="mt-2 rounded bg-slate-700/30 p-2 text-[10px] text-gray-500 md:text-xs">
                Los partidos existentes no se modifican: los faltantes se agregan en jornadas nuevas al final del calendario.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-green-500/20 bg-slate-800/50 p-3">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-white md:text-sm">
                <Users className="h-4 w-4 text-green-400" aria-hidden="true" />
                Activos ({analysis.activeTeams.length})
              </h4>
              <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                {analysis.teamStats.map((s) => (
                  <li key={s.teamId} className={`flex items-center justify-between rounded border p-2 ${s.total === 0 ? 'border-red-500/20 bg-red-500/10' : 'border-green-500/10 bg-green-500/10'}`}>
                    <span className="max-w-[150px] truncate text-[10px] text-white md:text-xs">{s.teamName}</span>
                    <span className="text-[10px] text-gray-400">
                      {s.total === 0 ? 'Sin partidos' : `${s.finished}/${s.total}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {analysis.inactiveWithMatches.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-slate-800/50 p-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-white md:text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                  Inactivos con partidos ({analysis.inactiveWithMatches.length})
                </h4>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                  {analysis.inactiveWithMatches.map((s) => (
                    <li key={s.teamId} className="flex items-center justify-between rounded border border-red-500/10 bg-red-500/10 p-2">
                      <span className="max-w-[150px] truncate text-[10px] text-white md:text-xs">{s.teamName}</span>
                      <span className="text-[10px] text-gray-400">{s.finished}/{s.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {missing > 0 && (
            <div className="rounded-lg border border-purple-500/20 bg-slate-800/50 p-3">
              <h4 className="mb-2 text-xs font-medium text-white md:text-sm">Partidos que se crearán ({missing})</h4>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-[10px] text-gray-300 md:text-xs">
                {analysis.missingPairs.map((p) => (
                  <li key={`${p.homeId}-${p.awayId}`}>{p.homeName} vs {p.awayName}</li>
                ))}
              </ul>
              <p className="mt-2 rounded bg-purple-500/10 p-2 text-[10px] text-gray-400">
                {rounds} {rounds === 1 ? 'jornada nueva' : 'jornadas nuevas'} desde la jornada {analysis.lastRound + 1}, en{' '}
                {analysis.config.weekdays.map((d) => DAY_NAMES[d]).join(', ')} desde las {analysis.config.startTime} (configuración
                detectada de los partidos existentes). Después puedes ajustar fechas y campos en cada partido.
              </p>
            </div>
          )}

          {analysis.hasOddTeams && (
            <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-[10px] text-blue-300 md:text-xs">
              <strong>Número impar:</strong> {analysis.activeTeams.length} equipos activos, un equipo descansa cada jornada.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={bulkCreate.isPending}
              className="h-9 flex-1 border-white/10 bg-slate-800/50 text-xs text-gray-400 hover:bg-slate-700/50 hover:text-white md:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={bulkCreate.isPending || missing === 0}
              className="h-9 flex-1 bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm"
            >
              {bulkCreate.isPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin md:h-4 md:w-4" aria-hidden="true" />
              ) : (
                <RefreshCw className="mr-1.5 h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              )}
              {bulkCreate.isPending ? 'Creando…' : 'Crear partidos faltantes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
