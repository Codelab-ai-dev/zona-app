import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type { PostRefereeReportRequest } from '../types'

type FieldKey = keyof PostRefereeReportRequest

interface FieldDef {
  key: FieldKey
  label: string
  placeholder: string
  multiline?: boolean
}

export const REPORT_FIELDS: FieldDef[] = [
  { key: 'referee_name', label: 'Árbitro Principal', placeholder: 'Nombre del árbitro' },
  { key: 'assistant_referee_1', label: 'Árbitro Asistente 1', placeholder: 'Nombre del asistente 1' },
  { key: 'assistant_referee_2', label: 'Árbitro Asistente 2', placeholder: 'Nombre del asistente 2' },
  { key: 'fourth_official', label: 'Cuarto Árbitro', placeholder: 'Nombre del cuarto árbitro' },
  { key: 'weather_conditions', label: 'Condiciones Climáticas', placeholder: 'Ej. Lluvia ligera, viento fuerte, etc.', multiline: true },
  { key: 'field_conditions', label: 'Condiciones del Campo', placeholder: 'Ej. Mojado, césped en buen estado, etc.', multiline: true },
  { key: 'general_observations', label: 'Observaciones Generales', placeholder: 'Comportamiento de afición, incidentes, etc.', multiline: true },
]

interface RefereeReportFormProps {
  values: PostRefereeReportRequest
  errors: Record<string, string>
  pending: boolean
  onChange: (key: FieldKey, value: string) => void
  onSave: () => void
  onCancel?: () => void
}

/** Editable referee report form; every field has a label and an inline error. */
export function RefereeReportForm({ values, errors, pending, onChange, onSave, onCancel }: RefereeReportFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORT_FIELDS.map((f) => {
          const id = `report-${f.key}`
          const error = errors[f.key]
          const shared = {
            id,
            value: values[f.key] ?? '',
            onChange: (e: { target: { value: string } }) => onChange(f.key, e.target.value),
            disabled: pending,
            placeholder: f.placeholder,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${id}-error` : undefined,
          }
          return (
            <div key={f.key} className={f.multiline ? 'md:col-span-2' : undefined}>
              <Label htmlFor={id}>{f.label}</Label>
              {f.multiline ? <Textarea {...shared} className="min-h-20" /> : <Input {...shared} />}
              {error && (
                <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button onClick={onSave} disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar Informe'}
        </Button>
      </div>
    </div>
  )
}
