import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useCancelSuspension, useCompleteSuspension } from '../api'
import type { Suspension } from '../types'

const statusLabels: Record<Suspension['status'], string> = {
  active: 'Activa',
  completed: 'Cumplida',
  cancelled: 'Cancelada',
}

const statusColors: Record<Suspension['status'], string> = {
  active: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

type Confirming = 'cancel' | 'complete' | null

export function SuspensionCard({ suspension, onEdit }: { suspension: Suspension; onEdit: () => void }) {
  const [confirming, setConfirming] = useState<Confirming>(null)
  const cancel = useCancelSuspension(suspension.id)
  const complete = useCompleteSuspension(suspension.id)
  const isActive = suspension.status === 'active'
  const pending = cancel.isPending || complete.isPending

  const run = async (action: 'cancel' | 'complete') => {
    try {
      await (action === 'cancel' ? cancel : complete).mutateAsync()
      setConfirming(null)
    } catch {
      // The mutation already shows the error toast; keep the dialog open.
    }
  }

  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{suspension.reason}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {suspension.suspension_type.replace(/_/g, ' ')}
              </p>
            </div>
            <Badge className={statusColors[suspension.status]}>{statusLabels[suspension.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Jornadas cumplidas: </span>
            <span className="font-medium">
              {suspension.matches_served}/{suspension.matches_to_serve}
            </span>
          </p>

          {suspension.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground">Notas</p>
              <p>{suspension.notes}</p>
            </div>
          )}

          {isActive && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                Editar
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setConfirming('complete')} disabled={pending}>
                <Check className="size-4" aria-hidden="true" />
                Completar
              </Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => setConfirming('cancel')} disabled={pending}>
                <Trash2 className="size-4" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirming === 'cancel'} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Suspensión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar esta suspensión? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void run('cancel')
              }}
              disabled={cancel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancel.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirming === 'complete'} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Completar Suspensión</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará la suspensión como cumplida y el jugador quedará habilitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void run('complete')
              }}
              disabled={complete.isPending}
            >
              {complete.isPending ? 'Completando…' : 'Sí, completar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
