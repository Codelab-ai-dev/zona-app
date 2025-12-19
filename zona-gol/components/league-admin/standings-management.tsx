"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Loader2, Edit, Save, X, AlertTriangle } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { generateStandingsEmbedding } from "@/lib/utils/generate-embeddings"

interface StandingsManagementProps {
  leagueId: string
}

interface Tournament {
  id: string
  name: string
  is_active: boolean
}

interface TeamStanding {
  id: string
  team_id: string
  tournament_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  points_adjustment: number
  adjustment_reason: string | null
  team: {
    id: string
    name: string
    logo: string | null
  }
}

export function StandingsManagement({ leagueId }: StandingsManagementProps) {
  const supabase = createClientSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>("")
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [editingTeam, setEditingTeam] = useState<TeamStanding | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    matches_played: 0,
    matches_won: 0,
    matches_drawn: 0,
    matches_lost: 0,
    goals_for: 0,
    goals_against: 0,
    points_adjustment: 0,
    adjustment_reason: ""
  })

  // Load tournaments
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, name, is_active')
          .eq('league_id', leagueId)
          .order('is_active', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) throw error

        setTournaments(data || [])

        // Auto-select active tournament or first one
        const active = data?.find(t => t.is_active)
        if (active) {
          setSelectedTournament(active.id)
        } else if (data && data.length > 0) {
          setSelectedTournament(data[0].id)
        }
      } catch (error) {
        console.error('Error loading tournaments:', error)
        toast.error('Error cargando torneos')
      }
    }

    loadTournaments()
  }, [leagueId, supabase])

  // Load standings when tournament changes
  useEffect(() => {
    const loadStandings = async () => {
      if (!selectedTournament) {
        setStandings([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // First check if team_stats exists for this tournament
        const { data: existingStats, error: statsError } = await supabase
          .from('team_stats')
          .select(`
            id,
            team_id,
            tournament_id,
            matches_played,
            matches_won,
            matches_drawn,
            matches_lost,
            goals_for,
            goals_against,
            goal_difference,
            points,
            points_adjustment,
            adjustment_reason,
            team:teams(id, name, logo)
          `)
          .eq('tournament_id', selectedTournament)
          .order('points', { ascending: false })

        if (statsError) throw statsError

        if (existingStats && existingStats.length > 0) {
          // Use existing stats
          const formattedStandings = existingStats.map((stat: any) => ({
            ...stat,
            points_adjustment: stat.points_adjustment || 0,
            adjustment_reason: stat.adjustment_reason || null,
            team: stat.team
          }))

          // Sort by total points (points + adjustment)
          formattedStandings.sort((a: any, b: any) => {
            const totalA = a.points + (a.points_adjustment || 0)
            const totalB = b.points + (b.points_adjustment || 0)
            if (totalB !== totalA) return totalB - totalA
            if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
            return b.goals_for - a.goals_for
          })

          setStandings(formattedStandings)
        } else {
          // Calculate from matches if no team_stats exist
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name, logo')
            .eq('tournament_id', selectedTournament)
            .eq('is_active', true)

          const { data: matches } = await supabase
            .from('matches')
            .select('home_team_id, away_team_id, home_score, away_score, status')
            .eq('tournament_id', selectedTournament)
            .eq('status', 'finished')

          // Calculate standings
          const standingsMap: Record<string, any> = {}

          teams?.forEach(team => {
            standingsMap[team.id] = {
              id: null,
              team_id: team.id,
              tournament_id: selectedTournament,
              matches_played: 0,
              matches_won: 0,
              matches_drawn: 0,
              matches_lost: 0,
              goals_for: 0,
              goals_against: 0,
              goal_difference: 0,
              points: 0,
              points_adjustment: 0,
              adjustment_reason: null,
              team
            }
          })

          matches?.forEach(match => {
            if (match.home_score !== null && match.away_score !== null) {
              const homeId = match.home_team_id
              const awayId = match.away_team_id

              if (standingsMap[homeId]) {
                standingsMap[homeId].matches_played++
                standingsMap[homeId].goals_for += match.home_score
                standingsMap[homeId].goals_against += match.away_score

                if (match.home_score > match.away_score) {
                  standingsMap[homeId].matches_won++
                } else if (match.home_score < match.away_score) {
                  standingsMap[homeId].matches_lost++
                } else {
                  standingsMap[homeId].matches_drawn++
                }
              }

              if (standingsMap[awayId]) {
                standingsMap[awayId].matches_played++
                standingsMap[awayId].goals_for += match.away_score
                standingsMap[awayId].goals_against += match.home_score

                if (match.away_score > match.home_score) {
                  standingsMap[awayId].matches_won++
                } else if (match.away_score < match.home_score) {
                  standingsMap[awayId].matches_lost++
                } else {
                  standingsMap[awayId].matches_drawn++
                }
              }
            }
          })

          // Calculate points and goal difference
          Object.values(standingsMap).forEach((team: any) => {
            team.points = team.matches_won * 3 + team.matches_drawn
            team.goal_difference = team.goals_for - team.goals_against
          })

          const calculatedStandings = Object.values(standingsMap).sort((a: any, b: any) => {
            if (b.points !== a.points) return b.points - a.points
            if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
            return b.goals_for - a.goals_for
          })

          setStandings(calculatedStandings as TeamStanding[])
        }
      } catch (error) {
        console.error('Error loading standings:', error)
        toast.error('Error cargando tabla de posiciones')
      } finally {
        setLoading(false)
      }
    }

    loadStandings()
  }, [selectedTournament, supabase])

  const handleEditClick = (team: TeamStanding) => {
    setEditingTeam(team)
    setEditForm({
      matches_played: team.matches_played,
      matches_won: team.matches_won,
      matches_drawn: team.matches_drawn,
      matches_lost: team.matches_lost,
      goals_for: team.goals_for,
      goals_against: team.goals_against,
      points_adjustment: team.points_adjustment || 0,
      adjustment_reason: team.adjustment_reason || ""
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTeam) return

    setSaving(true)
    try {
      const updateData = {
        matches_played: editForm.matches_played,
        matches_won: editForm.matches_won,
        matches_drawn: editForm.matches_drawn,
        matches_lost: editForm.matches_lost,
        goals_for: editForm.goals_for,
        goals_against: editForm.goals_against,
        points_adjustment: editForm.points_adjustment,
        adjustment_reason: editForm.adjustment_reason || null,
        updated_at: new Date().toISOString()
      }

      if (editingTeam.id) {
        // Update existing record
        const { error } = await supabase
          .from('team_stats')
          .update(updateData)
          .eq('id', editingTeam.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('team_stats')
          .insert({
            ...updateData,
            team_id: editingTeam.team_id,
            tournament_id: selectedTournament,
            league_id: leagueId
          })

        if (error) throw error
      }

      toast.success(`Estadísticas de ${editingTeam.team.name} actualizadas`)
      setEditModalOpen(false)
      setEditingTeam(null)

      // Regenerate standings embedding for the agent
      console.log('🔄 Regenerando embedding de tabla de posiciones...')
      generateStandingsEmbedding({
        league_id: leagueId,
        tournament_id: selectedTournament,
      }).catch(err => console.warn('Error generando embedding de standings:', err))

      // Reload standings
      const { data: updatedStats } = await supabase
        .from('team_stats')
        .select(`
          id,
          team_id,
          tournament_id,
          matches_played,
          matches_won,
          matches_drawn,
          matches_lost,
          goals_for,
          goals_against,
          goal_difference,
          points,
          points_adjustment,
          adjustment_reason,
          team:teams(id, name, logo)
        `)
        .eq('tournament_id', selectedTournament)

      if (updatedStats) {
        const formattedStandings = updatedStats.map((stat: any) => ({
          ...stat,
          points_adjustment: stat.points_adjustment || 0,
          team: stat.team
        }))

        formattedStandings.sort((a: any, b: any) => {
          const totalA = a.points + (a.points_adjustment || 0)
          const totalB = b.points + (b.points_adjustment || 0)
          if (totalB !== totalA) return totalB - totalA
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
          return b.goals_for - a.goals_for
        })

        setStandings(formattedStandings)
      }
    } catch (error: any) {
      console.error('Error saving standings:', error)
      toast.error(`Error guardando: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateTotalPoints = (team: TeamStanding) => {
    return team.points + (team.points_adjustment || 0)
  }

  if (loading && !selectedTournament) {
    return (
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
            Tabla de Posiciones
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            Gestiona la tabla de posiciones. Puedes editar estadísticas y aplicar sanciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tournament Selector */}
          {tournaments.length > 0 && (
            <div className="mb-6">
              <Label className="text-white drop-shadow mb-2 block">Seleccionar Torneo</Label>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger className="w-full md:w-80 backdrop-blur-md bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Seleccionar torneo" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name} {tournament.is_active && "(Activo)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
              <span className="text-white drop-shadow">Cargando tabla...</span>
            </div>
          ) : standings.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/80 drop-shadow">No hay equipos en este torneo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/20">
                    <TableHead className="text-white/90 drop-shadow">Pos</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Equipo</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PJ</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PG</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PE</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PP</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">GF</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">GC</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">DIF</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PTS</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((team, index) => {
                    const totalPoints = calculateTotalPoints(team)
                    const hasAdjustment = team.points_adjustment !== 0

                    return (
                      <TableRow
                        key={team.team_id}
                        className={`border-b border-white/20 hover:bg-white/5 ${hasAdjustment ? 'bg-red-500/10' : ''}`}
                      >
                        <TableCell className="font-bold text-white drop-shadow">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8 border border-white/30">
                              {team.team.logo && (
                                <AvatarImage src={team.team.logo} alt={team.team.name} />
                              )}
                              <AvatarFallback className="backdrop-blur-md bg-green-500/80 text-white text-xs font-bold">
                                {getTeamInitials(team.team.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium text-white drop-shadow">{team.team.name}</span>
                              {hasAdjustment && (
                                <div className="flex items-center mt-1">
                                  <AlertTriangle className="w-3 h-3 text-red-400 mr-1" />
                                  <span className="text-xs text-red-300">
                                    {team.points_adjustment > 0 ? '+' : ''}{team.points_adjustment} pts
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-white/90">{team.matches_played}</TableCell>
                        <TableCell className="text-center text-green-400">{team.matches_won}</TableCell>
                        <TableCell className="text-center text-yellow-400">{team.matches_drawn}</TableCell>
                        <TableCell className="text-center text-red-400">{team.matches_lost}</TableCell>
                        <TableCell className="text-center text-white/90">{team.goals_for}</TableCell>
                        <TableCell className="text-center text-white/90">{team.goals_against}</TableCell>
                        <TableCell className="text-center">
                          <span className={
                            team.goal_difference > 0 ? "text-green-400" :
                            team.goal_difference < 0 ? "text-red-400" : "text-white/70"
                          }>
                            {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-white drop-shadow-lg text-lg">
                              {totalPoints}
                            </span>
                            {hasAdjustment && (
                              <span className="text-xs text-white/50">
                                ({team.points}{team.points_adjustment >= 0 ? '+' : ''}{team.points_adjustment})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(team)}
                            className="text-white hover:bg-white/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white drop-shadow-lg">
              <Edit className="w-5 h-5 mr-2" />
              Editar Estadísticas
            </DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">
              {editingTeam?.team.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Partidos */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-white/80 text-xs">PJ</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_played}
                  onChange={(e) => setEditForm({ ...editForm, matches_played: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
              <div>
                <Label className="text-white/80 text-xs">PG</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_won}
                  onChange={(e) => setEditForm({ ...editForm, matches_won: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
              <div>
                <Label className="text-white/80 text-xs">PE</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_drawn}
                  onChange={(e) => setEditForm({ ...editForm, matches_drawn: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
              <div>
                <Label className="text-white/80 text-xs">PP</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_lost}
                  onChange={(e) => setEditForm({ ...editForm, matches_lost: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
            </div>

            {/* Goles */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80 text-xs">Goles a Favor (GF)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.goals_for}
                  onChange={(e) => setEditForm({ ...editForm, goals_for: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
              <div>
                <Label className="text-white/80 text-xs">Goles en Contra (GC)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.goals_against}
                  onChange={(e) => setEditForm({ ...editForm, goals_against: parseInt(e.target.value) || 0 })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                />
              </div>
            </div>

            {/* Ajuste de Puntos */}
            <div className="pt-4 border-t border-white/20">
              <Label className="text-white/80 text-sm flex items-center mb-2">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                Ajuste de Puntos (sanción/bonificación)
              </Label>
              <Input
                type="number"
                value={editForm.points_adjustment}
                onChange={(e) => setEditForm({ ...editForm, points_adjustment: parseInt(e.target.value) || 0 })}
                className="backdrop-blur-md bg-white/20 border-white/30 text-white text-center"
                placeholder="Ej: -3 para restar 3 puntos"
              />
              <p className="text-xs text-white/60 mt-1">
                Usa números negativos para restar puntos (ej: -3)
              </p>
            </div>

            {/* Motivo del Ajuste */}
            {editForm.points_adjustment !== 0 && (
              <div>
                <Label className="text-white/80 text-sm">Motivo del Ajuste</Label>
                <Textarea
                  value={editForm.adjustment_reason}
                  onChange={(e) => setEditForm({ ...editForm, adjustment_reason: e.target.value })}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white"
                  placeholder="Ej: Incumplimiento de reglamento, falta de documentación, etc."
                  rows={2}
                />
              </div>
            )}

            {/* Preview de puntos */}
            <div className="p-4 backdrop-blur-md bg-blue-500/20 rounded-lg border border-blue-300/30">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Puntos calculados:</span>
                <span className="text-white font-medium">
                  {editForm.matches_won * 3 + editForm.matches_drawn}
                </span>
              </div>
              {editForm.points_adjustment !== 0 && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white/80">Ajuste:</span>
                  <span className={editForm.points_adjustment < 0 ? "text-red-400" : "text-green-400"}>
                    {editForm.points_adjustment > 0 ? '+' : ''}{editForm.points_adjustment}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/20">
                <span className="text-white font-medium">Puntos totales:</span>
                <span className="text-white font-bold text-lg">
                  {editForm.matches_won * 3 + editForm.matches_drawn + editForm.points_adjustment}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditModalOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
