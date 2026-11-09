import { CheckCircle, Loader2, XCircle } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { useActivateTeam, useDeactivateTeam } from '../api'
import type { Team } from '../types'

interface Props {
  /** Team being (de)activated; null keeps the dialog closed. */
  team: Team | null
  onClose: () => void
}

/** Activate / deactivate confirmation with the original app's wording and consequences. */
export function ToggleActiveDialog({ team, onClose }: Props) {
  const activate = useActivateTeam()
  const deactivate = useDeactivateTeam()
  const pending = activate.isPending || deactivate.isPending
  const deactivating = team?.is_active ?? false

  const confirm = () => {
    if (!team) return
    const mutation = deactivating ? deactivate : activate
    mutation.mutate(team.id, { onSuccess: onClose })
  }
  const bullets = deactivating
    ? ['No será visible en equipos activos', 'No participará en partidos', 'Datos conservados']
    : ['Visible en equipos activos', 'Podrá participar en partidos', 'Propietario podrá gestionar']

  return (
    <AlertDialog open={team !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent className={`max-w-[95vw] bg-slate-900 md:max-w-md ${deactivating ? 'border-yellow-500/30' : 'border-green-500/30'}`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-sm text-white md:text-base">
            {deactivating ? (
              <XCircle className="h-4 w-4 text-yellow-400" aria-hidden="true" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" aria-hidden="true" />
            )}
            {deactivating ? 'Desactivar Equipo' : 'Activar Equipo'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-gray-400 md:text-sm">
            {deactivating ? 'El equipo será ocultado temporalmente' : 'El equipo será visible nuevamente'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div
          className={`space-y-2 rounded-lg border p-3 ${deactivating ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-green-500/20 bg-green-500/10'}`}
        >
          <p className="text-sm text-white">
            ¿{deactivating ? 'Desactivar' : 'Activar'}{' '}
            <span className={`font-bold ${deactivating ? 'text-yellow-400' : 'text-green-400'}`}>&quot;{team?.name}&quot;</span>?
          </p>
          <ul className="space-y-0.5 text-[10px] text-gray-400 md:text-xs">
            {bullets.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
        </div>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel
            disabled={pending}
            className="h-9 flex-1 border-white/10 bg-slate-800/50 text-xs text-gray-400 hover:bg-slate-700/50 hover:text-white md:text-sm"
          >
            Cancelar
          </AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog stays open while pending and on error. */}
          <Button
            onClick={confirm}
            disabled={pending}
            className={`h-9 flex-1 text-xs text-white md:text-sm ${deactivating ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {pending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin md:h-4 md:w-4" aria-hidden="true" />}
            {pending ? (deactivating ? 'Desactivando...' : 'Activando...') : deactivating ? 'Desactivar' : 'Activar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
