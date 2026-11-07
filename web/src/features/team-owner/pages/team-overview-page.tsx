import { QueryState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useTeam, useTeamStats } from '../api'

export function TeamOverviewPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  const stats = useTeamStats(teamId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Resumen del Equipo</h2>
        <p className="text-muted-foreground">Visualiza los datos generales del equipo.</p>
      </div>

      {/* Team Info */}
      <QueryState query={team} loadingLabel="Cargando información del equipo…">
        {(data) => (
          <Card>
            <CardHeader>
              <CardTitle>{data.name}</CardTitle>
              <CardDescription>{data.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.logo && <img src={data.logo} alt={data.name} className="h-24 w-24 rounded-lg object-cover" />}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Slug</p>
                  <p className="text-lg font-semibold">{data.slug}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <p className="text-lg font-semibold">{data.is_active ? 'Activo' : 'Inactivo'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>

      {/* Team Stats */}
      <QueryState query={stats} isEmpty={(res) => res.data.length === 0} loadingLabel="Cargando estadísticas…">
        {(res) => {
          const teamStat = res.data[0]
          if (!teamStat) return null
          return (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Partidos Jugados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.matches_played}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Registro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p className="font-semibold">
                      {teamStat.matches_won}G - {teamStat.matches_drawn}E - {teamStat.matches_lost}P
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Puntos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.points}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goles a Favor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.goals_for}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goles en Contra</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.goals_against}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Diferencia de Goles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.goal_difference}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Vallas Invictas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.clean_sheets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tarjetas Amarillas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.yellow_cards}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tarjetas Rojas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{teamStat.red_cards}</div>
                </CardContent>
              </Card>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}
