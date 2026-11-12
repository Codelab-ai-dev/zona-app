import { useMemo } from 'react'

import { QueryState } from '@/components/states'
import { Badge } from '@/components/ui/badge'

import { useTeamMatches, useTeamsByLeague } from '../api'
import { formatDate } from '../format'
import type { Match, Team } from '../types'

type Outcome = { letter: 'G' | 'E' | 'P'; label: string }

/** Result from the team's perspective; text + letter so color is never the only cue. */
export function outcomeFor(match: Match, teamId: string): Outcome | null {
  if (match.status !== 'finished') return null
  const mine = match.home_team_id === teamId ? match.home_score : match.away_score
  const theirs = match.home_team_id === teamId ? match.away_score : match.home_score
  if (mine > theirs) return { letter: 'G', label: 'Victoria' }
  if (mine < theirs) return { letter: 'P', label: 'Derrota' }
  return { letter: 'E', label: 'Empate' }
}

const OUTCOME = { G: 'bg-green-500/20 text-green-400', E: 'bg-yellow-500/20 text-yellow-400', P: 'bg-red-500/20 text-red-400' }

const STATUS_LABEL: Partial<Record<Match['status'], string>> = {
  scheduled: 'Programado',
  in_progress: 'En vivo',
  cancelled: 'Cancelado',
}

/** Most recent first, so slicing keeps the latest games (the API order is not guaranteed). */
export function latestMatches(matches: Match[], limit: number): Match[] {
  return [...matches]
    .filter((m) => m.status !== 'cancelled')
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, limit)
}

export function TeamMatches({ team }: { team: Team }) {
  const matches = useTeamMatches(team.id)
  // Matches only carry team ids; one league-wide request resolves every opponent name.
  const leagueTeams = useTeamsByLeague(team.league_id)
  const names = useMemo(() => {
    const map = new Map((leagueTeams.data?.data ?? []).map((t) => [t.id, t.name]))
    map.set(team.id, team.name)
    return map
  }, [leagueTeams.data, team.id, team.name])

  return (
    <QueryState
      query={matches}
      loadingLabel="Cargando partidos…"
      isEmpty={(res) => res.data.length === 0}
      empty={<p className="text-sm text-gray-400">Aún no hay partidos publicados.</p>}
    >
      {(res) => (
        <ul className="space-y-3">
          {latestMatches(res.data, 5).map((match) => {
            const home = names.get(match.home_team_id) ?? 'Local'
            const away = names.get(match.away_team_id) ?? 'Visitante'
            const outcome = outcomeFor(match, team.id)
            const shown = match.status === 'finished' || match.status === 'in_progress'
            return (
              <li key={match.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-700/30 p-3 text-white md:p-4">
                    <p className="text-sm">
                      <span className="font-semibold">{home}</span>{' '}
                      {shown ? (
                        <span className="mx-1 text-xl font-bold">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="mx-1 text-gray-400">vs</span>
                      )}{' '}
                      <span className="font-semibold">{away}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <time dateTime={match.match_date}>{formatDate(match.match_date)}</time>
                      {outcome ? (
                        <Badge className={`border-0 ${OUTCOME[outcome.letter]}`}>
                          <span aria-hidden="true">{outcome.letter}</span>
                          <span className="sr-only">{outcome.label}</span>
                          <span aria-hidden="true" className="hidden sm:inline">
                            {' '}
                            {outcome.label}
                          </span>
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-blue-500/20 text-blue-400">{STATUS_LABEL[match.status]}</Badge>
                      )}
                    </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </QueryState>
  )
}
