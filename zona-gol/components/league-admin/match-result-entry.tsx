"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Trophy,
  Plus,
  Trash2,
  Save,
  Search,
  CalendarDays,
  Users,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react"
import { generateMatchResultEmbedding } from "@/lib/utils/generate-embeddings"

interface Match {
  id: string
  match_date: string
  match_time: string | null
  status: string
  home_score: number | null
  away_score: number | null
  round: number | null
  tournament_id?: string
  home_teams: {
    id: string
    name: string
  }
  away_teams: {
    id: string
    name: string
  }
  tournaments: {
    name: string
    league_id?: string
  }
}

interface Player {
  id: string
  name: string
  jersey_number: number
  team_id: string
}

interface Goal {
  player_id: string
  player_name: string
  minute: number | null
  assist_player_id: string | null
  assist_player_name: string | null
}

interface Card {
  player_id: string
  player_name: string
  type: 'yellow' | 'red'
  minute: number | null
}

interface MatchResultEntryProps {
  leagueId: string
}

export function MatchResultEntry({ leagueId }: MatchResultEntryProps) {
  const supabase = createClientSupabaseClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [homeScore, setHomeScore] = useState<number>(0)
  const [awayScore, setAwayScore] = useState<number>(0)

  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])

  const [homeGoals, setHomeGoals] = useState<Goal[]>([])
  const [awayGoals, setAwayGoals] = useState<Goal[]>([])

  const [homeCards, setHomeCards] = useState<Card[]>([])
  const [awayCards, setAwayCards] = useState<Card[]>([])

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    loadMatches()
  }, [leagueId])

  const loadMatches = async () => {
    try {
      setLoading(true)

      // Cargar partidos programados o en progreso
      const { data, error} = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_time,
          status,
          home_score,
          away_score,
          round,
          tournament_id,
          home_teams:teams!matches_home_team_id_fkey(id, name),
          away_teams:teams!matches_away_team_id_fkey(id, name),
          tournaments!inner(
            name,
            league_id
          )
        `)
        .eq('tournaments.league_id', leagueId)
        .in('status', ['scheduled', 'in_progress'])
        .order('match_date')
        .order('match_time')
        .limit(50)

      if (error) throw error

      setMatches((data as any) || [])
    } catch (error) {
      console.error('Error loading matches:', error)
      toast.error('Error al cargar partidos')
    } finally {
      setLoading(false)
    }
  }

  const loadMatchPlayers = async (match: Match) => {
    try {
      // Cargar jugadores del equipo local
      const { data: homePlayers, error: homeError } = await supabase
        .from('players')
        .select('id, name, jersey_number, team_id')
        .eq('team_id', match.home_teams.id)
        .eq('is_active', true)
        .order('jersey_number')

      if (homeError) throw homeError

      // Cargar jugadores del equipo visitante
      const { data: awayPlayers, error: awayError } = await supabase
        .from('players')
        .select('id, name, jersey_number, team_id')
        .eq('team_id', match.away_teams.id)
        .eq('is_active', true)
        .order('jersey_number')

      if (awayError) throw awayError

      setHomePlayers(homePlayers || [])
      setAwayPlayers(awayPlayers || [])
    } catch (error) {
      console.error('Error loading players:', error)
      toast.error('Error al cargar jugadores')
    }
  }

  const handleSelectMatch = async (match: Match) => {
    setSelectedMatch(match)
    setHomeScore(match.home_score || 0)
    setAwayScore(match.away_score || 0)
    setHomeGoals([])
    setAwayGoals([])
    setHomeCards([])
    setAwayCards([])

    await loadMatchPlayers(match)
  }

  const addGoal = (isHome: boolean) => {
    const newGoal: Goal = {
      player_id: '',
      player_name: '',
      minute: null,
      assist_player_id: null,
      assist_player_name: null
    }

    if (isHome) {
      setHomeGoals([...homeGoals, newGoal])
    } else {
      setAwayGoals([...awayGoals, newGoal])
    }
  }

  const updateGoal = (isHome: boolean, index: number, field: keyof Goal, value: any) => {
    const goals = isHome ? [...homeGoals] : [...awayGoals]
    const players = isHome ? homePlayers : awayPlayers

    if (field === 'player_id') {
      const player = players.find(p => p.id === value)
      if (player) {
        goals[index].player_id = value
        goals[index].player_name = `${player.name} (#${player.jersey_number})`
      }
    } else if (field === 'assist_player_id') {
      // Manejar "Sin asistencia" cuando value es 'none'
      if (!value || value === 'none') {
        goals[index].assist_player_id = null
        goals[index].assist_player_name = null
      } else {
        const player = players.find(p => p.id === value)
        if (player) {
          goals[index].assist_player_id = value
          goals[index].assist_player_name = `${player.name} (#${player.jersey_number})`
        }
      }
    } else {
      goals[index] = { ...goals[index], [field]: value }
    }

    if (isHome) {
      setHomeGoals(goals)
    } else {
      setAwayGoals(goals)
    }
  }

  const removeGoal = (isHome: boolean, index: number) => {
    if (isHome) {
      setHomeGoals(homeGoals.filter((_, i) => i !== index))
    } else {
      setAwayGoals(awayGoals.filter((_, i) => i !== index))
    }
  }

  const addCard = (isHome: boolean, type: 'yellow' | 'red') => {
    const newCard: Card = {
      player_id: '',
      player_name: '',
      type,
      minute: null
    }

    if (isHome) {
      setHomeCards([...homeCards, newCard])
    } else {
      setAwayCards([...awayCards, newCard])
    }
  }

  const updateCard = (isHome: boolean, index: number, field: keyof Card, value: any) => {
    const cards = isHome ? [...homeCards] : [...awayCards]
    const players = isHome ? homePlayers : awayPlayers

    if (field === 'player_id') {
      const player = players.find(p => p.id === value)
      if (player) {
        cards[index].player_id = value
        cards[index].player_name = `${player.name} (#${player.jersey_number})`
      }
    } else {
      cards[index] = { ...cards[index], [field]: value }
    }

    if (isHome) {
      setHomeCards(cards)
    } else {
      setAwayCards(cards)
    }
  }

  const removeCard = (isHome: boolean, index: number) => {
    if (isHome) {
      setHomeCards(homeCards.filter((_, i) => i !== index))
    } else {
      setAwayCards(awayCards.filter((_, i) => i !== index))
    }
  }

  const handleSaveResult = async () => {
    if (!selectedMatch) return

    // Validación: los goles registrados no pueden exceder el marcador
    if (homeGoals.length > homeScore) {
      toast.error(`Los goles registrados del local (${homeGoals.length}) exceden el marcador (${homeScore})`)
      return
    }
    if (awayGoals.length > awayScore) {
      toast.error(`Los goles registrados del visitante (${awayGoals.length}) exceden el marcador (${awayScore})`)
      return
    }

    // Validar que los goles registrados tengan jugador asignado (solo si hay goles registrados)
    const allGoals = [...homeGoals, ...awayGoals]
    if (allGoals.length > 0 && allGoals.some(g => !g.player_id)) {
      toast.error('Los goles registrados deben tener un jugador asignado')
      return
    }

    // Validar que todas las tarjetas tengan jugador asignado
    const allCards = [...homeCards, ...awayCards]
    if (allCards.some(c => !c.player_id)) {
      toast.error('Todas las tarjetas deben tener un jugador asignado')
      return
    }

    setSaving(true)
    try {
      // 1. Actualizar resultado del partido
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: 'finished'
        })
        .eq('id', selectedMatch.id)

      if (matchError) throw matchError

      // 2. Guardar goles
      for (const goal of allGoals) {
        const { error: goalError } = await supabase
          .from('goals')
          .insert({
            match_id: selectedMatch.id,
            player_id: goal.player_id,
            minute: goal.minute,
            assist_player_id: goal.assist_player_id
          })

        if (goalError) throw goalError
      }

      // 3. Guardar tarjetas
      for (const card of allCards) {
        const { error: cardError } = await supabase
          .from('cards')
          .insert({
            match_id: selectedMatch.id,
            player_id: card.player_id,
            card_type: card.type,
            minute: card.minute
          })

        if (cardError) throw cardError
      }

      // 4. Actualizar estadísticas de equipos (opcional, depende de tu lógica)
      // Esto se puede hacer con triggers en la BD o aquí manualmente

      // 5. Generate embedding for match result (async, don't wait)
      if (selectedMatch.tournament_id && selectedMatch.tournaments.league_id) {
        generateMatchResultEmbedding({
          match_id: selectedMatch.id,
          tournament_id: selectedMatch.tournament_id,
          league_id: selectedMatch.tournaments.league_id
        }).catch(err => console.warn('Error generando embedding de resultado:', err))
      }

      toast.success('Resultado guardado exitosamente')
      setShowSuccessDialog(true)

      // Limpiar formulario
      setSelectedMatch(null)
      setHomeGoals([])
      setAwayGoals([])
      setHomeCards([])
      setAwayCards([])

      // Recargar partidos
      loadMatches()
    } catch (error: any) {
      console.error('Error saving result:', error)
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: string, time: string | null) => {
    const dateObj = new Date(date)
    const dateStr = dateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    const timeStr = time || 'Sin hora'
    return `${dateStr} - ${timeStr}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Cargando partidos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Selección de partido */}
        {!selectedMatch && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                <CalendarDays className="w-5 h-5" />
                Captura Manual de Resultados
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Selecciona un partido para registrar su resultado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <Alert className="backdrop-blur-xl bg-white/10 border-white/20">
                  <AlertCircle className="h-4 w-4 text-white" />
                  <AlertTitle className="text-white drop-shadow">No hay partidos disponibles</AlertTitle>
                  <AlertDescription className="text-white/80 drop-shadow">
                    No hay partidos programados o en progreso para registrar resultados.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="p-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-all cursor-pointer"
                      onClick={() => handleSelectMatch(match)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="backdrop-blur-md bg-white/20 border-white/30 text-white">
                              {match.tournaments.name}
                            </Badge>
                            {match.round && (
                              <Badge variant="outline" className="backdrop-blur-md bg-white/20 border-white/30 text-white">
                                Jornada {match.round}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`backdrop-blur-md border-white/30 text-white ${
                                match.status === 'in_progress'
                                  ? 'bg-green-500/30'
                                  : 'bg-blue-500/30'
                              }`}
                            >
                              {match.status === 'in_progress' ? 'En Progreso' : 'Programado'}
                            </Badge>
                          </div>
                          <div className="text-white drop-shadow font-semibold">
                            {match.home_teams.name} vs {match.away_teams.name}
                          </div>
                          <div className="text-sm text-white/70 drop-shadow mt-1">
                            {formatDate(match.match_date, match.match_time)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Registrar Resultado
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulario de captura */}
        {selectedMatch && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                    <Trophy className="w-5 h-5" />
                    {selectedMatch.home_teams.name} vs {selectedMatch.away_teams.name}
                  </CardTitle>
                  <CardDescription className="text-white/80 drop-shadow">
                    {formatDate(selectedMatch.match_date, selectedMatch.match_time)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedMatch(null)}
                  className="text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Marcador */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white drop-shadow">{selectedMatch.home_teams.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                    className="text-3xl text-center backdrop-blur-md bg-white/10 border-white/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white drop-shadow">{selectedMatch.away_teams.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                    className="text-3xl text-center backdrop-blur-md bg-white/10 border-white/30 text-white"
                  />
                </div>
              </div>

              {/* Goles Local */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white drop-shadow text-lg">
                    Goles {selectedMatch.home_teams.name} ({homeGoals.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addGoal(true)}
                    disabled={homePlayers.length === 0}
                    className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Gol
                  </Button>
                </div>
                {homePlayers.length === 0 && (
                  <Alert className="backdrop-blur-xl bg-amber-500/10 border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-200">
                      No hay jugadores activos registrados para {selectedMatch.home_teams.name}
                    </AlertDescription>
                  </Alert>
                )}
                {homeGoals.map((goal, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                    <div className="col-span-5">
                      <Select
                        value={goal.player_id}
                        onValueChange={(value) => updateGoal(true, index, 'player_id', value)}
                      >
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Goleador" />
                        </SelectTrigger>
                        <SelectContent>
                          {homePlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              #{player.jersey_number} {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={goal.assist_player_id || 'none'}
                        onValueChange={(value) => updateGoal(true, index, 'assist_player_id', value)}
                      >
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Asistencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asistencia</SelectItem>
                          {homePlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              #{player.jersey_number} {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Min"
                        value={goal.minute || ''}
                        onChange={(e) => updateGoal(true, index, 'minute', parseInt(e.target.value) || null)}
                        className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(true, index)}
                        className="text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Goles Visitante */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white drop-shadow text-lg">
                    Goles {selectedMatch.away_teams.name} ({awayGoals.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addGoal(false)}
                    disabled={awayPlayers.length === 0}
                    className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Gol
                  </Button>
                </div>
                {awayPlayers.length === 0 && (
                  <Alert className="backdrop-blur-xl bg-amber-500/10 border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-200">
                      No hay jugadores activos registrados para {selectedMatch.away_teams.name}
                    </AlertDescription>
                  </Alert>
                )}
                {awayGoals.map((goal, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                    <div className="col-span-5">
                      <Select
                        value={goal.player_id}
                        onValueChange={(value) => updateGoal(false, index, 'player_id', value)}
                      >
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Goleador" />
                        </SelectTrigger>
                        <SelectContent>
                          {awayPlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              #{player.jersey_number} {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={goal.assist_player_id || 'none'}
                        onValueChange={(value) => updateGoal(false, index, 'assist_player_id', value)}
                      >
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                          <SelectValue placeholder="Asistencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asistencia</SelectItem>
                          {awayPlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              #{player.jersey_number} {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Min"
                        value={goal.minute || ''}
                        onChange={(e) => updateGoal(false, index, 'minute', parseInt(e.target.value) || null)}
                        className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(false, index)}
                        className="text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tarjetas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tarjetas Local */}
                <div className="space-y-3">
                  <Label className="text-white drop-shadow">Tarjetas {selectedMatch.home_teams.name}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCard(true, 'yellow')}
                      className="backdrop-blur-md bg-yellow-500/30 border-yellow-300/30 text-white hover:bg-yellow-500/40"
                    >
                      Amarilla
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCard(true, 'red')}
                      className="backdrop-blur-md bg-red-500/30 border-red-300/30 text-white hover:bg-red-500/40"
                    >
                      Roja
                    </Button>
                  </div>
                  {homeCards.map((card, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                      <div className="col-span-7">
                        <Select
                          value={card.player_id}
                          onValueChange={(value) => updateCard(true, index, 'player_id', value)}
                        >
                          <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white h-8 text-sm">
                            <SelectValue placeholder="Jugador" />
                          </SelectTrigger>
                          <SelectContent>
                            {homePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                #{player.jersey_number} {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          placeholder="Min"
                          value={card.minute || ''}
                          onChange={(e) => updateCard(true, index, 'minute', parseInt(e.target.value) || null)}
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <Badge className={card.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}>
                          {card.type === 'yellow' ? 'A' : 'R'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCard(true, index)}
                          className="text-red-300 hover:bg-red-500/20 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tarjetas Visitante */}
                <div className="space-y-3">
                  <Label className="text-white drop-shadow">Tarjetas {selectedMatch.away_teams.name}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCard(false, 'yellow')}
                      className="backdrop-blur-md bg-yellow-500/30 border-yellow-300/30 text-white hover:bg-yellow-500/40"
                    >
                      Amarilla
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCard(false, 'red')}
                      className="backdrop-blur-md bg-red-500/30 border-red-300/30 text-white hover:bg-red-500/40"
                    >
                      Roja
                    </Button>
                  </div>
                  {awayCards.map((card, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                      <div className="col-span-7">
                        <Select
                          value={card.player_id}
                          onValueChange={(value) => updateCard(false, index, 'player_id', value)}
                        >
                          <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white h-8 text-sm">
                            <SelectValue placeholder="Jugador" />
                          </SelectTrigger>
                          <SelectContent>
                            {awayPlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                #{player.jersey_number} {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          placeholder="Min"
                          value={card.minute || ''}
                          onChange={(e) => updateCard(false, index, 'minute', parseInt(e.target.value) || null)}
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <Badge className={card.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}>
                          {card.type === 'yellow' ? 'A' : 'R'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCard(false, index)}
                          className="text-red-300 hover:bg-red-500/20 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <Alert className="flex-1 mr-4 backdrop-blur-xl bg-blue-500/20 border-blue-300/30">
                  <AlertCircle className="h-4 w-4 text-white" />
                  <AlertDescription className="text-white/90 drop-shadow text-sm">
                    Puedes guardar el resultado sin asignar goleadores si no tienes el dato.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleSaveResult}
                  disabled={saving}
                  size="lg"
                  className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Finalizar Partido
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de éxito */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="backdrop-blur-xl bg-white/95">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">¡Resultado Guardado!</DialogTitle>
            <DialogDescription className="text-center">
              El resultado del partido se ha registrado exitosamente.
              Las estadísticas se actualizarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
