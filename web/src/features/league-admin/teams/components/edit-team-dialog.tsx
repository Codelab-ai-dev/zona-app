import { useState } from 'react'
import { Edit } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useUpdateTeam } from '../api'
import type { Team, UpdateTeamRequest } from '../types'
import { withoutError } from './create-team-form'
import { FormField } from './form-field'

interface EditTeamDialogProps {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Mount it with `key={team.id}` so the form starts from the team's values. */
export function EditTeamDialog({ team, open, onOpenChange }: EditTeamDialogProps) {
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description ?? '',
    group_name: team.group_name ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateMutation = useUpdateTeam()

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => withoutError(prev, field))
  }

  const handleSubmit = async () => {
    const found: Record<string, string> = {}
    if (!formData.name.trim()) found.name = 'El nombre es requerido'
    if (formData.group_name && !/^[A-Z]$/.test(formData.group_name)) found.group_name = 'Debe ser una sola letra mayúscula'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const body: UpdateTeamRequest = {
      name: formData.name.trim(),
      description: formData.description || undefined,
      group_name: formData.group_name || undefined,
    }
    try {
      await updateMutation.mutateAsync({ teamId: team.id, team: body })
      toast.success('Equipo actualizado exitosamente')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar equipo')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto border-white/10 bg-slate-900 md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-sm text-white md:text-base">
            <Edit className="mr-2 h-4 w-4 text-blue-400" aria-hidden="true" />
            Editar Equipo
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 md:text-sm">Modifica la información del equipo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <FormField id="name" label="Nombre del equipo" value={formData.name} error={errors.name} onChange={(e) => handleChange('name', e.target.value)} />
          <div>
            <Label htmlFor="description" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Descripción</Label>
            <Textarea className="min-h-[60px] border-white/10 bg-slate-800/50 text-sm text-white placeholder:text-gray-500" id="description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} />
          </div>
          <FormField id="group_name" label="Grupo (letra única)" maxLength={1} placeholder="A" value={formData.group_name} error={errors.group_name} onChange={(e) => handleChange('group_name', e.target.value.toUpperCase())} />
          <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="h-9 w-full bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
            {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
