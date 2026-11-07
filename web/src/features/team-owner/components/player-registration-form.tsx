import { useState } from 'react'
import { useForm } from 'react-hook-form'
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

import type { CreatePlayerRegistrationRequestRequest } from '../types'

interface PlayerRegistrationFormProps {
  positions: string[]
  onSubmit: (data: CreatePlayerRegistrationRequestRequest) => Promise<void>
  isLoading: boolean
  error?: Error | null
}

export function PlayerRegistrationForm({
  positions,
  onSubmit,
  isLoading,
  error,
}: PlayerRegistrationFormProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreatePlayerRegistrationRequestRequest>({
    defaultValues: {
      player_name: '',
      player_position: '',
      jersey_number: 1,
      birth_date: undefined,
      reason: '',
    },
  })

  const position = watch('player_position')

  const handleFormSubmit = async (data: CreatePlayerRegistrationRequestRequest) => {
    setFieldErrors({})
    try {
      await onSubmit(data)
    } catch (err) {
      if (err instanceof Error && 'fields' in err) {
        // Handle 422 validation errors
        const apiError = err as unknown as { fields?: Record<string, string> }
        if (apiError.fields) {
          setFieldErrors(apiError.fields)
        }
      } else if (err instanceof Error) {
        console.error(err)
      }
    }
  }

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field] || errors[field as keyof typeof errors]?.message
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && !fieldErrors && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error.message}</div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="player_name">Nombre del Jugador *</Label>
        <Input
          id="player_name"
          placeholder="Juan Pérez"
          {...register('player_name', {
            required: 'El nombre es requerido',
            minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' },
          })}
          aria-invalid={!!getFieldError('player_name')}
          aria-describedby={getFieldError('player_name') ? 'player_name-error' : undefined}
        />
        {getFieldError('player_name') && (
          <p id="player_name-error" className="text-sm text-red-600">
            {getFieldError('player_name')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="player_position">Posición *</Label>
        <Select value={position} onValueChange={(value) => setValue('player_position', value)}>
          <SelectTrigger id="player_position" aria-invalid={!!getFieldError('player_position')}>
            <SelectValue placeholder="Selecciona una posición" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError('player_position') && (
          <p id="player_position-error" className="text-sm text-red-600">
            {getFieldError('player_position')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jersey_number">Número de Camiseta (1-99) *</Label>
        <Input
          id="jersey_number"
          type="number"
          min={1}
          max={99}
          {...register('jersey_number', {
            required: 'El número de camiseta es requerido',
            min: { value: 1, message: 'El número debe estar entre 1 y 99' },
            max: { value: 99, message: 'El número debe estar entre 1 y 99' },
          })}
          aria-invalid={!!getFieldError('jersey_number')}
          aria-describedby={getFieldError('jersey_number') ? 'jersey_number-error' : undefined}
        />
        {getFieldError('jersey_number') && (
          <p id="jersey_number-error" className="text-sm text-red-600">
            {getFieldError('jersey_number')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
        <Input
          id="birth_date"
          type="date"
          {...register('birth_date')}
          aria-invalid={!!getFieldError('birth_date')}
          aria-describedby={getFieldError('birth_date') ? 'birth_date-error' : undefined}
        />
        {getFieldError('birth_date') && (
          <p id="birth_date-error" className="text-sm text-red-600">
            {getFieldError('birth_date')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo de la Solicitud *</Label>
        <Textarea
          id="reason"
          placeholder="Describe el motivo de la solicitud de registro"
          {...register('reason', {
            required: 'El motivo es requerido',
            minLength: { value: 5, message: 'El motivo debe tener al menos 5 caracteres' },
          })}
          aria-invalid={!!getFieldError('reason')}
          aria-describedby={getFieldError('reason') ? 'reason-error' : undefined}
        />
        {getFieldError('reason') && (
          <p id="reason-error" className="text-sm text-red-600">
            {getFieldError('reason')}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
      </Button>
    </form>
  )
}
