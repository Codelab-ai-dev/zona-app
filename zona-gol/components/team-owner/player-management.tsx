"use client"

import { useState, useRef, useMemo } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/ui/file-upload"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { useAuth } from "@/lib/hooks/use-auth"
import { useLeagueFeatures } from "@/lib/hooks/use-league-features"
import { PlayerQRModal } from "@/components/ui/player-qr-modal"
import { Plus, Edit, Trash2, User, Loader2, QrCode, Ban, AlertCircle, Lock, ShieldCheck, Upload, CheckCircle, XCircle, CreditCard } from "lucide-react"
import { toast } from "sonner"
import {
  usePlayers,
  useTeamById,
  useTeamSuspensions,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  useTournamentById,
  queryKeys,
} from "@/lib/queries"
import { useQueryClient } from "@tanstack/react-query"
import { useAgeValidation } from "@/lib/hooks/use-age-validation"

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
  const { generatePlayerQR } = useQRGenerator()
  const queryClient = useQueryClient()

  // React Query hooks
  const { data: playersData, isLoading: loadingPlayers, error: playersError } = usePlayers(teamId)
  const { data: teamData } = useTeamById(teamId)
  const { data: suspensionsData } = useTeamSuspensions(teamId)

  // Mutations
  const createMutation = useCreatePlayer()
  const updateMutation = useUpdatePlayer()
  const deleteMutation = useDeletePlayer()

  // Extract data from React Query
  const players = playersData?.players || []
  const maxPlayersLimit = playersData?.maxLimit || null
  const registrationOpen = playersData?.registrationOpen ?? true
  const tournamentId = playersData?.tournamentId || null

  // Memoize suspended players set
  const suspendedPlayers = useMemo(() => {
    return new Set(suspensionsData?.map(s => s.player_id) || [])
  }, [suspensionsData])

  // Team info
  const teamInfo = useMemo(() => ({
    name: teamData?.name || teamName,
    logo: teamData?.logo || null
  }), [teamData, teamName])

  // League features
  const leagueId = teamData?.league_id
  const { hasFeature } = useLeagueFeatures(leagueId)

  // Age validation
  const {
    isAgeValidationEnabled,
    isIdDocumentRequired,
    validateAge,
    rulesDescription,
    availableExceptions,
  } = useAgeValidation({
    tournamentId: tournamentId || undefined,
    teamId,
  })

  // Local state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
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
    idDocumentUrl: "",
  })
  // INE extraction state
  const [ineImage, setIneImage] = useState<string>("")
  const [extractingIne, setExtractingIne] = useState(false)
  const [extractedData, setExtractedData] = useState<{
    nombre_completo: string
    fecha_nacimiento: string
    curp: string
    clave_elector?: string
  } | null>(null)
  const [ineExtractionError, setIneExtractionError] = useState<string>("")
  const [ageValidationResult, setAgeValidationResult] = useState<{
    isValid: boolean
    age: number
    meetsRegularRequirements: boolean
    isException: boolean
    reason?: string
  } | null>(null)

  const [requestFormData, setRequestFormData] = useState({
    name: "",
    position: "",
    jerseyNumber: "",
    birthDate: "",
    reason: "",
  })
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Estado para el modal de confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null)

  // Usar useRef para evitar crear un nuevo cliente en cada render
  const supabaseRef = useRef(createClientSupabaseClient())
  const supabase = supabaseRef.current

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

    try {
      const playerData: PlayerInsert = {
        name: formData.name,
        team_id: teamId,
        position: formData.position,
        jersey_number: jerseyNumber,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
        is_active: true,
        // INE verification fields
        id_document_url: formData.idDocumentUrl || null,
        id_verified: !!extractedData,
        id_verified_at: extractedData ? new Date().toISOString() : null,
        id_verification_method: extractedData ? 'automatic' : null,
        extracted_name: extractedData?.nombre_completo || null,
        extracted_curp: extractedData?.curp || null,
      }

      const createdPlayer = await createMutation.mutateAsync(playerData)

      // Actualizar la lista local inmediatamente (optimistic update)
      queryClient.setQueryData(
        queryKeys.players.byTeam(teamId),
        (oldData: any) => {
          if (!oldData) return { players: [createdPlayer], maxLimit: maxPlayersLimit, registrationOpen, tournamentId }
          return {
            ...oldData,
            players: [...oldData.players, createdPlayer]
          }
        }
      )

      // Generar QR automáticamente después de crear el jugador (solo si la feature está habilitada)
      if (createdPlayer?.id && profile?.league_id && hasFeature('qr_codes')) {
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

      const playerName = formData.name
      setFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", photo: "", idDocumentUrl: "" })
      resetIneState()
      setIsCreateDialogOpen(false)

      toast.success(`Jugador ${playerName} registrado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error creando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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
      idDocumentUrl: player.id_document_url || "",
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

    try {
      const updates: PlayerUpdate = {
        name: formData.name,
        position: formData.position,
        jersey_number: jerseyNumber,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
      }

      const playerId = editingPlayer.id
      const playerName = formData.name

      await updateMutation.mutateAsync({
        id: playerId,
        updates,
        teamId
      })

      // Optimistic update: actualizar el jugador en la lista local
      queryClient.setQueryData(
        queryKeys.players.byTeam(teamId),
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            players: oldData.players.map((p: any) =>
              p.id === playerId ? { ...p, ...updates } : p
            )
          }
        }
      )

      setEditingPlayer(null)
      setFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", photo: "", idDocumentUrl: "" })

      toast.success(`Jugador ${playerName} actualizado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error actualizando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  // Abre el modal de confirmación de eliminación
  const handleDeletePlayer = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    setPlayerToDelete(player)
    setDeleteConfirmOpen(true)
  }

  // Ejecuta la eliminación después de confirmar
  const confirmDeletePlayer = async () => {
    if (!playerToDelete) return

    const playerName = playerToDelete.name
    const playerId = playerToDelete.id

    try {
      // Cerrar modal primero
      setDeleteConfirmOpen(false)
      setPlayerToDelete(null)

      // Actualizar la lista local inmediatamente (optimistic update)
      queryClient.setQueryData(
        queryKeys.players.byTeam(teamId),
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            players: oldData.players.filter((p: any) => p.id !== playerId)
          }
        }
      )

      // Ejecutar mutation en background
      await deleteMutation.mutateAsync({ id: playerId, teamId })

      toast.success(`Jugador ${playerName} eliminado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error eliminando jugador:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
      // Revertir: refetch para restaurar el estado real
      queryClient.refetchQueries({ queryKey: queryKeys.players.byTeam(teamId) })
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

  // Función para extraer datos de la INE
  const handleExtractINE = async () => {
    if (!ineImage) {
      toast.error('Por favor sube una imagen de la INE')
      return
    }

    setExtractingIne(true)
    setIneExtractionError("")
    setExtractedData(null)
    setAgeValidationResult(null)

    try {
      const response = await fetch('/api/extract-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: ineImage }),
      })

      const result = await response.json()

      if (!result.success) {
        setIneExtractionError(result.error || 'Error al procesar la imagen')
        toast.error(result.error || 'Error al procesar la imagen')
        return
      }

      setExtractedData(result.data)

      // Auto-fill birth date
      if (result.data.fecha_nacimiento) {
        setFormData(prev => ({
          ...prev,
          birthDate: result.data.fecha_nacimiento,
        }))

        // Validate age
        if (isAgeValidationEnabled) {
          const validation = validateAge(result.data.fecha_nacimiento)
          setAgeValidationResult(validation)
        }
      }

      // Suggest name if empty
      if (!formData.name && result.data.nombre_completo) {
        setFormData(prev => ({
          ...prev,
          name: result.data.nombre_completo,
        }))
      }

      toast.success('Datos extraídos correctamente')
    } catch (error) {
      console.error('Error extracting INE data:', error)
      setIneExtractionError('Error de conexión al extraer datos')
      toast.error('Error de conexión al extraer datos')
    } finally {
      setExtractingIne(false)
    }
  }

  // Reset INE state when dialog closes
  const resetIneState = () => {
    setIneImage("")
    setExtractedData(null)
    setIneExtractionError("")
    setAgeValidationResult(null)
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
    // Verificar si la feature está disponible
    if (!hasFeature('qr_codes')) {
      toast.error('La generación de códigos QR no está disponible en tu plan actual')
      return
    }

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
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Encontrado</h2>
        <p className="text-white/80 drop-shadow">
          No se pudo cargar la información del equipo.
        </p>
      </div>
    )
  }

  const remainingSlots = maxPlayersLimit ? maxPlayersLimit - players.length : null
  const isAtLimit = maxPlayersLimit ? players.length >= maxPlayersLimit : false
  const canRegister = registrationOpen && !isAtLimit

  const loading = loadingPlayers
  const error = playersError?.message
  const creating = createMutation.isPending
  const updating = updateMutation.isPending

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
              <h3 className="font-bold text-white drop-shadow-lg text-base sm:text-lg">Registro de Jugadores Cerrado</h3>
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

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Gestión de Jugadores</h2>
          <p className="text-white/80 drop-shadow">Administra los jugadores de tu equipo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (open) {
              setFormData({ name: "", position: "", jerseyNumber: "", birthDate: "", photo: "", idDocumentUrl: "" })
              resetIneState()
            } else {
              resetIneState()
            }
            setIsCreateDialogOpen(open)
          }}>
          <DialogTrigger asChild>
            <Button
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg w-full sm:w-auto"
              disabled={!canRegister}
            >
              <Plus className="w-4 h-4 mr-2" />
              {!registrationOpen ? 'Registros Cerrados' : isAtLimit ? 'Límite Alcanzado' : 'Nuevo Jugador'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Jugador</DialogTitle>
              <DialogDescription className="text-slate-400">Completa la información del jugador</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pb-4">
              <div>
                <Label className="text-white">Fotografía del Jugador</Label>
                <FileUpload
                  variant="avatar"
                  value={formData.photo}
                  onChange={(file, dataUrl) => setFormData({ ...formData, photo: dataUrl || "" })}
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-white">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Carlos Rodríguez"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label htmlFor="position" className="text-white">Posición</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Seleccionar posición" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {positions.map((position) => (
                      <SelectItem key={position} value={position} className="text-white hover:bg-slate-700">
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jerseyNumber" className="text-white">Número de Camiseta</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                  placeholder="9"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
                {formData.jerseyNumber && getUsedJerseyNumbers().includes(Number.parseInt(formData.jerseyNumber)) && (
                  <p className="text-sm text-red-400 mt-1">Este número ya está en uso</p>
                )}
              </div>
              <div>
                <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => {
                    setFormData({ ...formData, birthDate: e.target.value })
                    // Validate age when manually entering birth date
                    if (isAgeValidationEnabled && e.target.value) {
                      const validation = validateAge(e.target.value)
                      setAgeValidationResult(validation)
                    } else {
                      setAgeValidationResult(null)
                    }
                  }}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>

              {/* Age validation info */}
              {isAgeValidationEnabled && (
                <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Validación de edad activa</span>
                  </div>
                  <p className="text-xs text-blue-200/80">{rulesDescription}</p>
                  {availableExceptions > 0 && (
                    <p className="text-xs text-yellow-300 mt-1">
                      Excepciones disponibles: {availableExceptions}
                    </p>
                  )}
                </div>
              )}

              {/* Age validation result */}
              {ageValidationResult && (
                <div className={`p-3 rounded-lg border ${
                  ageValidationResult.isValid
                    ? ageValidationResult.isException
                      ? 'bg-yellow-500/20 border-yellow-400/30'
                      : 'bg-green-500/20 border-green-400/30'
                    : 'bg-red-500/20 border-red-400/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {ageValidationResult.isValid ? (
                      <CheckCircle className={`w-4 h-4 ${ageValidationResult.isException ? 'text-yellow-400' : 'text-green-400'}`} />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      ageValidationResult.isValid
                        ? ageValidationResult.isException
                          ? 'text-yellow-300'
                          : 'text-green-300'
                        : 'text-red-300'
                    }`}>
                      {ageValidationResult.age} años - {
                        ageValidationResult.isValid
                          ? ageValidationResult.isException
                            ? 'Válido como excepción'
                            : 'Cumple requisitos'
                          : 'No cumple requisitos'
                      }
                    </span>
                  </div>
                  {ageValidationResult.reason && (
                    <p className="text-xs mt-1 text-white/70">{ageValidationResult.reason}</p>
                  )}
                </div>
              )}

              {/* INE Upload Section */}
              {(isIdDocumentRequired || isAgeValidationEnabled) && (
                <div className="border-t border-slate-600 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <Label className="text-white font-medium">
                      Documento de Identidad (INE)
                      {isIdDocumentRequired && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                  </div>

                  <div className="space-y-3">
                    <FileUpload
                      variant="document"
                      value={ineImage}
                      onChange={(file, dataUrl) => {
                        setIneImage(dataUrl || "")
                        setFormData(prev => ({ ...prev, idDocumentUrl: dataUrl || "" }))
                        setExtractedData(null)
                        setIneExtractionError("")
                        setAgeValidationResult(null)
                      }}
                      accept="image/jpeg,image/png,image/webp"
                    />

                    {ineImage && (
                      <Button
                        type="button"
                        onClick={handleExtractINE}
                        disabled={extractingIne}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {extractingIne ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extrayendo datos...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Extraer datos de la INE
                          </>
                        )}
                      </Button>
                    )}

                    {ineExtractionError && (
                      <div className="p-2 rounded-lg bg-red-500/20 border border-red-400/30">
                        <p className="text-sm text-red-300">{ineExtractionError}</p>
                      </div>
                    )}

                    {extractedData && (
                      <div className="p-3 rounded-lg bg-green-500/20 border border-green-400/30 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-300">Datos extraídos</span>
                        </div>
                        <div className="text-xs text-white/80 space-y-1">
                          <p><span className="text-white/60">Nombre:</span> {extractedData.nombre_completo}</p>
                          <p><span className="text-white/60">Fecha nacimiento:</span> {extractedData.fecha_nacimiento}</p>
                          <p><span className="text-white/60">CURP:</span> {extractedData.curp}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreatePlayer}
                disabled={
                  !formData.name.trim() ||
                  !formData.position ||
                  !formData.jerseyNumber ||
                  creating ||
                  (isIdDocumentRequired && !ineImage) ||
                  (ageValidationResult && !ageValidationResult.isValid)
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white"
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
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay jugadores registrados</h3>
          <p className="text-gray-600">Comienza registrando jugadores para tu equipo</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  <h3 className="text-base sm:text-lg font-semibold flex items-center text-white drop-shadow">
                    {player.name}
                    <span className="ml-2 text-sm font-bold text-green-400">#{player.jersey_number}</span>
                  </h3>
                  <p className="text-sm text-white/70 drop-shadow">{player.position}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={player.is_active ? "default" : "secondary"} className="w-fit">
                  {player.is_active ? "Activo" : "Inactivo"}
                </Badge>
                {isSuspended && (
                  <Badge variant="destructive" className="w-fit flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Suspendido
                  </Badge>
                )}
                {player.id_verified && (
                  <Badge className="w-fit flex items-center gap-1 bg-purple-500/80 text-white border-0">
                    <CheckCircle className="w-3 h-3" />
                    Verificado
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
                  {hasFeature('qr_codes') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQR(player)}
                      disabled={generatingQR}
                      className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  )}
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
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Jugador</DialogTitle>
            <DialogDescription className="text-slate-400">Modifica la información del jugador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Fotografía del Jugador</Label>
              <FileUpload
                variant="avatar"
                value={formData.photo}
                onChange={(file, dataUrl) => setFormData({ ...formData, photo: dataUrl || "" })}
              />
            </div>
            <div>
              <Label htmlFor="edit-name" className="text-white">Nombre Completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-position" className="text-white">Posición</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {positions.map((position) => (
                    <SelectItem key={position} value={position} className="text-white hover:bg-slate-700">
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-jerseyNumber" className="text-white">Número de Camiseta</Label>
              <Input
                id="edit-jerseyNumber"
                type="number"
                min="1"
                max="99"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
              {formData.jerseyNumber && getUsedJerseyNumbers().includes(Number.parseInt(formData.jerseyNumber)) && (
                <p className="text-sm text-red-400 mt-1">Este número ya está en uso</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-birthDate" className="text-white">Fecha de Nacimiento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Button
              onClick={handleUpdatePlayer}
              disabled={!formData.name.trim() || !formData.position || !formData.jerseyNumber || updating}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
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

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Jugador</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Estás seguro de que quieres eliminar a <span className="font-semibold text-white">{playerToDelete?.name}</span>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              onClick={() => setPlayerToDelete(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeletePlayer}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sección de solicitud de jugador excepcional */}
      {!registrationOpen && tournamentId && (
        <div className="border-t-2 border-white/20 pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-lg">Solicitar Jugador Excepcional</h3>
              <p className="text-sm text-white/80 drop-shadow">Por lesión u otra circunstancia excepcional</p>
            </div>
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="backdrop-blur-md bg-blue-500/20 border-blue-300/50 text-white hover:bg-blue-500/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Solicitar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Solicitar Registro Excepcional</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Completa la información del jugador y justifica la solicitud. El administrador de la liga revisará tu solicitud.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="request-name" className="text-white">Nombre Completo</Label>
                    <Input
                      id="request-name"
                      value={requestFormData.name}
                      onChange={(e) => setRequestFormData({ ...requestFormData, name: e.target.value })}
                      placeholder="Carlos Rodríguez"
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-position" className="text-white">Posición</Label>
                    <Select
                      value={requestFormData.position}
                      onValueChange={(value) => setRequestFormData({ ...requestFormData, position: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Seleccionar posición" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {positions.map((position) => (
                          <SelectItem key={position} value={position} className="text-white hover:bg-slate-700">
                            {position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="request-jerseyNumber" className="text-white">Número de Camiseta</Label>
                    <Input
                      id="request-jerseyNumber"
                      type="number"
                      min="1"
                      max="99"
                      value={requestFormData.jerseyNumber}
                      onChange={(e) => setRequestFormData({ ...requestFormData, jerseyNumber: e.target.value })}
                      placeholder="9"
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-birthDate" className="text-white">Fecha de Nacimiento (opcional)</Label>
                    <Input
                      id="request-birthDate"
                      type="date"
                      value={requestFormData.birthDate}
                      onChange={(e) => setRequestFormData({ ...requestFormData, birthDate: e.target.value })}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-reason" className="text-white">Justificación de la Solicitud</Label>
                    <Textarea
                      id="request-reason"
                      value={requestFormData.reason}
                      onChange={(e) => setRequestFormData({ ...requestFormData, reason: e.target.value })}
                      placeholder="Ejemplo: El jugador titular sufrió una lesión..."
                      rows={4}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Explica detalladamente la razón por la cual necesitas registrar este jugador
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestPlayer}
                    disabled={submittingRequest}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
