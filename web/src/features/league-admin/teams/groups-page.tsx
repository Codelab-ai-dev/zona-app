import { useState } from 'react'
import { AlertCircle, RefreshCw, Shuffle, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLeagueTournaments } from '@/features/leagues/api'
import type { Tournament } from '@/features/leagues/types'

import { useTeamsByLeague, useUpdateTeam } from './api'
import { GroupTeamsTable } from './components/group-teams-table'
import { LeaguePicker } from './components/league-picker'
import { groupTeams, lettersFor, planAutoDistribute, unassignedTeams, type Assignment } from './groups-logic'
import type { Team } from './types'
import { useSelectedLeague } from './use-selected-league'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido')

/** The original managed the league's active tournament, only when it is "Grupos + Eliminación". */
const pickTournament = (tournaments: Tournament[]) => {
  const active = tournaments.filter((t) => t.is_active)
  return active.find((t) => t.tournament_format === 'group_knockout') ?? active[0]
}

function NotAvailable() {
  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
      <h1 className="sr-only">Gestión de Grupos</h1>
      <CardContent className="py-12 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-white/50 drop-shadow-lg" aria-hidden="true" />
        <h2 className="mb-2 text-lg font-semibold text-white drop-shadow">No disponible</h2>
        <p className="text-white/80 drop-shadow">
          La gestión de grupos solo está disponible para torneos de formato &quot;Grupos + Eliminación&quot;
        </p>
      </CardContent>
    </Card>
  )
}

function TournamentGroups({ leagueId, tournament }: { leagueId: string; tournament: Tournament }) {
  const teamsQuery = useTeamsByLeague(leagueId)
  const updateTeam = useUpdateTeam()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<Record<string, string>>({})
  const [confirmShuffle, setConfirmShuffle] = useState(false)

  const groupCount = tournament.number_of_groups || 4
  const letters = lettersFor(groupCount)
  const allTeams = teamsQuery.data?.data ?? []
  const teams: Team[] = allTeams
    .filter((t) => t.tournament_id === tournament.id && t.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
  const nameOf = (id: string) => allTeams.find((t) => t.id === id)?.name ?? id
  const unassigned = unassignedTeams(teams, groupCount)

  /** One PATCH /teams/{id} per assignment; failures are collected per team. */
  const applyAssignments = async (assignments: Assignment[]) => {
    setBusy(true)
    setFailed({})
    const errors: Record<string, string> = {}
    let ok = 0
    for (const { teamId, group } of assignments) {
      try {
        await updateTeam.mutateAsync({ teamId, team: { group_name: group } })
        ok++
      } catch (error) {
        errors[teamId] = errorMessage(error)
      }
    }
    setFailed(errors)
    setBusy(false)
    return { ok, failures: Object.keys(errors).length }
  }

  const handleAssign = async (teamId: string, group: string) => {
    const { ok, failures } = await applyAssignments([{ teamId, group }])
    if (ok > 0) toast.success(`${nameOf(teamId)} asignado al grupo ${group}`)
    if (failures > 0) toast.error(`No se pudo asignar ${nameOf(teamId)}`)
  }

  const runAutoDistribute = async () => {
    setConfirmShuffle(false)
    const { ok, failures } = await applyAssignments(planAutoDistribute(teams, groupCount))
    if (failures > 0) toast.warning(`${ok} equipos distribuidos, ${failures} fallaron`)
    else toast.success(`${ok} equipos distribuidos automáticamente`)
  }

  // Shuffling reassigns every team, so ask first when some already have a group.
  const handleAutoDistribute = () => {
    if (teams.some((t) => t.group_name)) setConfirmShuffle(true)
    else void runAutoDistribute()
  }

  const failedList = Object.entries(failed)
  return (
    <QueryState
      query={teamsQuery}
      loadingLabel="Cargando grupos..."
    >
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">Gestión de Grupos</h1>
              <p className="text-white/80 drop-shadow">
                {tournament.name} - {groupCount} grupos
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => void teamsQuery.refetch()}
                disabled={busy || teamsQuery.isFetching}
                className="border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Actualizar
              </Button>
              <Button
                onClick={handleAutoDistribute}
                disabled={busy || teams.length === 0}
                className="border-0 bg-blue-500/80 text-white backdrop-blur-md hover:bg-blue-500/90"
              >
                <Shuffle className="mr-2 h-4 w-4" aria-hidden="true" />
                Distribuir Automáticamente
              </Button>
            </div>
          </div>

          {busy && <p role="status" className="text-sm text-white/70">Procesando…</p>}

          {failedList.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                <p>No se pudo actualizar:</p>
                <ul className="list-disc pl-5">
                  {failedList.map(([id, message]) => (
                    <li key={id}>
                      {nameOf(id)}: {message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {unassigned.length > 0 && (
            <Card className="border-orange-400/30 bg-orange-500/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                  <Users className="h-5 w-5" aria-hidden="true" />
                  Equipos sin Grupo ({unassigned.length})
                </CardTitle>
                <CardDescription className="text-white/80 drop-shadow">Asigna estos equipos a un grupo para continuar</CardDescription>
              </CardHeader>
              <CardContent>
                <GroupTeamsTable teams={unassigned} letters={letters} failed={failed} disabled={busy} onAssign={handleAssign} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {groupTeams(teams, groupCount).map(([letter, list]) => (
              <Card key={letter} className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white drop-shadow-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/80 font-bold text-white" aria-hidden="true">{letter}</div>
                    Grupo {letter}
                  </CardTitle>
                  <CardDescription className="text-white/80 drop-shadow">{list.length} equipos asignados</CardDescription>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-white/70 drop-shadow">No hay equipos asignados</p>
                    </div>
                  ) : (
                    <GroupTeamsTable compact teams={list} letters={letters} failed={failed} disabled={busy} onAssign={handleAssign} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-blue-400/30 bg-blue-500/10 backdrop-blur-xl">
            <CardContent className="py-4">
              <p className="text-sm text-white/80 drop-shadow">
                <strong>Nota:</strong> Una vez que asignes los equipos a sus grupos, podrás generar los partidos de la fase de grupos en la sección &quot;Fixtures&quot;. Los mejores{' '}
                {tournament.teams_advancing_per_group || 2} equipos de cada grupo avanzarán a la fase de eliminación directa.
              </p>
            </CardContent>
          </Card>

          <AlertDialog open={confirmShuffle} onOpenChange={setConfirmShuffle}>
            <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Distribuir automáticamente</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Se reasignarán al azar los {teams.length} equipos del torneo, incluidos los que ya tienen grupo. ¿Continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Cancelar</AlertDialogCancel>
                <Button onClick={() => void runAutoDistribute()} className="bg-blue-500 text-white hover:bg-blue-600">
                  Distribuir
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </QueryState>
  )
}

export function GroupsPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const tournamentsQuery = useLeagueTournaments(leagueId)

  return (
    <div className="space-y-6 py-6">
      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />
            <QueryState query={tournamentsQuery} loadingLabel="Cargando grupos...">
              {(res) => {
                const tournament = pickTournament(res.data)
                return tournament && tournament.tournament_format === 'group_knockout' ? (
                  <TournamentGroups key={tournament.id} leagueId={leagueId} tournament={tournament} />
                ) : (
                  <NotAvailable />
                )
              }}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
