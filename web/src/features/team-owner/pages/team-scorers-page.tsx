import { Target, Trophy } from 'lucide-react'
import { useMemo } from 'react'

import { QueryState, EmptyState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { useTeam, useTopScorers } from '../api'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import type { PlayerStats } from '../types'

const medalBadge: Record<number, string> = {
  1: 'bg-yellow-500/80 hover:bg-yellow-500/90',
  2: 'bg-gray-400/80 hover:bg-gray-400/90',
  3: 'bg-orange-600/80 hover:bg-orange-600/90',
}
const th = 'text-white/90 drop-shadow bg-transparent'

export function TeamScorersPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className={pageTitle}>Goleadores del Equipo</h2>
        <p className={pageSubtitle}>Tabla de goleo de tus jugadores</p>
      </div>

      <QueryState query={team} loadingLabel="Cargando equipo…">
        {(data) =>
          data.tournament_id ? (
            <ScorersTables teamId={teamId} tournamentId={data.tournament_id} />
          ) : (
            <EmptyState title="Sin torneo" description="Tu equipo aún no está inscrito en un torneo." />
          )
        }
      </QueryState>
    </div>
  )
}

function Podium({ scorers }: { scorers: PlayerStats[] }) {
  const [first, second, third] = scorers
  if (!first || !second || !third) return null
  const places = [
    { s: second, order: 'order-1', block: 'h-28 sm:h-32 bg-slate-500/30 border-slate-400/30', emoji: '🥈', emojiSize: 'text-3xl sm:text-4xl', edge: 'border-slate-400/50', name: 'text-sm sm:text-lg', goals: 'text-xl sm:text-2xl text-slate-300' },
    { s: first, order: 'order-2', block: 'h-36 sm:h-40 bg-yellow-600/30 border-yellow-500/30', emoji: '🥇', emojiSize: 'text-4xl sm:text-5xl', edge: 'border-yellow-500/50', name: 'text-base sm:text-xl', goals: 'text-2xl sm:text-3xl text-yellow-400' },
    { s: third, order: 'order-3', block: 'h-20 sm:h-24 bg-orange-700/30 border-orange-500/30', emoji: '🥉', emojiSize: 'text-2xl sm:text-3xl', edge: 'border-orange-500/50', name: 'text-sm sm:text-lg', goals: 'text-xl sm:text-2xl text-orange-400' },
  ]
  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Trophy className="w-5 h-5 text-yellow-400" aria-hidden="true" />
          Podio del Equipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {places.map(({ s, order, block, emoji, emojiSize, edge, name, goals }) => (
            <div key={order} className={cn('text-center', order)}>
              <div className={cn('backdrop-blur-md border rounded-t-xl flex items-end justify-center pb-4', block)}>
                <span className={emojiSize} aria-hidden="true">{emoji}</span>
              </div>
              <div className={cn('backdrop-blur-md bg-slate-800/50 p-3 sm:p-4 rounded-b-xl border-t-4 border border-slate-600/30', edge)}>
                <p className={cn('font-bold truncate text-white drop-shadow', name)}>{s.player_name}</p>
                <p className="text-xs sm:text-sm text-white/70 drop-shadow">#{s.jersey_number}</p>
                <p className={cn('font-bold drop-shadow-lg mt-2', goals)}>{s.goals} ⚽</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ScorersTables({ teamId, tournamentId }: { teamId: string; tournamentId: string }) {
  const topScorers = useTopScorers(tournamentId)

  const teamScorers = useMemo(
    () => (topScorers.data?.data ?? []).filter((s) => s.team_id === teamId && s.goals > 0),
    [topScorers.data, teamId],
  )

  return (
    <QueryState
      query={topScorers}
      isEmpty={(res) => res.data.length === 0}
      empty={<EmptyState title="Sin goleadores" description="No hay datos de goles disponibles." />}
    >
      {(res) => (
        <>
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                <Trophy className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                Máximos Goleadores
              </CardTitle>
              <CardDescription className="text-white/70 drop-shadow">
                {teamScorers.length > 0
                  ? `${teamScorers.length} jugador${teamScorers.length > 1 ? 'es' : ''} con goles`
                  : 'No hay goles registrados aún'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamScorers.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" aria-hidden="true" />
                  <p className="text-white/80 drop-shadow">No hay goles registrados todavía</p>
                  <p className="text-sm text-white/70 drop-shadow mt-2">Los goles aparecerán aquí cuando se registren en los partidos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-white/20 hover:bg-transparent">
                        <TableHead className={cn('w-20', th)}>Posición</TableHead>
                        <TableHead className={th}>Jugador</TableHead>
                        <TableHead className={cn('text-center', th)}>Dorsal</TableHead>
                        <TableHead className={cn('text-center', th)}>Asistencias</TableHead>
                        <TableHead className={cn('text-center', th)}>Goles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamScorers.map((s, index) => {
                        const position = index + 1
                        return (
                          <TableRow key={s.player_id} className={cn('border-white/10 hover:bg-white/5', position <= 3 ? 'bg-yellow-500/10' : 'bg-transparent')}>
                            <TableCell className="bg-transparent">
                              {position <= 3 ? (
                                <Badge className={cn('backdrop-blur-md text-white border-0', medalBadge[position])}>{position}°</Badge>
                              ) : (
                                <Badge variant="outline" className="border-white/30 text-white/80">{position}°</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-white drop-shadow bg-transparent">{s.player_name}</TableCell>
                            <TableCell className="text-center bg-transparent">
                              <Badge variant="outline" className="font-bold backdrop-blur-md bg-white/20 border-white/30 text-white">#{s.jersey_number}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-white/80 bg-transparent">{s.assists}</TableCell>
                            <TableCell className="text-center bg-transparent">
                              <Badge className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 border-0">⚽ {s.goals}</Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {teamScorers.length >= 3 && <Podium scorers={teamScorers} />}

          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-white drop-shadow-lg">Top 10 Goleadores del Torneo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-transparent">
                      <TableHead className={th}>#</TableHead>
                      <TableHead className={th}>Jugador</TableHead>
                      <TableHead className={th}>Equipo</TableHead>
                      <TableHead className={cn('text-center', th)}>Goles</TableHead>
                      <TableHead className={cn('text-center', th)}>Partidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.slice(0, 10).map((s, index) => (
                      <TableRow key={s.player_id} className={cn('border-white/10 hover:bg-white/5', s.team_id === teamId ? 'bg-green-500/20' : 'bg-transparent')}>
                        <TableCell className="font-semibold text-white/80">{index + 1}</TableCell>
                        <TableCell className="font-medium text-white">{s.player_name}</TableCell>
                        <TableCell className="text-white/80">{s.team_name}</TableCell>
                        <TableCell className="text-center font-bold text-green-400">{s.goals}</TableCell>
                        <TableCell className="text-center text-white/80">{s.matches_played}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </QueryState>
  )
}
