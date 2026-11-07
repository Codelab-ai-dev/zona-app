import { QueryState, EmptyState } from '@/components/states'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { useTeamMatches } from '../api'

export function TeamCalendarPage({ teamId }: { teamId: string }) {
  const matches = useTeamMatches(teamId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'scheduled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'finished':
        return 'Finalizado'
      case 'in_progress':
        return 'En vivo'
      case 'scheduled':
        return 'Programado'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Calendario</h2>
        <p className="text-muted-foreground">Visualiza todos los partidos de tu equipo.</p>
      </div>

      <QueryState
        query={matches}
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="No hay partidos" description="Tu equipo no tiene partidos programados." />}
      >
        {(res) => (
          <div className="space-y-4">
            {res.data.map((match) => (
              <Card key={match.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="flex-1 text-center sm:text-right">
                      <p className="font-semibold">{match.home_team?.name || 'Equipo'}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{match.home_score}</div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {new Date(match.match_date).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs font-medium">{match.match_time || '—'}</p>
                        <Badge variant={getStatusColor(match.status)} className="mt-2">
                          {getStatusLabel(match.status)}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">{match.away_score}</div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-semibold">{match.away_team?.name || 'Equipo'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
