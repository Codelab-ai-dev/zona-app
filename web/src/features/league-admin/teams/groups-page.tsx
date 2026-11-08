import { useState } from 'react'
import { AlertCircle, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useTeamsByLeague, useUpdateTeam } from './api'
import { GroupTeamsTable } from './components/group-teams-table'
import { LeaguePicker } from './components/league-picker'
import { groupTeams, planAutoDistribute, type Assignment } from './groups-logic'
import { useSelectedLeague } from './use-selected-league'

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido')

export function GroupsPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const teamsQuery = useTeamsByLeague(leagueId)
  const updateTeam = useUpdateTeam()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<Record<string, string>>({})
  const [groupCount, setGroupCount] = useState(2)

  const teams = teamsQuery.data?.data ?? []
  const nameOf = (id: string) => teams.find((t) => t.id === id)?.name ?? id

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

  const handleAutoDistribute = async () => {
    const plan = planAutoDistribute(teams, groupCount)
    const { ok, failures } = await applyAssignments(plan)
    if (failures > 0) toast.warning(`${ok} equipos distribuidos, ${failures} fallaron`)
    else toast.success(`${ok} equipos distribuidos automáticamente`)
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">Gestión de Grupos</h1>
        <p className="text-white/80 drop-shadow">Asigna equipos a grupos (A, B, C…)</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
            >
              {(res) => {
                const unassigned = res.data.filter((t) => !t.group_name)
                const failedList = Object.entries(failed)
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="group-count" className="text-white/90">Número de grupos</Label>
                        <Input
                          id="group-count"
                          type="number"
                          min={1}
                          max={26}
                          className="w-28 border-white/30 bg-white/10 text-white"
                          value={groupCount}
                          onChange={(e) => setGroupCount(Math.min(26, Math.max(1, Number(e.target.value) || 1)))}
                        />
                      </div>
                      <Button onClick={handleAutoDistribute} disabled={busy || unassigned.length === 0} className="border-0 bg-blue-500/80 text-white backdrop-blur-md hover:bg-blue-500/90">
                        <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                        Distribuir automáticamente
                      </Button>
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
                            Equipos sin grupo ({unassigned.length})
                          </CardTitle>
                          <CardDescription className="text-white/80 drop-shadow">Asigna estos equipos a un grupo para continuar</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <GroupTeamsTable teams={unassigned} failed={failed} disabled={busy} onAssign={handleAssign} />
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {groupTeams(res.data).map(([letter, list]) => (
                        <Card key={letter} className="border-white/20 bg-white/10 backdrop-blur-xl">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-white drop-shadow-lg">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/80 font-bold text-white">{letter}</div>
                              Grupo {letter} ({list.length})
                            </CardTitle>
                            <CardDescription className="text-white/80 drop-shadow">{list.length} equipos asignados</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <GroupTeamsTable compact teams={list} failed={failed} disabled={busy} onAssign={handleAssign} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="border-blue-400/30 bg-blue-500/10 backdrop-blur-xl">
                      <CardContent className="py-4">
                        <p className="text-sm text-white/80 drop-shadow">
                          <strong>Nota:</strong> Una vez que asignes los equipos a sus grupos, podrás generar los partidos de la fase de grupos en la sección &quot;Jornadas&quot;.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )
              }}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
