"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTeams } from "@/lib/hooks/use-teams"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"

type Team = Database['public']['Tables']['teams']['Row']
import { Edit, Shield, Calendar, Globe, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"

interface TeamInfoProps {
  teamId: string
}

export function TeamInfo({ teamId }: TeamInfoProps) {
  const { user } = useAuth()
  const { updateTeam } = useTeams()
  const [team, setTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Load team data directly from database
  useEffect(() => {
    async function loadTeamData() {
      if (!teamId) {
        setError('No team ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const supabase = createClientSupabaseClient()
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            owner:users!teams_owner_id_fkey(id, name, email),
            league:leagues(id, name, slug)
          `)
          .eq('id', teamId)
          .single()

        if (teamError) {
          console.error('Error loading team:', teamError)
          setError('No se pudo cargar la información del equipo')
          return
        }

        if (teamData) {
          setTeam(teamData)
          console.log('✅ Team data loaded:', teamData.name)
        } else {
          setError('Equipo no encontrado')
        }
      } catch (err) {
        console.error('Error loading team data:', err)
        setError('Error al cargar los datos del equipo')
      } finally {
        setLoading(false)
      }
    }

    loadTeamData()
  }, [teamId])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
  })

  // Update form data when team is loaded
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        description: team.description || "",
        slug: team.slug || "",
      })
    }
  }, [team])

  const canEditTeam = user?.role === "league_admin" || user?.role === "team_owner"

  const handleUpdateTeam = async () => {
    if (!team) return

    try {
      const updatedTeam: Team = {
        ...team,
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
      }

      await updateTeam(team.id, {
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
      })

      setTeam(updatedTeam)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating team:', error)
      setError('Error al actualizar el equipo')
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando equipo...</h3>
        <p className="text-gray-600">Obteniendo información del equipo</p>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Equipo no encontrado'}
        </h3>
        <p className="text-gray-600 mb-4">
          {error || 'No se pudo cargar la información del equipo'}
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="mt-2"
        >
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Información del Equipo</h2>
        <p className="text-gray-600">
          {canEditTeam ? "Gestiona los detalles del equipo" : "Visualiza los detalles de tu equipo"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-green-100 text-green-800 font-bold text-lg">
                  {getTeamInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{team.name}</CardTitle>
                <CardDescription className="text-base">/{team.slug}</CardDescription>
              </div>
            </div>
            {canEditTeam && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFormData({
                        name: team.name,
                        description: team.description || "",
                        slug: team.slug,
                      })
                    }
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Información del Equipo</DialogTitle>
                    <DialogDescription>Actualiza los detalles del equipo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="team-name">Nombre del Equipo</Label>
                      <Input
                        id="team-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Águilas FC"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-slug">URL Personalizada</Label>
                      <Input
                        id="team-slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="aguilas-fc"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-description">Descripción</Label>
                      <Textarea
                        id="team-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descripción del equipo..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleUpdateTeam} className="w-full bg-green-600 hover:bg-green-700">
                      Actualizar Equipo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-700">{team.description || "Sin descripción disponible"}</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Fundado: {new Date(team.created_at).toLocaleDateString("es-ES")}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>URL: /{team.slug}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Estado: {team.is_active ? "Activo" : "Inactivo"}</span>
              </div>
              {(team as any).league?.name && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>Liga: {(team as any).league.name}</span>
                </div>
              )}
              {(team as any).owner?.name && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>Propietario: {(team as any).owner.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Funcionalidades</CardTitle>
            <CardDescription>Características que estarán disponibles pronto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Subir logo del equipo</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Gestión de colores del uniforme</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Historial de temporadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
