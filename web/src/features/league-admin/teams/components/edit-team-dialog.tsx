import { useState } from 'react'
import { Edit } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLeagueTournaments } from '@/features/leagues/api'
import { ApiError } from '@/lib/api/client'

import { useOwnerUser, useUpdateOwner, useUpdateTeam } from '../api'
import type { Team, UpdateTeamRequest } from '../types'
import { NO_TOURNAMENT, withoutError } from './create-team-form'
import { FormField } from './form-field'
import { OwnerFields, type OwnerEdit } from './owner-fields'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

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
    tournament: team.tournament_id ?? NO_TOURNAMENT,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ownerEdits, setOwnerEdits] = useState<Partial<OwnerEdit>>({})
  const ownerQuery = useOwnerUser(team.owner_id)
  const tournaments = useLeagueTournaments(team.league_id).data?.data ?? []
  const loaded: OwnerEdit = {
    name: ownerQuery.data?.name ?? '',
    phone: ownerQuery.data?.phone ?? '',
    email: ownerQuery.data?.email ?? '',
  }
  const owner: OwnerEdit = { ...loaded, ...ownerEdits }
  const updateMutation = useUpdateTeam()
  const ownerMutation = useUpdateOwner()

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => withoutError(prev, field))
  }

  const handleOwnerChange = (field: keyof OwnerEdit, value: string) => {
    setOwnerEdits((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => withoutError(prev, `owner_${field}`))
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
    if (formData.tournament !== (team.tournament_id ?? NO_TOURNAMENT)) {
      body.tournament_id = formData.tournament === NO_TOURNAMENT ? NIL_UUID : formData.tournament
    }
    const changed = (field: keyof OwnerEdit) => {
      const value = owner[field].trim()
      return value !== loaded[field] && value !== '' ? value : undefined
    }
    const ownerBody = { name: changed('name'), phone: changed('phone'), email: changed('email') }
    const ownerChanged = Object.values(ownerBody).some(Boolean)
    try {
      await updateMutation.mutateAsync({ teamId: team.id, team: body })
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar equipo')
      return
    }
    if (ownerChanged) {
      try {
        await ownerMutation.mutateAsync({ userId: team.owner_id, user: ownerBody })
      } catch (error) {
        if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          setErrors(Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [`owner_${k}`, v])))
        }
        toast.error(`El equipo se guardó, pero falló el propietario: ${error instanceof Error ? error.message : 'error desconocido'}`)
        return
      }
    }
    toast.success('Equipo actualizado exitosamente')
    onOpenChange(false)
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
          <div>
            <Label htmlFor="edit-team-tournament" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Torneo</Label>
            <Select value={formData.tournament} onValueChange={(v) => handleChange('tournament', v)}>
              <SelectTrigger id="edit-team-tournament" className="h-9 border-white/10 bg-slate-800/50 text-sm text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TOURNAMENT}>Sin torneo</SelectItem>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tournament_id && <p className="mt-1 text-xs text-red-400">{errors.tournament_id}</p>}
          </div>
          <OwnerFields loadError={ownerQuery.isError ? 'No se pudieron cargar los datos actuales del propietario; los campos en blanco no se modifican.' : undefined} value={owner} errors={errors} onChange={handleOwnerChange} />
          <Button onClick={handleSubmit} disabled={updateMutation.isPending || ownerMutation.isPending} className="h-9 w-full bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
            {updateMutation.isPending || ownerMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
