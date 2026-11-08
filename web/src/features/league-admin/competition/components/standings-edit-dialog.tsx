import { AlertCircle, AlertTriangle, Loader2, Save, X } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useSetStandings } from '../api'
import type { Standings } from '../types'

type NumField = 'matches_played' | 'matches_won' | 'matches_drawn' | 'matches_lost' | 'goals_for' | 'goals_against'

const numberInput = 'h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm'

function NumberField({
  id,
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  id: NumField
  label: string
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-gray-400 text-[10px] md:text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={numberInput}
      />
      {error && (
        <p id={`${id}-error`} className="text-[10px] text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

const isCount = (value: string) => /^\d+$/.test(value.trim())

/**
 * Edits the totals a team shows in the table (PJ/PG/PE/PP/GF/GC). The API stores the
 * difference with the recorded matches as an adjustment, so new results keep adding up.
 */
export function StandingsEditDialog({
  standing,
  tournamentId,
  onClose,
}: {
  standing: Standings
  tournamentId: string
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<NumField, string>>({
    matches_played: String(standing.matches_played),
    matches_won: String(standing.matches_won),
    matches_drawn: String(standing.matches_drawn),
    matches_lost: String(standing.matches_lost),
    goals_for: String(standing.goals_for),
    goals_against: String(standing.goals_against),
  })
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSetStandings(tournamentId, standing.team_id)

  const set = (field: NumField) => (value: string) => setValues((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid: Record<string, string> = {}
    for (const [field, value] of Object.entries(values)) {
      if (!isCount(value)) invalid[field] = 'Debe ser un entero de 0 o más'
    }
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid)
      return
    }
    const n = (field: NumField) => Number(values[field].trim())
    if (n('matches_won') + n('matches_drawn') + n('matches_lost') !== n('matches_played')) {
      setErrors({ matches_played: 'PJ debe ser la suma de PG + PE + PP' })
      return
    }
    setErrors({})
    try {
      await save.mutateAsync({
        matches_played: n('matches_played'),
        matches_won: n('matches_won'),
        matches_drawn: n('matches_drawn'),
        matches_lost: n('matches_lost'),
        goals_for: n('goals_for'),
        goals_against: n('goals_against'),
        reason: reason.trim(),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        // 422 carries the minimums recorded matches impose; show it next to the field.
        const keys = Object.keys(err.fields)
        const inline = keys.length > 0 && keys.every((key) => key in values || key === 'reason')
        setErrors(inline ? err.fields : { form: err.message })
      }
    }
  }

  const pending = save.isPending
  const fieldError = (field: NumField) => errors[field]

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-sm md:text-base">Editar Estadísticas</DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">{standing.team_name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-4 gap-2">
            <NumberField id="matches_played" label="PJ" value={values.matches_played} error={fieldError('matches_played')} disabled={pending} onChange={set('matches_played')} />
            <NumberField id="matches_won" label="PG" value={values.matches_won} error={fieldError('matches_won')} disabled={pending} onChange={set('matches_won')} />
            <NumberField id="matches_drawn" label="PE" value={values.matches_drawn} error={fieldError('matches_drawn')} disabled={pending} onChange={set('matches_drawn')} />
            <NumberField id="matches_lost" label="PP" value={values.matches_lost} error={fieldError('matches_lost')} disabled={pending} onChange={set('matches_lost')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField id="goals_for" label="Goles a Favor" value={values.goals_for} error={fieldError('goals_for')} disabled={pending} onChange={set('goals_for')} />
            <NumberField id="goals_against" label="Goles en Contra" value={values.goals_against} error={fieldError('goals_against')} disabled={pending} onChange={set('goals_against')} />
          </div>

          <div className="flex gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[10px] md:text-xs text-yellow-300/90">
              Estos valores se guardan encima de los partidos registrados: los resultados nuevos se seguirán sumando. No pueden ser
              menores que lo ya registrado en partidos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stats-reason" className="text-gray-400 text-[10px] md:text-xs">
              Motivo del Ajuste
            </Label>
            <Textarea
              id="stats-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo de la edición…"
              rows={2}
              disabled={pending}
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'stats-reason-error' : undefined}
              className="bg-slate-800/50 border-white/10 text-white text-xs md:text-sm min-h-[60px]"
            />
            {errors.reason && (
              <p id="stats-reason-error" className="text-[10px] text-red-400">
                {errors.reason}
              </p>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending} className="flex-1 h-9 text-gray-400 hover:text-white hover:bg-slate-800/50 text-xs md:text-sm">
              <X className="w-3 h-3 md:w-4 md:h-4 mr-1.5" aria-hidden="true" />
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">
              {pending ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" aria-hidden="true" /> : <Save className="w-3 h-3 md:w-4 md:h-4 mr-1.5" aria-hidden="true" />}
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
