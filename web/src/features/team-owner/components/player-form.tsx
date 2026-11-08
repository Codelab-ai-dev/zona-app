import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { AlertCircle, Upload } from 'lucide-react'

import type { CreatePlayerRequest } from '../types'
import { toApiDate } from '../utils'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface PlayerFormProps {
  positions: string[]
  /** `photo` is the optional image the user picked; the caller uploads it once the player exists. */
  onSubmit: (data: CreatePlayerRequest, photo?: File) => Promise<void>
  isLoading?: boolean
}

export function PlayerForm({ positions, onSubmit, isLoading }: PlayerFormProps) {
  const [formData, setFormData] = useState({ name: '', position: '', jersey_number: '', birth_date: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearPhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('El tipo de archivo debe ser JPEG, PNG o WebP')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('El archivo no debe exceder 10 MB')
      return
    }
    setPhotoError(null)
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(typeof ev.target?.result === 'string' ? ev.target.result : null)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await onSubmit(
        {
          name: formData.name,
          position: formData.position,
          jersey_number: parseInt(formData.jersey_number, 10),
          birth_date: toApiDate(formData.birth_date),
        },
        photo ?? undefined,
      )
    } catch (error) {
      if (error instanceof ApiError && error.isValidation && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-white">Nombre Completo</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Carlos Rodríguez"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
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
        <Label htmlFor="position" className="text-white">Posición</Label>
        <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
          <SelectTrigger
            id="position"
            className="bg-slate-800 border-slate-600 text-white"
            disabled={isLoading}
            aria-invalid={Boolean(errors.position)}
            aria-describedby={errors.position ? 'position-error' : undefined}
          >
            <SelectValue placeholder="Seleccionar posición" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {positions.map((pos) => (
              <SelectItem key={pos} value={pos} className="text-white hover:bg-slate-700">
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.position && (
          <p id="position-error" className="mt-1 text-sm text-red-400">
            {errors.position}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="jersey-number" className="text-white">Número de Camiseta</Label>
        <Input
          id="jersey-number"
          type="number"
          min="1"
          max="99"
          value={formData.jersey_number}
          onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
          placeholder="9"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          disabled={isLoading}
          aria-invalid={Boolean(errors.jersey_number)}
          aria-describedby={errors.jersey_number ? 'jersey_number-error' : undefined}
        />
        {errors.jersey_number && (
          <p id="jersey_number-error" className="mt-1 text-sm text-red-400">
            {errors.jersey_number}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="birth-date" className="text-white">Fecha de Nacimiento</Label>
        <Input
          id="birth-date"
          type="date"
          className="bg-slate-800 border-slate-600 text-white"
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

      <div>
        <Label htmlFor="photo" className="text-white">Foto del Jugador</Label>
        <div className="mt-2 space-y-3">
          {photoPreview && (
            <div className="relative w-full max-w-xs">
              <img
                src={photoPreview}
                alt="Vista previa"
                className="w-full h-auto rounded-lg border border-slate-600 max-h-64 object-cover"
              />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Quitar foto"
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            disabled={isLoading}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full px-4 py-2 border-2 border-dashed border-slate-600 text-slate-300 rounded-lg hover:border-slate-400 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Seleccionar imagen (JPEG, PNG, WebP - máx 10MB)
          </button>

          {photoError && (
            <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {photoError}
            </div>
          )}

          {photo && <p className="text-sm text-green-400">✓ Foto seleccionada: {photo.name}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
        {isLoading ? 'Guardando…' : 'Registrar Jugador'}
      </Button>
    </form>
  )
}
