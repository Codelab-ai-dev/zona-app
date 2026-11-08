import { AlertTriangle, Clock, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { Match } from '../types'

const goalTypes: Record<string, string> = {
  normal: 'Gol',
  penalty: 'Penal',
  own_goal: 'Autogol',
  free_kick: 'Tiro libre',
}

function who(name: string | undefined, jersey: number | undefined) {
  return `${name ?? 'Jugador'}${jersey !== undefined ? ` (#${jersey})` : ''}`
}

/** Goles / Tarjetas / Incidencias of GET /matches/{id}, like the original cédula. */
export function RefereeEvents({ match }: { match: Match }) {
  const goals = match.goals ?? []
  const cards = match.cards ?? []
  const incidents = match.incidents ?? []
  const teamName = (id: string | undefined) =>
    id === match.home_team_id ? match.home_team?.name : id === match.away_team_id ? match.away_team?.name : undefined

  return (
    <>
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" aria-hidden="true" />
              Goles ({goals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {goals.map((goal) => (
                <li key={goal.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <Badge variant="outline" className="bg-green-100 border-green-300">{goal.minute}'</Badge>
                  <div>
                    <div className="font-medium">{who(goal.player_name, goal.player_jersey)}</div>
                    <div className="text-sm text-muted-foreground">
                      {teamName(goal.team_id)} - {goalTypes[goal.goal_type] ?? goal.goal_type}
                    </div>
                    {goal.assist_player_name && <div className="text-sm text-muted-foreground">Asistencia: {goal.assist_player_name}</div>}
                    {goal.description && <div className="text-sm mt-1">{goal.description}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              Tarjetas ({cards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${card.card_type === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}
                >
                  <Badge variant="outline" className={card.card_type === 'yellow' ? 'bg-yellow-100 border-yellow-300' : 'bg-red-100 border-red-300'}>
                    {card.minute}'
                  </Badge>
                  <div>
                    <div className="font-medium">{who(card.player_name, card.player_jersey)}</div>
                    <div className="text-sm text-muted-foreground">
                      {teamName(card.team_id)} - Tarjeta {card.card_type === 'yellow' ? 'Amarilla' : 'Roja'}
                    </div>
                    {card.reason && <div className="text-sm mt-1">{card.reason}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" aria-hidden="true" />
              Incidencias ({incidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {incidents.map((incident) => (
                <li key={incident.id} className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  {incident.minute !== undefined && <Badge variant="outline" className="bg-blue-100 border-blue-300">{incident.minute}'</Badge>}
                  <div className="flex-1">
                    <div className="font-medium">{incident.incident_type}</div>
                    {incident.player_name && <div className="text-sm text-muted-foreground">{incident.player_name}</div>}
                    <div className="text-sm mt-1">{incident.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
