"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { useTeams } from "@/lib/hooks/use-teams"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { useAuth } from "@/lib/hooks/use-auth"
import { PlayerQRModal } from "@/components/ui/player-qr-modal"
import { Plus, Edit, Trash2, User, Loader2, QrCode } from "lucide-react"

type Player = Database['public']['Tables']['players']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']

interface PlayerManagementProps {
  teamId: string
}

const positions = [
  "Portero",
  "Defensa Central",
  "Lateral Derecho",
  "Lateral Izquierdo",
  "Mediocampista Defensivo",
  "Mediocampista Central",
  "Mediocampista Ofensivo",
  "Extremo Derecho",
  "Extremo Izquierdo",
  "Delantero",
]

export function PlayerManagement({ teamId }: PlayerManagementProps) {
  const { profile } = useAuth()
  const {
    players,
    loading,
    error,
    getPlayersByTeam,
    createPlayer,
    updatePlayer,
    deletePlayer
  } = useTeams()
  const { generatePlayerQR } = useQRGenerator()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [currentQRData, setCurrentQRData] = useState<{
    player: Player,
    qrData: string,
    credential: any
  } | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    jerseyNumber: "",
    birthDate: "",
    photo: "",
  })

  // Load players when component mounts or teamId changes
  useEffect(() => {
    if (teamId) {
      console.log('🔵 Loading players for teamId:', teamId)
      getPlayersByTeam(teamId).catch(console.error)
    } else {
      console.warn('⚠️ No teamId provided to PlayerManagement')
    }
  }, [teamId, getPlayersByTeam])



  const handleCreatePlayer = async () => {
    if (!formData.name || !formData.position || !formData.jerseyNumber) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    const jerseyNumber = parseInt(formData.jerseyNumber)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      alert('El número de camiseta debe estar entre 1 y 99')
      return
    }

    // Check if jersey number is already used
    if (getUsedJerseyNumbers().includes(jerseyNumber)) {
      alert('Este número de camiseta ya está en uso')
      return
    }

    setCreating(true)
    
    try {
      const playerData: PlayerInsert = {
        name: formData.name,
        team_id: teamId,
        position: formData.position,
        jersey_number: jerseyNumber,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
        is_active: true,
      }

      const createdPlayer = await createPlayer(playerData)
      console.log('✅ Jugador creado exitosamente:', createdPlayer)
      
      // Generar QR automáticamente después de crear el jugador
      if (createdPlayer?.id && profile?.league_id) {
        setGeneratingQR(true)
        try {
          console.log('🔵 Generando QR automáticamente para nuevo jugador...')
          
          // Usar formato legacy para compatibilidad
          const qrResult = await generatePlayerQR(
            {
              id: createdPlayer.id,
              name: createdPlayer.name,
              team_id: createdPlayer.team_id,
              jersey_number: createdPlayer.jersey_number
            },
            { format: 'legacy' }
          )
          
          if (qrResult && qrResult.success) {
            console.log('✅ QR generado exitosamente')
            setCurrentQRData({
              player: createdPlayer,
              qrData: qrResult.qrData,
              credential: qrResult.credential
            })
            setQrModalOpen(true)
          } else {
            console.warn('⚠️ Error generando QR (jugador creado exitosamente)')
          }
        } catch (qrError: any) {
          console.warn('⚠️ Error generando QR (jugador creado exitosamente):', qrError)
        } finally {
          setGeneratingQR(false)
        }
      }
      
      setFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", photo: "" })
      setIsCreateDialogOpen(false)
      
      // Reload players to show the new player
      await getPlayersByTeam(teamId)
    } catch (error: any) {
      console.error('❌ Error creando jugador:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    setFormData({
      name: player.name,
      position: player.position,
      jerseyNumber: player.jersey_number.toString(),
      birthDate: player.birth_date || "",
      photo: player.photo || "",
    })
  }

  const handleUpdatePlayer = async () => {
    if (!editingPlayer || !formData.name || !formData.position || !formData.jerseyNumber) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    const jerseyNumber = parseInt(formData.jerseyNumber)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      alert('El número de camiseta debe estar entre 1 y 99')
      return
    }

    // Check if jersey number is already used by another player
    if (getUsedJerseyNumbers().includes(jerseyNumber)) {
      alert('Este número de camiseta ya está en uso')
      return
    }

    setUpdating(true)
    
    try {
      const updates: PlayerUpdate = {
        name: formData.name,
        position: formData.position,
        jersey_number: jerseyNumber,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
      }

      const updatedPlayer = await updatePlayer(editingPlayer.id, updates)
      console.log('✅ Jugador actualizado exitosamente:', updatedPlayer)
      
      setEditingPlayer(null)
      setFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", photo: "" })
      
      // Reload players to show the updated player
      await getPlayersByTeam(teamId)
    } catch (error: any) {
      console.error('❌ Error actualizando jugador:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar a ${player.name}?`
    
    if (!confirm(confirmMessage)) return

    try {
      await deletePlayer(playerId)
      console.log('✅ Jugador eliminado exitosamente')
      
      // Reload players to show the updated list
      await getPlayersByTeam(teamId)
    } catch (error: any) {
      console.error('❌ Error eliminando jugador:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const togglePlayerStatus = async (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    const action = player.is_active ? 'desactivar' : 'activar'
    const confirmMessage = `¿Estás seguro de que quieres ${action} a ${player.name}?`
    
    if (!confirm(confirmMessage)) return

    try {
      await updatePlayer(playerId, {
        is_active: !player.is_active
      })
      console.log(`✅ Jugador ${action}do exitosamente`)
      
      // Reload players to show the updated status
      await getPlayersByTeam(teamId)
    } catch (error: any) {
      console.error(`❌ Error al ${action} jugador:`, error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUsedJerseyNumbers = () => {
    return players.filter((p) => p.id !== editingPlayer?.id).map((p) => p.jersey_number)
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Función para generar QR manualmente para jugadores existentes
  const handleGenerateQR = async (player: Player) => {
    setGeneratingQR(true)
    try {
      console.log('🔵 Generando QR manualmente para jugador:', player.name)
      
      // Usar formato legacy para compatibilidad
      const qrResult = await generatePlayerQR(
        {
          id: player.id,
          name: player.name,
          team_id: player.team_id,
          jersey_number: player.jersey_number
        },
        { format: 'legacy' }
      )
      
      if (qrResult && qrResult.success) {
        console.log('✅ QR generado exitosamente')
        setCurrentQRData({
          player,
          qrData: qrResult.qrData,
          credential: qrResult.credential
        })
        setQrModalOpen(true)
      } else {
        alert('Error generando código QR')
      }
    } catch (error: any) {
      console.error('❌ Error generando QR:', error)
      alert(`Error generando QR: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  // Don't render if no teamId
  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Encontrado</h2>
        <p className="text-gray-600">
          No se pudo cargar la información del equipo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Jugadores</h2>
          <p className="text-gray-600">Administra los jugadores de tu equipo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Jugador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Jugador</DialogTitle>
              <DialogDescription>Completa la información del jugador</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fotografía del Jugador</Label>
                <FileUpload
                  variant="avatar"
                  value={formData.photo}
                  onChange={(file, dataUrl) => setFormData({ ...formData, photo: dataUrl || "" })}
                />
              </div>
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Carlos Rodríguez"
                />
              </div>
              <div>
                <Label htmlFor="position">Posición</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar posición" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jerseyNumber">Número de Camiseta</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                  placeholder="9"
                />
                {formData.jerseyNumber && getUsedJerseyNumbers().includes(Number.parseInt(formData.jerseyNumber)) && (
                  <p className="text-sm text-red-600 mt-1">Este número ya está en uso</p>
                )}
              </div>
              <div>
                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleCreatePlayer} 
                disabled={!formData.name.trim() || !formData.position || !formData.jerseyNumber || creating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando jugador...
                  </>
                ) : (
                  'Registrar Jugador'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando jugadores...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay jugadores registrados</h3>
          <p className="text-gray-600">Comienza registrando jugadores para tu equipo</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <Card key={player.id}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  {player.photo && (
                    <AvatarImage
                      src={player.photo || "/placeholder.svg?height=48&width=48&query=player"}
                      alt={player.name}
                    />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-800 font-bold">
                    {getPlayerInitials(player.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg flex items-center">
                    {player.name}
                    <span className="ml-2 text-sm font-bold text-green-600">#{player.jersey_number}</span>
                  </CardTitle>
                  <CardDescription>{player.position}</CardDescription>
                </div>
              </div>
              <Badge variant={player.is_active ? "default" : "secondary"} className="w-fit">
                {player.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {player.birth_date && (
                  <p className="text-sm text-gray-600">Edad: {calculateAge(player.birth_date)} años</p>
                )}
                <p className="text-sm text-gray-500">
                  Registrado: {new Date(player.created_at).toLocaleDateString("es-ES")}
                </p>
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPlayer(player)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleGenerateQR(player)}
                    disabled={generatingQR}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => togglePlayerStatus(player.id)}>
                    {player.is_active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePlayer(player.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Jugador</DialogTitle>
            <DialogDescription>Modifica la información del jugador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fotografía del Jugador</Label>
              <FileUpload
                variant="avatar"
                value={formData.photo}
                onChange={(file, dataUrl) => setFormData({ ...formData, photo: dataUrl || "" })}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nombre Completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-position">Posición</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-jerseyNumber">Número de Camiseta</Label>
              <Input
                id="edit-jerseyNumber"
                type="number"
                min="1"
                max="99"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
              />
              {formData.jerseyNumber && getUsedJerseyNumbers().includes(Number.parseInt(formData.jerseyNumber)) && (
                <p className="text-sm text-red-600 mt-1">Este número ya está en uso</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-birthDate">Fecha de Nacimiento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
            <Button 
              onClick={handleUpdatePlayer} 
              disabled={!formData.name.trim() || !formData.position || !formData.jerseyNumber || updating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando jugador...
                </>
              ) : (
                'Actualizar Jugador'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR */}
      {currentQRData && (
        <PlayerQRModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          player={currentQRData.player}
          qrData={currentQRData.qrData}
          credential={currentQRData.credential}
        />
      )}
    </div>
  )
}
