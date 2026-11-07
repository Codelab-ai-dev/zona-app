import { QueryState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTeamStats } from '../api'

export function TeamRecordPage({ teamId }: { teamId: string }) {
  const stats = useTeamStats(teamId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estadísticas</h2>
        <p className="text-muted-foreground">Visualiza un resumen detallado del desempeño del equipo.</p>
      </div>

      <QueryState query={stats} isEmpty={(res) => res.data.length === 0}>
        {(res) => {
          const stat = res.data[0]
          if (!stat) return null

          return (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Partidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jugados</span>
                        <span className="font-semibold">{stat.matches_played}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ganados</span>
                        <span className="font-semibold text-green-600">{stat.matches_won}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empatados</span>
                        <span className="font-semibold text-yellow-600">{stat.matches_drawn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Perdidos</span>
                        <span className="font-semibold text-red-600">{stat.matches_lost}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Goles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">A Favor</span>
                        <span className="font-semibold">{stat.goals_for}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En Contra</span>
                        <span className="font-semibold">{stat.goals_against}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diferencia</span>
                        <span className="font-semibold">{stat.goal_difference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Promedio por Partido</span>
                        <span className="font-semibold">
                          {stat.matches_played > 0 ? (stat.goals_for / stat.matches_played).toFixed(2) : '0'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Defensa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vallas Invictas</span>
                        <span className="font-semibold">{stat.clean_sheets}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarjetas Amarillas</span>
                        <span className="font-semibold text-yellow-600">{stat.yellow_cards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarjetas Rojas</span>
                        <span className="font-semibold text-red-600">{stat.red_cards}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Puntuación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Puntos</span>
                        <span className="font-semibold text-lg text-primary">{stat.points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ajustes</span>
                        <span className="font-semibold">{stat.points_adjustment}</span>
                      </div>
                      {stat.adjustment_reason && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Motivo: {stat.adjustment_reason}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}
