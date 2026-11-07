import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/features/leagues/leagues-page'

import {
  useTeam,
  useTeamCoachingStaff,
  useTeamMatches,
  useTeamPlayers,
  useTeamStats,
} from '../api'

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const team = useTeam(teamId)
  const players = useTeamPlayers(teamId)
  const coachingStaff = useTeamCoachingStaff(teamId)
  const stats = useTeamStats(teamId)
  const matches = useTeamMatches(teamId)

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
      <QueryState query={team} loadingLabel="Cargando equipo…">
        {(teamData) => (
          <>
            {/* Header */}
            <header className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
                <ArrowLeft className="size-4" /> Inicio
              </Link>

              <div className="flex items-start gap-4">
                <Avatar className="size-20 flex-shrink-0">
                  {teamData.logo && <AvatarImage src={teamData.logo} alt="" />}
                  <AvatarFallback className="text-lg">{initials(teamData.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold">{teamData.name}</h1>
                  {teamData.description && (
                    <p className="text-muted-foreground line-clamp-2">{teamData.description}</p>
                  )}
                </div>
              </div>
            </header>

            {/* Stats */}
            <QueryState query={stats} loadingLabel="Cargando estadísticas…">
              {(statsData) => (
                <div className="grid gap-4 md:grid-cols-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{statsData.matches_played}</p>
                      <p className="text-xs text-muted-foreground">Partidos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{statsData.wins}</p>
                      <p className="text-xs text-muted-foreground">Victorias</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-600">{statsData.draws}</p>
                      <p className="text-xs text-muted-foreground">Empates</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-red-600">{statsData.losses}</p>
                      <p className="text-xs text-muted-foreground">Derrotas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{statsData.goals_for}</p>
                      <p className="text-xs text-muted-foreground">Goles a Favor</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{statsData.points}</p>
                      <p className="text-xs text-muted-foreground">Puntos</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </QueryState>

            {/* Players */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Jugadores</h2>
              <QueryState query={players} loadingLabel="Cargando jugadores…">
                {(playersRes) => (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Jugador</TableHead>
                            <TableHead>Posición</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playersRes.data.map((player) => (
                            <TableRow key={player.id}>
                              <TableCell className="text-center font-semibold">
                                {player.jersey_number || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {player.photo && (
                                    <img
                                      src={player.photo}
                                      alt={player.name}
                                      className="size-8 rounded-full object-cover"
                                    />
                                  )}
                                  <span>{player.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {player.position || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </QueryState>
            </div>

            {/* Coaching Staff */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Cuerpo Técnico</h2>
              <QueryState query={coachingStaff} loadingLabel="Cargando cuerpo técnico…">
                {(staffRes) => (
                  <ul className="grid gap-4 md:grid-cols-3">
                    {staffRes.data.map((staff) => (
                      <li key={staff.id}>
                        <Card>
                          <CardContent className="p-4 flex items-center gap-3">
                            {staff.photo && (
                              <img
                                src={staff.photo}
                                alt={staff.name}
                                className="size-12 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{staff.name}</p>
                              <p className="text-xs text-muted-foreground">{staff.position || 'Staff'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </QueryState>
            </div>

            {/* Recent Matches */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Partidos Recientes</h2>
              <QueryState query={matches} loadingLabel="Cargando partidos…">
                {(matchesRes) => (
                  <div className="space-y-3">
                    {matchesRes.data.slice(0, 5).map((match) => (
                      <Card key={match.id}>
                        <CardContent className="p-4">
                          <div className="grid gap-4 md:grid-cols-3 md:items-center">
                            {/* Home */}
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm truncate">{match.home_team?.name || 'Local'}</span>
                              <Avatar className="size-8">
                                {match.home_team?.logo && <AvatarImage src={match.home_team.logo} alt="" />}
                                <AvatarFallback className="text-xs">
                                  {initials(match.home_team?.name ?? 'L')}
                                </AvatarFallback>
                              </Avatar>
                            </div>

                            {/* Score */}
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl font-bold w-8 text-center">{match.home_score}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-xl font-bold w-8 text-center">{match.away_score}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(match.match_date).toLocaleDateString('es-MX')}
                              </span>
                            </div>

                            {/* Away */}
                            <div className="flex items-center justify-start gap-2">
                              <Avatar className="size-8">
                                {match.away_team?.logo && <AvatarImage src={match.away_team.logo} alt="" />}
                                <AvatarFallback className="text-xs">
                                  {initials(match.away_team?.name ?? 'V')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{match.away_team?.name || 'Visitante'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </QueryState>
            </div>
          </>
        )}
      </QueryState>
    </section>
  )
}
