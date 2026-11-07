import React, { useState, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, QueryState } from '@/components/states'
import { useMyLeagues } from '@/features/leagues/api'
import { useTeamsByLeague, useUpdateTeam } from './api'
import { toast } from 'sonner'

export function GroupsPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [failedTeams, setFailedTeams] = useState<Record<string, string>>({})
  const hasSelectedRef = React.useRef(false)

  const leaguesQuery = useMyLeagues()
  const teamsQuery = useTeamsByLeague(selectedLeagueId)
  const updateTeamMutation = useUpdateTeam()

  // Auto-select first league
  React.useEffect(() => {
    const firstLeague = leaguesQuery.data?.data?.[0]
    if (!selectedLeagueId && firstLeague && !hasSelectedRef.current) {
      hasSelectedRef.current = true
      setSelectedLeagueId(firstLeague.id)
    }
  }, [selectedLeagueId, leaguesQuery.data])

  // Group teams by their assigned group
  const teamsByGroup = useMemo(() => {
    const teamsData = teamsQuery.data?.data
    if (!teamsData) return {}

    const grouped: Record<string, typeof teamsData> = {}
    const groups = new Set<string>()

    // Collect all groups that exist
    teamsData.forEach(team => {
      if (team.group_name) {
        groups.add(team.group_name)
      }
    })

    // Initialize all letter groups A-Z (enough for most cases)
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i)
      grouped[letter] = []
    }

    // Distribute teams to groups
    teamsData.forEach(team => {
      if (team.group_name) {
        const group = grouped[team.group_name]
        if (group) {
          group.push(team)
        }
      }
    })

    return grouped
  }, [teamsQuery.data])

  const unassignedTeams = useMemo(() => {
    const teamsData = teamsQuery.data?.data
    if (!teamsData) return []
    return teamsData.filter(team => !team.group_name)
  }, [teamsQuery.data])

  const handleAssignTeam = async (teamId: string, groupName: string) => {
    try {
      setUpdating(true)
      setFailedTeams({})

      await updateTeamMutation.mutateAsync({
        teamId,
        team: { group_name: groupName },
      })

      // Error will be caught by the mutation's onError handler
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al asignar equipo'
      setFailedTeams(prev => ({ ...prev, [teamId]: errorMsg }))
      toast.error(`Error: ${errorMsg}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleAutoDistribute = async () => {
    if (!unassignedTeams.length) {
      toast.info('Todos los equipos ya están asignados')
      return
    }

    const groups = Object.keys(teamsByGroup).filter(letter => letter.charCodeAt(0) >= 65 && letter.charCodeAt(0) <= 90)

    if (groups.length === 0) {
      toast.error('No hay grupos disponibles')
      return
    }

    try {
      setUpdating(true)
      setFailedTeams({})
      const errors: Record<string, string> = {}
      let successCount = 0

      // Distribute teams across groups
      for (let i = 0; i < unassignedTeams.length; i++) {
        const team = unassignedTeams[i]
        if (!team) continue

        const groupIndex = i % groups.length
        const groupName = groups[groupIndex]

        try {
          await updateTeamMutation.mutateAsync({
            teamId: team.id,
            team: { group_name: groupName },
          })
          successCount++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
          errors[team.id] = errorMsg
        }
      }

      if (Object.keys(errors).length > 0) {
        setFailedTeams(errors)
        toast.warning(`${successCount} equipos distribuidos, ${Object.keys(errors).length} fallaron`)
      } else {
        toast.success(`${successCount} equipos distribuidos automáticamente`)
      }
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Grupos</h1>
        <p className="text-muted-foreground mt-1">Asigna equipos a grupos (A, B, C…)</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
        children={(leaguesRes) => (
          <div className="space-y-6">
            {leaguesRes.data.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="league-select">Selecciona una liga</Label>
                <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                  <SelectTrigger id="league-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaguesRes.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
              children={() => (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAutoDistribute}
                      disabled={updating || unassignedTeams.length === 0}
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Distribuir automáticamente
                    </Button>
                  </div>

                  {updating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Procesando...
                    </div>
                  )}

                  {unassignedTeams.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">Equipos sin grupo ({unassignedTeams.length})</h2>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Equipo</TableHead>
                              <TableHead>Asignar grupo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unassignedTeams.map((team) => (
                              <TableRow key={team.id} className={failedTeams[team.id] ? 'bg-destructive/10' : ''}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{team.name}</p>
                                    <p className="text-sm text-muted-foreground">{team.slug}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Select onValueChange={(value) => handleAssignTeam(team.id, value)}>
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Grupo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.keys(teamsByGroup)
                                          .filter(letter => letter.charCodeAt(0) >= 65 && letter.charCodeAt(0) <= 90)
                                          .map((letter) => (
                                            <SelectItem key={letter} value={letter}>
                                              Grupo {letter}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {failedTeams[team.id] && (
                                    <p className="text-xs text-destructive mt-1">{failedTeams[team.id]}</p>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {Object.entries(teamsByGroup).map(([groupLetter, teams]) => {
                    const shouldShow = groupLetter.charCodeAt(0) >= 65 && groupLetter.charCodeAt(0) <= 90 && teams.length > 0
                    if (!shouldShow) return null

                    return (
                      <div key={groupLetter} className="space-y-3">
                        <h2 className="text-lg font-semibold">Grupo {groupLetter} ({teams.length})</h2>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Equipo</TableHead>
                                <TableHead>Cambiar grupo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teams.map((team) => (
                                <TableRow key={team.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{team.name}</p>
                                      <p className="text-sm text-muted-foreground">{team.slug}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={team.group_name || ''}
                                      onValueChange={(value) => handleAssignTeam(team.id, value)}
                                      disabled={updating}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.keys(teamsByGroup)
                                          .filter(letter => letter.charCodeAt(0) >= 65 && letter.charCodeAt(0) <= 90)
                                          .map((letter) => (
                                            <SelectItem key={letter} value={letter}>
                                              Grupo {letter}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Asigna todos los equipos a sus grupos correspondientes. Puedes cambiar los grupos en cualquier momento.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  )
}
