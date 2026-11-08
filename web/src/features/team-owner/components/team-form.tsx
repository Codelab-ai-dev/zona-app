import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import type { UpdateTeamRequest } from '../types'

type FormDataLocal = {
  name: string
  logo: string
  description: string
}

interface TeamFormProps {
  initialData?: Partial<FormDataLocal>
  onSubmit: (data: UpdateTeamRequest) => Promise<void>
  isLoading?: boolean
}

export function TeamForm({ initialData, onSubmit, isLoading }: TeamFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    logo: initialData?.logo || '',
    description: initialData?.description || '',
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await onSubmit({
        name: formData.name || undefined,
        logo: formData.logo || undefined,
        description: formData.description || undefined,
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
        <Label htmlFor="name" className="text-white">Nombre del Equipo</Label>
        <Input
          id="name"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Águilas FC"
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
        <Label htmlFor="description" className="text-white">Descripción</Label>
        <Textarea
          id="description"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe tu equipo..."
          disabled={isLoading}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="logo" className="text-white">Logo URL</Label>
        <Input
          id="logo"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          type="url"
          value={formData.logo}
          onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
          placeholder="https://..."
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
        {isLoading ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  )
}
