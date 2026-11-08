import { useState } from 'react'
import { QueryState } from '@/components/states'
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
import { Plus, User } from 'lucide-react'

import { useTeamCoachingStaff, useCreateCoachingStaff, useDeactivateCoachingStaff } from '../api'
import type { CreateCoachingStaffRequest } from '../types'
import { CoachingStaffForm } from '../components/coaching-staff-form'
import { CoachingStaffRow } from '../components/coaching-staff-row'
import { pageSubtitle, pageTitle } from '../glass'

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={pageTitle}>Gestión de Cuerpo Técnico</h2>
          <p className={pageSubtitle}>Administra el cuerpo técnico de tu equipo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Nuevo Miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Miembro del Cuerpo Técnico</DialogTitle>
              <DialogDescription className="text-slate-400">Completa la información del miembro</DialogDescription>
            </DialogHeader>
            <CoachingStaffForm roles={roles} onSubmit={handleCreateStaff} isLoading={createStaff.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        query={staff}
        isEmpty={(res) => res.data.length === 0}
        empty={
          <div className="text-center py-12">
            <User className="w-12 h-12 text-white/60 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2 drop-shadow-lg">Sin cuerpo técnico</h3>
            <p className="text-white/80 drop-shadow">Comienza registrando miembros del cuerpo técnico para tu equipo</p>
          </div>
        }
      >
        {(res) => (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((member) => (
              <CoachingStaffRow key={member.id} staff={member} onDeactivate={() => setDeleteStaffId(member.id)} />
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={Boolean(deleteStaffId)} onOpenChange={(open) => !open && setDeleteStaffId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Desactivar Miembro</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">¿Estás seguro de que quieres desactivar este miembro del cuerpo técnico?</AlertDialogDescription>
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
