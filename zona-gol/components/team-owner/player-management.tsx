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
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/ui/file-upload"
import { useTeams } from "@/lib/hooks/use-teams"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { useAuth } from "@/lib/hooks/use-auth"
import { PlayerQRModal } from "@/components/ui/player-qr-modal"
import { Plus, Edit, Trash2, User, Loader2, QrCode, Ban, AlertCircle, Lock } from "lucide-react"
import { toast } from "sonner"

type Player = Database['public']['Tables']['players']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']

interface PlayerManagementProps {
  teamId: string
  teamName?: string
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

export function PlayerManagement({ teamId, teamName = "Equipo" }: PlayerManagementProps) {
  const { profile } = useAuth()
  const {
    players,
    currentTeam,
    loading,
    error,
    getPlayersByTeam,
    getTeamById,
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
  const [teamInfo, setTeamInfo] = useState<{
    name: string,
    logo?: string | null
  }>({ name: teamName })
  const [suspendedPlayers, setSuspendedPlayers] = useState<Set<string>>(new Set())
  const [maxPlayersLimit, setMaxPlayersLimit] = useState<number | null>(null)
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    jerseyNumber: "",
    birthDate: "",
    photo: "",
  })
  const [requestFormData, setRequestFormData] = useState({
    name: "",
    position: "",
    jerseyNumber: "",
    birthDate: "",
    reason: "",
  })
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  const supabase = createClientSupabaseClient()

  // Load players when component mounts or teamId changes
  useEffect(() => {
    if (teamId) {
      console.log('🔵 Loading players for teamId:', teamId)
      getPlayersByTeam(teamId).catch(console.error)
      loadSuspendedPlayers()
    } else {
      console.warn('⚠️ No teamId provided to PlayerManagement')
    }
  }, [teamId, getPlayersByTeam])

  // Load suspended players
  const loadSuspendedPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('player_suspensions')
        .select('player_id')
        .eq('team_id', teamId)
        .eq('status', 'active')

      if (error) {
        console.error('Error loading suspended players:', error)
        return
      }

      const suspendedIds = new Set(data?.map(s => s.player_id) || [])
      setSuspendedPlayers(suspendedIds)
    } catch (error) {
      console.error('Error loading suspended players:', error)
    }
  }

  // Load team information and tournament max players
  useEffect(() => {
    if (teamId && getTeamById) {
      getTeamById(teamId)
        .then(async (team) => {
          if (team) {
            setTeamInfo({
              name: team.name || teamName,
              logo: team.logo || null
            })

            // Load tournament max_players and registration_open if team has a tournament
            if (team.tournament_id) {
              try {
                const { data: tournament, error } = await supabase
                  .from('tournaments')
                  .select('max_players, registration_open, id')
                  .eq('id', team.tournament_id)
                  .single()

                if (!error && tournament) {
                  console.log('🔵 Tournament info loaded:', tournament)
                  setMaxPlayersLimit(tournament.max_players)
                  setRegistrationOpen(tournament.registration_open)
                  setTournamentId(tournament.id)
                  console.log('🔵 Registration open status:', tournament.registration_open)
                }
              } catch (err) {
                console.error('Error loading tournament info:', err)
              }
            }
          }
        })
        .catch(console.error)
    }
  }, [teamId, getTeamById, teamName])



  const handleCreatePlayer = async () => {
    if (!formData.name || !formData.position || !formData.jerseyNumber) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    const jerseyNumber = parseInt(formData.jerseyNumber)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      toast.error('El número de camiseta debe estar entre 1 y 99')
      return
    }

    // Check if jersey number is already used
    if (getUsedJerseyNumbers().includes(jerseyNumber)) {
      toast.error('Este número de camiseta ya está en uso')
      return
    }

    // Check if max players limit has been reached
    if (maxPlayersLimit && players.length >= maxPlayersLimit) {
      toast.error(`Has alcanzado el límite de ${maxPlayersLimit} jugadores permitidos para este torneo`)
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
      toast.success(`Jugador ${formData.name} registrado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error creando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    const jerseyNumber = parseInt(formData.jerseyNumber)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      toast.error('El número de camiseta debe estar entre 1 y 99')
      return
    }

    // Check if jersey number is already used by another player
    if (getUsedJerseyNumbers().includes(jerseyNumber)) {
      toast.error('Este número de camiseta ya está en uso')
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
      toast.success(`Jugador ${formData.name} actualizado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error actualizando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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
      toast.success(`Jugador ${player.name} eliminado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error eliminando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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
      toast.success(`Jugador ${player.name} ${action}do exitosamente`)
    } catch (error: any) {
      console.error(`❌ Error al ${action} jugador:`, error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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

  // Función para solicitar registro excepcional de jugador
  const handleRequestPlayer = async () => {
    if (!requestFormData.name || !requestFormData.position || !requestFormData.jerseyNumber || !requestFormData.reason) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (!tournamentId || !profile?.id) {
      toast.error('Error: No se pudo identificar el torneo o usuario')
      return
    }

    const jerseyNumber = parseInt(requestFormData.jerseyNumber)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      toast.error('El número de camiseta debe estar entre 1 y 99')
      return
    }

    setSubmittingRequest(true)

    try {
      const { error } = await supabase
        .from('player_registration_requests')
        .insert({
          team_id: teamId,
          tournament_id: tournamentId,
          player_name: requestFormData.name,
          player_position: requestFormData.position,
          jersey_number: jerseyNumber,
          birth_date: requestFormData.birthDate || null,
          reason: requestFormData.reason,
          requested_by: profile.id,
          status: 'pending'
        })

      if (error) throw error

      toast.success('Solicitud enviada exitosamente', {
        description: 'El administrador de la liga la revisará.'
      })
      setRequestFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", reason: "" })
      setIsRequestDialogOpen(false)
      console.log('✅ Solicitud de jugador excepcional enviada')
    } catch (error: any) {
      console.error('❌ Error enviando solicitud:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setSubmittingRequest(false)
    }
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
        toast.error('Error generando código QR')
      }
    } catch (error: any) {
      console.error('❌ Error generando QR:', error)
      toast.error(`Error generando QR: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }


  // Don't render if no teamId
  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Encontrado</h2>
        <p className="text-white/80 drop-shadow">
          No se pudo cargar la información del equipo.
        </p>
      </div>
    )
  }

  const remainingSlots = maxPlayersLimit ? maxPlayersLimit - players.length : null
  const isAtLimit = maxPlayersLimit ? players.length >= maxPlayersLimit : false
  const canRegister = registrationOpen && !isAtLimit

  console.log('🔍 Registration state:', {
    registrationOpen,
    isAtLimit,
    canRegister,
    maxPlayersLimit,
    playersCount: players.length
  })

  return (
    <div className="space-y-6">
      {error && (
        <div className="backdrop-blur-xl bg-red-500/20 border border-red-300/30 rounded-xl p-4 mb-6 shadow-xl">
          <p className="text-white drop-shadow">{error}</p>
        </div>
      )}

      {!registrationOpen && (
        <div className="border-2 border-red-400/50 rounded-xl p-4 backdrop-blur-xl bg-red-500/20 shadow-xl">
          <div className="flex items-start">
            <Lock className="w-6 h-6 mr-3 mt-0.5 text-red-300 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-white drop-shadow-lg text-lg">Registro de Jugadores Cerrado</h3>
              <p className="text-sm mt-2 text-white/90 drop-shadow">
                La liga ha cerrado el periodo de registro de jugadores para este torneo.
                Si necesitas registrar un jugador debido a una lesión u otra circunstancia excepcional,
                puedes solicitar una aprobación especial más abajo.
              </p>
            </div>
          </div>
        </div>
      )}

      {maxPlayersLimit && registrationOpen && (
        <div className={`border rounded-xl p-4 backdrop-blur-xl shadow-xl ${isAtLimit ? 'bg-red-500/20 border-red-400/50' : 'bg-blue-500/20 border-blue-400/50'}`}>
          <div className="flex items-start">
            <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${isAtLimit ? 'text-red-300' : 'text-blue-300'}`} />
            <div className="flex-1">
              <h3 className={`font-semibold text-white drop-shadow-lg`}>
                {isAtLimit ? 'Límite de jugadores alcanzado' : 'Límite de jugadores'}
              </h3>
              <p className={`text-sm mt-1 text-white/90 drop-shadow`}>
                {isAtLimit
                  ? `Has registrado el máximo de ${maxPlayersLimit} jugadores permitidos para este torneo.`
                  : `Tienes ${remainingSlots} ${remainingSlots === 1 ? 'espacio disponible' : 'espacios disponibles'} de ${maxPlayersLimit} jugadores permitidos.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Gestión de Jugadores</h2>
          <p className="text-white/80 drop-shadow">Administra los jugadores de tu equipo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
              disabled={!canRegister}
            >
              <Plus className="w-4 h-4 mr-2" />
              {!registrationOpen ? 'Registros Cerrados' : isAtLimit ? 'Límite Alcanzado' : 'Nuevo Jugador'}
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white drop-shadow-lg">Registrar Nuevo Jugador</DialogTitle>
              <DialogDescription className="text-white/80 drop-shadow">Completa la información del jugador</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white drop-shadow">Fotografía del Jugador</Label>
                <FileUpload
                  variant="avatar"
                  value={formData.photo}
                  onChange={(file, dataUrl) => setFormData({ ...formData, photo: dataUrl || "" })}
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-white drop-shadow">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Carlos Rodríguez"
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="position" className="text-white drop-shadow">Posición</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-xl">
                    <SelectValue placeholder="Seleccionar posición" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/10 border-white/20">
                    {positions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jerseyNumber" className="text-white drop-shadow">Número de Camiseta</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                  placeholder="9"
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                />
                {formData.jerseyNumber && getUsedJerseyNumbers().includes(Number.parseInt(formData.jerseyNumber)) && (
                  <p className="text-sm text-red-300 drop-shadow mt-1">Este número ya está en uso</p>
                )}
              </div>
              <div>
                <Label htmlFor="birthDate" className="text-white drop-shadow">Fecha de Nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-xl"
                />
              </div>
              <Button
                onClick={handleCreatePlayer}
                disabled={!formData.name.trim() || !formData.position || !formData.jerseyNumber || creating}
                className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
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
        {players.map((player) => {
          const isSuspended = suspendedPlayers.has(player.id)
          return (
          <Card key={player.id} className={isSuspended ? 'border-red-400/50 backdrop-blur-xl bg-red-500/20 shadow-xl' : 'backdrop-blur-xl bg-white/10 border-white/20 shadow-xl'}>
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
                  <CardDescription className="text-white/70 drop-shadow">{player.position}</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={player.is_active ? "default" : "secondary"} className="w-fit">
                  {player.is_active ? "Activo" : "Inactivo"}
                </Badge>
                {isSuspended && (
                  <Badge variant="destructive" className="w-fit flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Suspendido
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {player.birth_date && (
                  <p className="text-sm text-white/80 drop-shadow">Edad: {calculateAge(player.birth_date)} años</p>
                )}
                <p className="text-sm text-white/70 drop-shadow">
                  Registrado: {new Date(player.created_at).toLocaleDateString("es-ES")}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPlayer(player)} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateQR(player)}
                    disabled={generatingQR}
                    className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => togglePlayerStatus(player.id)} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
                    {player.is_active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePlayer(player.id)}
                    className="backdrop-blur-md bg-red-500/30 border-red-300/50 text-red-300 hover:bg-red-500/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
        })}
        </div>
      )}

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg">Editar Jugador</DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">Modifica la información del jugador</DialogDescription>
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
              <Label htmlFor="edit-name" className="text-white drop-shadow">Nombre Completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
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

      {/* Sección de solicitud de jugador excepcional */}
      {!registrationOpen && tournamentId && (
        <div className="border-t-2 border-white/20 pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-white drop-shadow-lg">Solicitar Jugador Excepcional</h3>
              <p className="text-sm text-white/80 drop-shadow">Por lesión u otra circunstancia excepcional</p>
            </div>
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="backdrop-blur-md bg-blue-500/20 border-blue-300/50 text-white hover:bg-blue-500/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Solicitar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
                <DialogHeader>
                  <DialogTitle>Solicitar Registro Excepcional</DialogTitle>
                  <DialogDescription>
                    Completa la información del jugador y justifica la solicitud. El administrador de la liga revisará tu solicitud.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="request-name">Nombre Completo</Label>
                    <Input
                      id="request-name"
                      value={requestFormData.name}
                      onChange={(e) => setRequestFormData({ ...requestFormData, name: e.target.value })}
                      placeholder="Carlos Rodríguez"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-position">Posición</Label>
                    <Select
                      value={requestFormData.position}
                      onValueChange={(value) => setRequestFormData({ ...requestFormData, position: value })}
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
                    <Label htmlFor="request-jerseyNumber">Número de Camiseta</Label>
                    <Input
                      id="request-jerseyNumber"
                      type="number"
                      min="1"
                      max="99"
                      value={requestFormData.jerseyNumber}
                      onChange={(e) => setRequestFormData({ ...requestFormData, jerseyNumber: e.target.value })}
                      placeholder="9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-birthDate">Fecha de Nacimiento (opcional)</Label>
                    <Input
                      id="request-birthDate"
                      type="date"
                      value={requestFormData.birthDate}
                      onChange={(e) => setRequestFormData({ ...requestFormData, birthDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-reason">Justificación de la Solicitud</Label>
                    <Textarea
                      id="request-reason"
                      value={requestFormData.reason}
                      onChange={(e) => setRequestFormData({ ...requestFormData, reason: e.target.value })}
                      placeholder="Ejemplo: El jugador titular sufrió una lesión de ligamento cruzado anterior y estará fuera por 6 meses. Necesitamos un reemplazo para completar el plantel."
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Explica detalladamente la razón por la cual necesitas registrar este jugador
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestPlayer}
                    disabled={submittingRequest}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {submittingRequest ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando solicitud...
                      </>
                    ) : (
                      'Enviar Solicitud'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

    </div>
  )
}
