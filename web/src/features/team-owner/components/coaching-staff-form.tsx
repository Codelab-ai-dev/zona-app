import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import type { CreateCoachingStaffRequest } from '../types'
import { toApiDate } from '../utils'

type FormDataLocal = {
  name: string
  role: string
  photo: string
  birth_date: string
  cedula: string
}

interface CoachingStaffFormProps {
  roles: string[]
  onSubmit: (data: CreateCoachingStaffRequest) => Promise<void>
  isLoading?: boolean
  initialData?: Partial<FormDataLocal>
}

export function CoachingStaffForm({ roles, onSubmit, isLoading, initialData }: CoachingStaffFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    photo: '',
    birth_date: '',
    cedula: '',
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await onSubmit({
        name: formData.name,
        role: formData.role,
        photo: formData.photo || undefined,
        birth_date: toApiDate(formData.birth_date),
        cedula: formData.cedula || undefined,
      })
    } catch (error) {
      if (error instanceof ApiError && error.isValidation && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Carlos García"
          disabled={isLoading}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="role">Rol</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger
            id="role"
            disabled={isLoading}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'role-error' : undefined}
          >
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p id="role-error" className="mt-1 text-sm text-destructive">
            {errors.role}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="cedula">Cédula</Label>
        <Input
          id="cedula"
          value={formData.cedula}
          onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
          placeholder="Ej: 12345678"
          disabled={isLoading}
          aria-invalid={Boolean(errors.cedula)}
          aria-describedby={errors.cedula ? 'cedula-error' : undefined}
        />
        {errors.cedula && (
          <p id="cedula-error" className="mt-1 text-sm text-destructive">
            {errors.cedula}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="birth-date">Fecha de Nacimiento</Label>
        <Input
          id="birth-date"
          type="date"
          value={formData.birth_date}
          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
          disabled={isLoading}
          aria-invalid={Boolean(errors.birth_date)}
          aria-describedby={errors.birth_date ? 'birth-date-error' : undefined}
        />
        {errors.birth_date && (
          <p id="birth-date-error" className="mt-1 text-sm text-destructive">
            {errors.birth_date}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="photo">Foto URL</Label>
        <Input
          id="photo"
          type="url"
          value={formData.photo}
          onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
          placeholder="https://..."
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  )
}
