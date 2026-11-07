import { type ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import type { Match } from './types'

interface PlayoffBracketProps {
  matches: Match[]
}

/**
 * Displays playoff bracket from matches with phase='playoffs'.
 * Organizes matches by playoff_round (quarterfinals, semifinals, final, third_place).
 */
export function PlayoffBracket({ matches: allMatches }: PlayoffBracketProps) {
  const playoffMatches = allMatches.filter((m) => m.phase === 'playoffs')

  if (playoffMatches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
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
            <h3 className="font-semibold capitalize text-lg">
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
                      <div className="text-xs font-medium text-muted-foreground">
                        {roundMatches[0]?.leg === 'first' ? 'Ida' : 'Vuelta'}
                      </div>
                    )}
                    {roundMatches.map((match) => (
                      <PlayoffMatchCard key={match.id} match={match} />
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

function PlayoffMatchCard({ match }: { match: Match }): ReactNode {
  const homeTeam = match.home_team_id ? `Equipo ${match.home_team_id.slice(0, 8)}` : '—'
  const awayTeam = match.away_team_id ? `Equipo ${match.away_team_id.slice(0, 8)}` : '—'

  const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('es-MX') : '—'
  const matchTime = match.match_time ?? '—'

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-sm font-medium truncate">{homeTeam}</div>

          <div className="flex flex-col items-center gap-1">
            {match.status === 'finished' && (
              <div className="text-lg font-bold">
                {match.home_score} - {match.away_score}
              </div>
            )}
            {match.status === 'scheduled' && (
              <Badge variant="outline" className="text-xs">
                {matchTime}
              </Badge>
            )}
            {match.status === 'in_progress' && (
              <Badge variant="secondary" className="text-xs">
                EN VIVO
              </Badge>
            )}
          </div>

          <div className="flex-1 text-right text-sm font-medium truncate">{awayTeam}</div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{matchDate}</span>
          {match.field_number && <span>Cancha {match.field_number}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
