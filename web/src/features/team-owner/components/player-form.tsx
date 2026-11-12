import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'

import { validateAge, type AgeRules } from '../age-rules'
import type { CreatePlayerRequest, Player } from '../types'
import { toApiDate, toDateInput } from '../utils'
import { AgeResultBox, AgeRulesText } from './age-result'
import { PhotoPicker } from './photo-picker'

const FORM_FIELDS = ['name', 'position', 'jersey_number', 'birth_date']

interface PlayerFormProps {
  positions: string[]
  /** `photo` is the optional image the user picked; the caller uploads it. */
  onSubmit: (data: CreatePlayerRequest, photo?: File) => Promise<void>
  isLoading?: boolean
  /** Edit mode: the player to prefill (the photo stays unless a new one is picked). */
  player?: Player
  /** Tournament age rules; shows the rules text and a live result for the birth date. */
  ageRules?: AgeRules | null
  /** Age exceptions already used by the other players of the team. */
  usedExceptions?: number
}

export function PlayerForm({ positions, onSubmit, isLoading, player, ageRules, usedExceptions = 0 }: PlayerFormProps) {
  const [formData, setFormData] = useState({
    name: player?.name ?? '',
    position: player?.position ?? '',
    jersey_number: player ? String(player.jersey_number) : '',
    birth_date: toDateInput(player?.birth_date),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<File | null>(null)

  const ageResult = ageRules && formData.birth_date ? validateAge(formData.birth_date, ageRules, usedExceptions) : null
  const available = ageRules ? Math.max(0, ageRules.exceptionCount - usedExceptions) : 0

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

  // API errors for fields this form does not have (team_id: registration closed / player limit).
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
        {ageRules && <AgeRulesText rules={ageRules} available={available} />}
      </div>

      {ageResult && <AgeResultBox result={ageResult} />}

      <PhotoPicker label="Foto del Jugador" currentUrl={player?.photo} disabled={isLoading} onChange={setPhoto} />

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading || (ageResult !== null && !ageResult.isValid)}>
        {isLoading ? 'Guardando…' : player ? 'Guardar Cambios' : 'Registrar Jugador'}
      </Button>
    </form>
  )
}
