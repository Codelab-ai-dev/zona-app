import { toast } from 'sonner'

import { useReopenMatch } from '../api'
import type { MatchWithRelations } from '../types'
import { ReasonConfirmDialog } from './reason-confirm-dialog'

interface ReopenMatchDialogProps {
  match: MatchWithRelations
  onClose: () => void
}

/** Takes a finished match back to "Programado" 0-0 (POST /matches/{id}/reopen). */
export function ReopenMatchDialog({ match, onClose }: ReopenMatchDialogProps) {
  const reopen = useReopenMatch()

  const confirm = async (reason: string) => {
    try {
      const res = await reopen.mutateAsync({ matchId: match.id, reason })
      toast.success(
        `Partido reabierto: se quitaron ${res.goals_removed} goles, ${res.cards_removed} tarjetas y ${res.suspensions_removed} suspensiones pendientes.`,
      )
      if (res.suspensions_kept > 0) {
        toast.warning(`${res.suspensions_kept} suspensión(es) ya en cumplimiento se conservaron: revísalas en Suspensiones.`)
      }
      if (res.fines_kept > 0) {
        toast.warning(`${res.fines_kept} multa(s) ya pagada(s) de este partido se conservaron: revísalas en Finanzas.`)
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reabrir el partido')
    }
  }

  return (
    <ReasonConfirmDialog
      title="Reabrir partido"
      acknowledge="Entiendo que se borra el resultado de este partido y se recalculan la tabla y las estadísticas."
      confirmLabel="Reabrir partido"
      pending={reopen.isPending}
      onConfirm={(reason) => void confirm(reason)}
      onClose={onClose}
    >
      <p>
        <strong className="text-white">
          {match.home_team_name} {match.home_score} - {match.away_score} {match.away_team_name}
        </strong>{' '}
        vuelve a <strong className="text-white">Programado 0-0</strong>.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Se borran sus goles, tarjetas e incidentes, y se recalculan la tabla, los goleadores y la disciplina.</li>
        <li>Las suspensiones por roja que aún no empiezan a cumplirse se borran; las ya en cumplimiento se conservan.</li>
        <li>Las multas automáticas sin pagar se cancelan; las pagadas se conservan.</li>
        <li>La asistencia y el acta arbitral se conservan.</li>
      </ul>
    </ReasonConfirmDialog>
  )
}
