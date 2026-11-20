import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSetUserActive } from '../api'
import type { User } from '../types'

interface UserStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

/** Confirms deactivating an active user, or reactivating an inactive one. */
export function UserStatusDialog({ open, onOpenChange, user }: UserStatusDialogProps) {
  const setActive = useSetUserActive()
  const reactivate = user ? !user.is_active : false

  const handleConfirm = async () => {
    if (!user) return
    try {
      await setActive.mutateAsync({ id: user.id, isActive: reactivate })
      toast.success(reactivate ? 'Usuario reactivado: ya puede iniciar sesión' : 'Usuario desactivado exitosamente')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : reactivate ? 'Error al reactivar el usuario' : 'Error al desactivar el usuario')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>{reactivate ? 'Reactivar usuario' : 'Desactivar usuario'}</AlertDialogTitle>
          <AlertDialogDescription>
            {reactivate
              ? `"${user?.name}" podrá volver a iniciar sesión con su contraseña actual.`
              : `¿Estás seguro de que quieres desactivar a "${user?.name}"? No podrá acceder al sistema.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={setActive.isPending}
            className={reactivate ? 'bg-gol-400 text-slate-950 hover:bg-gol-500' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
          >
            {setActive.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {reactivate ? 'Reactivar' : 'Desactivar'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
