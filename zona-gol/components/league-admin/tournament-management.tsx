"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { Database } from "@/lib/supabase/database.types"
import { Plus, Edit, Calendar, Trophy, Loader2, Users, Lock, Unlock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Tournament = Database['public']['Tables']['tournaments']['Row']

interface TournamentManagementProps {
  leagueId: string
}

export function TournamentManagement({ leagueId }: TournamentManagementProps) {
  const {
    tournaments,
    loading,
    error,
    getTournamentsByLeague,
    createTournament,
    updateTournament,
    deleteTournament,
    permanentlyDeleteTournament
  } = useTournaments()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    maxPlayers: "",
    maxCoachingStaff: "10",
    tournamentFormat: "league" as 'league' | 'knockout' | 'group_knockout',
    numberOfGroups: "4",
    teamsAdvancingPerGroup: "2",
    roundsPerSeason: "2",
    hasThirdPlaceMatch: false,
  })

  // Load tournaments when component mounts or leagueId changes
  useEffect(() => {
    if (leagueId) {
      console.log('🔵 Loading tournaments for leagueId:', leagueId)
      getTournamentsByLeague(leagueId).catch(console.error)
    } else {
      console.warn('⚠️ No leagueId provided to TournamentManagement')
    }
  }, [leagueId, getTournamentsByLeague])

  // Don't render if no leagueId
  if (!leagueId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg mb-4">Liga No Encontrada</h2>
        <p className="text-white/80 drop-shadow">
          No se pudo cargar la información de la liga.
        </p>
      </div>
    )
  }

  const handleCreateTournament = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setCreating(true)
    
    try {
      await createTournament({
        name: formData.name,
        league_id: leagueId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        max_players: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
        max_coaching_staff: formData.maxCoachingStaff ? parseInt(formData.maxCoachingStaff) : 10,
        tournament_format: formData.tournamentFormat,
        number_of_groups: formData.tournamentFormat === 'group_knockout' ? parseInt(formData.numberOfGroups) : null,
        teams_advancing_per_group: parseInt(formData.teamsAdvancingPerGroup),
        rounds_per_season: parseInt(formData.roundsPerSeason),
        has_third_place_match: formData.hasThirdPlaceMatch,
        is_active: true
      })

      setFormData({
        name: "",
        startDate: "",
        endDate: "",
        maxPlayers: "",
        maxCoachingStaff: "10",
        tournamentFormat: "league",
        numberOfGroups: "4",
        teamsAdvancingPerGroup: "2",
        roundsPerSeason: "2",
        hasThirdPlaceMatch: false,
      })
      setIsCreateDialogOpen(false)
      toast.success(`Torneo "${formData.name}" creado exitosamente`)
      console.log('✅ Torneo creado exitosamente')
    } catch (error: any) {
      console.error('❌ Error creando torneo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setFormData({
      name: tournament.name,
      startDate: tournament.start_date,
      endDate: tournament.end_date,
      maxPlayers: tournament.max_players ? tournament.max_players.toString() : "",
      maxCoachingStaff: tournament.max_coaching_staff ? tournament.max_coaching_staff.toString() : "10",
      tournamentFormat: tournament.tournament_format || "league",
      numberOfGroups: tournament.number_of_groups ? tournament.number_of_groups.toString() : "4",
      teamsAdvancingPerGroup: tournament.teams_advancing_per_group ? tournament.teams_advancing_per_group.toString() : "2",
      roundsPerSeason: tournament.rounds_per_season ? tournament.rounds_per_season.toString() : "2",
      hasThirdPlaceMatch: tournament.has_third_place_match || false,
    })
  }

  const handleUpdateTournament = async () => {
    if (!editingTournament) return

    setUpdating(true)
    
    try {
      await updateTournament(editingTournament.id, {
        name: formData.name,
        start_date: formData.startDate,
        end_date: formData.endDate,
        max_players: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
        max_coaching_staff: formData.maxCoachingStaff ? parseInt(formData.maxCoachingStaff) : 10,
        tournament_format: formData.tournamentFormat,
        number_of_groups: formData.tournamentFormat === 'group_knockout' ? parseInt(formData.numberOfGroups) : null,
        teams_advancing_per_group: parseInt(formData.teamsAdvancingPerGroup),
        rounds_per_season: parseInt(formData.roundsPerSeason),
        has_third_place_match: formData.hasThirdPlaceMatch,
      })

      setEditingTournament(null)
      setFormData({
        name: "",
        startDate: "",
        endDate: "",
        maxPlayers: "",
        maxCoachingStaff: "10",
        tournamentFormat: "league",
        numberOfGroups: "4",
        teamsAdvancingPerGroup: "2",
        roundsPerSeason: "2",
        hasThirdPlaceMatch: false,
      })
      toast.success(`Torneo "${formData.name}" actualizado exitosamente`)
      console.log('✅ Torneo actualizado exitosamente')
    } catch (error: any) {
      console.error('❌ Error actualizando torneo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdating(false)
    }
  }

  const toggleTournamentStatus = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    try {
      await updateTournament(tournamentId, {
        is_active: !tournament.is_active
      })
      toast.success(`Torneo ${tournament.is_active ? 'desactivado' : 'activado'} exitosamente`)
      console.log('✅ Estado del torneo actualizado')
    } catch (error: any) {
      console.error('❌ Error actualizando estado del torneo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const toggleRegistrationStatus = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    const action = tournament.registration_open ? 'cerrar' : 'abrir'
    const confirmMessage = `¿Estás seguro de que quieres ${action} los registros de jugadores para "${tournament.name}"?`

    if (!confirm(confirmMessage)) return

    try {
      await updateTournament(tournamentId, {
        registration_open: !tournament.registration_open
      })
      toast.success(`Registros ${action}dos exitosamente`)
      console.log(`✅ Registros ${action}dos exitosamente`)
    } catch (error: any) {
      console.error(`❌ Error al ${action} registros:`, error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const handlePermanentDelete = async () => {
    if (!deletingTournament) return

    setDeleting(true)
    try {
      await permanentlyDeleteTournament(deletingTournament.id)
      toast.success(`Torneo "${deletingTournament.name}" eliminado permanentemente`)
      console.log('✅ Torneo eliminado permanentemente')
      setDeletingTournament(null)
    } catch (error: any) {
      console.error('❌ Error eliminando torneo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Gestión de Torneos</h2>
          <p className="text-white/80 drop-shadow">Administra los torneos de tu liga</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Torneo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center text-white text-sm md:text-base">
                <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                Crear Nuevo Torneo
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-xs md:text-sm">Completa la información para crear un nuevo torneo</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre del Torneo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Temporada 2024 - Apertura"
                  className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-9 bg-slate-800/50 border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Fecha de Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-9 bg-slate-800/50 border-white/10 text-white text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="maxPlayers" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Límite Jugadores</Label>
                  <Input
                    id="maxPlayers"
                    type="number"
                    min="1"
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                    placeholder="Sin límite"
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="maxCoachingStaff" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Límite Cuerpo Técnico</Label>
                  <Input
                    id="maxCoachingStaff"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.maxCoachingStaff}
                    onChange={(e) => setFormData({ ...formData, maxCoachingStaff: e.target.value })}
                    placeholder="10"
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
              </div>

              {/* Tournament Format */}
              <div>
                <Label htmlFor="tournamentFormat" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Formato del Torneo</Label>
                <Select
                  value={formData.tournamentFormat}
                  onValueChange={(value: 'league' | 'knockout' | 'group_knockout') =>
                    setFormData({ ...formData, tournamentFormat: value })
                  }
                >
                  <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                    <SelectValue placeholder="Selecciona el formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="league">Liga (Todos contra Todos)</SelectItem>
                    <SelectItem value="knockout">Eliminación Directa</SelectItem>
                    <SelectItem value="group_knockout">Fase de Grupos + Eliminación</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {formData.tournamentFormat === 'league' && 'Los equipos se enfrentan en formato round-robin'}
                  {formData.tournamentFormat === 'knockout' && 'Eliminación simple, el perdedor queda eliminado'}
                  {formData.tournamentFormat === 'group_knockout' && 'Estilo Mundial: fase de grupos seguida de eliminatorias'}
                </p>
              </div>

              {/* League-specific options */}
              {formData.tournamentFormat === 'league' && (
                <div>
                  <Label htmlFor="roundsPerSeason" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Vueltas</Label>
                  <Select
                    value={formData.roundsPerSeason}
                    onValueChange={(value) => setFormData({ ...formData, roundsPerSeason: value })}
                  >
                    <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Una vuelta (todos vs todos)</SelectItem>
                      <SelectItem value="2">Dos vueltas (ida y vuelta)</SelectItem>
                      <SelectItem value="3">Tres vueltas</SelectItem>
                      <SelectItem value="4">Cuatro vueltas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group knockout specific options */}
              {formData.tournamentFormat === 'group_knockout' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="numberOfGroups" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Número de Grupos</Label>
                    <Select
                      value={formData.numberOfGroups}
                      onValueChange={(value) => setFormData({ ...formData, numberOfGroups: value })}
                    >
                      <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 grupos</SelectItem>
                        <SelectItem value="4">4 grupos</SelectItem>
                        <SelectItem value="6">6 grupos</SelectItem>
                        <SelectItem value="8">8 grupos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="teamsAdvancingPerGroup" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Equipos que avanzan</Label>
                    <Select
                      value={formData.teamsAdvancingPerGroup}
                      onValueChange={(value) => setFormData({ ...formData, teamsAdvancingPerGroup: value })}
                    >
                      <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 equipo</SelectItem>
                        <SelectItem value="2">2 equipos</SelectItem>
                        <SelectItem value="3">3 equipos</SelectItem>
                        <SelectItem value="4">4 equipos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Knockout options */}
              {(formData.tournamentFormat === 'knockout' || formData.tournamentFormat === 'group_knockout') && (
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/30">
                  <Checkbox
                    id="hasThirdPlaceMatch"
                    checked={formData.hasThirdPlaceMatch}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasThirdPlaceMatch: checked as boolean })
                    }
                    className="border-white/20"
                  />
                  <Label htmlFor="hasThirdPlaceMatch" className="cursor-pointer text-gray-300 text-xs md:text-sm">
                    Incluir partido por el tercer lugar
                  </Label>
                </div>
              )}

              <Button
                onClick={handleCreateTournament}
                className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-sm"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Torneo'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="backdrop-blur-xl bg-red-500/20 border border-red-300/30 rounded-md p-4 mb-6 shadow-xl">
          <p className="text-white drop-shadow">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando torneos...</span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-white/50 drop-shadow" />
          <p className="text-white/80 drop-shadow">No hay torneos creados todavía</p>
          <p className="text-sm text-white/70 drop-shadow">Crea tu primer torneo para comenzar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2">
          {tournaments.map((tournament) => (
          <Card key={tournament.id} className="backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center text-white drop-shadow-lg">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                    {tournament.name}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-2 text-white/70 drop-shadow">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                  </CardDescription>
                  {tournament.max_players && (
                    <CardDescription className="flex items-center mt-1 text-white/70 drop-shadow">
                      <Users className="w-4 h-4 mr-1" />
                      Límite: {tournament.max_players} jugadores por equipo
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={tournament.is_active ? "backdrop-blur-md bg-green-500/80 text-white border-0" : "backdrop-blur-md bg-gray-500/80 text-white border-0"}>
                    {tournament.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge className={tournament.registration_open ? "backdrop-blur-md bg-blue-500/80 text-white border-0 flex items-center gap-1" : "backdrop-blur-md bg-red-500/80 text-white border-0 flex items-center gap-1"}>
                    {tournament.registration_open ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        Registros Abiertos
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Registros Cerrados
                      </>
                    )}
                  </Badge>
                  <Badge className="backdrop-blur-md bg-white/20 text-white border-white/30 flex items-center gap-1">
                    {tournament.tournament_format === 'league' && '🏆 Liga'}
                    {tournament.tournament_format === 'knockout' && '⚡ Eliminación'}
                    {tournament.tournament_format === 'group_knockout' && '🌍 Grupos + Eliminación'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20" size="sm" onClick={() => handleEditTournament(tournament)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20" size="sm" onClick={() => toggleTournamentStatus(tournament.id)}>
                  {tournament.is_active ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  className={tournament.registration_open ? "backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0" : "backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"}
                  size="sm"
                  onClick={() => toggleRegistrationStatus(tournament.id)}
                >
                  {tournament.registration_open ? (
                    <>
                      <Lock className="w-4 h-4 mr-1" />
                      Cerrar Registros
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-1" />
                      Abrir Registros
                    </>
                  )}
                </Button>
                <Button
                  className="backdrop-blur-md bg-red-600/80 hover:bg-red-600/90 text-white border-0"
                  size="sm"
                  onClick={() => setDeletingTournament(tournament)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Borrar Torneo
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Edit Tournament Dialog */}
      <Dialog open={!!editingTournament} onOpenChange={() => setEditingTournament(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white text-sm md:text-base">
              <Edit className="w-4 h-4 mr-2 text-blue-400" />
              Editar Torneo
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">Modifica la información del torneo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre del Torneo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 bg-slate-800/50 border-white/10 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-startDate" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Fecha de Inicio</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-9 bg-slate-800/50 border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Fecha de Fin</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-9 bg-slate-800/50 border-white/10 text-white text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-maxPlayers" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Límite Jugadores</Label>
                <Input
                  id="edit-maxPlayers"
                  type="number"
                  min="1"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                  placeholder="Sin límite"
                  className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-maxCoachingStaff" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Límite Cuerpo Técnico</Label>
                <Input
                  id="edit-maxCoachingStaff"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxCoachingStaff}
                  onChange={(e) => setFormData({ ...formData, maxCoachingStaff: e.target.value })}
                  placeholder="10"
                  className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                />
              </div>
            </div>

            {/* Tournament Format */}
            <div>
              <Label htmlFor="edit-tournamentFormat" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Formato del Torneo</Label>
              <Select
                value={formData.tournamentFormat}
                onValueChange={(value: 'league' | 'knockout' | 'group_knockout') =>
                  setFormData({ ...formData, tournamentFormat: value })
                }
              >
                <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                  <SelectValue placeholder="Selecciona el formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league">Liga (Todos contra Todos)</SelectItem>
                  <SelectItem value="knockout">Eliminación Directa</SelectItem>
                  <SelectItem value="group_knockout">Fase de Grupos + Eliminación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* League-specific options */}
            {formData.tournamentFormat === 'league' && (
              <div>
                <Label htmlFor="edit-roundsPerSeason" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Vueltas</Label>
                <Select
                  value={formData.roundsPerSeason}
                  onValueChange={(value) => setFormData({ ...formData, roundsPerSeason: value })}
                >
                  <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Una vuelta (todos vs todos)</SelectItem>
                    <SelectItem value="2">Dos vueltas (ida y vuelta)</SelectItem>
                    <SelectItem value="3">Tres vueltas</SelectItem>
                    <SelectItem value="4">Cuatro vueltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group knockout specific options */}
            {formData.tournamentFormat === 'group_knockout' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="edit-numberOfGroups" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Número de Grupos</Label>
                  <Select
                    value={formData.numberOfGroups}
                    onValueChange={(value) => setFormData({ ...formData, numberOfGroups: value })}
                  >
                    <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 grupos</SelectItem>
                      <SelectItem value="4">4 grupos</SelectItem>
                      <SelectItem value="6">6 grupos</SelectItem>
                      <SelectItem value="8">8 grupos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-teamsAdvancingPerGroup" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Equipos que avanzan</Label>
                  <Select
                    value={formData.teamsAdvancingPerGroup}
                    onValueChange={(value) => setFormData({ ...formData, teamsAdvancingPerGroup: value })}
                  >
                    <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 equipo</SelectItem>
                      <SelectItem value="2">2 equipos</SelectItem>
                      <SelectItem value="3">3 equipos</SelectItem>
                      <SelectItem value="4">4 equipos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Knockout options */}
            {(formData.tournamentFormat === 'knockout' || formData.tournamentFormat === 'group_knockout') && (
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/30">
                <Checkbox
                  id="edit-hasThirdPlaceMatch"
                  checked={formData.hasThirdPlaceMatch}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasThirdPlaceMatch: checked as boolean })
                  }
                  className="border-white/20"
                />
                <Label htmlFor="edit-hasThirdPlaceMatch" className="cursor-pointer text-gray-300 text-xs md:text-sm">
                  Incluir partido por el tercer lugar
                </Label>
              </div>
            )}

            <Button
              onClick={handleUpdateTournament}
              className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-sm"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Torneo'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTournament} onOpenChange={() => setDeletingTournament(null)}>
        <AlertDialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-sm md:text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-3">
              <p className="font-medium text-sm md:text-base text-white">
                ¿Eliminar "{deletingTournament?.name}"?
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-red-400 text-xs md:text-sm">Esta acción es IRREVERSIBLE</p>
                <ul className="text-[10px] md:text-xs list-disc list-inside space-y-0.5 text-gray-400">
                  <li>Todos los partidos del torneo</li>
                  <li>Todas las estadísticas de jugadores</li>
                  <li>Los equipos perderán su vinculación</li>
                </ul>
              </div>
              <p className="text-[10px] md:text-xs text-gray-500">
                Si solo quieres ocultar temporalmente el torneo, usa "Desactivar".
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel
              className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
              disabled={deleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
