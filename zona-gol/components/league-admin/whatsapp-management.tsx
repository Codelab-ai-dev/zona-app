"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Plus, Trash2, CheckCircle, XCircle, Phone, User, Clock, AlertCircle, Edit } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface WhatsAppLink {
  id: string
  phone_number: string
  user_id: string
  league_id: string
  tournament_id: string | null
  role: string
  is_active: boolean
  linked_at: string
  last_interaction_at: string | null
  display_name: string | null
  preferred_language: string
  user?: {
    name: string
    email: string
  }
}

interface LeagueUser {
  id: string
  name: string
  email: string
  role: string
}

interface Tournament {
  id: string
  name: string
  is_active: boolean
}

interface WhatsAppManagementProps {
  leagueId: string
}

export function WhatsAppManagement({ leagueId }: WhatsAppManagementProps) {
  const [links, setLinks] = useState<WhatsAppLink[]>([])
  const [users, setUsers] = useState<LeagueUser[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingLink, setEditingLink] = useState<WhatsAppLink | null>(null)

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [preferredLanguage, setPreferredLanguage] = useState("es")

  useEffect(() => {
    loadData()
  }, [leagueId])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClientSupabaseClient()

      // Load WhatsApp links (simple query without joins)
      const { data: linksData, error: linksError } = await supabase
        .from('whatsapp_user_links')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })

      if (linksError) {
        console.error('Error loading links:', linksError)
        toast.error('Error cargando vínculos de WhatsApp')
        setLinks([])
      }

      // Load all users from the league (for both dropdown and enriching links)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('league_id', leagueId)
        .order('name')

      if (usersError) {
        console.error('Error loading users:', usersError)
        setUsers([])
      } else {
        setUsers(usersData || [])
      }

      // Load tournaments for the league
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, is_active')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })

      if (tournamentsError) {
        console.error('Error loading tournaments:', tournamentsError)
        setTournaments([])
      } else {
        setTournaments(tournamentsData || [])
      }

      // Enrich links with user data
      if (linksData && usersData) {
        const enrichedLinks = linksData.map(link => {
          const userData = usersData.find(u => u.id === link.user_id)
          return {
            ...link,
            user: userData ? { name: userData.name, email: userData.email } : undefined
          }
        })
        setLinks(enrichedLinks)
      } else {
        setLinks(linksData || [])
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and special characters
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')

    // Check if it starts with + and has 10-15 digits
    const phoneRegex = /^\+\d{10,15}$/
    return phoneRegex.test(cleaned)
  }

  const formatPhoneNumber = (phone: string): string => {
    // Remove spaces and special characters, keep only + and digits
    return phone.replace(/[\s\-\(\)]/g, '')
  }

  const handleOpenDialog = (link?: WhatsAppLink) => {
    if (link) {
      // Edit mode
      setEditingLink(link)
      setPhoneNumber(link.phone_number)
      setSelectedUserId(link.user_id)
      setSelectedTournamentId(link.tournament_id || "")
      setDisplayName(link.display_name || "")
      setPreferredLanguage(link.preferred_language)
    } else {
      // Create mode - default to active tournament if exists
      setEditingLink(null)
      setPhoneNumber("")
      setSelectedUserId("")
      const activeTournament = tournaments.find(t => t.is_active)
      setSelectedTournamentId(activeTournament?.id || "")
      setDisplayName("")
      setPreferredLanguage("es")
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingLink(null)
    setPhoneNumber("")
    setSelectedUserId("")
    setSelectedTournamentId("")
    setDisplayName("")
    setPreferredLanguage("es")
  }

  const handleCreateLink = async () => {
    // Validations
    if (!phoneNumber) {
      toast.error('El número de teléfono es requerido')
      return
    }

    if (!selectedUserId) {
      toast.error('Debes seleccionar un usuario')
      return
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    if (!validatePhoneNumber(formattedPhone)) {
      toast.error('Formato de teléfono inválido. Debe ser: +52XXXXXXXXXX')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClientSupabaseClient()

      // Get user role
      const selectedUser = users.find(u => u.id === selectedUserId)
      if (!selectedUser) {
        toast.error('Usuario no encontrado')
        return
      }

      // Create link
      const { data, error } = await supabase
        .from('whatsapp_user_links')
        .insert({
          phone_number: formattedPhone,
          user_id: selectedUserId,
          league_id: leagueId,
          tournament_id: selectedTournamentId || null,
          role: selectedUser.role,
          display_name: displayName || selectedUser.name,
          preferred_language: preferredLanguage,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Este número de teléfono ya está vinculado')
        } else {
          toast.error('Error creando vínculo: ' + error.message)
        }
        return
      }

      toast.success('Vínculo de WhatsApp creado exitosamente')
      handleCloseDialog()
      loadData()
    } catch (error: any) {
      console.error('Error creating link:', error)
      toast.error('Error inesperado: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateLink = async () => {
    if (!editingLink) return

    // Validations
    if (!phoneNumber) {
      toast.error('El número de teléfono es requerido')
      return
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    if (!validatePhoneNumber(formattedPhone)) {
      toast.error('Formato de teléfono inválido. Debe ser: +52XXXXXXXXXX')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClientSupabaseClient()

      // Update link
      const { error } = await supabase
        .from('whatsapp_user_links')
        .update({
          phone_number: formattedPhone,
          tournament_id: selectedTournamentId || null,
          display_name: displayName,
          preferred_language: preferredLanguage
        })
        .eq('id', editingLink.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('Este número de teléfono ya está vinculado a otro usuario')
        } else {
          toast.error('Error actualizando vínculo: ' + error.message)
        }
        return
      }

      toast.success('Vínculo actualizado exitosamente')
      handleCloseDialog()
      loadData()
    } catch (error: any) {
      console.error('Error updating link:', error)
      toast.error('Error inesperado: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (editingLink) {
      handleUpdateLink()
    } else {
      handleCreateLink()
    }
  }

  const handleToggleActive = async (linkId: string, currentState: boolean) => {
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from('whatsapp_user_links')
        .update({ is_active: !currentState })
        .eq('id', linkId)

      if (error) {
        toast.error('Error actualizando vínculo: ' + error.message)
        return
      }

      toast.success(currentState ? 'Vínculo desactivado' : 'Vínculo activado')
      loadData()
    } catch (error: any) {
      console.error('Error toggling link:', error)
      toast.error('Error inesperado: ' + error.message)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('¿Estás seguro de eliminar este vínculo? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from('whatsapp_user_links')
        .delete()
        .eq('id', linkId)

      if (error) {
        toast.error('Error eliminando vínculo: ' + error.message)
        return
      }

      toast.success('Vínculo eliminado exitosamente')
      loadData()
    } catch (error: any) {
      console.error('Error deleting link:', error)
      toast.error('Error inesperado: ' + error.message)
    }
  }

  const getRoleBadge = (role: string) => {
    const config = {
      super_admin: { label: 'Super Admin', variant: 'destructive' as const },
      league_admin: { label: 'Admin Liga', variant: 'default' as const },
      team_owner: { label: 'Dueño Equipo', variant: 'secondary' as const },
      user: { label: 'Usuario', variant: 'outline' as const }
    }
    return config[role as keyof typeof config] || config.user
  }

  const stats = {
    total: links.length,
    active: links.filter(l => l.is_active).length,
    inactive: links.filter(l => !l.is_active).length,
    withInteractions: links.filter(l => l.last_interaction_at).length
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 drop-shadow">Total Vínculos</p>
                <p className="text-3xl font-bold text-white drop-shadow-lg">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 drop-shadow">Activos</p>
                <p className="text-3xl font-bold text-green-300 drop-shadow-lg">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 drop-shadow">Inactivos</p>
                <p className="text-3xl font-bold text-red-300 drop-shadow-lg">{stats.inactive}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 drop-shadow">Con Interacciones</p>
                <p className="text-3xl font-bold text-yellow-300 drop-shadow-lg">{stats.withInteractions}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                <MessageSquare className="w-5 h-5 text-green-400" />
                Gestión de WhatsApp
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Vincula números de WhatsApp con usuarios de tu liga
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Vínculo
                </Button>
              </DialogTrigger>
              <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white drop-shadow-lg">
                    {editingLink ? 'Editar' : 'Crear'} Vínculo de WhatsApp
                  </DialogTitle>
                  <DialogDescription className="text-white/80 drop-shadow">
                    {editingLink
                      ? 'Actualiza la información del vínculo de WhatsApp'
                      : 'Vincula un número de WhatsApp con un usuario de tu liga'
                    }
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Alert className="backdrop-blur-xl bg-blue-500/20 border-blue-300/30">
                    <AlertCircle className="h-4 w-4 text-blue-300" />
                    <AlertDescription className="text-white/90 drop-shadow text-sm">
                      El formato del número debe incluir el código de país (ejemplo: +5215512345678)
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="user" className="text-white/90 drop-shadow">Usuario</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                      disabled={!!editingLink}
                    >
                      <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white disabled:opacity-50">
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} - {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editingLink && (
                      <p className="text-xs text-white/60 mt-1">El usuario no puede ser cambiado en un vínculo existente</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-white/90 drop-shadow">Número de WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+5215512345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10 backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tournament" className="text-white/90 drop-shadow">
                      Torneo Activo
                    </Label>
                    <Select
                      value={selectedTournamentId}
                      onValueChange={setSelectedTournamentId}
                    >
                      <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                        <SelectValue placeholder="Selecciona un torneo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map(tournament => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name} {tournament.is_active && '(Activo)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/60 mt-1">
                      El torneo determina qué datos puede consultar el usuario en WhatsApp
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="display-name" className="text-white/90 drop-shadow">
                      Nombre para Mostrar (Opcional)
                    </Label>
                    <Input
                      id="display-name"
                      type="text"
                      placeholder="Nombre del contacto"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="language" className="text-white/90 drop-shadow">Idioma Preferido</Label>
                    <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                      <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="flex-1 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !phoneNumber || (!editingLink && !selectedUserId)}
                      className="flex-1 backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                    >
                      {submitting
                        ? (editingLink ? 'Actualizando...' : 'Creando...')
                        : (editingLink ? 'Actualizar Vínculo' : 'Crear Vínculo')
                      }
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Warning for links without tournament */}
          {!loading && links.some(l => !l.tournament_id && l.is_active) && (
            <Alert className="mb-4 backdrop-blur-xl bg-orange-500/20 border-orange-300/30">
              <AlertCircle className="h-4 w-4 text-orange-300" />
              <AlertDescription className="text-white/90 drop-shadow text-sm">
                <strong>Atención:</strong> Hay usuarios sin torneo asignado. El agente no podrá responder consultas de tabla, resultados o calendario sin un torneo configurado.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white/80 drop-shadow">Cargando vínculos...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/80 drop-shadow mb-2">No hay vínculos de WhatsApp</p>
              <p className="text-white/60 drop-shadow text-sm">
                Crea el primer vínculo para empezar a usar el Agent Service
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/90 drop-shadow">Usuario</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Teléfono</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Torneo</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Estado</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Última Interacción</TableHead>
                    <TableHead className="text-white/90 drop-shadow text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id} className="border-white/20 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-white/50" />
                          <div>
                            <p className="text-white drop-shadow font-medium">
                              {link.display_name || link.user?.name || 'Sin nombre'}
                            </p>
                            <p className="text-white/60 drop-shadow text-sm">
                              {link.user?.email || 'Sin email'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-white/90 drop-shadow bg-white/10 px-2 py-1 rounded text-sm">
                          {link.phone_number}
                        </code>
                      </TableCell>
                      <TableCell>
                        {link.tournament_id ? (
                          <Badge className="bg-blue-500/80 text-white">
                            {tournaments.find(t => t.id === link.tournament_id)?.name || 'Torneo'}
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500/80 text-white">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sin torneo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {link.is_active ? (
                          <Badge className="bg-green-500/80 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/80 text-white">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-white/80 drop-shadow text-sm">
                        {link.last_interaction_at ? (
                          formatDistanceToNow(new Date(link.last_interaction_at), {
                            addSuffix: true,
                            locale: es
                          })
                        ) : (
                          <span className="text-white/50">Sin interacciones</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(link)}
                            className="backdrop-blur-md bg-blue-500/20 border-blue-300/30 text-white hover:bg-blue-500/30"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(link.id, link.is_active)}
                            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            {link.is_active ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
