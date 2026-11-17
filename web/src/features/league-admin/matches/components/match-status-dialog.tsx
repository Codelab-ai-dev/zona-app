import { toast } from 'sonner'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'

import { useUpdateMatchStatus } from '../api'
import type { MatchWithRelations } from '../types'

interface MatchStatusDialogProps {
  match: MatchWithRelations
  onClose: () => void
}

/**
 * Confirms cancelling a match, or reactivating a cancelled one (back to
 * scheduled). Finished matches never get here; if one finished meanwhile, the
 * API's 409 message is shown.
 */
export function MatchStatusDialog({ match, onClose }: MatchStatusDialogProps) {
  const update = useUpdateMatchStatus()
  const reactivate = match.status === 'cancelled'
  const teams = `${match.home_team_name} vs ${match.away_team_name}`

  const confirm = async () => {
    try {
      await update.mutateAsync({ matchId: match.id, status: reactivate ? 'scheduled' : 'cancelled' })
      toast.success(reactivate ? 'Partido reactivado' : 'Partido cancelado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado del partido')
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
        <AlertDialogTitle>{reactivate ? 'Reactivar partido' : 'Cancelar partido'}</AlertDialogTitle>
        <AlertDialogDescription className="text-gray-400">
          {reactivate
            ? `${teams} vuelve a quedar programado con su fecha y hora actuales.`
            : `${teams} queda cancelado. No se borra: puedes reactivarlo después.`}
        </AlertDialogDescription>
        <div className="flex gap-3">
          <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault() // keep the dialog open until the request ends
              void confirm()
            }}
            disabled={update.isPending}
            className={reactivate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'}
          >
            {update.isPending ? 'Guardando…' : reactivate ? 'Reactivar' : 'Cancelar partido'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
