import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { QueryState, EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLeagueBySlug } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { Tournament } from '@/features/leagues/types'

import { useDiscipline, useStandings, useTopScorers, useTournamentMatches, useTournamentsByLeague } from '../api'
import type { Match } from '../types'

export function TournamentDetailPage() {
  const { slug, tournamentId } = useParams<{ slug: string; tournamentId: string }>()
  const [activeTab, setActiveTab] = useState('standings')

  const league = useLeagueBySlug(slug ?? '')
  const tournaments = useTournamentsByLeague(league.data?.id)
  const standings = useStandings(tournamentId)
  const matches = useTournamentMatches(tournamentId)
  const topScorers = useTopScorers(tournamentId)
  const discipline = useDiscipline(tournamentId)

  const tournament = tournaments.data?.data.find((t: Tournament) => t.id === tournamentId)

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <Link to={`/liga/${slug}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="size-4" /> {league.data?.name}
        </Link>
        {tournament && (
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground text-sm">
              {new Date(tournament.start_date).toLocaleDateString('es-MX')} -{' '}
              {new Date(tournament.end_date).toLocaleDateString('es-MX')}
            </p>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standings">Tabla</TabsTrigger>
            <TabsTrigger value="matches">Partidos</TabsTrigger>
            <TabsTrigger value="top-scorers">Goleadores</TabsTrigger>
            <TabsTrigger value="discipline">Disciplina</TabsTrigger>
          </TabsList>

          {/* Standings */}
          <TabsContent value="standings" className="mt-6">
            <QueryState
              query={standings}
              loadingLabel="Cargando tabla…"
              isEmpty={(res) => res.data.length === 0}
            >
              {(res) => (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center w-12">PJ</TableHead>
                          <TableHead className="text-center w-12">G</TableHead>
                          <TableHead className="text-center w-12">E</TableHead>
                          <TableHead className="text-center w-12">P</TableHead>
                          <TableHead className="text-center w-12">GF</TableHead>
                          <TableHead className="text-center w-12">GC</TableHead>
                          <TableHead className="text-center w-12">DG</TableHead>
                          <TableHead className="text-center w-12">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {res.data.map((standing) => (
                          <TableRow key={standing.team_id}>
                            <TableCell className="text-center font-semibold">{standing.position}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6 flex-shrink-0">
                                  {standing.team_logo && <AvatarImage src={standing.team_logo} alt="" />}
                                  <AvatarFallback className="text-xs">
                                    {initials(standing.team_name ?? 'EQ')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm">{standing.team_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">{standing.played}</TableCell>
                            <TableCell className="text-center text-sm">{standing.won}</TableCell>
                            <TableCell className="text-center text-sm">{standing.drawn}</TableCell>
                            <TableCell className="text-center text-sm">{standing.lost}</TableCell>
                            <TableCell className="text-center text-sm">{standing.goals_for}</TableCell>
                            <TableCell className="text-center text-sm">{standing.goals_against}</TableCell>
                            <TableCell className="text-center text-sm">{standing.goal_difference}</TableCell>
                            <TableCell className="text-center font-bold">{standing.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </QueryState>
          </TabsContent>

          {/* Matches */}
          <TabsContent value="matches" className="mt-6">
            <QueryState
              query={matches}
              loadingLabel="Cargando partidos…"
              isEmpty={(res) => res.data.length === 0}
              empty={<EmptyState title="No hay partidos" />}
            >
              {(res) => (
                <div className="space-y-3">
                  {res.data.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </QueryState>
          </TabsContent>

          {/* Top Scorers */}
          <TabsContent value="top-scorers" className="mt-6">
            <QueryState
              query={topScorers}
              loadingLabel="Cargando goleadores…"
              isEmpty={(res) => res.data.length === 0}
            >
              {(res) => (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Jugador</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center w-16">Goles</TableHead>
                          <TableHead className="text-center w-16">Asistencias</TableHead>
                          <TableHead className="text-center w-16">PJ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {res.data.map((scorer, index) => (
                          <TableRow key={scorer.player_id}>
                            <TableCell className="text-center font-semibold">{index + 1}</TableCell>
                            <TableCell className="font-medium">{scorer.player_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{scorer.team_name}</TableCell>
                            <TableCell className="text-center font-bold">{scorer.goals}</TableCell>
                            <TableCell className="text-center">{scorer.assists}</TableCell>
                            <TableCell className="text-center">{scorer.matches_played}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </QueryState>
          </TabsContent>

          {/* Discipline */}
          <TabsContent value="discipline" className="mt-6">
            <QueryState
              query={discipline}
              loadingLabel="Cargando disciplina…"
              isEmpty={(res) => res.data.length === 0}
            >
              {(res) => (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jugador</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center w-20">Amarillas</TableHead>
                          <TableHead className="text-center w-20">Rojas</TableHead>
                          <TableHead className="text-center w-20">PJ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {res.data.map((card) => (
                          <TableRow key={card.player_id}>
                            <TableCell className="font-medium">{card.player_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{card.team_name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">
                                {card.yellow_cards}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="bg-red-500/20">
                                {card.red_cards}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{card.matches_played}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </QueryState>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(match.match_date)
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'in_progress'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          {/* Home Team */}
          <div className="flex items-center justify-end gap-2">
            <div className="text-right">
              <p className="font-semibold text-sm truncate">{match.home_team?.name || 'Local'}</p>
              <p className="text-xs text-muted-foreground">{matchDate.toLocaleDateString('es-MX')}</p>
            </div>
            <Avatar className="size-8">
              {match.home_team?.logo && <AvatarImage src={match.home_team.logo} alt="" />}
              <AvatarFallback className="text-xs">{initials(match.home_team?.name ?? 'L')}</AvatarFallback>
            </Avatar>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            {isFinished || isLive ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold w-8 text-center">{match.home_score}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-2xl font-bold w-8 text-center">{match.away_score}</span>
                </div>
                {isLive && <Badge variant="default" className="bg-green-600">EN VIVO</Badge>}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{match.match_time || 'Por definir'}</div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-start gap-2">
            <Avatar className="size-8">
              {match.away_team?.logo && <AvatarImage src={match.away_team.logo} alt="" />}
              <AvatarFallback className="text-xs">{initials(match.away_team?.name ?? 'V')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm truncate">{match.away_team?.name || 'Visitante'}</p>
              <p className="text-xs text-muted-foreground">{match.round ? `Jornada ${match.round}` : ''}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
