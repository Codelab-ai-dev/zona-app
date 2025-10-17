"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLeagues } from "@/lib/hooks/use-leagues"
import { leagueActions } from "@/lib/actions/league-actions"
import { authActions } from "@/lib/actions/auth-actions"
import { generatePassword } from "@/lib/utils"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { fileUploadService } from "@/lib/utils/file-upload"
import { FileUpload } from "@/components/ui/file-upload"
import { Plus, Edit, Trash2, Users, Copy, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Definir tipos
type League = Database['public']['Tables']['leagues']['Row']
type UserProfile = Database['public']['Tables']['users']['Row']

export function LeagueManagement() {
  const { leagues, loading, getAllLeagues, createLeagueWithAdmin } = useLeagues()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdAdmin, setCreatedAdmin] = useState<UserProfile | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    logo: "",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Debug effect to track modal state

  useEffect(() => {
    console.log('🔍 Modal state changed:', {
      showSuccessDialog,
      hasPassword: !!generatedPassword,
      password: generatedPassword,
      hasAdmin: !!createdAdmin,
      adminEmail: createdAdmin?.email
    })
  }, [showSuccessDialog, generatedPassword, createdAdmin])

  const availableAdmins = users.filter((user) => user.role === "league_admin")

  // Load users and leagues on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all users
        const allUsers = await authActions.getAllProfiles()
        setUsers(allUsers)
        
        // Load all leagues
        await getAllLeagues()
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleCreateLeague = async () => {
    if (!formData.name || !formData.adminName || !formData.adminEmail) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setCreating(true)
    
    try {
      console.log('🚀 Iniciando creación de liga y administrador...')
      
      // 1. Generar una contraseña segura para el administrador
      const adminPassword = generatePassword()
      console.log('🔑 Contraseña generada para administrador')
      
      // 2. Guardar la información para el modal antes de cualquier operación async
      const adminEmail = formData.adminEmail
      const adminName = formData.adminName
      const adminPhone = formData.adminPhone
      const leagueName = formData.name
      const leagueSlug = formData.slug
      const leagueDescription = formData.description
      
      // 3. Preparar datos para el modal ANTES de crear nada
      setGeneratedPassword(adminPassword)
      
      const tempAdminProfile = {
        id: crypto.randomUUID(),
        email: adminEmail,
        name: adminName,
        role: 'league_admin' as const,
        phone: adminPhone || null,
        is_active: true,
        league_id: 'temp-league-id',
        team_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setCreatedAdmin(tempAdminProfile)
      
      console.log('📋 Datos preparados para modal ANTES de operaciones async')
      
      // 4. Limpiar formulario y cerrar diálogo de creación INMEDIATAMENTE
      setFormData({ name: "", slug: "", description: "", adminName: "", adminEmail: "", adminPhone: "", logo: "" })
      setLogoFile(null)
      setIsCreateDialogOpen(false)
      
      // 5. Mostrar modal de credenciales INMEDIATAMENTE
      setShowSuccessDialog(true)
      
      console.log('✅ Modal mostrado inmediatamente')
      
      // 6. Crear todo en background sin bloquear el modal
      setTimeout(async () => {
        try {
          console.log('🔄 Iniciando creación real en background...')
          
          const supabase = createClientSupabaseClient()
          let adminProfile: any
          let logoUrl = ''
          
          // Opción 1: Intentar crear usuario con admin API
          try {
            console.log('🔵 Intentando crear usuario con admin API...')
            
            const authResponse = await fetch('/api/auth/create-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: adminEmail,
                password: adminPassword,
                user_metadata: {
                  name: adminName,
                  role: 'league_admin'
                }
              })
            })
            
            console.log('🔵 Response status:', authResponse.status)
            
            if (authResponse.ok) {
              const { user: authUser } = await authResponse.json()
              console.log('✅ Usuario de autenticación creado con admin API:', authUser)
              
              // Esperar un poco para que los triggers se ejecuten
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // Crear el perfil del usuario
              const { data: profile, error: profileError } = await (supabase
                .from('users') as any)
                .upsert({
                  id: authUser.id,
                  email: adminEmail,
                  name: adminName,
                  role: 'league_admin',
                  phone: adminPhone || null,
                  is_active: true
                }, { onConflict: 'id' })
                .select()
                .single()
              
              if (!profileError && profile) {
                adminProfile = profile
                console.log('✅ Perfil de administrador creado:', adminProfile)
              } else {
                console.error('❌ Error creando perfil:', profileError)
              }
            } else {
              const errorData = await authResponse.json()
              console.error('❌ Error en respuesta de admin API:', {
                status: authResponse.status,
                error: errorData
              })
            }
          } catch (adminApiError) {
            console.error('❌ Excepción en admin API:', adminApiError)
          }
          
          // Opción 2: Si falla la admin API, usar el super admin actual como admin temporal
          if (!adminProfile) {
            console.log('📋 Creando liga con super admin como administrador temporal...')
            
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
              throw new Error('No hay usuario autenticado')
            }
            
            adminProfile = {
              id: user.id,
              email: adminEmail, // Mostrar el email del admin que se pretendía crear
              name: adminName,   // Mostrar el nombre del admin que se pretendía crear
              role: 'super_admin',
              phone: adminPhone,
              is_active: true
            }
            
            console.log('👤 Usando super admin como administrador temporal:', adminProfile)
          }
          
          // Upload logo if provided
          if (logoFile) {
            try {
              console.log('📸 Uploading league logo...')
              const uploadResult = await fileUploadService.uploadLogo(
                logoFile, 
                `league-${generateSlug(leagueName)}-${Date.now()}`
              )
              logoUrl = uploadResult.publicUrl
              console.log('✅ Logo uploaded:', logoUrl)
            } catch (logoError) {
              console.warn('⚠️ Error uploading logo:', logoError)
            }
          }

          // Crear la liga con el admin disponible
          const slug = leagueSlug || generateSlug(leagueName)
          
          const league = await leagueActions.createLeagueWithAdmin({
            name: leagueName,
            slug: slug,
            description: leagueDescription || `Liga ${leagueName}`,
            admin_id: adminProfile.id,
            logo: logoUrl || null,
            is_active: true
          })
          
          console.log('🏆 Liga creada en background:', league)
          
          // Si estamos usando el super admin como admin temporal, asignar la liga al usuario actual
          if (adminProfile.role === 'super_admin') {
            try {
              await authActions.assignLeagueToCurrentUser(league.id)
              console.log('✅ Liga asignada al super admin actual')
              
              // Opcional: recargar el perfil del usuario para reflejar el cambio
              // Esto ayudará a que el dashboard se actualice inmediatamente
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            } catch (assignError) {
              console.warn('⚠️ Error asignando liga al super admin:', assignError)
            }
          }
          
          // Actualizar el perfil mostrado en el modal con datos reales
          setCreatedAdmin({
            ...adminProfile,
            league_id: league.id,
            // Mantener los datos originales para mostrar en el modal
            email: adminEmail,
            name: adminName
          })
          
          // Recargar ligas con un pequeño delay para asegurar consistencia
          setTimeout(async () => {
            await getAllLeagues()
            console.log('🔄 Ligas recargadas después de crear nueva liga')
          }, 500)
          
          console.log('🎉 Liga creada exitosamente en background')
          
        } catch (backgroundError) {
          console.error('❌ Error en background:', backgroundError)
          // El modal ya se mostró, así que el usuario puede copiar las credenciales
          // Las tareas de background fallaron, pero no afectan la experiencia del usuario
        }
      }, 100)
      
    } catch (error: any) {
      console.error('❌ Error en creación de liga:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEditLeague = (league: League) => {
    setEditingLeague(league)
    const admin = users.find((user) => user.id === league.admin_id)
    setFormData({
      name: league.name,
      slug: league.slug,
      description: league.description || "",
      adminName: admin?.name || "",
      adminEmail: admin?.email || "",
      adminPhone: admin?.phone || "",
      logo: league.logo || "",
    })
    setLogoFile(null)
  }

  const handleUpdateLeague = async () => {
    if (!editingLeague) return

    try {
      let logoUrl = formData.logo
      
      // Upload new logo if provided
      if (logoFile) {
        try {
          console.log('📸 Converting league logo...')
          const uploadResult = await fileUploadService.uploadLogo(
            logoFile,
            `league-${editingLeague.slug}-${Date.now()}`
          )
          logoUrl = uploadResult.publicUrl
          console.log('✅ Logo converted to base64:', logoUrl ? 'Success' : 'Failed')
        } catch (logoError) {
          console.warn('⚠️ Error processing logo:', logoError)
        }
      }

      // Update league data
      await leagueActions.updateLeague(editingLeague.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        logo: logoUrl || null,
      })

      // Update admin user info
      if (editingLeague.admin_id) {
        await authActions.updateProfileById(editingLeague.admin_id, {
          name: formData.adminName,
          email: formData.adminEmail,
          phone: formData.adminPhone,
        })
      }

      // Reload data
      await getAllLeagues()
      const allUsers = await authActions.getAllProfiles()
      setUsers(allUsers)
      
      // Close edit dialog
      setEditingLeague(null)
      setFormData({ name: "", slug: "", description: "", adminName: "", adminEmail: "", adminPhone: "", logo: "" })
      setLogoFile(null)

      toast.success('Liga actualizada exitosamente')
      console.log('✅ Liga actualizada exitosamente')
    } catch (error: any) {
      console.error('❌ Error updating league:', error)
      toast.error('Error al actualizar la liga')
    }
  }

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta liga? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await leagueActions.deleteLeague(leagueId)
      // The store will be updated automatically by the action
      toast.success('Liga eliminada exitosamente')
    } catch (error: any) {
      console.error('Error deleting league:', error)
      toast.error(`Error al eliminar la liga: ${error.message || 'Error desconocido'}`)
    }
  }

  const toggleLeagueStatus = async (leagueId: string) => {
    const league = leagues.find(l => l.id === leagueId)
    if (!league) return

    try {
      await leagueActions.updateLeague(leagueId, {
        is_active: !league.is_active
      })
      // The store will be updated automatically by the action
      toast.success(`Liga ${league.is_active ? 'desactivada' : 'activada'} exitosamente`)
    } catch (error: any) {
      console.error('Error updating league status:', error)
      toast.error(`Error al actualizar el estado de la liga: ${error.message || 'Error desconocido'}`)
    }
  }

  // Función para verificar estado real de las ligas en BD
  const debugLeaguesStatus = async () => {
    try {
      const supabase = createClientSupabaseClient()
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('id, name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      console.log('🔍 Estado real de las ligas en BD:')
      leagues.forEach(league => {
        console.log(`${league.is_active ? '✅' : '❌'} ${league.name} (${league.is_active ? 'ACTIVA' : 'INACTIVA'})`)
      })

      const inactiveCount = leagues.filter(l => !l.is_active).length
      const activeCount = leagues.filter(l => l.is_active).length

      toast.info('Estado de la base de datos', {
        description: `${activeCount} ligas activas, ${inactiveCount} ligas inactivas. Ver consola para detalles.`,
        duration: 5000
      })
    } catch (error: any) {
      console.error('Error checking leagues status:', error)
      toast.error(`Error verificando estado: ${error.message}`)
    }
  }

  // Función para activar todas las ligas inactivas (útil para corrección masiva)
  const activateAllLeagues = async () => {
    if (!confirm('¿Estás seguro de que quieres activar TODAS las ligas inactivas?')) {
      return
    }

    const inactiveLeagues = leagues.filter(l => !l.is_active)

    if (inactiveLeagues.length === 0) {
      toast.warning('No hay ligas inactivas para activar')
      return
    }

    try {
      console.log(`🔄 Activando ${inactiveLeagues.length} ligas inactivas...`)

      for (const league of inactiveLeagues) {
        await leagueActions.updateLeague(league.id, {
          is_active: true
        })
        console.log(`✅ Liga activada: ${league.name}`)
      }

      toast.success(`Se activaron ${inactiveLeagues.length} ligas exitosamente`)

      // Recargar ligas para reflejar los cambios
      await getAllLeagues()

      // También refrescar la página para asegurar que se actualice la vista pública
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      console.error('Error activating leagues:', error)
      toast.error(`Error al activar ligas: ${error.message || 'Error desconocido'}`)
    }
  }

  const getAdminName = (adminId: string) => {
    const admin = users.find((user) => user.id === adminId)
    return admin ? admin.name : "Sin asignar"
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copiado al portapapeles')
      console.log('✅ Copiado al portapapeles')
    } catch (err) {
      console.error('❌ Error al copiar:', err)
      // Fallback para navegadores más antiguos
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success('Copiado al portapapeles')
      } catch (fallbackErr) {
        toast.error('Error al copiar al portapapeles')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Ligas</h2>
          <p className="text-gray-600">Administra todas las ligas del sistema</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={debugLeaguesStatus}
            className="text-gray-600 hover:text-gray-700 border-gray-600"
            size="sm"
          >
            Debug BD
          </Button>
          <Button
            variant="outline"
            onClick={activateAllLeagues}
            className="text-blue-600 hover:text-blue-700 border-blue-600"
          >
            <Eye className="w-4 h-4 mr-2" />
            Activar Todas
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Liga
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Liga</DialogTitle>
              <DialogDescription>
                Completa la información para crear una nueva liga y su administrador
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Liga</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Liga Premier Mexicana"
                />
              </div>
              <div>
                <FileUpload
                  label="Logo de la Liga"
                  accept="image/*"
                  maxSize={2}
                  value={formData.logo}
                  onChange={(file, dataUrl) => {
                    setLogoFile(file)
                    if (dataUrl) {
                      setFormData({ ...formData, logo: dataUrl })
                    }
                  }}
                  variant="default"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Personalizada</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="liga-premier-mexicana"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la liga..."
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Información del Administrador</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="adminName">Nombre Completo</Label>
                    <Input
                      id="adminName"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Correo Electrónico</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="juan@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPhone">Teléfono</Label>
                    <Input
                      id="adminPhone"
                      value={formData.adminPhone}
                      onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                      placeholder="+52 555 123 4567"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCreateLeague} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Liga y Administrador'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liga y Administrador Creados</DialogTitle>
            <DialogDescription>
              La liga ha sido creada exitosamente. Estas son las credenciales del administrador:
            </DialogDescription>
          </DialogHeader>
          
          {createdAdmin && generatedPassword ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold">Email:</div>
                <div className="flex items-center gap-2">
                  <span className="flex-1">{createdAdmin.email}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(createdAdmin.email)
                      toast.success('Email copiado al portapapeles')
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold">Contraseña:</div>
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    {showPassword ? generatedPassword : '••••••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword)
                      toast.success('Contraseña copiada al portapapeles')
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 text-sm">
                <p className="font-semibold">Importante:</p>
                <p>Guarda estas credenciales en un lugar seguro. No se mostrarán nuevamente.</p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-red-500">
              Error: No se pudieron cargar las credenciales. Por favor contacta al soporte.
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => (
          <Card key={league.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{league.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500">/{league.slug}</CardDescription>
                </div>
                <Badge variant={league.is_active ? "default" : "secondary"}>
                  {league.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {league.logo && (
                <div className="mb-4">
                  <img
                    src={league.logo}
                    alt={`Logo de ${league.name}`}
                    className="w-16 h-16 object-contain mx-auto rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">{league.description}</p>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Users className="w-4 h-4 mr-1" />
                Admin: {getAdminName(league.admin_id)}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditLeague(league)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleLeagueStatus(league.id)}>
                  {league.is_active ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteLeague(league.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit League Dialog */}
      <Dialog open={!!editingLeague} onOpenChange={() => setEditingLeague(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Liga</DialogTitle>
            <DialogDescription>Modifica la información de la liga y su administrador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre de la Liga</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <FileUpload
                label="Logo de la Liga"
                accept="image/*"
                maxSize={2}
                value={formData.logo}
                onChange={(file, dataUrl) => {
                  setLogoFile(file)
                  if (dataUrl) {
                    setFormData({ ...formData, logo: dataUrl })
                  }
                }}
                variant="default"
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">URL Personalizada</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Información del Administrador</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-adminName">Nombre Completo</Label>
                  <Input
                    id="edit-adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-adminEmail">Correo Electrónico</Label>
                  <Input
                    id="edit-adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-adminPhone">Teléfono</Label>
                  <Input
                    id="edit-adminPhone"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleUpdateLeague} className="w-full bg-green-600 hover:bg-green-700">
              Actualizar Liga
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Modal de Credenciales */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        console.log('🔄 Modal state changing:', { from: showSuccessDialog, to: open })
        setShowSuccessDialog(open)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-700 flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              Liga Creada Exitosamente
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Se ha creado la liga y el usuario administrador correctamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-50 p-2 rounded text-xs">
                Debug: Password={generatedPassword || 'No password'}, Admin={!!createdAdmin ? 'Yes' : 'No'}, Email={createdAdmin?.email || 'No email'}
              </div>
            )}
            
            {/* Información de la Liga */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Liga Creada</h4>
              <p className="text-sm text-blue-700">
                <span className="font-medium">Liga ID:</span> {createdAdmin?.league_id || 'Sin ID'}
              </p>
            </div>

            {/* Credenciales del Administrador */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2H7v-2H4a1 1 0 01-1-1v-4c0-5.523 4.477-10 10-10s10 4.477 10 10z"></path>
                </svg>
                Credenciales del Administrador
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-amber-700 uppercase tracking-wide">Usuario</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">
                      {createdAdmin?.email}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdAdmin?.email || '')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-amber-700 uppercase tracking-wide">Contraseña</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">
                      {showPassword ? generatedPassword : "••••••••••••"}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedPassword)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso Importante */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">¡Importante!</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Guarda estas credenciales de forma segura. El administrador podrá cambiar su contraseña después del primer inicio de sesión.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(`Usuario: ${createdAdmin?.email}\nContraseña: ${generatedPassword}`)}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Todo
              </Button>
              <Button 
                onClick={() => {
                  // Cerrar el modal y limpiar estado
                  setShowSuccessDialog(false)
                  setGeneratedPassword("")
                  setCreatedAdmin(null)
                  setShowPassword(false)
                  
                  // Mantener al super admin en el panel para crear más ligas
                  console.log('✅ Modal cerrado, listo para crear otra liga')
                }} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Crear Otra Liga
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
