import { Calendar, Shield, Trophy } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'

import { formatMoney } from '../money'
import { useTournaments, useStandings, useLeagueSummary } from '../api'

export function HomePage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const leagueSummary = useLeagueSummary(leagueId)

  const activeTournament = tournaments.data?.data?.find((t) => t.is_active)
  const shownTournament = activeTournament ?? tournaments.data?.data?.[0]
  const standings = useStandings(shownTournament?.id)
  const totalTeams = standings.data?.data ? new Set(standings.data.data.map((s) => s.team_id)).size : 0

  const stats = [
    {
      title: 'Torneos Activos',
      value: tournaments.data?.data?.filter((t) => t.is_active).length ?? 0,
      icon: Trophy,
      color: 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Equipos',
      value: totalTeams,
      icon: Shield,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Jornadas',
      value: activeTournament?.rounds_per_season ?? 0,
      icon: Calendar,
      color: 'bg-green-100 text-green-800',
    },
  ]

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <header>
        <h2 id="home-title" className="text-2xl font-bold">
          Resumen de la Liga
        </h2>
        <p className="text-sm text-muted-foreground">Visión general de tu liga</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Active Tournament Info */}
      {activeTournament && (
        <Card>
          <CardHeader>
            <CardTitle>Torneo Activo</CardTitle>
            <CardDescription>{activeTournament.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Formato</p>
              <p className="font-medium">{activeTournament.tournament_format}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">
                {new Date(activeTournament.start_date).toLocaleDateString()} -{' '}
                {new Date(activeTournament.end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jornadas</p>
              <p className="font-medium">{activeTournament.rounds_per_season}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inscripciones</p>
              <p className="font-medium">{activeTournament.registration_open ? 'Abiertas' : 'Cerradas'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance Summary */}
      <QueryState
        query={leagueSummary}
        loadingLabel="Cargando finanzas…"
        isEmpty={() => false}
        empty={<EmptyState title="Sin datos" />}
      >
        {(summary) => (
          <Card>
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Ingresos</p>
                <p className="text-2xl font-bold">
                  {formatMoney(summary.total_income)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl font-bold">
                  {formatMoney(summary.total_collected)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatMoney(summary.total_pending)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMoney(summary.total_overdue)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>

      {/* Standings Preview */}
      {!shownTournament ? (
        tournaments.isSuccess && (
          <EmptyState title="Sin posiciones" description="Crea un torneo y equipo para comenzar" />
        )
      ) : (
      <QueryState
        query={standings}
        loadingLabel="Cargando posiciones…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin posiciones" description="Crea un torneo y equipo para comenzar" />}
      >
        {(res) => (
          <Card>
            <CardHeader>
              <CardTitle>Posiciones Actuales</CardTitle>
              <CardDescription>Top 5 equipos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {res.data.slice(0, 5).map((standing) => (
                  <div key={standing.team_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg w-8">{standing.position}.</span>
                      <span className="font-medium">{standing.team_name}</span>
                    </div>
                    <span className="font-bold">{standing.points} pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>
      )}
    </section>
  )
}
