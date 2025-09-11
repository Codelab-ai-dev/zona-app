"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/ui/file-upload"
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
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { useAuth } from "@/lib/hooks/use-auth"
import { Database } from "@/lib/supabase/database.types"
import { Users, Shield, CheckCircle, XCircle, Plus, Loader2, Edit, Trash2 } from "lucide-react"

type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

interface TeamManagementProps {
  leagueId: string
}

export function TeamManagement({ leagueId }: TeamManagementProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { 
    teams, 
    loading, 
    error,
    getTeamsByLeague,
    createTeamWithOwner,
    createTeamWithNewOwner,
    updateTeam
  } = useTeams()
  
  const {
    tournaments,
    getTournamentsByLeague
  } = useTournaments()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
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

  // Load teams and tournaments when component mounts or leagueId changes
  useEffect(() => {
    if (leagueId) {
      console.log('🔵 Loading teams for leagueId:', leagueId)
      getTeamsByLeague(leagueId).catch(console.error)
      getTournamentsByLeague(leagueId).catch(console.error)
    } else {
      console.warn('⚠️ No leagueId provided to TeamManagement')
    }
  }, [leagueId, getTeamsByLeague, getTournamentsByLeague])

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

  const approveTeam = async (teamId: string) => {
    try {
      await updateTeam(teamId, { is_active: true })
      console.log('✅ Equipo aprobado')
    } catch (error: any) {
      console.error('❌ Error aprobando equipo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const rejectTeam = async (teamId: string) => {
    try {
      await updateTeam(teamId, { is_active: false })
      console.log('✅ Equipo rechazado')
    } catch (error: any) {
      console.error('❌ Error rechazando equipo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
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
      alert('Por favor completa todos los campos requeridos')
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
          
          // Esperar un poco más antes de recargar para asegurar que no interfiera con el modal
          setTimeout(async () => {
            try {
              // Recargar equipos para mostrar el nuevo equipo
              await getTeamsByLeague(leagueId)
            } catch (reloadError) {
              console.warn('⚠️ Error recargando equipos:', reloadError)
            }
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
      alert(`Error: ${error.message || 'Error desconocido'}`)
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

  const handleLogoChange = (file: File | null, dataUrl?: string) => {
    setFormData({
      ...formData,
      logo: dataUrl || "",
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
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setUpdating(true)
    
    try {
      await updateTeam(editingTeam.id, {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        tournament_id: formData.tournamentId === "none" ? null : formData.tournamentId,
        logo: formData.logo || null,
      })

      setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
      setIsEditDialogOpen(false)
      setEditingTeam(null)
      console.log('✅ Equipo actualizado exitosamente')
      
      // Reload teams to show the updated team
      await getTeamsByLeague(leagueId)
    } catch (error: any) {
      console.error('❌ Error actualizando equipo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeactivateTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    const action = team.is_active ? 'desactivar' : 'activar'
    const confirmMessage = `¿Estás seguro de que quieres ${action} este equipo?`
    
    if (!confirm(confirmMessage)) return

    try {
      await updateTeam(teamId, {
        is_active: !team.is_active
      })
      console.log(`✅ Equipo ${action}do exitosamente`)
      
      // Reload teams to show the updated status
      await getTeamsByLeague(leagueId)
    } catch (error: any) {
      console.error(`❌ Error al ${action} equipo:`, error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleTeamClick = (teamId: string) => {
    console.log('🔵 Navigating to team:', teamId)
    router.push(`/equipos/${teamId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h2>
          <p className="text-gray-600">Administra los equipos registrados en tu liga</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Equipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Equipo</DialogTitle>
              <DialogDescription>
                Agrega un nuevo equipo a tu liga. El equipo será aprobado automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="grid gap-6 py-4 lg:grid-cols-2">
                {/* Columna izquierda - Información del Equipo */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Información del Equipo</h4>
                  
                  <div className="flex justify-center">
                    <FileUpload
                      variant="avatar"
                      accept="image/*"
                      maxSize={2}
                      value={formData.logo}
                      onChange={handleLogoChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Nombre del Equipo *</Label>
                    <Input
                      id="team-name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej: Real Madrid CF"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="team-slug">URL Personalizada</Label>
                    <Input
                      id="team-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="real-madrid-cf"
                    />
                    <p className="text-xs text-gray-500">Se generará automáticamente si se deja vacío</p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="team-description">Descripción</Label>
                    <Textarea
                      id="team-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción del equipo..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="team-tournament">Torneo (Opcional)</Label>
                    <Select value={formData.tournamentId} onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}>
                      <SelectTrigger>
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
                    <p className="text-xs text-gray-500">El equipo puede asignarse a un torneo más tarde</p>
                  </div>
                </div>

                {/* Columna derecha - Información del Propietario */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Información del Propietario</h4>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="owner-name">Nombre Completo *</Label>
                    <Input
                      id="owner-name"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="owner-email">Email *</Label>
                    <Input
                      id="owner-email"
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      placeholder="propietario@ejemplo.com"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="owner-phone">Teléfono</Label>
                    <Input
                      id="owner-phone"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      placeholder="+502 1234-5678"
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <h5 className="text-sm font-medium text-blue-800">ℹ️ Información importante</h5>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Se creará automáticamente una cuenta para el propietario</li>
                      <li>• Recibirá una contraseña temporal que podrá cambiar</li>
                      <li>• Podrá gestionar los jugadores de su equipo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!formData.name.trim() || !formData.ownerName.trim() || !formData.ownerEmail.trim() || creating}
                className="bg-green-600 hover:bg-green-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando equipos...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay equipos registrados</h3>
          <p className="text-gray-600">Los equipos aparecerán aquí cuando se registren en tu liga</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="cursor-pointer transition-colors hover:bg-gray-50">
              <CardHeader onClick={() => handleTeamClick(team.id)}>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {team.logo ? (
                      <AvatarImage src={team.logo || "/placeholder.svg"} alt={`${team.name} logo`} />
                    ) : (
                      <AvatarFallback className="bg-green-100 text-green-800 font-bold">
                        {getTeamInitials(team.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg hover:text-blue-600">{team.name}</CardTitle>
                    <CardDescription>/{team.slug}</CardDescription>
                  </div>
                </div>
                <Badge variant={team.is_active ? "default" : "secondary"} className="w-fit">
                  {team.is_active ? "Aprobado" : "Pendiente"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.description && (
                    <p className="text-sm text-gray-600">{team.description}</p>
                  )}
                  {/* Show tournament info if assigned */}
                  {team.tournament_id && (
                    <div className="flex items-center text-sm text-blue-600">
                      <Shield className="w-4 h-4 mr-1" />
                      Torneo: {tournaments?.find(t => t.id === team.tournament_id)?.name || 'Torneo asignado'}
                    </div>
                  )}
                  {/* Show owner info if available */}
                  {(team as any).owner && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      Propietario: {(team as any).owner.name}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Shield className="w-4 h-4 mr-1" />
                    Creado: {new Date(team.created_at).toLocaleDateString("es-ES")}
                  </div>
                  
                  {/* Team action buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditTeam(team)
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeactivateTeam(team.id)
                      }}
                      className={team.is_active ? "text-red-600 hover:text-red-700 flex-1" : "text-green-600 hover:text-green-700 flex-1"}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Equipo</DialogTitle>
            <DialogDescription>
              Modifica la información del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center">
              <FileUpload
                variant="avatar"
                accept="image/*"
                maxSize={2}
                value={formData.logo}
                onChange={handleLogoChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-team-name">Nombre del Equipo</Label>
              <Input
                id="edit-team-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Real Madrid CF"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-team-slug">URL Personalizada</Label>
              <Input
                id="edit-team-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="real-madrid-cf"
              />
              <p className="text-xs text-gray-500">Se generará automáticamente si se deja vacío</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-team-description">Descripción</Label>
              <Textarea
                id="edit-team-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del equipo..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-team-tournament">Torneo</Label>
              <Select value={formData.tournamentId} onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}>
                <SelectTrigger>
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
              <p className="text-xs text-gray-500">El equipo puede cambiarse de torneo</p>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Información del Propietario</h4>
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-owner-name">Nombre Completo</Label>
                  <Input
                    id="edit-owner-name"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-owner-email">Email</Label>
                  <Input
                    id="edit-owner-email"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="propietario@ejemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-owner-phone">Teléfono</Label>
                  <Input
                    id="edit-owner-phone"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    placeholder="+502 1234-5678"
                  />
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Los cambios en la información del propietario solo actualizarán el nombre y teléfono.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setEditingTeam(null)
              setFormData({ name: "", slug: "", description: "", logo: "", tournamentId: "none", ownerName: "", ownerEmail: "", ownerPhone: "" })
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateTeam}
              disabled={!formData.name.trim() || updating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-green-700">¡Equipo Creado Exitosamente!</DialogTitle>
            <DialogDescription>
              El equipo y la cuenta del propietario han sido creados. Guarda estas credenciales.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-green-800 mb-2">Credenciales del Propietario</h4>
              {ownerCredentials && (
                <>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Nombre:</span>
                      <span className="ml-2 text-gray-900">{ownerCredentials.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                        {ownerCredentials.email}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Contraseña temporal:</span>
                      <span className="ml-2 text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                        {ownerCredentials.password}
                      </span>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                    <p className="text-xs text-blue-800">
                      <strong>Importante:</strong> Comparte estas credenciales con el propietario del equipo de forma segura.
                      Se recomienda que cambie la contraseña en su primer inicio de sesión.
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
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
