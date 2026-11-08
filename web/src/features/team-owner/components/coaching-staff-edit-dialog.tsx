import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useUpdateCoachingStaff, useUploadFile } from '../api'
import type { CoachingStaff, CreateCoachingStaffRequest } from '../types'
import { CoachingStaffForm } from './coaching-staff-form'

interface CoachingStaffEditDialogProps {
  staff: CoachingStaff
  roles: string[]
  onClose: () => void
}

/** Edit dialog: PATCH /coaching-staff/{id}; a replaced photo is uploaded first (team scope). */
export function CoachingStaffEditDialog({ staff, roles, onClose }: CoachingStaffEditDialogProps) {
  const updateStaff = useUpdateCoachingStaff()
  const uploadFile = useUploadFile()

  // Errors propagate to the form, which maps 422 fields onto its inputs.
  const handleSubmit = async (data: CreateCoachingStaffRequest, photo?: File) => {
    let photoUrl: string | undefined
    if (photo) {
      photoUrl = (await uploadFile.mutateAsync({ file: photo, scope: 'team', scopeId: staff.team_id })).url
    }
    await updateStaff.mutateAsync({ staffId: staff.id, data: { ...data, ...(photoUrl ? { photo: photoUrl } : {}) } })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Miembro del Cuerpo Técnico</DialogTitle>
          <DialogDescription className="text-slate-400">Actualiza la información de {staff.name}</DialogDescription>
        </DialogHeader>
        <CoachingStaffForm roles={roles} staff={staff} onSubmit={handleSubmit} isLoading={updateStaff.isPending || uploadFile.isPending} />
      </DialogContent>
    </Dialog>
  )
}
