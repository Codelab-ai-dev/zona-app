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
import { ProductModeSelector } from "@/components/super-admin/product-mode-selector"
import type { ProductMode } from "@/lib/types/product-mode"

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
    product_mode: "full" as ProductMode,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Debug effect to track modal state
  // useEffect(() => {
  //   console.log('🔍 Modal state changed:', {
  //     showSuccessDialog,
  //     hasPassword: !!generatedPassword,
  //     password: generatedPassword,
  //     hasAdmin: !!createdAdmin,
  //     adminEmail: createdAdmin?.email
  //   })
  // }, [showSuccessDialog, generatedPassword, createdAdmin])

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
        // console.error('Error loading data:', error)
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
      // console.log('🚀 Iniciando creación de liga y administrador...')

      // 1. Generar una contraseña segura para el administrador
      const adminPassword = generatePassword()
      // console.log('🔑 Contraseña generada para administrador')

      // 2. Guardar la información para el modal antes de cualquier operación async
      const adminEmail = formData.adminEmail
      const adminName = formData.adminName
      const adminPhone = formData.adminPhone
      const leagueName = formData.name
      const leagueSlug = formData.slug
      const leagueDescription = formData.description
      const productMode = formData.product_mode

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

      // console.log('📋 Datos preparados para modal ANTES de operaciones async')

      // 4. Limpiar formulario y cerrar diálogo de creación INMEDIATAMENTE
      setFormData({ name: "", slug: "", description: "", adminName: "", adminEmail: "", adminPhone: "", logo: "", product_mode: "full" as ProductMode })
      setLogoFile(null)
      setIsCreateDialogOpen(false)

      // 5. Mostrar modal de credenciales INMEDIATAMENTE
      setShowSuccessDialog(true)

      // console.log('✅ Modal mostrado inmediatamente')

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
            is_active: true,
            product_mode: productMode || 'full'
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Gestión de Ligas</h2>
          <p className="text-gray-500 text-sm">Administra todas las ligas del sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={activateAllLeagues}
            className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs"
            size="sm"
          >
            <Eye className="w-3 h-3 mr-1" />
            Activar Todas
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600 text-white border-0" size="sm">
                <Plus className="w-3 h-3 mr-1" />
                Nueva Liga
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-base md:text-lg">Crear Nueva Liga</DialogTitle>
                <DialogDescription className="text-gray-500 text-xs md:text-sm">
                  Completa la información para crear una nueva liga y su administrador
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-400 text-sm">Nombre de la Liga</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Liga Premier Mexicana"
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
                  <Label htmlFor="slug" className="text-gray-400 text-sm">URL Personalizada</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    placeholder="liga-premier-mexicana"
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                    forceLowercase={true}
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-gray-400 text-sm">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción de la liga..."
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="border-t border-white/10 pt-3">
                  <ProductModeSelector
                    value={formData.product_mode}
                    onChange={(mode) => setFormData({ ...formData, product_mode: mode })}
                  />
                </div>

                <div className="border-t border-white/10 pt-3">
                  <h4 className="font-medium text-white text-sm mb-3">Información del Administrador</h4>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="adminName" className="text-gray-400 text-sm">Nombre Completo</Label>
                      <Input
                        id="adminName"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        placeholder="Juan Pérez"
                        className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminEmail" className="text-gray-400 text-sm">Correo Electrónico</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        placeholder="juan@ejemplo.com"
                        className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminPhone" className="text-gray-400 text-sm">Teléfono</Label>
                      <Input
                        id="adminPhone"
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                        placeholder="+52 555 123 4567"
                        className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCreateLeague}
                  className="w-full bg-green-500 hover:bg-green-600 text-white border-0"
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
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              Liga Creada
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Credenciales del administrador:
            </DialogDescription>
          </DialogHeader>

          {createdAdmin && generatedPassword ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Email</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(createdAdmin.email)
                      toast.success('Email copiado')
                    }}
                    className="h-6 px-2 text-gray-400 hover:text-white"
                  >
                    <Copy size={12} />
                  </Button>
                </div>
                <p className="text-white text-sm font-mono">{createdAdmin.email}</p>
              </div>

              <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Contraseña</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-6 px-2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword)
                        toast.success('Contraseña copiada')
                      }}
                      className="h-6 px-2 text-gray-400 hover:text-white"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
                <p className="text-white text-sm font-mono">
                  {showPassword ? generatedPassword : '••••••••••••'}
                </p>
              </div>

              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                <p className="text-yellow-400 text-xs font-medium">Importante</p>
                <p className="text-gray-400 text-xs mt-1">Guarda estas credenciales. No se mostrarán nuevamente.</p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-red-400 text-sm">
              Error al cargar las credenciales.
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => (
          <div key={league.id} className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4 hover:bg-slate-800/70 transition-all">
            <div className="flex items-start gap-3 mb-3">
              {league.logo ? (
                <img
                  src={league.logo}
                  alt={`Logo de ${league.name}`}
                  className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg bg-slate-700/50 flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 font-bold text-sm">{league.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm md:text-base truncate">{league.name}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">/{league.slug}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${league.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {league.is_active ? "Activa" : "Inactiva"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${(league as any).product_mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {(league as any).product_mode === 'full' ? 'Completo' : 'Web'}
                  </span>
                </div>
              </div>
            </div>

            {league.description && (
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{league.description}</p>
            )}

            <div className="flex items-center text-xs text-gray-500 mb-3">
              <Users className="w-3 h-3 mr-1" />
              {getAdminName(league.admin_id)}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditLeague(league)}
                className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleLeagueStatus(league.id)}
                className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2 text-[10px]"
              >
                {league.is_active ? "Desactivar" : "Activar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteLeague(league.id)}
                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit League Dialog */}
      <Dialog open={!!editingLeague} onOpenChange={() => setEditingLeague(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-base md:text-lg">Editar Liga</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs md:text-sm">Modifica la información de la liga</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name" className="text-gray-400 text-sm">Nombre de la Liga</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
              <Label htmlFor="edit-slug" className="text-gray-400 text-sm">URL Personalizada</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                forceLowercase={true}
                className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-gray-400 text-sm">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="border-t border-white/10 pt-3">
              <h4 className="font-medium text-white text-sm mb-3">Información del Administrador</h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="edit-adminName" className="text-gray-400 text-sm">Nombre Completo</Label>
                  <Input
                    id="edit-adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-adminEmail" className="text-gray-400 text-sm">Correo Electrónico</Label>
                  <Input
                    id="edit-adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-adminPhone" className="text-gray-400 text-sm">Teléfono</Label>
                  <Input
                    id="edit-adminPhone"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleUpdateLeague} className="w-full bg-green-500 hover:bg-green-600 text-white border-0">
              Actualizar Liga
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
