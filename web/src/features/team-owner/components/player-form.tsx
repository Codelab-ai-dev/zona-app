import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import type { CreatePlayerRequest } from '../types'

// Local type only used in this component
type FormDataLocal = {
  name: string
  position: string
  jersey_number: string
  photo: string
  birth_date: string
}

interface PlayerFormProps {
  positions: string[]
  onSubmit: (data: CreatePlayerRequest) => Promise<void>
  isLoading?: boolean
  initialData?: Partial<FormDataLocal>
}

export function PlayerForm({ positions, onSubmit, isLoading, initialData }: PlayerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    jersey_number: '',
    photo: '',
    birth_date: '',
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await onSubmit({
        name: formData.name,
        position: formData.position,
        jersey_number: parseInt(formData.jersey_number, 10),
        photo: formData.photo || undefined,
        birth_date: formData.birth_date || undefined,
      })
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
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
          placeholder="Ej: Juan Pérez"
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
        <Label htmlFor="position">Posición</Label>
        <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
          <SelectTrigger id="position" disabled={isLoading}>
            <SelectValue placeholder="Seleccionar posición" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.position && (
          <p id="position-error" className="mt-1 text-sm text-destructive">
            {errors.position}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="jersey-number">Número de Jersey</Label>
        <Input
          id="jersey-number"
          type="number"
          min="1"
          max="99"
          value={formData.jersey_number}
          onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
          placeholder="Ej: 10"
          disabled={isLoading}
          aria-invalid={Boolean(errors.jersey_number)}
          aria-describedby={errors.jersey_number ? 'jersey_number-error' : undefined}
        />
        {errors.jersey_number && (
          <p id="jersey_number-error" className="mt-1 text-sm text-destructive">
            {errors.jersey_number}
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
        />
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
