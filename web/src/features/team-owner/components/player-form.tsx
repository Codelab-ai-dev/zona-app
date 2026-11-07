import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { AlertCircle, Upload } from 'lucide-react'

import type { CreatePlayerRequest } from '../types'
import { useUploadFile } from '../api'

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
  playerId?: string
}

export function PlayerForm({ positions, onSubmit, isLoading, initialData, playerId }: PlayerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    jersey_number: '',
    photo: '',
    birth_date: '',
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFile = useUploadFile()

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const maxSize = 10 * 1024 * 1024 // 10 MB
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!validTypes.includes(file.type)) {
      setUploadError('El tipo de archivo debe ser JPEG, PNG o WebP')
      return
    }

    if (file.size > maxSize) {
      setUploadError('El archivo no debe exceder 10 MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file if we have a playerId (for updates)
    if (playerId) {
      setIsUploadingPhoto(true)
      setUploadError(null)
      try {
        const result = await uploadFile.mutateAsync({
          file,
          scope: 'player',
          scopeId: playerId,
        })
        setFormData({ ...formData, photo: result.name })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Error al subir la foto')
        setPhotoPreview(null)
      } finally {
        setIsUploadingPhoto(false)
      }
    }
  }

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
        <Label htmlFor="photo">Foto del Jugador</Label>
        <div className="mt-2 space-y-3">
          {photoPreview && (
            <div className="relative w-full max-w-xs">
              <img
                src={photoPreview}
                alt="Vista previa"
                className="w-full h-auto rounded-lg border border-gray-200 max-h-64 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
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
            onChange={handlePhotoUpload}
            disabled={isLoading || isUploadingPhoto}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploadingPhoto}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploadingPhoto ? 'Subiendo...' : 'Seleccionar imagen (JPEG, PNG, WebP - máx 10MB)'}
          </button>

          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {formData.photo && !isUploadingPhoto && (
            <p className="text-sm text-green-600">✓ Foto cargada</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  )
}
