"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileUploadStorage } from "@/components/ui/file-upload-storage"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTeamsByLeague, useTournamentsByLeague, useUpdateTeam, useDeleteTeam, queryKeys } from "@/lib/queries"
import { useTeams } from "@/lib/hooks/use-teams"
import { useAuth } from "@/lib/hooks/use-auth"
import { Database } from "@/lib/supabase/database.types"
import { Users, Shield, CheckCircle, XCircle, Plus, Loader2, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

interface TeamManagementProps {
  leagueId: string
}

export function TeamManagement({ leagueId }: TeamManagementProps) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  // TanStack Query para cargar datos (con caché)
  const { data: teams = [], isLoading: loading, error: teamsError } = useTeamsByLeague(leagueId)
  const { data: tournaments = [] } = useTournamentsByLeague(leagueId)

  // Mutations de TanStack Query
  const updateTeamMutation = useUpdateTeam()
  const deleteTeamMutation = useDeleteTeam()

  // Hook original para crear equipos (mantiene lógica compleja)
  const { createTeamWithNewOwner } = useTeams()

  // Convertir error a string
  const error = teamsError ? (teamsError instanceof Error ? teamsError.message : 'Error desconocido') : null

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const [activatingTeam, setActivatingTeam] = useState<Team | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [newTeamId, setNewTeamId] = useState<string>(() => crypto.randomUUID())
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>("all")
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    logo: "",
    tournamentId: "none",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
  })
  const [showCredentials, setShowCredentials] = useState(false)
  const [ownerCredentials, setOwnerCredentials] = useState<{email: string, password: string, name: string} | null>(null)
  const [navigatingToTeam, setNavigatingToTeam] = useState<string | null>(null)

  // Helper para invalidar caché después de operaciones
  const invalidateTeamsCache = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.byLeague(leagueId) })
  }

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

  const approveTeam = async (teamId: string) => {
    try {
      await updateTeamMutation.mutateAsync({ teamId, updates: { is_active: true } })
      toast.success('Equipo aprobado exitosamente')
      console.log('✅ Equipo aprobado')
    } catch (error: any) {
      console.error('❌ Error aprobando equipo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const rejectTeam = async (teamId: string) => {
    try {
      await updateTeamMutation.mutateAsync({ teamId, updates: { is_active: false } })
      toast.success('Equipo rechazado exitosamente')
      console.log('✅ Equipo rechazado')
    } catch (error: any) {
      console.error('❌ Error rechazando equipo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  const handleCreateTeam = async () => {
    if (!formData.name || !formData.ownerName || !formData.ownerEmail) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setCreating(true)
    
    try {
      console.log('🚀 Iniciando creación de equipo y propietario...')
      
      // 1. Generar contraseña y preparar credenciales
      const generatePassword = (length = 8): string => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        let password = ""
        for (let i = 0; i < length; i++) {
          password += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        return password
      }
      const ownerPassword = generatePassword()
      console.log('🔑 Contraseña generada para propietario')
      
      // 2. Preparar credenciales para mostrar INMEDIATAMENTE
      const ownerCredentials = {
        email: formData.ownerEmail,
        password: ownerPassword,
        name: formData.ownerName
      }
      
      // 3. Guardar datos del formulario antes de limpiar
      const teamData = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        league_id: leagueId,
        tournament_id: formData.tournamentId === "none" || !formData.tournamentId ? null : formData.tournamentId,
        logo: formData.logo || null,
        is_active: true, // Admin-created teams are automatically approved
      }
      
      const ownerData = {
        name: formData.ownerName,
        email: formData.ownerEmail,
        phone: formData.ownerPhone || undefined
      }
      
      console.log('📋 Datos preparados para modal ANTES de operaciones async')
      
      // 4. Mostrar credenciales INMEDIATAMENTE
      setOwnerCredentials(ownerCredentials)
      setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
      setIsCreateDialogOpen(false)
      setShowCredentials(true)
      
      console.log('✅ Modal de credenciales mostrado inmediatamente')
      
      // 5. Crear equipo y propietario en background sin bloquear UI
      setTimeout(async () => {
        try {
          console.log('🔄 Iniciando creación real en background...')
          console.log('🔑 Usando contraseña:', ownerPassword)
          
          // Pasar la contraseña generada a la función de creación
          const result = await createTeamWithNewOwner(teamData, {
            ...ownerData,
            password: ownerPassword  // ¡Importante! Pasar la contraseña generada
          })
          
          console.log('🏆 Equipo y propietario creados exitosamente en background')
          
          // Invalidar caché para recargar equipos
          setTimeout(() => {
            invalidateTeamsCache()
          }, 1000)
          
        } catch (backgroundError) {
          console.error('❌ Error en background:', backgroundError)
          // Mostrar el error específico
          console.error('❌ Detalles del error:', {
            message: backgroundError.message,
            stack: backgroundError.stack
          })
        }
      }, 500)
      
    } catch (error: any) {
      console.error('❌ Error en creación de equipo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: formData.slug || generateSlug(name),
    })
  }

  const handleLogoChange = (url: string | null) => {
    setFormData({
      ...formData,
      logo: url || "",
    })
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      slug: team.slug,
      description: team.description || "",
      logo: team.logo || "",
      tournamentId: team.tournament_id || "none",
      ownerName: (team as any).owner?.name || "",
      ownerEmail: (team as any).owner?.email || "",
      ownerPhone: (team as any).owner?.phone || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam || !formData.name) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setUpdating(true)

    try {
      await updateTeamMutation.mutateAsync({
        teamId: editingTeam.id,
        updates: {
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          description: formData.description || null,
          tournament_id: formData.tournamentId === "none" ? null : formData.tournamentId,
          logo: formData.logo || null,
        }
      })

      setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
      setIsEditDialogOpen(false)
      setEditingTeam(null)
      toast.success('Equipo actualizado exitosamente')
      console.log('✅ Equipo actualizado exitosamente')
      // TanStack Query invalida el caché automáticamente
    } catch (error: any) {
      console.error('❌ Error actualizando equipo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleActivateClick = (team: Team) => {
    setActivatingTeam(team)
    setIsActivateDialogOpen(true)
  }

  const handleConfirmToggleActivate = async () => {
    if (!activatingTeam) return

    const action = activatingTeam.is_active ? 'desactivar' : 'activar'
    setToggling(true)

    try {
      await updateTeamMutation.mutateAsync({
        teamId: activatingTeam.id,
        updates: { is_active: !activatingTeam.is_active }
      })
      toast.success(`Equipo ${action}do exitosamente`)
      console.log(`✅ Equipo ${action}do exitosamente`)

      // Close dialog and reset state
      setIsActivateDialogOpen(false)
      setActivatingTeam(null)
      // TanStack Query invalida el caché automáticamente
    } catch (error: any) {
      console.error(`❌ Error al ${action} equipo:`, error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setToggling(false)
    }
  }

  const handleTeamClick = (teamId: string) => {
    console.log('🔵 Navigating to team:', teamId)
    setNavigatingToTeam(teamId)
    router.push(`/equipos/${teamId}`)
  }

  const handleDeleteTeamClick = (team: Team) => {
    setDeletingTeam(team)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingTeam) return

    setDeleting(true)

    try {
      await deleteTeamMutation.mutateAsync(deletingTeam.id)
      toast.success('Equipo eliminado exitosamente')
      console.log('✅ Equipo eliminado exitosamente')

      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setDeletingTeam(null)
      // TanStack Query invalida el caché automáticamente
    } catch (error: any) {
      console.error('❌ Error al eliminar equipo:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeleting(false)
    }
  }

  // Filter teams by tournament
  const filteredTeams = selectedTournamentFilter === "all"
    ? teams
    : selectedTournamentFilter === "none"
    ? teams.filter(team => !team.tournament_id)
    : teams.filter(team => team.tournament_id === selectedTournamentFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-white drop-shadow-lg">Gestión de Equipos</h2>
          <p className="text-white/80 drop-shadow text-xs sm:text-base">Administra los equipos de tu liga</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (open) {
            // Limpiar formulario y generar nuevo ID al abrir
            setNewTeamId(crypto.randomUUID())
            setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
          }
          setIsCreateDialogOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Agregar Equipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-[800px] bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center text-white text-sm md:text-base">
                <Shield className="w-4 h-4 mr-2 text-green-400" />
                Crear Nuevo Equipo
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-xs md:text-sm">
                Agrega un nuevo equipo a tu liga. El equipo será aprobado automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3 md:grid-cols-2">
              {/* Columna izquierda - Información del Equipo */}
              <div className="space-y-3">
                <h4 className="font-medium text-white text-xs md:text-sm border-b border-white/10 pb-2">Información del Equipo</h4>

                <div className="flex justify-center">
                  <FileUploadStorage
                    variant="avatar"
                    bucket="team-logos"
                    fileId={newTeamId}
                    accept="image/*"
                    maxSize={2}
                    value={formData.logo}
                    onChange={handleLogoChange}
                    onUploadStart={() => setUploadingLogo(true)}
                    onUploadEnd={() => setUploadingLogo(false)}
                  />
                </div>

                <div>
                  <Label htmlFor="team-name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre del Equipo *</Label>
                  <Input
                    id="team-name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Real Madrid CF"
                    required
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="team-slug" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">URL Personalizada</Label>
                  <Input
                    id="team-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="real-madrid-cf"
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Se generará automáticamente si se deja vacío</p>
                </div>

                <div>
                  <Label htmlFor="team-description" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Descripción</Label>
                  <Textarea
                    id="team-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del equipo..."
                    rows={2}
                    className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm min-h-[60px]"
                  />
                </div>

                <div>
                  <Label htmlFor="team-tournament" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Torneo (Opcional)</Label>
                  <Select value={formData.tournamentId} onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}>
                    <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                      <SelectValue placeholder="Seleccionar torneo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin torneo asignado</SelectItem>
                      {tournaments?.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Columna derecha - Información del Propietario */}
              <div className="space-y-3">
                <h4 className="font-medium text-white text-xs md:text-sm border-b border-white/10 pb-2">Información del Propietario</h4>

                <div>
                  <Label htmlFor="owner-name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre Completo *</Label>
                  <Input
                    id="owner-name"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    required
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="owner-email" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Email *</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="propietario@ejemplo.com"
                    required
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="owner-phone" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Teléfono</Label>
                  <Input
                    id="owner-phone"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="+502 1234-5678"
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
                  <h5 className="text-xs font-medium text-blue-400">Información importante</h5>
                  <ul className="text-[10px] md:text-xs text-gray-400 space-y-0.5">
                    <li>• Se creará una cuenta para el propietario</li>
                    <li>• Recibirá una contraseña temporal</li>
                    <li>• Podrá gestionar los jugadores</li>
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!formData.name.trim() || !formData.ownerName.trim() || !formData.ownerEmail.trim() || creating || uploadingLogo}
                className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Subiendo logo...
                  </>
                ) : creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Equipo'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tournament Filter */}
      <div className="flex items-center gap-4">
        <Label htmlFor="tournament-filter" className="text-white/90 drop-shadow whitespace-nowrap">
          Filtrar por torneo:
        </Label>
        <Select value={selectedTournamentFilter} onValueChange={setSelectedTournamentFilter}>
          <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg w-64">
            <SelectValue placeholder="Todos los torneos" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
            <SelectItem value="all" className="text-white hover:bg-white/10">
              Todos los equipos
            </SelectItem>
            <SelectItem value="none" className="text-white hover:bg-white/10">
              Sin torneo asignado
            </SelectItem>
            {tournaments?.map((tournament) => (
              <SelectItem key={tournament.id} value={tournament.id} className="text-white hover:bg-white/10">
                {tournament.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-white/70 drop-shadow text-sm">
          {filteredTeams.length} equipo{filteredTeams.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="backdrop-blur-xl bg-red-500/20 border border-red-300/30 rounded-md p-4 mb-6 shadow-xl">
          <p className="text-white drop-shadow">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando equipos...</span>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-white/50 mx-auto mb-4 drop-shadow" />
          <h3 className="text-base sm:text-lg font-medium text-white drop-shadow-lg mb-2">
            {teams.length === 0 ? 'No hay equipos registrados' : 'No hay equipos en este torneo'}
          </h3>
          <p className="text-white/80 drop-shadow">
            {teams.length === 0
              ? 'Los equipos aparecerán aquí cuando se registren en tu liga'
              : 'Selecciona otro torneo o agrega equipos a este torneo'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="cursor-pointer backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all relative">
              {navigatingToTeam === team.id && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                    <p className="text-white text-sm font-medium">Cargando equipo...</p>
                  </div>
                </div>
              )}
              <CardHeader onClick={() => handleTeamClick(team.id)}>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {team.logo ? (
                      <AvatarImage src={team.logo || "/placeholder.svg"} alt={`${team.name} logo`} />
                    ) : (
                      <AvatarFallback className="bg-soccer-green/20 text-soccer-green dark:text-soccer-green-light font-bold">
                        {getTeamInitials(team.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg hover:text-blue-300">{team.name}</CardTitle>
                    <CardDescription className="text-white/70 drop-shadow">/{team.slug}</CardDescription>
                  </div>
                </div>
                <Badge className={team.is_active ? "backdrop-blur-md bg-green-500/80 text-white border-0 w-fit" : "backdrop-blur-md bg-gray-500/80 text-white border-0 w-fit"}>
                  {team.is_active ? "Aprobado" : "Pendiente"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.description && (
                    <p className="text-sm text-white/80 drop-shadow">{team.description}</p>
                  )}
                  {/* Show tournament info if assigned */}
                  {team.tournament_id && (
                    <div className="flex items-center text-sm text-blue-300 drop-shadow">
                      <Shield className="w-4 h-4 mr-1" />
                      Torneo: {tournaments?.find(t => t.id === team.tournament_id)?.name || 'Torneo asignado'}
                    </div>
                  )}
                  {/* Show owner info if available */}
                  {(team as any).owner && (
                    <div className="flex items-center text-sm text-white/70 drop-shadow">
                      <Users className="w-4 h-4 mr-1" />
                      Propietario: {(team as any).owner.name}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-white/70 drop-shadow">
                    <Shield className="w-4 h-4 mr-1" />
                    Creado: {new Date(team.created_at).toLocaleDateString("es-ES")}
                  </div>
                  
                  {/* Team action buttons */}
                  <div className="space-y-2 pt-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditTeam(team)
                        }}
                        className="flex-1 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActivateClick(team)
                        }}
                        className={team.is_active ? "flex-1 backdrop-blur-md bg-yellow-500/80 hover:bg-yellow-500/90 text-white border-0" : "flex-1 backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"}
                      >
                        {team.is_active ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTeamClick(team)
                      }}
                      className="w-full backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar Equipo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[600px] bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white text-sm md:text-base">
              <Edit className="w-4 h-4 mr-2 text-blue-400" />
              Editar Equipo
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Modifica la información del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex justify-center">
              <FileUploadStorage
                variant="avatar"
                bucket="team-logos"
                fileId={editingTeam?.id || ''}
                accept="image/*"
                maxSize={2}
                value={formData.logo}
                onChange={handleLogoChange}
                onUploadStart={() => setUploadingLogo(true)}
                onUploadEnd={() => setUploadingLogo(false)}
              />
            </div>
            <div>
              <Label htmlFor="edit-team-name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre del Equipo</Label>
              <Input
                id="edit-team-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Real Madrid CF"
                className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="edit-team-slug" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">URL Personalizada</Label>
              <Input
                id="edit-team-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="real-madrid-cf"
                className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1">Se generará automáticamente si se deja vacío</p>
            </div>
            <div>
              <Label htmlFor="edit-team-description" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Descripción</Label>
              <Textarea
                id="edit-team-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del equipo..."
                rows={2}
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm min-h-[60px]"
              />
            </div>
            <div>
              <Label htmlFor="edit-team-tournament" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Torneo</Label>
              <Select value={formData.tournamentId} onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}>
                <SelectTrigger className="h-9 bg-slate-800/50 border-white/10 text-white text-sm">
                  <SelectValue placeholder="Seleccionar torneo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin torneo asignado</SelectItem>
                  {tournaments?.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-white/10 pt-3">
              <h4 className="font-medium text-white text-xs md:text-sm mb-3">Información del Propietario</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="edit-owner-name" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Nombre</Label>
                    <Input
                      id="edit-owner-name"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="Juan Pérez"
                      className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-owner-phone" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Teléfono</Label>
                    <Input
                      id="edit-owner-phone"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      placeholder="+502 1234-5678"
                      className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-owner-email" className="text-gray-400 text-[10px] md:text-xs mb-1.5 block">Email</Label>
                  <Input
                    id="edit-owner-email"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="propietario@ejemplo.com"
                    className="h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
                <p className="text-[10px] text-gray-500 bg-slate-800/30 p-2 rounded">
                  Los cambios solo actualizarán el nombre y teléfono.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button onClick={() => {
              setIsEditDialogOpen(false)
              setEditingTeam(null)
              setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
            }} className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm">
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateTeam}
              disabled={!formData.name.trim() || updating || uploadingLogo}
              className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm"
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Subiendo logo...
                </>
              ) : updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Equipo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-400 text-sm md:text-base">
              <CheckCircle className="w-4 h-4 mr-2" />
              Equipo Creado Exitosamente
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Guarda estas credenciales de acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-3">
              <h4 className="font-medium text-green-400 text-xs md:text-sm">Credenciales del Propietario</h4>
              {ownerCredentials && (
                <>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Nombre:</span>
                      <span className="text-white font-medium">{ownerCredentials.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white font-mono bg-slate-800/50 px-2 py-1 rounded text-xs">
                        {ownerCredentials.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Contraseña:</span>
                      <span className="text-white font-mono bg-slate-800/50 px-2 py-1 rounded text-xs">
                        {ownerCredentials.password}
                      </span>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mt-2">
                    <p className="text-[10px] md:text-xs text-blue-400">
                      <strong>Importante:</strong> Comparte estas credenciales de forma segura.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowCredentials(false)
                setOwnerCredentials(null)
              }}
              className="w-full h-9 bg-green-500 hover:bg-green-600 text-white text-sm"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate/Deactivate Team Confirmation Dialog */}
      <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <DialogContent className={`max-w-[95vw] md:max-w-md bg-slate-900 ${activatingTeam?.is_active ? 'border-yellow-500/30' : 'border-green-500/30'}`}>
          <DialogHeader>
            <DialogTitle className="text-white text-sm md:text-base flex items-center gap-2">
              {activatingTeam?.is_active ? (
                <>
                  <XCircle className="w-4 h-4 text-yellow-400" />
                  Desactivar Equipo
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Activar Equipo
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              {activatingTeam?.is_active
                ? 'El equipo será ocultado temporalmente'
                : 'El equipo será visible nuevamente'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className={`${activatingTeam?.is_active ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'} border rounded-lg p-3 space-y-2`}>
              <p className="text-white text-sm">
                ¿{activatingTeam?.is_active ? 'Desactivar' : 'Activar'}{' '}
                <span className={`font-bold ${activatingTeam?.is_active ? 'text-yellow-400' : 'text-green-400'}`}>
                  "{activatingTeam?.name}"
                </span>?
              </p>
              <ul className="text-[10px] md:text-xs text-gray-400 space-y-0.5">
                {activatingTeam?.is_active ? (
                  <>
                    <li>• No será visible en equipos activos</li>
                    <li>• No participará en partidos</li>
                    <li>• Datos conservados</li>
                  </>
                ) : (
                  <>
                    <li>• Visible en equipos activos</li>
                    <li>• Podrá participar en partidos</li>
                    <li>• Propietario podrá gestionar</li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              onClick={() => {
                setIsActivateDialogOpen(false)
                setActivatingTeam(null)
              }}
              disabled={toggling}
              className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmToggleActivate}
              disabled={toggling}
              className={`flex-1 h-9 ${activatingTeam?.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white text-xs md:text-sm`}
            >
              {toggling ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
                  {activatingTeam?.is_active ? 'Desactivando...' : 'Activando...'}
                </>
              ) : (
                activatingTeam?.is_active ? 'Desactivar' : 'Activar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-white text-sm md:text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
              <p className="text-white text-sm">
                ¿Eliminar{' '}
                <span className="font-bold text-red-400">"{deletingTeam?.name}"</span>?
              </p>
              <p className="text-red-400 font-medium text-xs">Esta acción eliminará:</p>
              <ul className="text-[10px] md:text-xs text-gray-400 space-y-0.5">
                <li>• Todos los jugadores del equipo</li>
                <li>• Todas las estadísticas</li>
                <li>• El historial de partidos</li>
              </ul>
              <p className="text-[10px] text-gray-500 mt-2">
                Considera desactivar el equipo si solo quieres ocultarlo.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingTeam(null)
              }}
              disabled={deleting}
              className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm"
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
