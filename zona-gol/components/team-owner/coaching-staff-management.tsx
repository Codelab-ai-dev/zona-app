"use client"

import { useState } from "react"
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
import { Database } from "@/lib/supabase/database.types"
import { Plus, Edit, Trash2, User, Loader2, AlertCircle, Lock, QrCode } from "lucide-react"
import { toast } from "sonner"
import { PlayerQRModal } from "@/components/ui/player-qr-modal"
import {
  useCoachingStaff,
  useCreateCoachingStaff,
  useUpdateCoachingStaff,
  useDeleteCoachingStaff,
} from "@/lib/queries"

type CoachingStaff = Database['public']['Tables']['coaching_staff']['Row']

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
  // React Query hooks
  const { data, isLoading, error } = useCoachingStaff(teamId)
  const createMutation = useCreateCoachingStaff()
  const updateMutation = useUpdateCoachingStaff()
  const deleteMutation = useDeleteCoachingStaff()

  // Local state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<CoachingStaff | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [currentQRData, setCurrentQRData] = useState<{
    staff: CoachingStaff,
    qrData: string,
    credential: any
  } | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    cedula: "",
    birthDate: "",
    photo: "",
  })

  // Data from React Query
  const coachingStaff = data?.staff || []
  const maxCoachingStaffLimit = data?.maxLimit || null
  const registrationOpen = data?.registrationOpen ?? true

  const handleCreateStaff = async () => {
    if (!formData.name || !formData.role) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (maxCoachingStaffLimit && coachingStaff.length >= maxCoachingStaffLimit) {
      toast.error(`Has alcanzado el límite de ${maxCoachingStaffLimit} miembros del cuerpo técnico`)
      return
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        team_id: teamId,
        role: formData.role,
        cedula: formData.cedula || null,
        birth_date: formData.birthDate || null,
        photo: formData.photo || null,
        is_active: true,
      })

      toast.success(`${formData.name} registrado exitosamente`)
      setFormData({ name: "", role: "", cedula: "", birthDate: "", photo: "" })
      setIsCreateDialogOpen(false)
    } catch (err: any) {
      console.error('Error creando miembro:', err)
      toast.error(`Error: ${err.message || 'Error desconocido'}`)
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

    try {
      await updateMutation.mutateAsync({
        id: editingStaff.id,
        teamId,
        updates: {
          name: formData.name,
          role: formData.role,
          cedula: formData.cedula || null,
          birth_date: formData.birthDate || null,
          photo: formData.photo || null,
        }
      })

      toast.success(`${formData.name} actualizado exitosamente`)
      setEditingStaff(null)
      setFormData({ name: "", role: "", cedula: "", birthDate: "", photo: "" })
    } catch (err: any) {
      console.error('Error actualizando miembro:', err)
      toast.error(`Error: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    const staff = coachingStaff.find(s => s.id === staffId)
    if (!staff) return

    if (!confirm(`¿Estás seguro de que quieres eliminar a ${staff.name}?`)) return

    try {
      await deleteMutation.mutateAsync({ id: staffId, teamId })
      toast.success(`${staff.name} eliminado exitosamente`)
    } catch (err: any) {
      console.error('Error eliminando miembro:', err)
      toast.error(`Error: ${err.message || 'Error desconocido'}`)
    }
  }

  const toggleStaffStatus = async (staffId: string) => {
    const staff = coachingStaff.find(s => s.id === staffId)
    if (!staff) return

    const action = staff.is_active ? 'desactivar' : 'activar'
    if (!confirm(`¿Estás seguro de que quieres ${action} a ${staff.name}?`)) return

    try {
      await updateMutation.mutateAsync({
        id: staffId,
        teamId,
        updates: { is_active: !staff.is_active }
      })
      toast.success(`${staff.name} ${action}do exitosamente`)
    } catch (err: any) {
      console.error(`Error al ${action} miembro:`, err)
      toast.error(`Error: ${err.message || 'Error desconocido'}`)
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

  const handleGenerateQR = async (staff: CoachingStaff) => {
    setGeneratingQR(true)
    try {
      const qrData = JSON.stringify({
        t: 's',
        i: staff.id,
        n: staff.name,
        r: staff.role,
        tm: staff.team_id
      })

      const credential = {
        id: staff.id,
        player_id: staff.id,
        qr_code_data: qrData,
        team_id: staff.team_id,
        created_at: new Date().toISOString()
      }

      setCurrentQRData({ staff, qrData, credential })
      setQrModalOpen(true)
    } catch (err: any) {
      console.error('Error generando QR:', err)
      toast.error(`Error generando QR: ${err.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Encontrado</h2>
        <p className="text-white/80 drop-shadow">No se pudo cargar la información del equipo.</p>
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
          <p className="text-white drop-shadow">{(error as Error).message}</p>
        </div>
      )}

      {!registrationOpen && (
        <div className="border-2 border-red-400/50 rounded-xl p-4 backdrop-blur-xl bg-red-500/20 shadow-xl">
          <div className="flex items-start">
            <Lock className="w-6 h-6 mr-3 mt-0.5 text-red-300 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-white text-base sm:text-lg drop-shadow-lg">Registro de Cuerpo Técnico Cerrado</h3>
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
              <h3 className="font-semibold drop-shadow-lg text-white">
                {isAtLimit ? 'Límite de cuerpo técnico alcanzado' : 'Límite de cuerpo técnico'}
              </h3>
              <p className="text-sm mt-1 drop-shadow text-white/80">
                {isAtLimit
                  ? `Has registrado el máximo de ${maxCoachingStaffLimit} miembros del cuerpo técnico permitidos.`
                  : `Tienes ${remainingSlots} ${remainingSlots === 1 ? 'espacio disponible' : 'espacios disponibles'} de ${maxCoachingStaffLimit} miembros permitidos.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Gestión de Cuerpo Técnico</h2>
          <p className="text-white/80 drop-shadow">Administra el cuerpo técnico de tu equipo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (open) {
              setFormData({ name: "", role: "", cedula: "", birthDate: "", photo: "" })
            }
            setIsCreateDialogOpen(open)
          }}>
          <DialogTrigger asChild>
            <Button
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl w-full sm:w-auto"
              disabled={!canRegister}
            >
              <Plus className="w-4 h-4 mr-2" />
              {!registrationOpen ? 'Registros Cerrados' : isAtLimit ? 'Límite Alcanzado' : 'Nuevo Miembro'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Miembro del Cuerpo Técnico</DialogTitle>
              <DialogDescription className="text-slate-400">Completa la información del miembro</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white">Fotografía</Label>
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
                  placeholder="Juan Pérez"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-white">Rol / Cargo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {roles.map((role) => (
                      <SelectItem key={role} value={role} className="text-white hover:bg-slate-700">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cedula" className="text-white">Cédula / DNI (opcional)</Label>
                <Input
                  id="cedula"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  placeholder="12345678"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento (opcional)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={handleCreateStaff}
                disabled={!formData.name.trim() || !formData.role || createMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {createMutation.isPending ? (
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando cuerpo técnico...</span>
        </div>
      ) : coachingStaff.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-white mb-2 drop-shadow-lg">No hay miembros del cuerpo técnico registrados</h3>
          <p className="text-white/80 drop-shadow">Comienza registrando miembros del cuerpo técnico para tu equipo</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {coachingStaff.map((staff) => (
            <Card key={staff.id} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    {staff.photo && (
                      <AvatarImage
                        src={staff.photo}
                        alt={staff.name}
                      />
                    )}
                    <AvatarFallback className="bg-blue-500/30 text-blue-300 font-bold border border-blue-300/50">
                      {getStaffInitials(staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg">{staff.name}</CardTitle>
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
                      disabled={deleteMutation.isPending}
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
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Miembro del Cuerpo Técnico</DialogTitle>
            <DialogDescription className="text-slate-400">Modifica la información del miembro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Fotografía</Label>
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
              <Label htmlFor="edit-role" className="text-white">Rol / Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {roles.map((role) => (
                    <SelectItem key={role} value={role} className="text-white hover:bg-slate-700">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-cedula" className="text-white">Cédula / DNI (opcional)</Label>
              <Input
                id="edit-cedula"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-birthDate" className="text-white">Fecha de Nacimiento (opcional)</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Button
              onClick={handleUpdateStaff}
              disabled={!formData.name.trim() || !formData.role || updateMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {updateMutation.isPending ? (
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
            jersey_number: 0,
            photo: currentQRData.staff.photo,
          }}
          qrData={currentQRData.qrData}
          credential={{
            type: 'staff',
            version: '1.0',
            timestamp: Date.now()
          }}
        />
      )}
    </div>
  )
}
