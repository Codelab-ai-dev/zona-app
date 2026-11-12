import { Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { GeneratedMatch, Match } from '../../types'

interface PreviewStepProps {
  matches: Array<Match | GeneratedMatch>
  rounds: number
  teamNames: Map<string, string>
  pending: boolean
  onBack: () => void
  onSave: () => void
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Vista Previa del Calendario": the generated rounds, reviewed before anything is saved. */
export function PreviewStep({ matches, rounds, teamNames, pending, onBack, onSave }: PreviewStepProps) {
  const byRound = new Map<number, Array<Match | GeneratedMatch>>()
  matches.forEach((m) => byRound.set(m.round ?? 0, [...(byRound.get(m.round ?? 0) ?? []), m]))
  const name = (id: string) => teamNames.get(id) ?? 'Por definir'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white md:text-base">
          <Calendar className="h-4 w-4 text-green-400" aria-hidden="true" />
          Vista Previa del Calendario
        </h3>
        <p className="text-xs text-gray-400 md:text-sm">
          Revisa el calendario generado antes de guardarlo: {matches.length} partidos en {rounds} jornadas. Todavía no se guardó nada.
        </p>
      </div>

      <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
        {[...byRound.entries()].sort(([a], [b]) => a - b).map(([round, list]) => (
          <section key={round} aria-label={`Jornada ${round}`} className="rounded-lg border border-white/10 bg-slate-800/50">
            <h4 className="border-b border-white/10 bg-slate-700/30 px-3 py-2 text-xs font-semibold text-white md:text-sm">
              Jornada {round}
              <span className="ml-2 font-normal text-gray-400">{list.length} {list.length === 1 ? 'partido' : 'partidos'}</span>
            </h4>
            <ul className="divide-y divide-white/5">
              {[...list]
                .sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.match_time ?? '').localeCompare(b.match_time ?? ''))
                .map((m, i) => (
                  <li key={`${m.home_team_id}-${m.away_team_id}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs md:text-sm">
                    <span className="min-w-0 text-white">
                      {name(m.home_team_id)} <span className="text-gray-500">vs</span> {name(m.away_team_id)}
                    </span>
                    <span className="text-[10px] text-gray-400 md:text-xs">
                      {date(m.match_date)} · {m.match_time?.slice(0, 5) ?? 'Sin hora'} · Cancha {m.field_number ?? 1}
                    </span>
                  </li>
                ))}
            </ul>
            {list.some((m) => m.bye_team_id) && (
              <p className="border-t border-white/5 px-3 py-1.5 text-[10px] text-gray-500">
                Descansa: {[...new Set(list.map((m) => m.bye_team_id).filter((id): id is string => Boolean(id)))].map(name).join(', ')}
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack} disabled={pending}>
          Volver
        </Button>
        <Button onClick={onSave} disabled={pending} className="flex-1 bg-green-500 text-white hover:bg-green-600">
          {pending ? 'Guardando…' : 'Guardar Calendario'}
        </Button>
      </div>
    </div>
  )
}
