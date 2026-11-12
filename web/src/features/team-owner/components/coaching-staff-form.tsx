import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'

import type { CoachingStaff, CreateCoachingStaffRequest } from '../types'
import { toApiDate, toDateInput } from '../utils'
import { PhotoPicker } from './photo-picker'

const FORM_FIELDS = ['name', 'role', 'cedula', 'birth_date']

interface CoachingStaffFormProps {
  roles: string[]
  /** `photo` is the optional image the user picked; the caller uploads it. */
  onSubmit: (data: CreateCoachingStaffRequest, photo?: File) => Promise<void>
  isLoading?: boolean
  /** Edit mode: the member to prefill (the photo stays unless a new one is picked). */
  staff?: CoachingStaff
}

export function CoachingStaffForm({ roles, onSubmit, isLoading, staff }: CoachingStaffFormProps) {
  const [formData, setFormData] = useState({
    name: staff?.name ?? '',
    role: staff?.role ?? '',
    birth_date: toDateInput(staff?.birth_date),
    cedula: staff?.cedula ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await onSubmit(
        {
          name: formData.name,
          role: formData.role,
          birth_date: toApiDate(formData.birth_date),
          cedula: formData.cedula || undefined,
        },
        photo ?? undefined,
      )
    } catch (error) {
      if (error instanceof ApiError && error.isValidation && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
      }
    }
  }

  // API errors for fields this form does not have (team_id: staff limit reached).
  const extraErrors = Object.entries(errors).filter(([key]) => !FORM_FIELDS.includes(key))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {extraErrors.length > 0 && (
        <div role="alert" className="flex items-start gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          {extraErrors.map(([, message]) => message).join('. ')}
        </div>
      )}
      <div>
        <Label htmlFor="name" className="text-white">Nombre Completo</Label>
        <Input
          id="name"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Carlos García"
          disabled={isLoading}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="role" className="text-white">Rol / Cargo</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger
            id="role"
            className="bg-slate-800 border-slate-600 text-white"
            disabled={isLoading}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'role-error' : undefined}
          >
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {roles.map((r) => (
              <SelectItem key={r} value={r} className="text-white hover:bg-slate-700">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p id="role-error" className="mt-1 text-sm text-red-400">
            {errors.role}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="cedula" className="text-white">Cédula / DNI (opcional)</Label>
        <Input
          id="cedula"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          value={formData.cedula}
          onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
          placeholder="Ej: 12345678"
          disabled={isLoading}
          aria-invalid={Boolean(errors.cedula)}
          aria-describedby={errors.cedula ? 'cedula-error' : undefined}
        />
        {errors.cedula && (
          <p id="cedula-error" className="mt-1 text-sm text-red-400">
            {errors.cedula}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="birth-date" className="text-white">Fecha de Nacimiento (opcional)</Label>
        <Input
          id="birth-date"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          type="date"
          value={formData.birth_date}
          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
          disabled={isLoading}
          aria-invalid={Boolean(errors.birth_date)}
          aria-describedby={errors.birth_date ? 'birth-date-error' : undefined}
        />
        {errors.birth_date && (
          <p id="birth-date-error" className="mt-1 text-sm text-red-400">
            {errors.birth_date}
          </p>
        )}
      </div>

      <PhotoPicker label="Foto" currentUrl={staff?.photo} disabled={isLoading} onChange={setPhoto} />

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
        {isLoading ? 'Guardando…' : staff ? 'Guardar Cambios' : 'Registrar Miembro'}
      </Button>
    </form>
  )
}
