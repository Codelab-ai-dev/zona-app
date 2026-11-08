import { Badge } from '@/components/ui/badge'

import { formatDate } from '../format'
import type { Match } from '../types'
import type { TeamLookup } from './match-list'
import { panelClass } from './public-shell'

const ROUNDS: Array<{ key: string; label: string }> = [
  { key: 'round_of_16', label: 'Octavos de Final' },
  { key: 'quarterfinals', label: 'Cuartos de Final' },
  { key: 'semifinals', label: 'Semifinales' },
  { key: 'final', label: 'Final' },
  { key: 'third_place', label: 'Tercer Lugar' },
]

const LEG_LABEL = { first: 'Ida', second: 'Vuelta' } as const

/** Playoff bracket built from the published matches with phase = playoffs, grouped by playoff_round. */
export function PlayoffBracket({ matches, teams }: { matches: Match[]; teams: TeamLookup }) {
  const playoffs = matches
    .filter((m) => m.phase === 'playoffs')
    .sort((a, b) => (a.playoff_position ?? 0) - (b.playoff_position ?? 0) || (a.leg ?? '').localeCompare(b.leg ?? ''))

  return (
    <div className="space-y-6">
      {ROUNDS.map(({ key, label }) => {
        const round = playoffs.filter((m) => m.playoff_round === key)
        if (round.length === 0) return null
        return (
          <section key={key} aria-labelledby={`bracket-${key}`} className="space-y-3">
            <h3 id={`bracket-${key}`} className="text-lg font-semibold text-white">{label}</h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {round.map((m) => (
                <li key={m.id}>
                  <BracketMatch match={m} teams={teams} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function BracketMatch({ match, teams }: { match: Match; teams: TeamLookup }) {
  const home = teams.get(match.home_team_id)?.name ?? 'Por definir'
  const away = teams.get(match.away_team_id)?.name ?? 'Por definir'
  const showScore = match.status === 'finished' || match.status === 'in_progress'
  return (
    <div className={`${panelClass} p-3`}>
      {match.leg && <p className="mb-1 text-xs font-medium text-gray-400">{LEG_LABEL[match.leg as keyof typeof LEG_LABEL]}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{home}</span>
        <span className="text-lg font-bold text-green-400">
          {showScore ? `${match.home_score} - ${match.away_score}` : <span className="text-sm text-gray-400">vs</span>}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-white">{away}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(match.match_date)}{match.match_time ? ` · ${match.match_time.slice(0, 5)}` : ''}</span>
        {match.status === 'in_progress' && <Badge className="border-0 bg-green-500/20 text-[10px] text-green-400">En vivo</Badge>}
        {match.field_number ? <span>Cancha {match.field_number}</span> : null}
      </div>
    </div>
  )
}
