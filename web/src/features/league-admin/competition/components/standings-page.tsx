import { AlertTriangle, Edit, ImageDown, Loader2, Trophy } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMyLeagues } from '@/features/leagues/api'
import { cn } from '@/lib/utils'

import { useStandings, useTournaments } from '../api'
import type { Standings } from '../types'
import { PointsAdjustmentDialog } from './points-adjustment-dialog'
import { StandingsPosterGenerator } from './standings-poster-generator'
import { getTeamInitials } from './standings-poster'

const th = 'text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1'

export function StandingsPage({ leagueId }: { leagueId: string }) {
  const tournaments = useTournaments(leagueId)
  const leagues = useMyLeagues()
  const [chosen, setChosen] = useState('')
  const [selectedStanding, setSelectedStanding] = useState<Standings | null>(null)
  const [posterOpen, setPosterOpen] = useState(false)

  const list = tournaments.data?.data ?? []
  // Default to the active tournament, then the first one.
  const selectedTournament = chosen || (list.find((t) => t.is_active) ?? list[0])?.id || ''
  const standings = useStandings(selectedTournament || undefined)
  const rows = standings.data?.data ?? []
  const league = leagues.data?.data.find((l) => l.id === leagueId)

  if (tournaments.isPending) {
    return (
      <div role="status" className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-green-400" aria-hidden="true" />
          <span className="text-gray-400 text-sm">Cargando...</span>
        </div>
      </div>
    )
  }
  if (tournaments.isError) return <ErrorState error={tournaments.error} onRetry={() => void tournaments.refetch()} />

  return (
    <section aria-labelledby="standings-title" className="space-y-4 md:space-y-6">
      <div className="rounded-xl bg-slate-800/50 border border-white/10">
        <div className="p-3 md:p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" aria-hidden="true" />
                <h2 id="standings-title" className="text-sm md:text-base font-semibold text-white">
                  Tabla de Posiciones
                </h2>
              </div>
              <p className="text-[10px] md:text-xs text-gray-500">Gestiona la tabla de posiciones y aplica sanciones</p>
            </div>
            <Button
              onClick={() => setPosterOpen(true)}
              disabled={standings.isPending || rows.length === 0}
              size="sm"
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
            >
              <ImageDown className="w-4 h-4 mr-2" aria-hidden="true" />
              Generar Imagen
            </Button>
          </div>
        </div>

        <div className="p-3 md:p-4">
          {list.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="tournament-select" className="text-gray-400 text-xs mb-1.5 block">
                Seleccionar Torneo
              </Label>
              <Select value={selectedTournament} onValueChange={setChosen}>
                <SelectTrigger id="tournament-select" className="w-full md:w-80 h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                  <SelectValue placeholder="Seleccionar torneo" />
                </SelectTrigger>
                <SelectContent>
                  {list.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name} {tournament.is_active && '(Activo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!selectedTournament ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 text-sm">Sin torneos</p>
              <p className="text-gray-600 text-xs mt-1">Crea un torneo para ver la tabla</p>
            </div>
          ) : standings.isPending ? (
            <div role="status" className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-green-400" aria-hidden="true" />
              <span className="text-gray-400 text-sm">Cargando posiciones…</span>
            </div>
          ) : standings.isError ? (
            <ErrorState error={standings.error} onRetry={() => void standings.refetch()} />
          ) : rows.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 text-sm">No hay equipos en este torneo</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-[10px] md:text-xs font-medium w-8 md:w-10 px-1 md:px-2">#</TableHead>
                    <TableHead className="text-gray-400 text-[10px] md:text-xs font-medium px-1 md:px-2">Equipo</TableHead>
                    <TableHead className={th}>PJ</TableHead>
                    <TableHead className={th}>PG</TableHead>
                    <TableHead className={th}>PE</TableHead>
                    <TableHead className={th}>PP</TableHead>
                    <TableHead className={cn(th, 'hidden md:table-cell')}>GF</TableHead>
                    <TableHead className={cn(th, 'hidden md:table-cell')}>GC</TableHead>
                    <TableHead className={cn(th, 'w-8')}>DG</TableHead>
                    <TableHead className={cn(th, 'w-9 md:w-12')}>PTS</TableHead>
                    <TableHead className={cn(th, 'w-8')}>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((team) => {
                    const hasAdjustment = team.points_adjustment !== 0
                    return (
                      <TableRow key={team.team_id} className={cn('border-b border-white/5 hover:bg-slate-700/30', hasAdjustment && 'bg-red-500/10')}>
                        <TableCell className="font-semibold text-white text-xs md:text-sm px-1 md:px-2">{team.position}</TableCell>
                        <TableCell className="px-1 md:px-2">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                              {team.team_logo && <AvatarImage src={team.team_logo} alt={team.team_name} />}
                              <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-xs font-bold">
                                {getTeamInitials(team.team_name).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-medium text-white text-[10px] md:text-sm block truncate max-w-[80px] md:max-w-none">{team.team_name}</span>
                              {hasAdjustment && (
                                <div className="flex items-center">
                                  <AlertTriangle className="w-2.5 h-2.5 text-red-400 mr-0.5" aria-hidden="true" />
                                  <span className="text-[8px] md:text-[10px] text-red-400">
                                    {team.points_adjustment > 0 ? '+' : ''}
                                    {team.points_adjustment}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-gray-300 text-[10px] md:text-sm px-1">{team.matches_played}</TableCell>
                        <TableCell className="text-center text-green-400 text-[10px] md:text-sm px-1">{team.matches_won}</TableCell>
                        <TableCell className="text-center text-yellow-400 text-[10px] md:text-sm px-1">{team.matches_drawn}</TableCell>
                        <TableCell className="text-center text-red-400 text-[10px] md:text-sm px-1">{team.matches_lost}</TableCell>
                        <TableCell className="text-center text-gray-300 text-[10px] md:text-sm px-1 hidden md:table-cell">{team.goals_for}</TableCell>
                        <TableCell className="text-center text-gray-300 text-[10px] md:text-sm px-1 hidden md:table-cell">{team.goals_against}</TableCell>
                        <TableCell className="text-center text-[10px] md:text-sm px-1">
                          <span className={team.goal_difference > 0 ? 'text-green-400' : team.goal_difference < 0 ? 'text-red-400' : 'text-gray-500'}>
                            {team.goal_difference > 0 ? '+' : ''}
                            {team.goal_difference}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-white text-sm md:text-base">{team.points}</span>
                            {hasAdjustment && (
                              <span className="text-[8px] md:text-[10px] text-gray-500">
                                ({team.points_adjustment > 0 ? '+' : ''}
                                {team.points_adjustment})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedStanding(team)}
                            aria-label={`Ajustar puntos de ${team.team_name}`}
                            className="h-7 w-7 md:h-8 md:w-8 p-0 text-gray-400 hover:text-white hover:bg-slate-700/50"
                          >
                            <Edit className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {selectedStanding && (
        <PointsAdjustmentDialog standing={selectedStanding} tournamentId={selectedTournament} onClose={() => setSelectedStanding(null)} />
      )}

      <StandingsPosterGenerator
        open={posterOpen}
        onOpenChange={setPosterOpen}
        standings={rows}
        leagueName={league?.name ?? ''}
        leagueLogo={league?.logo}
        tournamentName={list.find((t) => t.id === selectedTournament)?.name ?? 'Torneo'}
      />
    </section>
  )
}
