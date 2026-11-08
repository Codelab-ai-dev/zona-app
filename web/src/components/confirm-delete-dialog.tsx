import { Loader2, Trash2 } from 'lucide-react'

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

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Name of what is being deleted, shown in quotes. */
  name: string
  /** What else is lost, one line each. */
  consequences: string[]
  /** Softer alternative, e.g. "Si solo quieres ocultarlo, usa Desactivar." */
  hint: string
  pending: boolean
  onConfirm: () => void
}

/** Permanent-delete confirmation with the original app's look. */
export function ConfirmDeleteDialog({ open, onOpenChange, name, consequences, hint, pending, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-red-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-sm md:text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" aria-hidden="true" />
            Confirmar Eliminación
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-gray-400 space-y-3">
              <p className="font-medium text-sm md:text-base text-white">¿Eliminar "{name}"?</p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-red-400 text-xs md:text-sm">Esta acción es IRREVERSIBLE</p>
                <ul className="text-[10px] md:text-xs list-disc list-inside space-y-0.5 text-gray-400">
                  {consequences.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <p className="text-[10px] md:text-xs text-gray-500">{hint}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel
            disabled={pending}
            className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
          >
            Cancelar
          </AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog stays open while deleting and on error. */}
          <Button onClick={onConfirm} disabled={pending} className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm">
            {pending ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5" aria-hidden="true" />
            )}
            {pending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
