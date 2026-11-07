import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/features/leagues/leagues-page'
import { ApiError } from '@/lib/api/client'

import { useTeam, useTeamCoachingStaff, useTeamPlayers, useTeamStats } from '../api'
import { TeamMatches } from './team-matches'

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const team = useTeam(teamId)
  const players = useTeamPlayers(teamId)
  const coachingStaff = useTeamCoachingStaff(teamId)
  const stats = useTeamStats(teamId)

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      {!team.data && <h1 className="sr-only">Equipo</h1>}
      <QueryState query={team} loadingLabel="Cargando equipo…">
        {(teamData) => (
          <>
            <header className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" /> Inicio
              </Link>

              <div className="flex items-start gap-4">
                <Avatar className="size-20 shrink-0">
                  {teamData.logo && <AvatarImage src={teamData.logo} alt="" />}
                  <AvatarFallback className="text-lg" aria-hidden="true">{initials(teamData.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-bold">{teamData.name}</h1>
                  {teamData.description && <p className="line-clamp-2 text-muted-foreground">{teamData.description}</p>}
                </div>
              </div>
            </header>

            <section aria-labelledby="team-stats-title" className="space-y-4">
              <h2 id="team-stats-title" className="text-2xl font-bold">Estadísticas</h2>
              {stats.isError && stats.error instanceof ApiError && stats.error.status === 404 ? (
                <p className="text-sm text-muted-foreground">Aún no hay estadísticas para este equipo.</p>
              ) : (
                <QueryState query={stats} loadingLabel="Cargando estadísticas…">
                  {(s) => (
                    <dl className="grid grid-cols-2 gap-4 md:grid-cols-6">
                      <Stat label="Partidos" value={s.matches_played} />
                      <Stat label="Victorias" value={s.matches_won} />
                      <Stat label="Empates" value={s.matches_drawn} />
                      <Stat label="Derrotas" value={s.matches_lost} />
                      <Stat label="Goles a favor" value={s.goals_for} />
                      <Stat label="Puntos" value={s.points + s.points_adjustment} />
                    </dl>
                  )}
                </QueryState>
              )}
            </section>

            <section aria-labelledby="team-players-title" className="space-y-4">
              <h2 id="team-players-title" className="text-2xl font-bold">Jugadores</h2>
              <QueryState
                query={players}
                loadingLabel="Cargando jugadores…"
                isEmpty={(res) => res.data.length === 0}
                empty={<p className="text-sm text-muted-foreground">Aún no hay jugadores registrados.</p>}
              >
                {(res) => (
                  <Card>
                    <CardContent className="p-0">
                      <Table aria-label="Plantilla de jugadores">
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col" className="w-12 text-center">#</TableHead>
                            <TableHead scope="col">Jugador</TableHead>
                            <TableHead scope="col">Posición</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {res.data.map((player) => (
                            <TableRow key={player.id}>
                              <TableCell className="text-center font-semibold">{player.jersey_number || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {player.photo && (
                                    <img src={player.photo} alt="" className="size-8 rounded-full object-cover" />
                                  )}
                                  <span>{player.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{player.position || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </QueryState>
            </section>

            <section aria-labelledby="team-staff-title" className="space-y-4">
              <h2 id="team-staff-title" className="text-2xl font-bold">Cuerpo Técnico</h2>
              <QueryState
                query={coachingStaff}
                loadingLabel="Cargando cuerpo técnico…"
                isEmpty={(res) => res.data.length === 0}
                empty={<p className="text-sm text-muted-foreground">Aún no hay cuerpo técnico registrado.</p>}
              >
                {(res) => (
                  <ul className="grid gap-4 md:grid-cols-3">
                    {res.data.map((staff) => (
                      <li key={staff.id}>
                        <Card>
                          <CardContent className="flex items-center gap-3 p-4">
                            {staff.photo && (
                              <img src={staff.photo} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{staff.name}</p>
                              <p className="text-xs text-muted-foreground">{staff.role || 'Staff'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </QueryState>
            </section>

            <section aria-labelledby="team-matches-title" className="space-y-4">
              <h2 id="team-matches-title" className="text-2xl font-bold">Partidos Recientes</h2>
              <TeamMatches team={teamData} />
            </section>
          </>
        )}
      </QueryState>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col-reverse p-4 text-center">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-3xl font-bold">{value}</dd>
      </CardContent>
    </Card>
  )
}
