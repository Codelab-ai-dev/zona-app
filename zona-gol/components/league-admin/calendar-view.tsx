"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Trophy, Loader2, Edit, Save, X, RefreshCw } from "lucide-react"
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

interface CalendarViewProps {
  leagueId: string
}

interface CalendarMatch {
  id: string
  round: number
  homeTeam: Team
  awayTeam: Team
  date: string
  time: string
  field: number
  status: string
}

interface EditingMatch extends CalendarMatch {
  isEditing: boolean
}

export function CalendarView({ leagueId }: CalendarViewProps) {
  const { tournaments, getTournamentsByLeague } = useTournaments()
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [matches, setMatches] = useState<CalendarMatch[]>([])
  const [editingMatches, setEditingMatches] = useState<EditingMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')

  useEffect(() => {
    if (leagueId) {
      getTournamentsByLeague(leagueId)
    }
  }, [leagueId])

  useEffect(() => {
    // Auto-select the first active tournament
    if (tournaments.length > 0 && !selectedTournamentId) {
      const activeTournament = tournaments.find(t => t.is_active) || tournaments[0]
      setSelectedTournamentId(activeTournament.id)
      loadMatches(activeTournament.id)
    }
  }, [tournaments, selectedTournamentId])

  const loadMatches = async (tournamentId: string) => {
    if (!tournamentId) return

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()
      
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          id,
          home_team_id,
          away_team_id,
          match_date,
          match_time,
          field_number,
          round,
          status,
          home_team:teams!matches_home_team_id_fkey(id, name, slug),
          away_team:teams!matches_away_team_id_fkey(id, name, slug)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      const formattedMatches: CalendarMatch[] = matchesData?.map((match: any) => ({
        id: match.id,
        round: match.round || 1,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        date: match.match_date.split('T')[0],
        time: match.match_time || match.match_date.split('T')[1]?.substring(0, 5) || '10:00',
        field: match.field_number || 1,
        status: match.status
      })) || []

      setMatches(formattedMatches)
      setEditingMatches(formattedMatches.map(m => ({ ...m, isEditing: false })))
      
    } catch (error: any) {
      console.error('Error loading matches:', error)
      setMessage({ type: 'error', text: `Error cargando partidos: ${error.message || 'Error desconocido'}` })
    } finally {
      setLoading(false)
    }
  }

  const updateMatch = async (matchId: string, updates: Partial<CalendarMatch>) => {
    try {
      const supabase = createClientSupabaseClient()
      
      // Enfoque simple: usar un objeto plano para la actualización
      const updateData: Record<string, any> = {};
      
      if (updates.date || updates.time) {
        updateData.match_date = `${updates.date || '2024-01-01'}T${updates.time || '10:00'}:00`;
      }
      if (updates.time) updateData.match_time = updates.time;
      if (updates.field) updateData.field_number = updates.field;

      // Usar el método .update() con type assertion
      const { error } = await supabase
        .from('matches')
        // @ts-ignore - Ignorar el error de tipado
        .update(updateData)
        .eq('id', matchId)

      if (error) {
        throw new Error(error.message)
      }

      setMessage({ type: 'success', text: 'Partido actualizado exitosamente' })
      
      // Reload matches
      if (selectedTournamentId) {
        await loadMatches(selectedTournamentId)
      }
      
    } catch (error: any) {
      console.error('Error updating match:', error)
      setMessage({ type: 'error', text: `Error actualizando partido: ${error.message || 'Error desconocido'}` })
    }
  }

  const toggleEditMatch = (index: number) => {
    setEditingMatches(prev => 
      prev.map((match, i) => 
        i === index ? { ...match, isEditing: !match.isEditing } : match
      )
    )
  }

  const saveMatchEdit = async (index: number) => {
    const match = editingMatches[index]
    if (!match.id) return

    await updateMatch(match.id, {
      date: match.date,
      time: match.time,
      field: match.field
    })

    toggleEditMatch(index)
  }

  const updateEditingMatch = (index: number, field: keyof CalendarMatch, value: any) => {
    setEditingMatches(prev =>
      prev.map((match, i) =>
        i === index ? { ...match, [field]: value } : match
      )
    )
  }

  const groupMatchesByRound = (matches: CalendarMatch[]) => {
    const rounds: Record<number, CalendarMatch[]> = {}
    matches.forEach(match => {
      if (!rounds[match.round]) rounds[match.round] = []
      rounds[match.round].push(match)
    })
    return rounds
  }

  const getAvailableRounds = (matches: CalendarMatch[]) => {
    const rounds = Array.from(new Set(matches.map(match => match.round))).sort((a, b) => a - b)
    return rounds
  }

  const getFilteredMatches = (matches: CalendarMatch[]) => {
    if (selectedRound === 'all') return matches
    return matches.filter(match => match.round === selectedRound)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Programado</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-green-600">En Juego</Badge>
      case 'finished':
        return <Badge variant="secondary">Finalizado</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const activeTournaments = tournaments.filter(t => t.is_active)
  const allTournaments = tournaments

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendario de Partidos</h2>
          <p className="text-gray-600">Visualiza y edita los partidos programados</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => selectedTournamentId && loadMatches(selectedTournamentId)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seleccionar Torneo</CardTitle>
              <CardDescription>Elige el torneo para ver sus partidos</CardDescription>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Cargando...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select 
              value={selectedTournamentId} 
              onValueChange={(value) => {
                setSelectedTournamentId(value)
                setSelectedRound('all')
                loadMatches(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent>
                {activeTournaments.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activos
                    </div>
                    {activeTournaments.map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-green-600" />
                          {tournament.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allTournaments.filter(t => !t.is_active).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider border-t">
                      Inactivos
                    </div>
                    {allTournaments.filter(t => !t.is_active).map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-gray-400" />
                          {tournament.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Jornada</CardTitle>
            <CardDescription>Selecciona una jornada específica para facilitar la visualización</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select 
                value={selectedRound === 'all' ? 'all' : selectedRound.toString()}
                onValueChange={(value) => setSelectedRound(value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Todas las jornadas
                    </div>
                  </SelectItem>
                  {getAvailableRounds(matches).map(round => (
                    <SelectItem key={round} value={round.toString()}>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        Jornada {round}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {getFilteredMatches(matches).length === 0 && matches.length > 0 && selectedRound !== 'all' && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay partidos en esta jornada</h3>
            <p className="text-gray-500 mb-4">La jornada {selectedRound} no tiene partidos programados</p>
            <Button variant="outline" onClick={() => setSelectedRound('all')}>
              Ver todas las jornadas
            </Button>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && !loading && selectedTournamentId && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay partidos programados</h3>
            <p className="text-gray-500 mb-4">Este torneo aún no tiene partidos generados</p>
            <Button variant="outline" onClick={() => window.location.href = '#tournaments'}>
              Ir a Torneos para generar partidos
            </Button>
          </CardContent>
        </Card>
      )}

      {getFilteredMatches(matches).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupMatchesByRound(getFilteredMatches(matches))).map(([round, roundMatches]) => (
            <Card key={round}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Jornada {round}
                  <Badge variant="outline" className="ml-2">
                    {roundMatches.length} partidos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {roundMatches.map((match, matchIndex) => {
                    const globalIndex = editingMatches.findIndex(m => m.id === match.id)
                    const editingMatch = editingMatches[globalIndex]
                    const isEditing = editingMatch?.isEditing || false
                    
                    return (
                      <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Status Badge */}
                          <div className="flex-shrink-0">
                            {getStatusBadge(match.status)}
                          </div>
                          
                          {/* Field */}
                          <div className="text-center min-w-0 flex-shrink-0">
                            {isEditing ? (
                              <Select 
                                value={editingMatch.field.toString()}
                                onValueChange={(value) => updateEditingMatch(globalIndex, 'field', parseInt(value))}
                              >
                                <SelectTrigger className="w-20 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1,2,3,4,5,6].map(num => (
                                    <SelectItem key={num} value={num.toString()}>
                                      {num}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                Cancha {match.field}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-medium truncate">{match.homeTeam.name}</span>
                            <span className="text-gray-500 flex-shrink-0">vs</span>
                            <span className="font-medium truncate">{match.awayTeam.name}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editingMatch.date}
                                onChange={(e) => updateEditingMatch(globalIndex, 'date', e.target.value)}
                                className="w-32 h-8"
                              />
                            ) : (
                              <span className="text-gray-600">{new Date(match.date).toLocaleDateString('es-ES')}</span>
                            )}
                          </div>
                          
                          {/* Time */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-600" />
                            {isEditing ? (
                              <Input
                                type="time"
                                value={editingMatch.time}
                                onChange={(e) => updateEditingMatch(globalIndex, 'time', e.target.value)}
                                className="w-24 h-8"
                              />
                            ) : (
                              <span className="text-gray-600">{match.time}</span>
                            )}
                          </div>
                          
                          {/* Edit Controls */}
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => saveMatchEdit(globalIndex)}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                  onClick={() => toggleEditMatch(globalIndex)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => toggleEditMatch(globalIndex)}
                                disabled={match.status !== 'scheduled'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!selectedTournamentId && tournaments.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay torneos disponibles</h3>
            <p className="text-gray-500 mb-4">Crea un torneo primero para generar partidos</p>
            <Button variant="outline" onClick={() => window.location.href = '#tournaments'}>
              Crear Torneo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}