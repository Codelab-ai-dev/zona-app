import { Medal, Trophy } from 'lucide-react'

import { QueryState, EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { useTeam, useTournamentStandings } from '../api'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import { initials } from '../utils'
import type { Standings } from '../types'

const th = 'text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2'
const medalStyle: Record<number, string> = {
  1: 'bg-yellow-500/80 hover:bg-yellow-500/90',
  2: 'bg-gray-400/80 hover:bg-gray-400/90',
  3: 'bg-orange-600/80 hover:bg-orange-600/90',
}

function PositionBadge({ position }: { position: number }) {
  if (position <= 3) {
    return (
      <Badge className={cn('backdrop-blur-md text-white border-0', medalStyle[position])}>
        <Medal className="w-3 h-3 mr-1" aria-hidden="true" />
        {position}°
      </Badge>
    )
  }
  return <Badge variant="outline" className="border-white/30 text-white/80">{position}°</Badge>
}

/** Standings of the team's tournament, styled like the original dashboard tab. */
export function TeamStandingsPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)

  return (
    <div className="space-y-6">
      <QueryState query={team} loadingLabel="Cargando equipo…">
        {(data) =>
          data.tournament_id ? (
            <StandingsTable tournamentId={data.tournament_id} teamId={teamId} teamName={data.name} />
          ) : (
            <EmptyState title="Sin torneo" description="Tu equipo aún no está inscrito en un torneo." />
          )
        }
      </QueryState>
    </div>
  )
}

function Summary({ row, position, teamName }: { row: Standings; position: number; teamName: string }) {
  const ring =
    position === 1 ? 'bg-yellow-500/30 border-yellow-400 text-yellow-400'
    : position === 2 ? 'bg-gray-400/30 border-gray-300 text-gray-300'
    : position === 3 ? 'bg-orange-500/30 border-orange-400 text-orange-400'
    : 'bg-white/20 border-white/30 text-white'
  const tiles = [
    { label: 'Victorias', value: row.matches_won, tone: 'bg-green-500/20 border-green-300/30 text-green-400' },
    { label: 'Empates', value: row.matches_drawn, tone: 'bg-yellow-500/20 border-yellow-300/30 text-yellow-400' },
    { label: 'Derrotas', value: row.matches_lost, tone: 'bg-red-500/20 border-red-300/30 text-red-400' },
  ]
  return (
    <Card className={glassCard}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn('flex items-center justify-center w-16 h-16 rounded-full backdrop-blur-md border-2', ring)}>
              <span className="text-2xl font-bold">{position}°</span>
            </div>
            <Avatar className="w-14 h-14 border-2 border-white/30">
              {row.team_logo ? <AvatarImage src={row.team_logo} alt={teamName} /> : null}
              <AvatarFallback className="bg-slate-700 text-white text-lg">{initials(teamName)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold text-white drop-shadow">{teamName}</h3>
              <p className="text-sm text-white/70 drop-shadow">{row.points} puntos</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {tiles.map((t) => (
              <div key={t.label} className={cn('p-3 backdrop-blur-md rounded-xl border', t.tone.split(' ').slice(0, 2).join(' '))}>
                <p className={cn('text-lg font-bold', t.tone.split(' ')[2])}>{t.value}</p>
                <p className="text-xs text-white/70">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StandingsTable({ tournamentId, teamId, teamName }: { tournamentId: string; teamId: string; teamName: string }) {
  const standings = useTournamentStandings(tournamentId)

  return (
    <QueryState query={standings} isEmpty={(res) => res.data.length === 0} empty={<EmptyState title="Sin posiciones" description="Aún no hay tabla de posiciones para este torneo." />}>
      {(res) => {
        const own = res.data.find((s) => s.team_id === teamId)
        const ownPosition = own ? res.data.indexOf(own) + 1 : 0
        return (
          <>
            <div>
              <h2 className={pageTitle}>Tabla de Posiciones</h2>
              <p className={pageSubtitle}>
                {teamName} - {ownPosition > 0 ? `Posición ${ownPosition}° de ${res.data.length}` : 'Posición actual en la liga'}
              </p>
            </div>

            {own && <Summary row={own} position={ownPosition} teamName={teamName} />}

            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                  <Trophy className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  Clasificación General
                </CardTitle>
                <CardDescription className="text-white/70 drop-shadow">{res.data.length} equipos en el torneo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="border-collapse text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow className="border-white/20 hover:bg-transparent">
                        <TableHead className="w-10 sm:w-16 text-white/90 drop-shadow bg-transparent px-1 sm:px-4">#</TableHead>
                        <TableHead className="text-white/90 drop-shadow bg-transparent px-1 sm:px-4">Equipo</TableHead>
                        <TableHead className={th}>PJ</TableHead>
                        <TableHead className={th}>G</TableHead>
                        <TableHead className={th}>E</TableHead>
                        <TableHead className={th}>P</TableHead>
                        <TableHead className={cn(th, 'hidden sm:table-cell')}>GF</TableHead>
                        <TableHead className={cn(th, 'hidden sm:table-cell')}>GC</TableHead>
                        <TableHead className={th}>DG</TableHead>
                        <TableHead className={th}>Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {res.data.map((s, index) => {
                        const position = index + 1
                        const isOwn = s.team_id === teamId
                        return (
                          <TableRow
                            key={s.team_id}
                            className={cn(
                              'border-white/10 transition-colors',
                              isOwn
                                ? 'bg-green-500/30 hover:bg-green-500/40 border-l-4 border-l-green-400'
                                : position <= 3
                                  ? 'bg-yellow-500/10 hover:bg-yellow-500/15'
                                  : 'bg-transparent hover:bg-white/5',
                            )}
                          >
                            <TableCell className="bg-transparent px-1 sm:px-4">
                              <span className="sm:hidden font-bold text-white">{position}</span>
                              <span className="hidden sm:inline"><PositionBadge position={position} /></span>
                            </TableCell>
                            <TableCell className={cn('font-semibold drop-shadow bg-transparent px-1 sm:px-4', isOwn ? 'text-green-300' : 'text-white')}>
                              <div className="flex items-center gap-1 sm:gap-3">
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border border-white/20" aria-hidden="true">
                                  {s.team_logo ? <AvatarImage src={s.team_logo} alt="" /> : null}
                                  <AvatarFallback className="bg-slate-700 text-white text-[10px] sm:text-xs">{initials(s.team_name)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[80px] sm:max-w-none">{s.team_name}</span>
                                {isOwn && (
                                  <Badge className="hidden sm:inline-flex text-xs backdrop-blur-md bg-green-500/50 text-white border-0">Tu equipo</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={cn(th, 'text-white/80')}>{s.matches_played}</TableCell>
                            <TableCell className={cn(th, 'text-green-400')}>{s.matches_won}</TableCell>
                            <TableCell className={cn(th, 'text-yellow-400')}>{s.matches_drawn}</TableCell>
                            <TableCell className={cn(th, 'text-red-400')}>{s.matches_lost}</TableCell>
                            <TableCell className={cn(th, 'hidden sm:table-cell text-white/80')}>{s.goals_for}</TableCell>
                            <TableCell className={cn(th, 'hidden sm:table-cell text-white/80')}>{s.goals_against}</TableCell>
                            <TableCell className={cn(th, s.goal_difference > 0 ? 'text-green-400' : s.goal_difference < 0 ? 'text-red-400' : 'text-white/80')}>
                              {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                            </TableCell>
                            <TableCell className="text-center bg-transparent px-1 sm:px-2">
                              <Badge className={cn('backdrop-blur-md border-0 text-xs sm:text-sm px-1.5 sm:px-2', isOwn ? 'bg-green-500/80 hover:bg-green-500/90' : 'bg-blue-500/80 hover:bg-blue-500/90')}>
                                {s.points}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )
      }}
    </QueryState>
  )
}
