import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'

import { ApiError } from '@/lib/api/client'

import type { CreatePlayerRegistrationRequestRequest } from '../types'
import { toApiDate } from '../utils'

interface PlayerRegistrationFormProps {
  positions: string[]
  onSubmit: (data: CreatePlayerRegistrationRequestRequest) => Promise<void>
  isLoading: boolean
  /** Wording of the original "Solicitar Registro Excepcional" dialog (Jugadores tab, registration closed). */
  exceptional?: boolean
}

type FormValues = {
  player_name: string
  player_position: string
  jersey_number: number
  birth_date: string
  reason: string
}

const FORM_FIELDS = ['player_name', 'player_position', 'jersey_number', 'birth_date', 'reason']

export function PlayerRegistrationForm({ positions, onSubmit, isLoading, exceptional }: PlayerRegistrationFormProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<FormValues>({
    defaultValues: { player_name: '', player_position: '', jersey_number: 1, birth_date: '', reason: '' },
  })

  const position = useWatch({ control, name: 'player_position' })

  const handleFormSubmit = async (values: FormValues) => {
    setFieldErrors({})
    setFormError(null)
    try {
      await onSubmit({
        player_name: values.player_name,
        player_position: values.player_position,
        jersey_number: values.jersey_number,
        birth_date: toApiDate(values.birth_date),
        reason: values.reason,
      })
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(err.fields)
        // Errors for fields this form does not have (e.g. tournament_id) go in the banner.
        const extra = Object.entries(err.fields).filter(([key]) => !FORM_FIELDS.includes(key))
        setFormError(extra.length > 0 ? extra.map(([, msg]) => msg).join('. ') : Object.keys(err.fields).length === 0 ? err.message : null)
      }
    }
  }

  const getFieldError = (field: keyof FormValues): string | undefined => fieldErrors[field] || errors[field]?.message

  // Registered manually: the Select is not a native input.
  register('player_position', { required: 'La posición es requerida' })

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {formError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{formError}</div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="player_name" className="text-white">Nombre del Jugador *</Label>
        <Input
          id="player_name"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          placeholder="Juan Pérez"
          {...register('player_name', {
            required: 'El nombre es requerido',
            minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' },
          })}
          aria-invalid={!!getFieldError('player_name')}
          aria-describedby={getFieldError('player_name') ? 'player_name-error' : undefined}
        />
        {getFieldError('player_name') && (
          <p id="player_name-error" className="text-sm text-red-400">
            {getFieldError('player_name')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="player_position" className="text-white">Posición *</Label>
        <Select value={position} onValueChange={(value) => setValue('player_position', value, { shouldValidate: true })}>
          <SelectTrigger
            id="player_position"
            className="bg-slate-800 border-slate-600 text-white"
            aria-invalid={!!getFieldError('player_position')}
            aria-describedby={getFieldError('player_position') ? 'player_position-error' : undefined}
          >
            <SelectValue placeholder="Selecciona una posición" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {positions.map((pos) => (
              <SelectItem key={pos} value={pos} className="text-white hover:bg-slate-700">
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('player_position') && (
          <p id="player_position-error" className="text-sm text-red-400">
            {getFieldError('player_position')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jersey_number" className="text-white">Número de Camiseta (1-99) *</Label>
        <Input
          id="jersey_number"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          type="number"
          min={1}
          max={99}
          {...register('jersey_number', {
            valueAsNumber: true,
            required: 'El número de camiseta es requerido',
            min: { value: 1, message: 'El número debe estar entre 1 y 99' },
            max: { value: 99, message: 'El número debe estar entre 1 y 99' },
          })}
          aria-invalid={!!getFieldError('jersey_number')}
          aria-describedby={getFieldError('jersey_number') ? 'jersey_number-error' : undefined}
        />
        {getFieldError('jersey_number') && (
          <p id="jersey_number-error" className="text-sm text-red-400">
            {getFieldError('jersey_number')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth_date" className="text-white">{exceptional ? 'Fecha de Nacimiento (opcional)' : 'Fecha de Nacimiento'}</Label>
        <Input
          id="birth_date"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          type="date"
          {...register('birth_date')}
          aria-invalid={!!getFieldError('birth_date')}
          aria-describedby={getFieldError('birth_date') ? 'birth_date-error' : undefined}
        />
        {getFieldError('birth_date') && (
          <p id="birth_date-error" className="text-sm text-red-400">
            {getFieldError('birth_date')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason" className="text-white">{exceptional ? 'Justificación de la Solicitud' : 'Motivo de la Solicitud *'}</Label>
        <Textarea
          id="reason"
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          placeholder={exceptional ? 'Ejemplo: El jugador titular sufrió una lesión...' : 'Describe el motivo de la solicitud de registro'}
          {...register('reason', {
            required: 'El motivo es requerido',
            minLength: { value: 5, message: 'El motivo debe tener al menos 5 caracteres' },
          })}
          aria-invalid={!!getFieldError('reason')}
          aria-describedby={getFieldError('reason') ? 'reason-error' : undefined}
        />
        {exceptional && (
          <p className="text-xs text-slate-500">Explica detalladamente la razón por la cual necesitas registrar este jugador</p>
        )}
        {getFieldError('reason') && (
          <p id="reason-error" className="text-sm text-red-400">
            {getFieldError('reason')}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
        {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
      </Button>
    </form>
  )
}
