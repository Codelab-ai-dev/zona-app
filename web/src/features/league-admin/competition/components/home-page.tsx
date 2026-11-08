import { Calendar, Shield, Trophy } from 'lucide-react'
import { formatLabel } from './tournament-list'
import { useMemo } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTournamentMatches } from '@/features/league-admin/matches/api'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'

import { useStandings, useTournaments } from '../api'

const glass = 'backdrop-blur-xl bg-white/10 border-white/20'
const row =
  'flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10'

const dateFmt = (value: string) => new Date(value).toLocaleDateString('es-ES')

export function HomePage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const teams = useTeamsByLeague(leagueId)
  const activeTournament = tournaments.data?.data.find((t) => t.is_active)
  const matches = useTournamentMatches(activeTournament?.id)
  const standings = useStandings(activeTournament?.id)

  const recentTeams = useMemo(
    () => [...(teams.data?.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [teams.data],
  )
  const upcoming = useMemo(
    () =>
      (matches.data?.data ?? [])
        .filter((m) => m.status === 'scheduled')
        .sort((a, b) => a.match_date.localeCompare(b.match_date))
        .slice(0, 5),
    [matches.data],
  )

  if (tournaments.isPending || teams.isPending) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Estadísticas de la Liga</h2>
        <LoadingState label="Cargando datos..." />
      </div>
    )
  }

  const failed = tournaments.isError ? tournaments : teams.isError ? teams : null
  if (failed) return <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />

  const stats = [
    {
      title: 'Torneos',
      value: activeTournament ? 1 : 0,
      total: tournaments.data?.data.length ?? 0,
      icon: Trophy,
      description: activeTournament ? 'Torneo activo' : 'Sin datos',
    },
    {
      title: 'Equipos',
      value: teams.data?.page?.total ?? teams.data?.data.length ?? 0,
      total: 0,
      icon: Shield,
      description: (teams.data?.data.length ?? 0) > 0 ? 'Registrados' : 'Sin datos',
    },
    {
      title: 'Partidos',
      value: matches.data?.page?.total ?? matches.data?.data.length ?? 0,
      total: 0,
      icon: Calendar,
      description: (matches.data?.data.length ?? 0) > 0 ? 'Registrados' : 'Sin datos',
    },
  ]

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <div className="mb-6">
        <h2 id="home-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          Estadísticas de la Liga
        </h2>
        <p className="text-white/80 drop-shadow">Resumen de actividad y participación</p>
      </div>

      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className={`${glass} hover:bg-white/15 transition-all`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90 drop-shadow">{stat.title}</CardTitle>
                <div className="p-2 rounded-full backdrop-blur-md bg-white/20">
                  <Icon className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {stat.value}
                  {stat.total > stat.value && <span className="text-sm font-normal text-white/70">/{stat.total}</span>}
                </div>
                <CardDescription className="text-xs text-white/70 drop-shadow">{stat.description}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeTournament && (
        <Card className={glass}>
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Torneo Activo</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">{activeTournament.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-white">
            <div>
              <p className="text-sm text-white/70">Formato</p>
              <p className="font-medium">{formatLabel[activeTournament.tournament_format]}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Período</p>
              <p className="font-medium">
                {dateFmt(activeTournament.start_date)} - {dateFmt(activeTournament.end_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/70">Jornadas</p>
              <p className="font-medium">{activeTournament.rounds_per_season}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Inscripciones</p>
              <p className="font-medium">{activeTournament.registration_open ? 'Abiertas' : 'Cerradas'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2">
        <Card className={glass}>
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Equipos Recientes</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Últimos equipos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTeams.length > 0 ? (
                recentTeams.map((team) => (
                  <div key={team.id} className={row}>
                    <div>
                      <p className="font-medium text-white drop-shadow">{team.name}</p>
                      <p className="text-sm text-white/70 drop-shadow">Registrado el {dateFmt(team.created_at)}</p>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-md ${
                        team.is_active ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-white'
                      }`}
                    >
                      {team.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70 drop-shadow py-4">No hay equipos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={glass}>
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Próximos Partidos</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Calendario de partidos programados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.length > 0 ? (
                upcoming.map((match) => (
                  <div key={match.id} className={row}>
                    <div>
                      <p className="font-medium text-white drop-shadow">
                        {match.home_team_name} vs {match.away_team_name}
                      </p>
                      <p className="text-sm text-white/70 drop-shadow">
                        {match.match_date ? dateFmt(match.match_date) : 'Fecha por definir'}
                      </p>
                    </div>
                    <div className="px-2 py-1 text-xs backdrop-blur-md bg-blue-500/80 text-white border border-white/20 font-medium rounded-full">
                      Programado
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70 drop-shadow py-4">No hay partidos programados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTournament && (standings.data?.data.length ?? 0) > 0 && (
        <Card className={glass}>
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg">Posiciones Actuales</CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Top 5 equipos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {standings.data?.data.slice(0, 5).map((s) => (
              <div key={s.team_id} className={`${row} sm:flex-row`}>
                <div className="flex items-center gap-3 text-white">
                  <span className="font-semibold text-lg w-8">{s.position}.</span>
                  <span className="font-medium">{s.team_name}</span>
                </div>
                <span className="font-bold text-green-400">{s.points} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
