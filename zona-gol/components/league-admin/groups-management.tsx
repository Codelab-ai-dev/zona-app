"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { Loader2, Users, Trophy, RefreshCw, Shuffle } from "lucide-react"
import { toast } from "sonner"

type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

interface GroupsManagementProps {
  leagueId: string
}

export function GroupsManagement({ leagueId }: GroupsManagementProps) {
  const supabase = createClientSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsByGroup, setTeamsByGroup] = useState<Record<string, Team[]>>({})

  useEffect(() => {
    loadData()
  }, [leagueId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load active tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .single()

      if (tournamentError) {
        if (tournamentError.code === 'PGRST116') {
          toast.error('No hay torneo activo')
        } else {
          throw tournamentError
        }
        return
      }

      setActiveTournament(tournament)

      // Only load teams if tournament is group_knockout format
      if (tournament.tournament_format !== 'group_knockout') {
        toast.error('El torneo activo no es de formato Grupos + Eliminación')
        return
      }

      // Load teams for this tournament
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('is_active', true)
        .order('name')

      if (teamsError) throw teamsError

      setTeams(teamsData || [])
      groupTeams(teamsData || [], tournament.number_of_groups || 4)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error(error.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const groupTeams = (teamsList: Team[], numberOfGroups: number) => {
    const grouped: Record<string, Team[]> = {}

    // Initialize groups
    for (let i = 0; i < numberOfGroups; i++) {
      const groupLetter = String.fromCharCode(65 + i) // A, B, C, D, etc.
      grouped[groupLetter] = []
    }

    // Group teams by their assigned group_name
    teamsList.forEach(team => {
      if (team.group_name && grouped[team.group_name]) {
        grouped[team.group_name].push(team)
      }
    })

    setTeamsByGroup(grouped)
  }

  const handleAssignTeamToGroup = async (teamId: string, groupName: string) => {
    try {
      setUpdating(true)

      const { error } = await supabase
        .from('teams')
        .update({ group_name: groupName })
        .eq('id', teamId)

      if (error) throw error

      toast.success('Equipo asignado al grupo exitosamente')
      await loadData()
    } catch (error: any) {
      console.error('Error assigning team to group:', error)
      toast.error(error.message || 'Error asignando equipo al grupo')
    } finally {
      setUpdating(false)
    }
  }

  const handleAutoDistribute = async () => {
    if (!activeTournament) return

    try {
      setUpdating(true)
      const numberOfGroups = activeTournament.number_of_groups || 4

      // Shuffle teams randomly
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)

      // Distribute teams evenly across groups
      const updates = shuffledTeams.map((team, index) => {
        const groupIndex = index % numberOfGroups
        const groupLetter = String.fromCharCode(65 + groupIndex)

        return supabase
          .from('teams')
          .update({ group_name: groupLetter })
          .eq('id', team.id)
      })

      await Promise.all(updates)

      toast.success('Equipos distribuidos automáticamente')
      await loadData()
    } catch (error: any) {
      console.error('Error auto-distributing teams:', error)
      toast.error(error.message || 'Error distribuyendo equipos')
    } finally {
      setUpdating(false)
    }
  }

  const getTeamInitials = (teamName: string) => {
    return teamName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-white mr-2" />
        <span className="text-white drop-shadow">Cargando grupos...</span>
      </div>
    )
  }

  if (!activeTournament || activeTournament.tournament_format !== 'group_knockout') {
    return (
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="text-center py-12">
          <Trophy className="w-12 h-12 text-white/50 mx-auto mb-4 drop-shadow-lg" />
          <h3 className="text-lg font-semibold text-white mb-2 drop-shadow">No disponible</h3>
          <p className="text-white/80 drop-shadow">
            La gestión de grupos solo está disponible para torneos de formato "Grupos + Eliminación"
          </p>
        </CardContent>
      </Card>
    )
  }

  const unassignedTeams = teams.filter(team => !team.group_name)
  const numberOfGroups = activeTournament.number_of_groups || 4

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Gestión de Grupos</h2>
          <p className="text-white/80 drop-shadow">
            {activeTournament.name} - {numberOfGroups} grupos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            disabled={updating}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button
            onClick={handleAutoDistribute}
            className="backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0"
            disabled={updating || teams.length === 0}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Distribuir Automáticamente
          </Button>
        </div>
      </div>

      {/* Unassigned Teams */}
      {unassignedTeams.length > 0 && (
        <Card className="backdrop-blur-xl bg-orange-500/20 border-orange-400/30">
          <CardHeader>
            <CardTitle className="text-white drop-shadow-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipos sin Grupo ({unassignedTeams.length})
            </CardTitle>
            <CardDescription className="text-white/80 drop-shadow">
              Asigna estos equipos a un grupo para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {unassignedTeams.map(team => (
                <div key={team.id} className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <Avatar className="w-10 h-10 border border-white/30">
                      {team.logo && <AvatarImage src={team.logo} alt={team.name} />}
                      <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white text-sm font-bold">
                        {getTeamInitials(team.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white drop-shadow flex-1">{team.name}</span>
                  </div>
                  <Select
                    onValueChange={(value) => handleAssignTeamToGroup(team.id, value)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-full backdrop-blur-md bg-white/10 border-white/30 text-white">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                      {Array.from({ length: numberOfGroups }, (_, i) => {
                        const groupLetter = String.fromCharCode(65 + i)
                        return (
                          <SelectItem key={groupLetter} value={groupLetter} className="text-white">
                            Grupo {groupLetter}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {Object.keys(teamsByGroup).sort().map(groupName => (
          <Card key={groupName} className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-xl text-white drop-shadow-lg flex items-center gap-2">
                <div className="w-10 h-10 rounded-full backdrop-blur-md bg-blue-500/80 flex items-center justify-center text-white font-bold">
                  {groupName}
                </div>
                Grupo {groupName}
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                {teamsByGroup[groupName].length} equipos asignados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamsByGroup[groupName].length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/70 drop-shadow">No hay equipos asignados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamsByGroup[groupName].map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8 border border-white/30">
                          {team.logo && <AvatarImage src={team.logo} alt={team.name} />}
                          <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white text-xs font-bold">
                            {getTeamInitials(team.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-white drop-shadow">{team.name}</span>
                      </div>
                      <Select
                        value={groupName}
                        onValueChange={(value) => handleAssignTeamToGroup(team.id, value)}
                        disabled={updating}
                      >
                        <SelectTrigger className="w-32 backdrop-blur-md bg-white/10 border-white/30 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                          {Array.from({ length: numberOfGroups }, (_, i) => {
                            const groupLetter = String.fromCharCode(65 + i)
                            return (
                              <SelectItem key={groupLetter} value={groupLetter} className="text-white">
                                Grupo {groupLetter}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="backdrop-blur-xl bg-blue-500/10 border-blue-400/30">
        <CardContent className="py-4">
          <p className="text-sm text-white/80 drop-shadow">
            <strong>Nota:</strong> Una vez que asignes los equipos a sus grupos, podrás generar los partidos de la fase de grupos
            en la sección "Partidos Grupos". Los mejores {activeTournament.teams_advancing_per_group || 2} equipos de cada grupo
            avanzarán a la fase de eliminación directa.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
