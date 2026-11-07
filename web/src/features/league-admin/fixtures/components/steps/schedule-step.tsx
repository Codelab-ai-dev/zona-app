import { AlertTriangle, Clock } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { FixtureSchedule } from '../../types'
import { WEEKDAYS, WEEKDAY_LABELS } from './constants'

interface ScheduleStepProps {
  schedule: FixtureSchedule
  /** Errors keyed by API field name ("schedule" or "schedule.<field>"). */
  errors: Record<string, string>
  onChange: (field: keyof FixtureSchedule, value: string | number | undefined) => void
  onToggleDay: (day: string) => void
  onBack: () => void
  onNext: () => void
}

interface FieldProps {
  id: string
  label: string
  field: keyof FixtureSchedule
  errors: Record<string, string>
  children: (props: { 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => React.ReactNode
  icon?: boolean
}

function Field({ id, label, field, errors, children, icon }: FieldProps) {
  const error = errors[`schedule.${field}`]
  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="flex items-center gap-1 text-base font-semibold">
        {icon && <Clock className="h-4 w-4" aria-hidden="true" />}
        {label}
      </Label>
      {children({ 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Step 3: schedule configuration. Shows a top-level alert for non-field ("schedule") errors. */
export function ScheduleStep({ schedule, errors, onChange, onToggleDay, onBack, onNext }: ScheduleStepProps) {
  const generalError = errors['schedule']
  const hasFieldErrors = Object.keys(errors).some((k) => k !== 'schedule')
  const num = (field: keyof FixtureSchedule, raw: string) => {
    const n = parseInt(raw, 10)
    onChange(field, Number.isNaN(n) ? 0 : n)
  }

  return (
    <div className="space-y-6">
      {generalError && (
        <Alert role="alert" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertDescription className="text-destructive">{generalError}</AlertDescription>
        </Alert>
      )}
      {!generalError && hasFieldErrors && (
        <Alert role="alert" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertDescription className="text-destructive">Revisa los campos marcados para corregirlos.</AlertDescription>
        </Alert>
      )}

      <Field id="start-date" label="Fecha de inicio" field="start_date" errors={errors}>
        {(a11y) => (
          <Input
            id="start-date"
            type="date"
            value={schedule.start_date}
            onChange={(e) => onChange('start_date', e.target.value)}
            {...a11y}
          />
        )}
      </Field>

      <Field id="end-date" label="Fecha de fin (opcional)" field="end_date" errors={errors}>
        {(a11y) => (
          <Input
            id="end-date"
            type="date"
            value={schedule.end_date ?? ''}
            onChange={(e) => onChange('end_date', e.target.value || undefined)}
            {...a11y}
          />
        )}
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Días de juego</legend>
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex items-center gap-2">
              <Checkbox
                id={`day-${day}`}
                checked={schedule.match_days.includes(day)}
                onCheckedChange={() => onToggleDay(day)}
              />
              <Label htmlFor={`day-${day}`} className="cursor-pointer font-normal">
                {WEEKDAY_LABELS[day]}
              </Label>
            </div>
          ))}
        </div>
        {errors['schedule.match_days'] && (
          <p className="text-xs text-destructive">{errors['schedule.match_days']}</p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field id="start-time" label="Hora de inicio" field="start_time" errors={errors} icon>
          {(a11y) => (
            <Input
              id="start-time"
              type="time"
              value={schedule.start_time}
              onChange={(e) => onChange('start_time', e.target.value)}
              {...a11y}
            />
          )}
        </Field>
        <Field id="end-time" label="Hora de fin (opcional)" field="end_time" errors={errors} icon>
          {(a11y) => (
            <Input
              id="end-time"
              type="time"
              value={schedule.end_time ?? ''}
              onChange={(e) => onChange('end_time', e.target.value || undefined)}
              {...a11y}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="fields" label="Canchas disponibles" field="fields_available" errors={errors}>
          {(a11y) => (
            <Input
              id="fields"
              type="number"
              min="1"
              value={schedule.fields_available}
              onChange={(e) => num('fields_available', e.target.value)}
              {...a11y}
            />
          )}
        </Field>
        <Field id="half-minutes" label="Minutos por tiempo" field="half_minutes" errors={errors}>
          {(a11y) => (
            <Input
              id="half-minutes"
              type="number"
              min="1"
              value={schedule.half_minutes}
              onChange={(e) => num('half_minutes', e.target.value)}
              {...a11y}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="halftime-break" label="Descanso entretiempos" field="halftime_break_minutes" errors={errors}>
          {(a11y) => (
            <Input
              id="halftime-break"
              type="number"
              min="0"
              value={schedule.halftime_break_minutes}
              onChange={(e) => num('halftime_break_minutes', e.target.value)}
              {...a11y}
            />
          )}
        </Field>
        <Field id="break-between" label="Descanso entre partidos" field="break_between_matches" errors={errors}>
          {(a11y) => (
            <Input
              id="break-between"
              type="number"
              min="0"
              value={schedule.break_between_matches}
              onChange={(e) => num('break_between_matches', e.target.value)}
              {...a11y}
            />
          )}
        </Field>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}
