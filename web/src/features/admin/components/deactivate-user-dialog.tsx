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
import { useDeactivateUser } from '../api'
import type { User } from '../types'

interface DeactivateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function DeactivateUserDialog({ open, onOpenChange, user }: DeactivateUserDialogProps) {
  const deactivateUser = useDeactivateUser()

  const handleDeactivate = async () => {
    if (!user) return

    try {
      await deactivateUser.mutateAsync(user.id)
      toast.success('Usuario desactivado exitosamente')
      onOpenChange(false)
    } catch {
      toast.error('Error al desactivar el usuario')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres desactivar a "{user?.name}"? No podrá acceder al sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={deactivateUser.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deactivateUser.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Desactivar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
