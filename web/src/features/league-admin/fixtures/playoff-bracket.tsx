import { type ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import type { Match } from './types'

interface PlayoffBracketProps {
  matches: Match[]
  /** team id -> name; falls back to a short id. */
  teamNames?: Record<string, string>
}

/**
 * Displays playoff bracket from matches with phase='playoffs'.
 * Organizes matches by playoff_round (quarterfinals, semifinals, final, third_place).
 */
export function PlayoffBracket({ matches: allMatches, teamNames = {} }: PlayoffBracketProps) {
  const playoffMatches = allMatches.filter((m) => m.phase === 'playoffs')

  if (playoffMatches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/20 p-8 text-center text-white/70">
        No hay partidos de llave generados
      </div>
    )
  }

  // Group matches by round
  const groupedMatches = new Map<string, Match[]>()
  for (const match of playoffMatches) {
    const round = match.playoff_round ?? 'unknown'
    const key = `${round}-${match.leg ? match.leg : ''}`
    if (!groupedMatches.has(key)) {
      groupedMatches.set(key, [])
    }
    groupedMatches.get(key)!.push(match)
  }

  // Round order for display
  const roundOrder = ['quarterfinals', 'semifinals', 'final', 'third_place']

  return (
    <div className="space-y-6">
      {roundOrder.map((roundType) => {
        const keys = Array.from(groupedMatches.keys()).filter((k) => k.startsWith(roundType))
        if (keys.length === 0) return null

        return (
          <div key={roundType} className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold capitalize text-white drop-shadow-lg">
              {roundType === 'quarterfinals'
                ? 'Cuartos de Final'
                : roundType === 'semifinals'
                  ? 'Semifinales'
                  : roundType === 'final'
                    ? 'Final'
                    : 'Tercer Lugar'}
            </h3>

            <div className="space-y-2">
              {keys.map((key) => {
                const roundMatches = groupedMatches.get(key) ?? []
                const hasLegs = roundMatches.some((m) => m.leg)

                return (
                  <div key={key} className="space-y-2">
                    {hasLegs && (
                      <div className="text-xs font-medium text-white/70">
                        {roundMatches[0]?.leg === 'first' ? 'Ida' : 'Vuelta'}
                      </div>
                    )}
                    {roundMatches.map((match) => (
                      <PlayoffMatchCard key={match.id} match={match} teamNames={teamNames} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PlayoffMatchCard({ match, teamNames }: { match: Match; teamNames: Record<string, string> }): ReactNode {
  const nameOf = (id: string) => (id ? (teamNames[id] ?? `Equipo ${id.slice(0, 8)}`) : '—')
  const homeTeam = nameOf(match.home_team_id)
  const awayTeam = nameOf(match.away_team_id)

  const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('es-MX') : '—'
  const matchTime = match.match_time ?? '—'

  return (
    <Card className="overflow-hidden border-green-400/20 bg-white/5 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 truncate text-sm font-medium text-white">{homeTeam}</div>

          <div className="flex flex-col items-center gap-1">
            {match.status === 'finished' && (
              <div className="text-lg font-bold text-green-400">
                {match.home_score} - {match.away_score}
              </div>
            )}
            {match.status === 'scheduled' && (
              <Badge className="border-white/30 bg-white/10 text-xs text-white">
                {matchTime.slice(0, 5)}
              </Badge>
            )}
            {match.status === 'in_progress' && (
              <Badge className="border-0 bg-green-500/80 text-xs text-white">
                EN VIVO
              </Badge>
            )}
          </div>

          <div className="flex-1 truncate text-right text-sm font-medium text-white">{awayTeam}</div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-white/70">
          <span>{matchDate}</span>
          {match.field_number && <span>Cancha {match.field_number}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
