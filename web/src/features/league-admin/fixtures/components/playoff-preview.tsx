import { Calendar, Clock, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { firstRoundPairs } from '../playoff-seeding'

interface PlayoffPreviewProps {
  numTeams: 4 | 8
  /** Team names by seed order. */
  seedNames: string[]
  startDate: string
  startTime: string
  field: number
  thirdPlace: boolean
  homeAndAway: boolean
  pending: boolean
  onBack: () => void
  onConfirm: () => void
}

const addMinutes = (time: string, minutes: number) => {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Preview of the first-round pairings (the API schedules every match 90 minutes apart). */
export function PlayoffPreview({ numTeams, seedNames, startDate, startTime, field, thirdPlace, homeAndAway, pending, onBack, onConfirm }: PlayoffPreviewProps) {
  const date = new Date(`${startDate}T00:00:00Z`).toLocaleDateString('es-MX', { dateStyle: 'medium', timeZone: 'UTC' })
  const later = [...(numTeams === 8 ? ['semifinales'] : []), ...(thirdPlace ? ['tercer lugar'] : []), 'final'].join(', ')
  const roundName = numTeams === 8 ? 'Cuartos de final' : 'Semifinales'
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-yellow-300/30 bg-yellow-500/10 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Trophy className="h-4 w-4 text-yellow-300" aria-hidden="true" />
          {roundName}
          <Badge variant="outline" className="border-yellow-300/40 text-yellow-200">
            {firstRoundPairs(numTeams).length} partidos
          </Badge>
        </h3>
        <ul className="space-y-2">
          {firstRoundPairs(numTeams).map(([home, away], i) => (
            <li key={i} className="flex flex-col gap-1 rounded border border-white/10 bg-white/5 p-2 text-sm text-white sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">
                {seedNames[home]} <span className="text-white/50">vs</span> {seedNames[away]}
                {homeAndAway && <Badge variant="secondary" className="ml-2">IDA</Badge>}
              </span>
              <span className="flex items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" />{date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{addMinutes(startTime, i * 90)}</span>
                <span>Cancha {field}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-white/60">
        {homeAndAway ? 'Cada eliminatoria se juega a ida y vuelta. ' : ''}
        La llave también incluye {later}.
      </p>
      <div className="flex gap-2">
        <Button onClick={onBack} disabled={pending} className="border-white/30 bg-white/10 text-white hover:bg-white/20">
          Volver
        </Button>
        <Button onClick={onConfirm} disabled={pending} className="flex-1 bg-green-500 text-white hover:bg-green-600">
          {pending ? 'Generando…' : 'Confirmar y generar'}
        </Button>
      </div>
    </div>
  )
}
