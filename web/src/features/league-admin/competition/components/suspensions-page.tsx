import { Plus, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'
import { Badge } from '@/components/ui/badge'

import { useSuspensions, useCancelSuspension } from '../api'
import type { Suspension } from '../types'
import { SuspensionForm } from './suspension-form'

export function SuspensionsPage({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const suspensions = useSuspensions(leagueId)
  const [selectedSuspension, setSelectedSuspension] = useState<Suspension | null>(null)

  return (
    <section aria-labelledby="suspensions-title" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 id="suspensions-title" className="text-2xl font-bold">
            Suspensiones
          </h2>
          <p className="text-sm text-muted-foreground">Gestiona las suspensiones de jugadores</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          Nueva Suspensión
        </Button>
      </header>

      {showForm && <SuspensionForm leagueId={leagueId} onClose={() => setShowForm(false)} />}
      {selectedSuspension && (
        <SuspensionFormEdit
          suspension={selectedSuspension}
          onClose={() => setSelectedSuspension(null)}
        />
      )}

      <QueryState
        query={suspensions}
        loadingLabel="Cargando suspensiones…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin suspensiones" description="No hay suspensiones registradas" />}
      >
        {(res) => (
          <ul className="grid gap-4">
            {res.data.map((suspension) => (
              <li key={suspension.id}>
                <SuspensionCard
                  suspension={suspension}
                  onEdit={() => setSelectedSuspension(suspension)}
                />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}

function SuspensionCard({
  suspension,
  onEdit,
}: {
  suspension: Suspension
  onEdit: () => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const cancel = useCancelSuspension(suspension.id)

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync()
      setShowConfirm(false)
    } catch {
      // Error is already handled by mutation toast
    }
  }

  const statusColors = {
    active: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Suspensión Activa</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{suspension.reason}</p>
            </div>
            <Badge className={statusColors[suspension.status as keyof typeof statusColors]}>
              {suspension.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{suspension.suspension_type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Jornadas</p>
              <p className="font-medium">
                {suspension.matches_served}/{suspension.matches_to_serve}
              </p>
            </div>
          </div>

          {suspension.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground">Notas</p>
              <p>{suspension.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={suspension.status !== 'active'}
            >
              Editar
            </Button>
            {suspension.status === 'active' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="gap-2"
                disabled={cancel.isPending}
              >
                <Trash2 className="size-4" />
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
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
              onClick={handleCancel}
              disabled={cancel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancel.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SuspensionFormEdit({
  suspension,
  onClose,
}: {
  suspension: Suspension
  onClose: () => void
}) {
  return <SuspensionForm leagueId={suspension.league_id} suspension={suspension} onClose={onClose} />
}
