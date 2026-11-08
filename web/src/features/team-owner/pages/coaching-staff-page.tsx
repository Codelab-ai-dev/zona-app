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
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'

import { useLeagueQrEnabled, useTeamCoachingStaff, useCreateCoachingStaff, useDeactivateCoachingStaff, useUpdateCoachingStaff, useUploadFile } from '../api'
import { useTeamRules } from '../use-team-rules'
import type { CoachingStaff, CreateCoachingStaffRequest } from '../types'
import { buildStaffQrPayload, staffAsCredentialPerson } from '../components/credential-qr'
import { CoachingStaffEditDialog } from '../components/coaching-staff-edit-dialog'
import { LimitBanner } from '../components/registration-banners'
import { PlayerCredential } from '../components/player-credential'
import { CoachingStaffForm } from '../components/coaching-staff-form'
import { CoachingStaffRow } from '../components/coaching-staff-row'
import { pageSubtitle, pageTitle } from '../glass'

const roles = ['Entrenador Principal', 'Asistente Técnico', 'Preparador Físico', 'Médico', 'Kinesiologo', 'Nutricionista']

export function CoachingStaffPage({ teamId }: { teamId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null)
  const [editStaff, setEditStaff] = useState<CoachingStaff | null>(null)
  const [credentialStaff, setCredentialStaff] = useState<CoachingStaff | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  const staff = useTeamCoachingStaff(teamId)
  const createStaff = useCreateCoachingStaff()
  const deactivateStaff = useDeactivateCoachingStaff()
  const updateStaff = useUpdateCoachingStaff()
  const uploadFile = useUploadFile()
  const rules = useTeamRules(teamId)
  const qrEnabled = useLeagueQrEnabled(rules.team?.league_id).data === true

  const handleCreateStaff = async (data: CreateCoachingStaffRequest, photo?: File) => {
    // Errors propagate to the form, which maps 422 fields onto its inputs.
    // Staff photos live in the team's storage scope, so they can be uploaded before the member exists.
    const uploaded = photo ? await uploadFile.mutateAsync({ file: photo, scope: 'team', scopeId: teamId }) : undefined
    await createStaff.mutateAsync({ teamId, data: { ...data, ...(uploaded?.url ? { photo: uploaded.url } : {}) } })
    setIsDialogOpen(false)
  }

  // PATCH {is_active:true}: the API answers 422 when the staff limit is reached.
  const handleReactivate = async (member: CoachingStaff) => {
    setReactivatingId(member.id)
    try {
      await updateStaff.mutateAsync({ staffId: member.id, data: { is_active: true } })
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) toast.error(Object.values(error.fields).join('. ') || error.message)
    } finally {
      setReactivatingId(null)
    }
  }

  const staffList = staff.data?.data ?? []
  const activeCount = staffList.filter((m) => m.is_active).length
  const atLimit = rules.maxStaff !== null && activeCount >= rules.maxStaff

  return (
    <div className="space-y-6">
      {rules.maxStaff !== null && (
        <LimitBanner
          title="Límite de cuerpo técnico"
          atLimitText={`Has registrado el máximo de ${rules.maxStaff} miembros del cuerpo técnico permitidos.`}
          used={activeCount}
          max={rules.maxStaff}
          noun="miembros"
        />
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={pageTitle}>Gestión de Cuerpo Técnico</h2>
          <p className={pageSubtitle}>Administra el cuerpo técnico de tu equipo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={atLimit} className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              {atLimit ? 'Límite Alcanzado' : 'Nuevo Miembro'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Miembro del Cuerpo Técnico</DialogTitle>
              <DialogDescription className="text-slate-400">Completa la información del miembro</DialogDescription>
            </DialogHeader>
            <CoachingStaffForm roles={roles} onSubmit={handleCreateStaff} isLoading={createStaff.isPending || uploadFile.isPending} />
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
              <CoachingStaffRow
                key={member.id}
                staff={member}
                onEdit={() => setEditStaff(member)}
                onDeactivate={() => setDeleteStaffId(member.id)}
                onReactivate={() => void handleReactivate(member)}
                onCredential={qrEnabled ? () => setCredentialStaff(member) : undefined}
                reactivating={reactivatingId === member.id}
              />
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

      {editStaff && <CoachingStaffEditDialog staff={editStaff} roles={roles} onClose={() => setEditStaff(null)} />}

      {credentialStaff && rules.team && (
        <PlayerCredential
          open
          onOpenChange={(open) => !open && setCredentialStaff(null)}
          player={staffAsCredentialPerson(credentialStaff)}
          teamName={rules.team.name}
          teamLogo={rules.team.logo}
          staff={{ qrValue: buildStaffQrPayload(credentialStaff) }}
        />
      )}
    </div>
  )
}
