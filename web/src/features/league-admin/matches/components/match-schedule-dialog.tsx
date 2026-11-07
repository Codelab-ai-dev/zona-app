import { useMemo, useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { toast } from 'sonner'

import { useUpdateMatchSchedule } from '../api'
import type { MatchWithRelations, UpdateMatchScheduleRequest } from '../types'

interface MatchScheduleDialogProps {
  match: MatchWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/** Dialog to edit match schedule (date, time, field, round). */
export function MatchScheduleDialog({ match, open, onOpenChange, onSaved }: MatchScheduleDialogProps) {
  const updateSchedule = useUpdateMatchSchedule()

  // Parse initial values
  const initialDate = useMemo(() => {
    const d = new Date(match.match_date)
    return d.toISOString().split('T')[0]
  }, [match.match_date])

  const initialTime = useMemo(() => match.match_time || new Date(match.match_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }), [match.match_date, match.match_time])

  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [field, setField] = useState(String(match.field_number || 1))
  const [round, setRound] = useState(String(match.round || ''))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    setErrors({})
    try {
      const data: UpdateMatchScheduleRequest = {}
      if ((date && date !== initialDate) || (time && time !== initialTime)) {
        if (date) {
          const dateParts = date.split('-').map(Number)
          const timeParts = time.split(':').map(Number)
          const year = dateParts[0]
          const month = dateParts[1]
          const day = dateParts[2]
          const hours = timeParts[0]
          const minutes = timeParts[1]
          if (year && month && day && hours !== undefined && minutes !== undefined) {
            const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes))
            data.match_date = dt.toISOString()
            data.match_time = time
          }
        }
      }
      if (field && Number(field) > 0) {
        data.field_number = Number(field)
      }
      if (round) {
        data.round = Number(round)
      }

      await updateSchedule.mutateAsync({ matchId: match.id, data })
      toast.success('Programación actualizada exitosamente')
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          setErrors(err.fields)
        }
        toast.error(err.message)
      } else {
        toast.error('Error al actualizar')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar programación</DialogTitle>
          <DialogDescription>
            {match.home_team?.name ?? 'TBD'} vs {match.away_team?.name ?? 'TBD'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={updateSchedule.isPending}
              aria-invalid={!!errors.match_date}
              aria-describedby={errors.match_date ? 'date-error' : undefined}
            />
            {errors.match_date && (
              <p id="date-error" className="mt-1 text-sm text-destructive">
                {errors.match_date}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="time">Hora</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={updateSchedule.isPending}
              aria-invalid={!!errors.match_time}
              aria-describedby={errors.match_time ? 'time-error' : undefined}
            />
            {errors.match_time && (
              <p id="time-error" className="mt-1 text-sm text-destructive">
                {errors.match_time}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="field">Campo</Label>
            <Input
              id="field"
              type="number"
              min="1"
              value={field}
              onChange={(e) => setField(e.target.value)}
              disabled={updateSchedule.isPending}
              aria-invalid={!!errors.field_number}
              aria-describedby={errors.field_number ? 'field-error' : undefined}
            />
            {errors.field_number && (
              <p id="field-error" className="mt-1 text-sm text-destructive">
                {errors.field_number}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="round">Jornada</Label>
            <Input
              id="round"
              type="number"
              min="1"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              placeholder="Dejar en blanco para sin jornada"
              disabled={updateSchedule.isPending}
              aria-invalid={!!errors.round}
              aria-describedby={errors.round ? 'round-error' : undefined}
            />
            {errors.round && (
              <p id="round-error" className="mt-1 text-sm text-destructive">
                {errors.round}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateSchedule.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateSchedule.isPending}>
            {updateSchedule.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
