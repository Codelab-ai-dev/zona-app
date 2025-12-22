"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Trophy, Loader2, Edit, AlertTriangle, X, Save } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { generateStandingsEmbedding } from "@/lib/utils/generate-embeddings"
import { useTournamentsByLeague, useTeamStatsByTournament, useInvalidateTeamStats } from "@/lib/queries"

interface StandingsManagementProps {
  leagueId: string
}

interface TeamStanding {
  id: string | null
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

  // React Query para torneos
  const { data: tournamentsData = [], isLoading: tournamentsLoading } = useTournamentsByLeague(leagueId)

  // Transformar torneos para el select
  const tournaments = useMemo(() => {
    return tournamentsData.map(t => ({
      id: t.id,
      name: t.name,
      is_active: t.is_active
    }))
  }, [tournamentsData])

  const [selectedTournament, setSelectedTournament] = useState<string>("")

  // Auto-seleccionar torneo activo cuando cargan
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournament) {
      const active = tournaments.find(t => t.is_active)
      if (active) {
        setSelectedTournament(active.id)
      } else if (tournaments.length > 0) {
        setSelectedTournament(tournaments[0].id)
      }
    }
  }, [tournaments, selectedTournament])

  // React Query para standings
  const {
    data: standingsData = [],
    isLoading: standingsLoading,
    refetch: refetchStandings
  } = useTeamStatsByTournament(selectedTournament || undefined)

  // Hook para invalidar cache
  const { invalidateByTournament } = useInvalidateTeamStats()

  // Transformar standings
  const standings: TeamStanding[] = useMemo(() => {
    return standingsData as TeamStanding[]
  }, [standingsData])

  const loading = tournamentsLoading || standingsLoading
  const [saving, setSaving] = useState(false)
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

      // Invalidar cache y recargar standings
      invalidateByTournament(selectedTournament)
      refetchStandings()
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
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-green-400" />
          <span className="text-gray-400 text-sm">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-xl bg-slate-800/50 border border-white/10">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
            <h2 className="text-sm md:text-base font-semibold text-white">Tabla de Posiciones</h2>
          </div>
          <p className="text-[10px] md:text-xs text-gray-500">
            Gestiona la tabla de posiciones y aplica sanciones
          </p>
        </div>

        <div className="p-3 md:p-4">
          {/* Tournament Selector */}
          {tournaments.length > 0 && (
            <div className="mb-4">
              <Label className="text-gray-400 text-xs mb-1.5 block">Seleccionar Torneo</Label>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger className="w-full md:w-80 h-9 bg-slate-800/50 border-white/10 text-white text-sm">
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-green-400" />
              <span className="text-gray-400 text-sm">Cargando tabla...</span>
            </div>
          ) : standings.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay equipos en este torneo</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10">
                    <TableHead className="text-gray-400 text-[10px] md:text-xs font-medium w-8 md:w-10 px-1 md:px-2">#</TableHead>
                    <TableHead className="text-gray-400 text-[10px] md:text-xs font-medium px-1 md:px-2">Equipo</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1">PJ</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1">PG</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1">PE</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1">PP</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1 hidden md:table-cell">GF</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-7 md:w-10 px-1 hidden md:table-cell">GC</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-8 md:w-10 px-1">DG</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-9 md:w-12 px-1">PTS</TableHead>
                    <TableHead className="text-center text-gray-400 text-[10px] md:text-xs font-medium w-8 md:w-10 px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((team, index) => {
                    const totalPoints = calculateTotalPoints(team)
                    const hasAdjustment = team.points_adjustment !== 0

                    return (
                      <TableRow
                        key={team.team_id}
                        className={`border-b border-white/5 hover:bg-slate-700/30 ${hasAdjustment ? 'bg-red-500/10' : ''}`}
                      >
                        <TableCell className="font-semibold text-white text-xs md:text-sm px-1 md:px-2">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-1 md:px-2">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                              {team.team.logo && (
                                <AvatarImage src={team.team.logo} alt={team.team.name} />
                              )}
                              <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-xs font-bold">
                                {getTeamInitials(team.team.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-medium text-white text-[10px] md:text-sm block truncate max-w-[80px] md:max-w-none">{team.team.name}</span>
                              {hasAdjustment && (
                                <div className="flex items-center">
                                  <AlertTriangle className="w-2.5 h-2.5 text-red-400 mr-0.5" />
                                  <span className="text-[8px] md:text-[10px] text-red-400">
                                    {team.points_adjustment > 0 ? '+' : ''}{team.points_adjustment}
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
                          <span className={
                            team.goal_difference > 0 ? "text-green-400" :
                            team.goal_difference < 0 ? "text-red-400" : "text-gray-500"
                          }>
                            {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-white text-sm md:text-base">
                              {totalPoints}
                            </span>
                            {hasAdjustment && (
                              <span className="text-[8px] md:text-[10px] text-gray-500">
                                ({team.points}{team.points_adjustment >= 0 ? '+' : ''}{team.points_adjustment})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(team)}
                            className="h-7 w-7 md:h-8 md:w-8 p-0 text-gray-400 hover:text-white hover:bg-slate-700/50"
                          >
                            <Edit className="w-3 h-3 md:w-4 md:h-4" />
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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white text-sm md:text-base">
              <Edit className="w-4 h-4 mr-2" />
              Editar Estadísticas
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              {editingTeam?.team.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Partidos */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">PJ</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_played}
                  onChange={(e) => setEditForm({ ...editForm, matches_played: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">PG</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_won}
                  onChange={(e) => setEditForm({ ...editForm, matches_won: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">PE</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_drawn}
                  onChange={(e) => setEditForm({ ...editForm, matches_drawn: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">PP</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.matches_lost}
                  onChange={(e) => setEditForm({ ...editForm, matches_lost: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Goles */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">Goles a Favor</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.goals_for}
                  onChange={(e) => setEditForm({ ...editForm, goals_for: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">Goles en Contra</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.goals_against}
                  onChange={(e) => setEditForm({ ...editForm, goals_against: parseInt(e.target.value) || 0 })}
                  className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Ajuste de Puntos */}
            <div className="pt-3 border-t border-white/10">
              <Label className="text-gray-400 text-[10px] md:text-xs flex items-center mb-1.5">
                <AlertTriangle className="w-3 h-3 mr-1.5 text-yellow-400" />
                Ajuste de Puntos
              </Label>
              <Input
                type="number"
                value={editForm.points_adjustment}
                onChange={(e) => setEditForm({ ...editForm, points_adjustment: parseInt(e.target.value) || 0 })}
                className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
                placeholder="Ej: -3"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Usa números negativos para restar puntos
              </p>
            </div>

            {/* Motivo del Ajuste */}
            {editForm.points_adjustment !== 0 && (
              <div>
                <Label className="text-gray-400 text-[10px] md:text-xs">Motivo del Ajuste</Label>
                <Textarea
                  value={editForm.adjustment_reason}
                  onChange={(e) => setEditForm({ ...editForm, adjustment_reason: e.target.value })}
                  className="bg-slate-800/50 border-white/10 text-white text-xs md:text-sm min-h-[60px]"
                  placeholder="Ej: Incumplimiento de reglamento"
                  rows={2}
                />
              </div>
            )}

            {/* Preview de puntos */}
            <div className="p-3 bg-slate-800/50 rounded-lg border border-white/10">
              <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="text-gray-400">Puntos calculados:</span>
                <span className="text-white font-medium">
                  {editForm.matches_won * 3 + editForm.matches_drawn}
                </span>
              </div>
              {editForm.points_adjustment !== 0 && (
                <div className="flex justify-between items-center mt-1 text-xs md:text-sm">
                  <span className="text-gray-400">Ajuste:</span>
                  <span className={editForm.points_adjustment < 0 ? "text-red-400" : "text-green-400"}>
                    {editForm.points_adjustment > 0 ? '+' : ''}{editForm.points_adjustment}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                <span className="text-white font-medium text-xs md:text-sm">Puntos totales:</span>
                <span className="text-green-400 font-bold text-base md:text-lg">
                  {editForm.matches_won * 3 + editForm.matches_drawn + editForm.points_adjustment}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditModalOpen(false)}
              className="flex-1 h-9 text-gray-400 hover:text-white hover:bg-slate-800/50 text-xs md:text-sm"
            >
              <X className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
