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
import { Plus, Edit, Calendar, Trophy, Loader2 } from "lucide-react"

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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Liga No Encontrada</h2>
        <p className="text-gray-600">
          No se pudo cargar la información de la liga.
        </p>
      </div>
    )
  }

  const handleCreateTournament = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setCreating(true)
    
    try {
      await createTournament({
        name: formData.name,
        league_id: leagueId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        is_active: true
      })

      setFormData({ name: "", startDate: "", endDate: "" })
      setIsCreateDialogOpen(false)
      console.log('✅ Torneo creado exitosamente')
    } catch (error: any) {
      console.error('❌ Error creando torneo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
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
      })

      setEditingTournament(null)
      setFormData({ name: "", startDate: "", endDate: "" })
      console.log('✅ Torneo actualizado exitosamente')
    } catch (error: any) {
      console.error('❌ Error actualizando torneo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
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
      console.log('✅ Estado del torneo actualizado')
    } catch (error: any) {
      console.error('❌ Error actualizando estado del torneo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Torneos</h2>
          <p className="text-gray-600">Administra los torneos de tu liga</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
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
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
                </div>
                <Badge variant={tournament.is_active ? "default" : "secondary"}>
                  {tournament.is_active ? "Activo" : "Inactivo"}
                </Badge>
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
