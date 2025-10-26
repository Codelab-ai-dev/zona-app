"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Edit, Calendar, Trophy, Loader2, Users, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

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
    deleteTournament
  } = useTournaments()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    maxPlayers: "",
    maxCoachingStaff: "10",
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
        <h2 className="text-2xl font-bold text-foreground mb-4">Liga No Encontrada</h2>
        <p className="text-muted-foreground">
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
        is_active: true
      })

      setFormData({ name: "", startDate: "", endDate: "", maxPlayers: "", maxCoachingStaff: "10" })
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
      })

      setEditingTournament(null)
      setFormData({ name: "", startDate: "", endDate: "", maxPlayers: "", maxCoachingStaff: "10" })
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
          <h2 className="text-2xl font-bold text-foreground">Gestión de Torneos</h2>
          <p className="text-muted-foreground">Administra los torneos de tu liga</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-soccer-green hover:bg-soccer-green-dark">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Torneo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Torneo</DialogTitle>
              <DialogDescription>Completa la información para crear un nuevo torneo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Torneo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Temporada 2024 - Apertura"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha de Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxPlayers">Límite de Jugadores por Equipo (opcional)</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="1"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                  placeholder="Sin límite"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deja vacío para no establecer límite de jugadores
                </p>
              </div>
              <div>
                <Label htmlFor="maxCoachingStaff">Límite de Cuerpo Técnico por Equipo</Label>
                <Input
                  id="maxCoachingStaff"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxCoachingStaff}
                  onChange={(e) => setFormData({ ...formData, maxCoachingStaff: e.target.value })}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Límite de miembros del cuerpo técnico (por defecto 10)
                </p>
              </div>
              <Button
                onClick={handleCreateTournament}
                className="w-full bg-green-600 hover:bg-green-700"
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando torneos...</span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>No hay torneos creados todavía</p>
          <p className="text-sm">Crea tu primer torneo para comenzar</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tournaments.map((tournament) => (
          <Card key={tournament.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                    {tournament.name}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-2">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                  </CardDescription>
                  {tournament.max_players && (
                    <CardDescription className="flex items-center mt-1">
                      <Users className="w-4 h-4 mr-1" />
                      Límite: {tournament.max_players} jugadores por equipo
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Badge variant={tournament.is_active ? "default" : "secondary"}>
                    {tournament.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant={tournament.registration_open ? "default" : "destructive"} className="flex items-center gap-1">
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditTournament(tournament)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleTournamentStatus(tournament.id)}>
                  {tournament.is_active ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant={tournament.registration_open ? "destructive" : "default"}
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
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Edit Tournament Dialog */}
      <Dialog open={!!editingTournament} onOpenChange={() => setEditingTournament(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Torneo</DialogTitle>
            <DialogDescription>Modifica la información del torneo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Torneo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-startDate">Fecha de Inicio</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-endDate">Fecha de Fin</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-maxPlayers">Límite de Jugadores por Equipo (opcional)</Label>
              <Input
                id="edit-maxPlayers"
                type="number"
                min="1"
                value={formData.maxPlayers}
                onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                placeholder="Sin límite"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deja vacío para no establecer límite de jugadores
              </p>
            </div>
            <div>
              <Label htmlFor="edit-maxCoachingStaff">Límite de Cuerpo Técnico por Equipo</Label>
              <Input
                id="edit-maxCoachingStaff"
                type="number"
                min="1"
                max="20"
                value={formData.maxCoachingStaff}
                onChange={(e) => setFormData({ ...formData, maxCoachingStaff: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Límite de miembros del cuerpo técnico (por defecto 10)
              </p>
            </div>
            <Button
              onClick={handleUpdateTournament}
              className="w-full bg-green-600 hover:bg-green-700"
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

    </div>
  )
}
