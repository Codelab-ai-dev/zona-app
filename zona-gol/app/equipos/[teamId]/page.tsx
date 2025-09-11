"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { ArrowLeft, Users, Trophy, AlertTriangle, Target, Clock } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { Loader2 } from "lucide-react"

type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientSupabaseClient()
  
  const [team, setTeam] = useState<Team | null>(null)
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const teamId = params?.teamId as string

  useEffect(() => {
    const loadTeamAndStats = async () => {
      if (!teamId) return
      
      try {
        setLoading(true)
        setError(null)
        
        console.log('🔵 Loading team data for ID:', teamId)
        
        // Load team data
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
        
        if (teamError) {
          console.error('❌ Error loading team:', teamError)
          setError('Equipo no encontrado')
          return
        }
        
        if (!teamData) {
          setError('Equipo no encontrado')
          return
        }
        
        console.log('✅ Team data loaded:', teamData.name)
        setTeam(teamData)
        
        // Load players for this team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true)
        
        if (playersError) {
          console.error('❌ Error loading players:', playersError)
          setError('Error cargando jugadores')
          return
        }
        
        console.log('✅ Players loaded:', players?.length || 0)
        
        // For each player, get their aggregated stats
        const playersWithStatsData: PlayerWithStats[] = []
        
        for (const player of players || []) {
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
        
        console.log('✅ Player stats calculated:', playersWithStatsData.length)
        setPlayersWithStats(playersWithStatsData)
        
      } catch (err: any) {
        console.error('❌ Error in loadTeamAndStats:', err)
        setError(err.message || 'Error cargando datos del equipo')
      } finally {
        setLoading(false)
      }
    }

    loadTeamAndStats()
  }, [teamId, supabase])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleBackClick = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Cargando información del equipo... (ID: {teamId})</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Team ID: {teamId}</p>
          <Button onClick={handleBackClick} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Encontrado</h2>
          <p className="text-gray-600 mb-4">
            No se pudo cargar la información del equipo.
          </p>
          <Button onClick={handleBackClick} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button onClick={handleBackClick} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            {team.logo ? (
              <AvatarImage src={team.logo} alt={`${team.name} logo`} />
            ) : (
              <AvatarFallback className="bg-green-100 text-green-800 font-bold text-lg">
                {team.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-gray-600">/{team.slug}</p>
            <Badge variant={team.is_active ? "default" : "secondary"} className="mt-1">
              {team.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Team Description */}
      {team.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700">{team.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{playersWithStats.length}</p>
            <p className="text-sm text-gray-600">Jugadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_goals, 0)}
            </p>
            <p className="text-sm text-gray-600">Goles Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_yellow_cards, 0)}
            </p>
            <p className="text-sm text-gray-600">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_red_cards, 0)}
            </p>
            <p className="text-sm text-gray-600">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Estadísticas de Jugadores
          </CardTitle>
          <CardDescription>
            Rendimiento individual de cada jugador del equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playersWithStats.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay jugadores registrados
              </h3>
              <p className="text-gray-600">
                Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo
              </p>
              {team && (
                <p className="text-sm text-gray-500 mt-2">
                  Equipo: {team.name}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">PJ</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asistencias</TableHead>
                    <TableHead className="text-center">TA</TableHead>
                    <TableHead className="text-center">TR</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playersWithStats.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center">
                              {player.name}
                              <span className="ml-2 text-sm font-bold text-green-600">
                                #{player.jersey_number}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">{player.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {player.total_games}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {player.total_goals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {player.total_assists}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_yellow_cards > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {player.total_yellow_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_red_cards > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {player.total_red_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {player.total_minutes_played}'
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