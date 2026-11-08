import { ArrowLeft, Home, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/features/leagues/leagues-page'
import { ApiError } from '@/lib/api/client'

import { usePublicLeague, useTeam, useTeamCoachingStaff, useTeamPlayerStats, useTeamStats } from '../api'
import { panelClass } from './public-shell'
import { TeamAdminActions } from './team-admin-actions'
import { TeamMatches } from './team-matches'
import { TeamPlayersTable } from './team-players-table'

const iconBtn =
  'inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 md:size-9'

function SectionTitle({ id, children, count }: { id: string; children: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2 md:mb-4">
      <Trophy className="size-4 text-yellow-400 md:size-5" aria-hidden="true" />
      <h2 id={id} className="text-base font-bold text-white md:text-lg">{children}</h2>
      {count !== undefined && <span className="text-xs text-gray-500">({count})</span>}
    </div>
  )
}

const muted = 'text-sm text-gray-400'

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const team = useTeam(teamId)
  const players = useTeamPlayerStats(teamId)
  const coachingStaff = useTeamCoachingStaff(teamId)
  const stats = useTeamStats(teamId)
  const league = usePublicLeague(team.data?.league_id)

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="container mx-auto flex-1 space-y-4 px-3 py-4 md:space-y-6 md:px-4 md:py-6">
        {!team.data && <h1 className="sr-only">Equipo</h1>}
        <QueryState query={team} loadingLabel="Cargando equipo…">
          {(teamData) => (
            <>
              <header className={`${panelClass} p-3 md:rounded-2xl md:p-5`}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex gap-2">
                    <Link to="/" aria-label="Inicio" className={`${iconBtn} border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30`}>
                      <Home className="size-4" aria-hidden="true" />
                    </Link>
                    <button type="button" onClick={() => window.history.back()} aria-label="Volver" className={`${iconBtn} border-white/10 bg-slate-700/50 text-white hover:bg-slate-700`}>
                      <ArrowLeft className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Avatar className="size-12 border-2 border-green-500/30 md:size-16">
                    {teamData.logo && <AvatarImage src={teamData.logo} alt="" />}
                    <AvatarFallback className="bg-green-500/20 text-sm font-bold text-green-400 md:text-lg" aria-hidden="true">{initials(teamData.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-white md:text-2xl">{teamData.name}</h1>
                      <Badge className={`border-0 ${teamData.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {teamData.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {teamData.description && <p className="line-clamp-2 text-sm text-gray-400">{teamData.description}</p>}
                    {league.data && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        {league.data.logo && <img src={league.data.logo} alt="" className="size-4 rounded-sm object-contain" />}
                        <Link to={`/liga/${league.data.slug}`} className="hover:text-green-400">{league.data.name}</Link>
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3"><TeamAdminActions team={teamData} /></div>
              </header>

              <section aria-labelledby="team-stats-title" className={`${panelClass} p-3 md:rounded-2xl md:p-5`}>
                <SectionTitle id="team-stats-title">Estadísticas</SectionTitle>
                {stats.isError && stats.error instanceof ApiError && stats.error.status === 404 ? (
                  <p className={muted}>Aún no hay estadísticas para este equipo.</p>
                ) : (
                  <QueryState query={stats} loadingLabel="Cargando estadísticas…">
                    {(s) => (
                      <dl className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-8">
                        <Stat label="Partidos" value={s.matches_played} />
                        <Stat label="Victorias" value={s.matches_won} tone="text-green-400" />
                        <Stat label="Empates" value={s.matches_drawn} tone="text-yellow-400" />
                        <Stat label="Derrotas" value={s.matches_lost} tone="text-red-400" />
                        <Stat label="Goles a favor" value={s.goals_for} tone="text-green-400" />
                        <Stat label="Goles en contra" value={s.goals_against} tone="text-red-400" />
                        <Stat label="Diferencia de goles" value={s.goal_difference} tone={s.goal_difference < 0 ? 'text-red-400' : 'text-green-400'} />
                        <Stat label="Puntos" value={s.points + s.points_adjustment} tone="text-green-400" />
                      </dl>
                    )}
                  </QueryState>
                )}
              </section>

              <section aria-labelledby="team-players-title" className={`${panelClass} p-3 md:rounded-2xl md:p-5`}>
                <SectionTitle id="team-players-title" count={players.data?.data.length}>Jugadores</SectionTitle>
                <TeamPlayersTable teamId={teamData.id} />
              </section>

              <section aria-labelledby="team-staff-title" className={`${panelClass} p-3 md:rounded-2xl md:p-5`}>
                <SectionTitle id="team-staff-title">Cuerpo Técnico</SectionTitle>
                <QueryState
                  query={coachingStaff}
                  loadingLabel="Cargando cuerpo técnico…"
                  isEmpty={(res) => res.data.length === 0}
                  empty={<p className={muted}>Aún no hay cuerpo técnico registrado.</p>}
                >
                  {(res) => (
                    <ul className="grid gap-3 md:grid-cols-3">
                      {res.data.map((staff) => (
                        <li key={staff.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-700/30 p-3">
                          <Avatar className="size-10 shrink-0 border border-purple-500/30">
                            {staff.photo && <AvatarImage src={staff.photo} alt="" />}
                            <AvatarFallback className="bg-purple-500/20 text-xs text-purple-400" aria-hidden="true">{initials(staff.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{staff.name}</p>
                            <Badge className="mt-0.5 border-0 bg-purple-500/20 px-1.5 py-0 text-[10px] text-purple-400">{staff.role || 'Staff'}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryState>
              </section>

              <section aria-labelledby="team-matches-title" className={`${panelClass} p-3 md:rounded-2xl md:p-5`}>
                <SectionTitle id="team-matches-title">Partidos Recientes</SectionTitle>
                <TeamMatches team={teamData} />
              </section>
            </>
          )}
        </QueryState>
      </div>
      <footer className="py-3 text-center">
        <p className="text-[10px] text-gray-700">© {new Date().getFullYear()} Zona Gol</p>
      </footer>
    </div>
  )
}

function Stat({ label, value, tone = 'text-white' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg border border-white/5 bg-slate-700/50 p-2 text-center md:p-3">
      <dt className="text-[10px] text-gray-500 md:text-xs">{label}</dt>
      <dd className={`text-lg font-bold md:text-xl ${tone}`}>{value}</dd>
    </div>
  )
}
