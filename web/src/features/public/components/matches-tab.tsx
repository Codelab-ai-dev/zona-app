import { Calendar, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/states'

import type { Match } from '../types'
import { MatchList, type TeamLookup } from './match-list'

const SHOWN = 5

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white md:text-base">{title}</h3>
      </div>
      {children}
    </section>
  )
}

const byDate = (a: Match, b: Match) => a.match_date.localeCompare(b.match_date) || (a.match_time ?? '').localeCompare(b.match_time ?? '')

/** "Próximos Partidos" and "Resultados Recientes" (from the visible matches), then the full list. */
export function MatchesTab({ matches, teams }: { matches: Match[]; teams: TeamLookup }) {
  const upcoming = matches.filter((m) => m.status === 'scheduled' || m.status === 'in_progress').sort(byDate).slice(0, SHOWN)
  const recent = matches.filter((m) => m.status === 'finished').sort((a, b) => byDate(b, a)).slice(0, SHOWN)
  const ordered = [...matches].sort(byDate)
  return (
    <div className="space-y-6">
      <Section icon={<Calendar className="size-4 text-blue-400" aria-hidden="true" />} title="Próximos Partidos">
        {upcoming.length ? <MatchList matches={upcoming} teams={teams} /> : <EmptyState title="No hay partidos próximos" />}
      </Section>
      <Section icon={<CheckCircle2 className="size-4 text-green-400" aria-hidden="true" />} title="Resultados Recientes">
        {recent.length ? <MatchList matches={recent} teams={teams} /> : <EmptyState title="Aún no hay resultados" />}
      </Section>
      <Section icon={<Calendar className="size-4 text-purple-400" aria-hidden="true" />} title="Todos los partidos">
        <MatchList matches={ordered} teams={teams} />
      </Section>
    </div>
  )
}
