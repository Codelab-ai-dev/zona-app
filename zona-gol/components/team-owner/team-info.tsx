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
import { PlayerStatistics } from "./player-statistics"

type Team = Database['public']['Tables']['teams']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']
type Player = Database['public']['Tables']['players']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

import { Edit, Shield, Calendar, Globe, Loader2, Trophy, Target, AlertTriangle, Clock, Users } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { AvatarImage } from "@/components/ui/avatar"

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
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])
  
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

          // Load player statistics
          const { data: playersFromDb, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .eq('is_active', true)

          if (!playersError && playersFromDb) {
            // For each player, get their aggregated stats
            const playersWithStatsData: PlayerWithStats[] = []

            for (const player of playersFromDb) {
              const { data: stats, error: statsError } = await supabase
                .from('player_stats')
                .select('*')
                .eq('player_id', player.id)

              if (statsError) {
                console.warn('⚠️ Error loading stats for player:', player.name, statsError)
              }

              // Calculate aggregated stats
              const totalGames = stats?.length || 0
              const totalGoals = stats?.reduce((sum, s) => sum + (s.goals || 0), 0) || 0
              const totalAssists = stats?.reduce((sum, s) => sum + (s.assists || 0), 0) || 0
              const totalYellowCards = stats?.reduce((sum, s) => sum + (s.yellow_cards || 0), 0) || 0
              const totalRedCards = stats?.reduce((sum, s) => sum + (s.red_cards || 0), 0) || 0
              const totalMinutesPlayed = stats?.reduce((sum, s) => sum + (s.minutes_played || 0), 0) || 0

              playersWithStatsData.push({
                ...player,
                total_games: totalGames,
                total_goals: totalGoals,
                total_assists: totalAssists,
                total_yellow_cards: totalYellowCards,
                total_red_cards: totalRedCards,
                total_minutes_played: totalMinutesPlayed,
              })
            }

            setPlayersWithStats(playersWithStatsData)
            console.log('✅ Player stats loaded:', playersWithStatsData.length)
          }
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

  const getPlayerInitials = (name: string) => {
    return name
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

      {/* Team Detailed Statistics Section */}
      {playersWithStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Estadísticas del Equipo
            </CardTitle>
            <CardDescription>
              Análisis detallado del rendimiento colectivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Rendimiento Ofensivo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Rendimiento Ofensivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground mb-1">Goles Totales</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_goals, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground mb-1">Asistencias Totales</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_assists, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-muted-foreground mb-1">Goles por Jugador</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_goals, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <p className="text-sm text-muted-foreground mb-1">Asistencias por Jugador</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_assists, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Máximos Goleadores */}
              {(() => {
                const topScorers = [...playersWithStats]
                  .filter(p => p.total_goals > 0)
                  .sort((a, b) => b.total_goals - a.total_goals)
                  .slice(0, 3)

                return topScorers.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                      Máximos Goleadores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topScorers.map((player, index) => (
                        <div key={player.id} className="p-4 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-green-100 text-green-800">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{player.name}</p>
                              <p className="text-xs text-muted-foreground">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{player.total_goals}</p>
                              <p className="text-xs text-muted-foreground">goles</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Máximos Asistidores */}
              {(() => {
                const topAssisters = [...playersWithStats]
                  .filter(p => p.total_assists > 0)
                  .sort((a, b) => b.total_assists - a.total_assists)
                  .slice(0, 3)

                return topAssisters.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-blue-600" />
                      Máximos Asistidores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topAssisters.map((player, index) => (
                        <div key={player.id} className="p-4 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-900' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-blue-100 text-blue-800">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{player.name}</p>
                              <p className="text-xs text-muted-foreground">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{player.total_assists}</p>
                              <p className="text-xs text-muted-foreground">asist.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Disciplina del Equipo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                  Disciplina
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-yellow-400 rounded"></div>
                      <p className="text-sm text-muted-foreground">Tarjetas Amarillas</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-red-600 rounded"></div>
                      <p className="text-sm text-muted-foreground">Tarjetas Rojas</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Tarjetas por Jugador</p>
                    <p className="text-3xl font-bold text-gray-700">
                      {((playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards + p.total_red_cards, 0)) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Jugadores sin Tarjetas</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.filter(p => p.total_yellow_cards === 0 && p.total_red_cards === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600" />
                  Participación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Partidos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {playersWithStats.reduce((sum, p) => sum + p.total_games, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Minutos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0).toLocaleString()}'
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Promedio Minutos por Jugador</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Math.round(playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0) / playersWithStats.length)}'
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Jugadores Activos</p>
                    <p className="text-3xl font-bold text-green-600">
                      {playersWithStats.filter(p => p.total_games > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Statistics Section */}
      <PlayerStatistics teamId={teamId} />
    </div>
  )
}
