import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { initials } from '@/features/leagues/leagues-page'

import { formatDate } from '../format'
import type { Match } from '../types'

export interface TeamRef {
  name: string
  logo?: string
}

/** Public match payloads carry team ids only; names come from a lookup. */
export type TeamLookup = Map<string, TeamRef>

const STATUS_LABEL: Record<Match['status'], string> = {
  scheduled: 'Programado',
  in_progress: 'En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

export function MatchList({ matches, teams }: { matches: Match[]; teams: TeamLookup }) {
  return (
    <ul className="space-y-3">
      {matches.map((match) => (
        <li key={match.id}>
          <MatchCard match={match} teams={teams} />
        </li>
      ))}
    </ul>
  )
}

function MatchCard({ match, teams }: { match: Match; teams: TeamLookup }) {
  const home = teams.get(match.home_team_id)
  const away = teams.get(match.away_team_id)
  const homeName = home?.name ?? 'Local'
  const awayName = away?.name ?? 'Visitante'
  const showScore = match.status === 'finished' || match.status === 'in_progress'
  const summary = showScore
    ? `${homeName} ${match.home_score}, ${awayName} ${match.away_score}`
    : `${homeName} contra ${awayName}`

  return (
    <Card>
      <CardContent className="p-4">
        <p className="sr-only">
          {summary}. {STATUS_LABEL[match.status]}. {formatDate(match.match_date)}
        </p>
        <div aria-hidden="true" className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="flex items-center justify-end gap-2">
            <div className="text-right">
              <p className="truncate text-sm font-semibold">{homeName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(match.match_date)}</p>
            </div>
            <TeamAvatar name={homeName} logo={home?.logo} />
          </div>

          <div className="flex flex-col items-center gap-1">
            {showScore ? (
              <div className="flex items-center gap-2">
                <span className="w-8 text-center text-2xl font-bold">{match.home_score}</span>
                <span className="text-muted-foreground">-</span>
                <span className="w-8 text-center text-2xl font-bold">{match.away_score}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{match.match_time || 'Por definir'}</div>
            )}
            <Badge variant={match.status === 'in_progress' ? 'default' : 'outline'}>{STATUS_LABEL[match.status]}</Badge>
          </div>

          <div className="flex items-center justify-start gap-2">
            <TeamAvatar name={awayName} logo={away?.logo} />
            <div>
              <p className="truncate text-sm font-semibold">{awayName}</p>
              <p className="text-xs text-muted-foreground">{match.round ? `Jornada ${match.round}` : ''}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamAvatar({ name, logo }: { name: string; logo?: string }) {
  return (
    <Avatar className="size-8">
      {logo && <AvatarImage src={logo} alt="" />}
      <AvatarFallback className="text-xs" aria-hidden="true">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
