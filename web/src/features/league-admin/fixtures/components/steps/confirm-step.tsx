import { Button } from '@/components/ui/button'

import type { FixtureSchedule } from '../../types'
import { WEEKDAYS } from './constants'

interface ConfirmStepProps {
  tournamentName: string
  teamCount: number
  isDoubleRound: boolean
  startDate: string
  schedule: FixtureSchedule
  pending: boolean
  onBack: () => void
  onGenerate: () => void
}

/** Step 5: summary + generate. Rounds are only known after the API answers. */
export function ConfirmStep({
  tournamentName,
  teamCount,
  isDoubleRound,
  startDate,
  schedule,
  pending,
  onBack,
  onGenerate,
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm font-medium text-blue-300">
          <strong>Torneo:</strong> {tournamentName}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Equipos:</strong> {teamCount}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Formato:</strong> {isDoubleRound ? 'Ida y vuelta' : 'Solo ida'}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Inicio:</strong> {startDate || 'Sin fecha'}
        </p>
      </div>

      <ConfigSummary teamCount={teamCount} isDoubleRound={isDoubleRound} schedule={schedule} />

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button onClick={onGenerate} disabled={pending} className="flex-1 bg-green-500 text-white hover:bg-green-600">
          {pending ? 'Generando…' : 'Generar Vista Previa'}
        </Button>
      </div>
    </div>
  )
}

const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

/** Days (YYYY-MM-DD, inclusive) between start and end that fall on one of the match days. */
function playableDays(schedule: FixtureSchedule): number {
  if (!schedule.start_date || !schedule.end_date) return 0
  const wanted = new Set(schedule.match_days.map((d) => DAY_INDEX[d]))
  const end = new Date(`${schedule.end_date}T00:00:00Z`)
  let count = 0
  for (const d = new Date(`${schedule.start_date}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (wanted.has(d.getUTCDay())) count++
  }
  return count
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** "Resumen de Configuración" of the original generator, computed from the form. */
function ConfigSummary({ teamCount, isDoubleRound, schedule }: { teamCount: number; isDoubleRound: boolean; schedule: FixtureSchedule }) {
  const rounds = isDoubleRound ? teamCount * 2 - 2 : teamCount - 1
  const total = isDoubleRound ? teamCount * (teamCount - 1) : (teamCount * (teamCount - 1)) / 2
  const matchMinutes = schedule.half_minutes * 2 + schedule.halftime_break_minutes
  const slotMinutes = matchMinutes + schedule.break_between_matches
  const [h = 0, m = 0] = schedule.start_time.split(':').map(Number)
  const start = h * 60 + m
  const [eh = 0, em = 0] = (schedule.end_time ?? '').split(':').map(Number)
  const slotsPerDay =
    schedule.end_time && slotMinutes > 0 ? Math.max(0, Math.floor((eh * 60 + em - start) / slotMinutes)) : undefined
  const days = schedule.start_date && schedule.end_date
    ? Math.ceil((new Date(schedule.end_date).getTime() - new Date(schedule.start_date).getTime()) / 86_400_000)
    : undefined
  const capacity = days !== undefined && slotsPerDay !== undefined ? playableDays(schedule) * slotsPerDay * schedule.fields_available : undefined
  const orderedDays = WEEKDAYS.filter((d) => schedule.match_days.includes(d)).length

  const rows: Array<[string, string]> = [
    ['Equipos', `${teamCount} participantes`],
    ['Jornadas', String(Math.max(0, rounds))],
    ['Partidos total', String(Math.max(0, total))],
    ['Días por semana', String(orderedDays)],
    ['Canchas', `${schedule.fields_available} disponibles`],
    ...(days !== undefined ? ([['Duración', `${days} día${days !== 1 ? 's' : ''}`]] as Array<[string, string]>) : []),
    ...(capacity !== undefined && capacity > 0
      ? ([['Capacidad', `${capacity} espacios (${Math.round((total / capacity) * 100)}% usado)`]] as Array<[string, string]>)
      : []),
    ['Duración del partido', `${schedule.half_minutes}min + ${schedule.halftime_break_minutes}min + ${schedule.half_minutes}min = ${matchMinutes}min`],
    ['Descanso entre partidos', `${schedule.break_between_matches}min`],
    ['Total por espacio', `${slotMinutes}min`],
    ['Horario de inicio', hhmm(start)],
    ...(slotsPerDay !== undefined ? ([['Horarios generados', `${slotsPerDay} por día`]] as Array<[string, string]>) : []),
  ]

  return (
    <section aria-labelledby="config-summary" className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
      <h3 id="config-summary" className="mb-3 text-sm font-semibold text-white">Resumen de Configuración</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-gray-300 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-1">
            <dt className="font-medium">{label}:</dt>{' '}
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
