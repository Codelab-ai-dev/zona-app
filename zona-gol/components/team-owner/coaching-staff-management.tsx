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
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { Plus, Edit, Trash2, User, Loader2, AlertCircle, Lock, QrCode } from "lucide-react"
import { toast } from "sonner"
import { PlayerQRModal } from "@/components/ui/player-qr-modal"

type CoachingStaff = Database['public']['Tables']['coaching_staff']['Row']
type CoachingStaffInsert = Database['public']['Tables']['coaching_staff']['Insert']
type CoachingStaffUpdate = Database['public']['Tables']['coaching_staff']['Update']

interface CoachingStaffManagementProps {
  teamId: string
  teamName?: string
}

const roles = [
  "Director Técnico",
  "Asistente Técnico",
  "Preparador Físico",
  "Entrenador de Porteros",
  "Médico",
  "Fisioterapeuta",
  "Utilero",
  "Delegado",
  "Otro",
]

export function CoachingStaffManagement({ teamId, teamName = "Equipo" }: CoachingStaffManagementProps) {
  const [coachingStaff, setCoachingStaff] = useState<CoachingStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<CoachingStaff | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [maxCoachingStaffLimit, setMaxCoachingStaffLimit] = useState<number | null>(null)
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [currentQRData, setCurrentQRData] = useState<{
    staff: CoachingStaff,
    qrData: string,
    credential: any
  } | null>(null)
  const [teamInfo, setTeamInfo] = useState<{
    name: string,
    logo?: string | null
  }>({ name: teamName })
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    cedula: "",
    birthDate: "",
    photo: "",
  })

  const supabase = createClientSupabaseClient()

  // Load coaching staff when component mounts or teamId changes
  useEffect(() => {
    if (teamId) {
      console.log('🔵 Loading coaching staff for teamId:', teamId)
      loadCoachingStaff()
      loadTournamentLimits()
    } else {
      console.warn('⚠️ No teamId provided to CoachingStaffManagement')
    }
  }, [teamId])

  const loadCoachingStaff = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCoachingStaff(data || [])
      console.log('✅ Coaching staff loaded:', data?.length || 0)
    } catch (err: any) {
      console.error('❌ Error loading coaching staff:', err)
      setError(err.message)
      toast.error('Error cargando cuerpo técnico')
    } finally {
      setLoading(false)
    }
  }

  const loadTournamentLimits = async () => {
    try {
      // Get team's tournament and info
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('tournament_id, name, logo')
        .eq('id', teamId)
        .single()

      if (teamError) throw teamError

      if (team) {
        setTeamInfo({
          name: team.name || teamName,
          logo: team.logo || null
        })

        if (team.tournament_id) {
          // Get tournament limits
          const { data: tournament, error: tournamentError } = await supabase
            .from('tournaments')
            .select('max_coaching_staff, registration_open')
            .eq('id', team.tournament_id)
            .single()

          if (!tournamentError && tournament) {
            setMaxCoachingStaffLimit(tournament.max_coaching_staff || 10)
            setRegistrationOpen(tournament.registration_open)
            console.log('🔵 Tournament limits loaded:', tournament)
          }
        }
      }
    } catch (err) {
      console.error('Error loading tournament limits:', err)
    }
  }

  const handleCreateStaff = async () => {
    if (!formData.name || !formData.role) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    // Check if max coaching staff limit has been reached
    if (maxCoachingStaffLimit && coachingStaff.length >= maxCoachingStaffLimit) {
      toast.error(`Has alcanzado el límite de ${maxCoachingStaffLimit} miembros del cuerpo técnico permitidos para este torneo`)
      return
    }

    setCreating(true)

    try {
      const staffData: CoachingStaffInsert = {
        name: formData.name,
        team_id: teamId,
        role: formData.role,
        cedula: formData.cedula || null,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
        is_active: true,
      }

      const { data, error } = await supabase
        .from('coaching_staff')
        .insert(staffData)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Miembro del cuerpo técnico creado exitosamente:', data)

      setFormData({ name: "", role: "", cedula: "", birthDate: "", photo: "" })
      setIsCreateDialogOpen(false)

      // Reload coaching staff
      await loadCoachingStaff()
      toast.success(`${formData.name} registrado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error creando miembro del cuerpo técnico:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEditStaff = (staff: CoachingStaff) => {
    setEditingStaff(staff)
    setFormData({
      name: staff.name,
      role: staff.role,
      cedula: staff.cedula || "",
      birthDate: staff.birth_date || "",
      photo: staff.photo || "",
    })
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff || !formData.name || !formData.role) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setUpdating(true)

    try {
      const updates: CoachingStaffUpdate = {
        name: formData.name,
        role: formData.role,
        cedula: formData.cedula || null,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
      }

      const { error } = await supabase
        .from('coaching_staff')
        .update(updates)
        .eq('id', editingStaff.id)

      if (error) throw error

      console.log('✅ Miembro del cuerpo técnico actualizado exitosamente')

      setEditingStaff(null)
      setFormData({ name: "", role: "", cedula: "", birthDate: "", photo: "" })

      // Reload coaching staff
      await loadCoachingStaff()
      toast.success(`${formData.name} actualizado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error actualizando miembro del cuerpo técnico:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    const staff = coachingStaff.find(s => s.id === staffId)
    if (!staff) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar a ${staff.name}?`

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('coaching_staff')
        .delete()
        .eq('id', staffId)

      if (error) throw error

      console.log('✅ Miembro del cuerpo técnico eliminado exitosamente')

      // Reload coaching staff
      await loadCoachingStaff()
      toast.success(`${staff.name} eliminado exitosamente`)
    } catch (error: any) {
      console.error('❌ Error eliminando miembro del cuerpo técnico:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const toggleStaffStatus = async (staffId: string) => {
    const staff = coachingStaff.find(s => s.id === staffId)
    if (!staff) return

    const action = staff.is_active ? 'desactivar' : 'activar'
    const confirmMessage = `¿Estás seguro de que quieres ${action} a ${staff.name}?`

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('coaching_staff')
        .update({ is_active: !staff.is_active })
        .eq('id', staffId)

      if (error) throw error

      console.log(`✅ Miembro del cuerpo técnico ${action}do exitosamente`)

      // Reload coaching staff
      await loadCoachingStaff()
      toast.success(`${staff.name} ${action}do exitosamente`)
    } catch (error: any) {
      console.error(`❌ Error al ${action} miembro del cuerpo técnico:`, error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const getStaffInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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

  // Función para generar QR de cuerpo técnico
  const handleGenerateQR = async (staff: CoachingStaff) => {
    setGeneratingQR(true)
    try {
      console.log('🔵 Generando QR para cuerpo técnico:', staff.name)

      // Crear datos compactos para el QR
      const qrData = JSON.stringify({
        t: 's', // type: staff
        i: staff.id,
        n: staff.name,
        r: staff.role,
        tm: staff.team_id
      })

      // Crear objeto de credencial simulado
      const credential = {
        id: staff.id,
        player_id: staff.id,
        qr_code_data: qrData,
        team_id: staff.team_id,
        created_at: new Date().toISOString()
      }

      console.log('✅ QR generado exitosamente para cuerpo técnico')
      setCurrentQRData({
        staff,
        qrData,
        credential
      })
      setQrModalOpen(true)
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Encontrado</h2>
        <p className="text-gray-600">
          No se pudo cargar la información del equipo.
        </p>
      </div>
    )
  }

  const remainingSlots = maxCoachingStaffLimit ? maxCoachingStaffLimit - coachingStaff.length : null
  const isAtLimit = maxCoachingStaffLimit ? coachingStaff.length >= maxCoachingStaffLimit : false
  const canRegister = registrationOpen && !isAtLimit

  return (
    <div className="space-y-6">
      {error && (
        <div className="backdrop-blur-xl bg-red-500/20 border border-red-400/50 rounded-xl p-4 mb-6 shadow-xl">
          <p className="text-white drop-shadow">{error}</p>
        </div>
      )}

      {!registrationOpen && (
        <div className="border-2 border-red-400/50 rounded-xl p-4 backdrop-blur-xl bg-red-500/20 shadow-xl">
          <div className="flex items-start">
            <Lock className="w-6 h-6 mr-3 mt-0.5 text-red-300 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg drop-shadow-lg">Registro de Cuerpo Técnico Cerrado</h3>
              <p className="text-sm mt-2 text-white/80 drop-shadow">
                La liga ha cerrado el periodo de registro del cuerpo técnico para este torneo.
              </p>
            </div>
          </div>
        </div>
      )}

      {maxCoachingStaffLimit && registrationOpen && (
        <div className={`border rounded-xl p-4 backdrop-blur-xl shadow-xl ${isAtLimit ? 'bg-red-500/20 border-red-400/50' : 'bg-blue-500/20 border-blue-400/50'}`}>
          <div className="flex items-start">
            <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${isAtLimit ? 'text-red-300' : 'text-blue-300'}`} />
            <div className="flex-1">
              <h3 className={`font-semibold drop-shadow-lg ${isAtLimit ? 'text-white' : 'text-white'}`}>
                {isAtLimit ? 'Límite de cuerpo técnico alcanzado' : 'Límite de cuerpo técnico'}
              </h3>
              <p className={`text-sm mt-1 drop-shadow ${isAtLimit ? 'text-white/80' : 'text-white/80'}`}>
                {isAtLimit
                  ? `Has registrado el máximo de ${maxCoachingStaffLimit} miembros del cuerpo técnico permitidos para este torneo.`
                  : `Tienes ${remainingSlots} ${remainingSlots === 1 ? 'espacio disponible' : 'espacios disponibles'} de ${maxCoachingStaffLimit} miembros permitidos.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Gestión de Cuerpo Técnico</h2>
          <p className="text-white/80 drop-shadow">Administra el cuerpo técnico de tu equipo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
              disabled={!canRegister}
            >
              <Plus className="w-4 h-4 mr-2" />
              {!registrationOpen ? 'Registros Cerrados' : isAtLimit ? 'Límite Alcanzado' : 'Nuevo Miembro'}
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white drop-shadow-lg">Registrar Nuevo Miembro del Cuerpo Técnico</DialogTitle>
              <DialogDescription className="text-white/70 drop-shadow">Completa la información del miembro</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white drop-shadow">Fotografía</Label>
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
                  placeholder="Juan Pérez"
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-white drop-shadow">Rol / Cargo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-xl">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/10 border-white/20">
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cedula" className="text-white drop-shadow">Cédula / DNI (opcional)</Label>
                <Input
                  id="cedula"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  placeholder="12345678"
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="birthDate" className="text-white drop-shadow">Fecha de Nacimiento (opcional)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                />
              </div>
              <Button
                onClick={handleCreateStaff}
                disabled={!formData.name.trim() || !formData.role || creating}
                className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Miembro'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando cuerpo técnico...</span>
        </div>
      ) : coachingStaff.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2 drop-shadow-lg">No hay miembros del cuerpo técnico registrados</h3>
          <p className="text-white/80 drop-shadow">Comienza registrando miembros del cuerpo técnico para tu equipo</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coachingStaff.map((staff) => (
            <Card key={staff.id} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {staff.photo && (
                      <AvatarImage
                        src={staff.photo || "/placeholder.svg?height=48&width=48&query=staff"}
                        alt={staff.name}
                      />
                    )}
                    <AvatarFallback className="bg-blue-500/30 text-blue-300 font-bold border border-blue-300/50">
                      {getStaffInitials(staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg text-white drop-shadow-lg">{staff.name}</CardTitle>
                    <CardDescription className="text-white/70 drop-shadow">{staff.role}</CardDescription>
                  </div>
                </div>
                <Badge variant={staff.is_active ? "default" : "secondary"} className={`w-fit backdrop-blur-md ${staff.is_active ? 'bg-green-500/80 text-white border-0' : 'bg-gray-500/80 text-white border-0'}`}>
                  {staff.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {staff.cedula && (
                    <p className="text-sm text-white/80 drop-shadow">Cédula: {staff.cedula}</p>
                  )}
                  {staff.birth_date && (
                    <p className="text-sm text-white/80 drop-shadow">Edad: {calculateAge(staff.birth_date)} años</p>
                  )}
                  <p className="text-sm text-white/70 drop-shadow">
                    Registrado: {new Date(staff.created_at).toLocaleDateString("es-ES")}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditStaff(staff)} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQR(staff)}
                      disabled={generatingQR}
                      className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleStaffStatus(staff.id)} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
                      {staff.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="backdrop-blur-md bg-red-500/30 border-red-300/50 text-red-300 hover:bg-red-500/40"
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

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg">Editar Miembro del Cuerpo Técnico</DialogTitle>
            <DialogDescription className="text-white/70 drop-shadow">Modifica la información del miembro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white drop-shadow">Fotografía</Label>
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
              <Label htmlFor="edit-role" className="text-white drop-shadow">Rol / Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/10 border-white/20">
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-cedula" className="text-white drop-shadow">Cédula / DNI (opcional)</Label>
              <Input
                id="edit-cedula"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="edit-birthDate" className="text-white drop-shadow">Fecha de Nacimiento (opcional)</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
              />
            </div>
            <Button
              onClick={handleUpdateStaff}
              disabled={!formData.name.trim() || !formData.role || updating}
              className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Miembro'
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
          player={{
            id: currentQRData.staff.id,
            name: currentQRData.staff.name,
            team_id: currentQRData.staff.team_id,
            position: currentQRData.staff.role,
            jersey_number: 0, // No aplicable para cuerpo técnico
            photo: currentQRData.staff.photo,
            birth_date: currentQRData.staff.birth_date,
            is_active: currentQRData.staff.is_active,
            created_at: currentQRData.staff.created_at,
            updated_at: currentQRData.staff.updated_at
          }}
          qrData={currentQRData.qrData}
          credential={currentQRData.credential}
          teamName={teamInfo.name}
          teamLogo={teamInfo.logo}
        />
      )}

    </div>
  )
}
