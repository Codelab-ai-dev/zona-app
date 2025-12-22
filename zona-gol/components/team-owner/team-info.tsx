"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlayerStatistics } from "./player-statistics"
import { Edit, Shield, Calendar, Globe, Loader2, Trophy, Target, AlertTriangle, Clock } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useTeamInfo, useUpdateTeam } from "@/lib/queries"

interface TeamInfoProps {
  teamId: string
}

export function TeamInfo({ teamId }: TeamInfoProps) {
  const { user } = useAuth()

  // React Query hooks
  const { data, isLoading, error } = useTeamInfo(teamId)
  const updateMutation = useUpdateTeam()

  const team = data?.team
  const playersWithStats = data?.playersWithStats || []

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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
      await updateMutation.mutateAsync({
        teamId: team.id,
        updates: {
          name: formData.name,
          description: formData.description,
          slug: formData.slug,
        }
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating team:', error)
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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-white/60 mx-auto mb-4 animate-spin" />
        <h3 className="text-base sm:text-lg font-medium text-white mb-2 drop-shadow-lg">Cargando equipo...</h3>
        <p className="text-white/80 drop-shadow">Obteniendo información del equipo</p>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-white/60 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-white mb-2 drop-shadow-lg">
          {error?.message || 'Equipo no encontrado'}
        </h3>
        <p className="text-white/80 drop-shadow mb-4">
          No se pudo cargar la información del equipo
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-2 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Información del Equipo</h2>
        <p className="text-white/80 drop-shadow">
          {canEditTeam ? "Gestiona los detalles del equipo" : "Visualiza los detalles de tu equipo"}
        </p>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                {team.logo && (
                  <AvatarImage src={team.logo} alt={team.name} className="object-cover" />
                )}
                <AvatarFallback className="bg-green-500/30 text-green-300 font-bold text-base sm:text-lg border border-green-300/50">
                  {getTeamInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl sm:text-2xl text-white drop-shadow-lg">{team.name}</CardTitle>
                <CardDescription className="text-sm sm:text-base text-white/70 drop-shadow">/{team.slug}</CardDescription>
              </div>
            </div>
            {canEditTeam && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData({
                        name: team.name,
                        description: team.description || "",
                        slug: team.slug,
                      })
                    }
                    className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Editar Información del Equipo</DialogTitle>
                    <DialogDescription className="text-slate-400">Actualiza los detalles del equipo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="team-name" className="text-white">Nombre del Equipo</Label>
                      <Input
                        id="team-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Águilas FC"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-slug" className="text-white">URL Personalizada</Label>
                      <Input
                        id="team-slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="aguilas-fc"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-description" className="text-white">Descripción</Label>
                      <Textarea
                        id="team-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descripción del equipo..."
                        rows={3}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <Button
                      onClick={handleUpdateTeam}
                      disabled={updateMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        'Actualizar Equipo'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-white/80 drop-shadow">{team.description || "Sin descripción disponible"}</p>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Fundado: {new Date(team.created_at).toLocaleDateString("es-ES")}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">URL: /{team.slug}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>Estado: {team.is_active ? "Activo" : "Inactivo"}</span>
              </div>
              {(team as any).league?.name && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Liga: {(team as any).league.name}</span>
                </div>
              )}
              {(team as any).owner?.name && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Propietario: {(team as any).owner.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Detailed Statistics Section */}
      {playersWithStats.length > 0 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 mr-2" />
              Estadísticas del Equipo
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">
              Análisis detallado del rendimiento colectivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Rendimiento Ofensivo */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Target className="w-5 h-5 mr-2 text-green-400" />
                  Rendimiento Ofensivo
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-green-500/20 rounded-xl border border-green-300/30 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-1">Goles Totales</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_goals, 0)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-purple-500/20 rounded-xl border border-purple-300/30 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-1">Goles por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-400 drop-shadow-lg">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_goals, 0) / playersWithStats.length).toFixed(1)}
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
                    <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                      Máximos Goleadores
                    </h3>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                      {topScorers.map((player, index) => (
                        <div key={player.id} className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 hover:bg-white/15 transition-all shadow-lg">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg ${
                              index === 0 ? 'bg-yellow-400/80 text-yellow-900' :
                              index === 1 ? 'bg-gray-400/80 text-gray-900' :
                              'bg-orange-400/80 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="bg-green-500/30 text-green-300 border border-green-300/50 text-xs sm:text-sm">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs sm:text-sm truncate text-white drop-shadow">{player.name}</p>
                              <p className="text-xs text-white/70 drop-shadow">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl sm:text-2xl font-bold text-green-400 drop-shadow-lg">{player.total_goals}</p>
                              <p className="text-xs text-white/70 drop-shadow">goles</p>
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
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                  Disciplina
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-yellow-500/20 rounded-xl border border-yellow-300/30 shadow-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-5 sm:w-4 sm:h-6 bg-yellow-400 rounded"></div>
                      <p className="text-xs sm:text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-red-500/20 rounded-xl border border-red-300/30 shadow-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-5 sm:w-4 sm:h-6 bg-red-600 rounded"></div>
                      <p className="text-xs sm:text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-400 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Tarjetas por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {((playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards + p.total_red_cards, 0)) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Jugadores sin Tarjetas</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
                      {playersWithStats.filter(p => p.total_yellow_cards === 0 && p.total_red_cards === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Clock className="w-5 h-5 mr-2 text-gray-400" />
                  Participación
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Partidos Jugados (Total)</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_games, 0)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Minutos Jugados (Total)</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0).toLocaleString()}'
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Promedio Minutos por Jugador</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {Math.round(playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0) / playersWithStats.length)}'
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-lg">
                    <p className="text-xs sm:text-sm text-white/80 drop-shadow mb-2">Jugadores Activos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 drop-shadow-lg">
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
