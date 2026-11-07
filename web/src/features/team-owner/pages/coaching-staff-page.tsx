import { useState } from 'react'
import { QueryState, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Trash2 } from 'lucide-react'

import { useTeamCoachingStaff, useCreateCoachingStaff, useDeactivateCoachingStaff } from '../api'
import type { CreateCoachingStaffRequest } from '../types'
import { CoachingStaffForm } from '../components/coaching-staff-form'
import { CoachingStaffRow } from '../components/coaching-staff-row'

const roles = ['Entrenador Principal', 'Asistente Técnico', 'Preparador Físico', 'Médico', 'Kinesiologo', 'Nutricionista']

export function CoachingStaffPage({ teamId }: { teamId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null)

  const staff = useTeamCoachingStaff(teamId)
  const createStaff = useCreateCoachingStaff()
  const deactivateStaff = useDeactivateCoachingStaff()

  const handleCreateStaff = async (data: CreateCoachingStaffRequest) => {
    // Errors propagate to the form, which maps 422 fields onto its inputs.
    await createStaff.mutateAsync({ teamId, data })
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión del Cuerpo Técnico</h2>
          <p className="text-muted-foreground">Administra el cuerpo técnico de tu equipo.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Cuerpo Técnico</DialogTitle>
              <DialogDescription>Ingresa los detalles del miembro del cuerpo técnico.</DialogDescription>
            </DialogHeader>
            <CoachingStaffForm roles={roles} onSubmit={handleCreateStaff} isLoading={createStaff.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        query={staff}
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin cuerpo técnico" description="Agrega miembros del cuerpo técnico a tu equipo." />}
      >
        {(res) => (
          <div className="space-y-4">
            {res.data.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                <CoachingStaffRow staff={member} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteStaffId(member.id)}
                  aria-label={`Desactivar a ${member.name}`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={Boolean(deleteStaffId)} onOpenChange={(open) => !open && setDeleteStaffId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Miembro</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de que quieres desactivar este miembro del cuerpo técnico?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteStaffId && deactivateStaff.mutate(deleteStaffId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
