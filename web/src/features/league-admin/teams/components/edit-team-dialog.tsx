import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useUpdateTeam } from '../api'
import type { Team, UpdateTeamRequest } from '../types'

interface EditTeamDialogProps {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdate?: () => void
}

export function EditTeamDialog({ team, open, onOpenChange, onTeamUpdate }: EditTeamDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_name: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateMutation = useUpdateTeam()

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        group_name: team.group_name || '',
      })
      setErrors({})
    }
    onOpenChange(isOpen)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (formData.group_name && formData.group_name.length !== 1) {
      newErrors.group_name = 'Debe ser una sola letra mayúscula'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const updateReq: UpdateTeamRequest = {
      name: formData.name,
      description: formData.description || undefined,
      group_name: formData.group_name || undefined,
    }

    try {
      await updateMutation.mutateAsync({ teamId: team.id, team: updateReq })
      onOpenChange(false)
      onTeamUpdate?.()
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar equipo</DialogTitle>
          <DialogDescription>Actualiza la información del equipo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del equipo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_name">Grupo (letra única)</Label>
            <Input
              id="group_name"
              maxLength={1}
              placeholder="A"
              value={formData.group_name}
              onChange={(e) => handleChange('group_name', e.target.value.toUpperCase())}
              aria-invalid={!!errors.group_name}
            />
            {errors.group_name && <p className="text-sm text-destructive">{errors.group_name}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
