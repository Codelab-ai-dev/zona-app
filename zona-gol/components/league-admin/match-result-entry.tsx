"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Shield
} from "lucide-react"
import Image from "next/image"
import { generateMatchResultEmbedding, sendMatchResultNotification } from "@/lib/utils/generate-embeddings"
import { usePendingMatchesByLeague, useInvalidateMatches } from "@/lib/queries"

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
    logo?: string | null
  }
  away_teams: {
    id: string
    name: string
    logo?: string | null
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

  // React Query para partidos pendientes
  const {
    data: matchesData = [],
    isLoading: loading,
    refetch: refetchMatches
  } = usePendingMatchesByLeague(leagueId)

  // Hook para invalidar cache
  const { invalidateByTournament } = useInvalidateMatches()

  // Transform to Match type
  const matches: Match[] = useMemo(() => {
    return matchesData as Match[]
  }, [matchesData])

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
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

        // 6. Send WhatsApp notification for match result (async, don't wait)
        // Get league name first
        supabase.from('leagues').select('name').eq('id', selectedMatch.tournaments.league_id).single()
          .then(({ data: league }) => {
            const leagueName = league?.name || 'Liga'

            // Get scorers for notification
            const scorers = homeGoals.concat(awayGoals)
              .filter(g => g.player_name)
              .reduce((acc, goal) => {
                const existing = acc.find(s => s.player_name === goal.player_name.split(' (#')[0])
                if (existing) {
                  existing.goals++
                } else {
                  acc.push({ player_name: goal.player_name.split(' (#')[0], goals: 1 })
                }
                return acc
              }, [] as Array<{ player_name: string; goals: number }>)

            sendMatchResultNotification({
              league_id: selectedMatch.tournaments.league_id!,
              tournament_id: selectedMatch.tournament_id!,
              home_team: selectedMatch.home_teams.name,
              away_team: selectedMatch.away_teams.name,
              home_score: homeScore,
              away_score: awayScore,
              round: selectedMatch.round || undefined,
              league_name: leagueName,
              tournament_name: selectedMatch.tournaments.name,
              scorers: scorers.length > 0 ? scorers : undefined,
            }).catch(err => console.warn('Error enviando notificación de resultado:', err))
          })
          .catch(err => console.warn('Error obteniendo nombre de liga:', err))
      }

      toast.success('Resultado guardado exitosamente')
      setShowSuccessDialog(true)

      // Limpiar formulario
      setSelectedMatch(null)
      setHomeGoals([])
      setAwayGoals([])
      setHomeCards([])
      setAwayCards([])

      // Recargar partidos e invalidar cache
      refetchMatches()
      if (selectedMatch?.tournament_id) {
        invalidateByTournament(selectedMatch.tournament_id)
      }
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
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Cargando partidos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Selección de partido */}
        {!selectedMatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CalendarDays className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">Captura de Resultados</h2>
                <p className="text-xs text-gray-500">Selecciona un partido para registrar su resultado</p>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-6 text-center">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                <h3 className="text-sm font-medium text-white mb-1">No hay partidos disponibles</h3>
                <p className="text-xs text-gray-500">No hay partidos programados o en progreso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4 hover:bg-slate-700/50 transition-all cursor-pointer"
                    onClick={() => handleSelectMatch(match)}
                  >
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-gray-400">
                        {match.tournaments.name}
                      </span>
                      {match.round && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-gray-400">
                          J{match.round}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        match.status === 'in_progress'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {match.status === 'in_progress' ? 'En Juego' : 'Programado'}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {match.home_teams.logo ? (
                          <Image
                            src={match.home_teams.logo}
                            alt={match.home_teams.name}
                            width={24}
                            height={24}
                            className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                        <span className="text-xs md:text-sm font-medium text-white truncate">{match.home_teams.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">vs</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-xs md:text-sm font-medium text-white truncate">{match.away_teams.name}</span>
                        {match.away_teams.logo ? (
                          <Image
                            src={match.away_teams.logo}
                            alt={match.away_teams.name}
                            width={24}
                            height={24}
                            className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date and Action */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs text-gray-500">
                        {formatDate(match.match_date, match.match_time)}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-400 font-medium">
                        Registrar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formulario de captura */}
        {selectedMatch && (
          <div className="space-y-4">
            {/* Header */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {selectedMatch.home_teams.logo ? (
                          <Image
                            src={selectedMatch.home_teams.logo}
                            alt={selectedMatch.home_teams.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                            <Shield className="w-2.5 h-2.5 text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm md:text-base font-bold text-white">{selectedMatch.home_teams.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">vs</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm md:text-base font-bold text-white">{selectedMatch.away_teams.name}</span>
                        {selectedMatch.away_teams.logo ? (
                          <Image
                            src={selectedMatch.away_teams.logo}
                            alt={selectedMatch.away_teams.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                            <Shield className="w-2.5 h-2.5 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-500">
                      {formatDate(selectedMatch.match_date, selectedMatch.match_time)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Marcador */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-3 block">Marcador Final</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 truncate block">{selectedMatch.home_teams.name}</label>
                  <Input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                    className="text-2xl md:text-3xl text-center h-14 bg-slate-700/50 border-white/10 text-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 truncate block">{selectedMatch.away_teams.name}</label>
                  <Input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                    className="text-2xl md:text-3xl text-center h-14 bg-slate-700/50 border-white/10 text-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Goles Local */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide">Goles</label>
                  <p className="text-xs md:text-sm font-medium text-white truncate">{selectedMatch.home_teams.name} ({homeGoals.length})</p>
                </div>
                <Button size="sm" onClick={() => addGoal(true)} disabled={homePlayers.length === 0} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-0 text-xs h-7">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Gol
                </Button>
              </div>
              {homePlayers.length === 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-400 mb-2">No hay jugadores registrados</div>
              )}
              <div className="space-y-2">
                {homeGoals.map((goal, index) => (
                  <div key={index} className="rounded-lg bg-slate-700/30 border border-white/5 p-2">
                    <div className="flex gap-2 mb-2">
                      <Select value={goal.player_id} onValueChange={(value) => updateGoal(true, index, 'player_id', value)}>
                        <SelectTrigger className="flex-1 h-8 bg-slate-800/50 border-white/10 text-white text-xs"><SelectValue placeholder="Goleador" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {homePlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" max="120" placeholder="Min" value={goal.minute || ''} onChange={(e) => updateGoal(true, index, 'minute', parseInt(e.target.value) || null)} className="w-14 h-8 bg-slate-800/50 border-white/10 text-white text-xs text-center" />
                      <Button variant="ghost" size="sm" onClick={() => removeGoal(true, index)} className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <Select value={goal.assist_player_id || 'none'} onValueChange={(value) => updateGoal(true, index, 'assist_player_id', value)}>
                      <SelectTrigger className="h-7 bg-slate-800/50 border-white/10 text-gray-400 text-[10px]"><SelectValue placeholder="Asistencia (opcional)" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="none" className="text-gray-400 text-xs">Sin asistencia</SelectItem>
                        {homePlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Goles Visitante */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide">Goles</label>
                  <p className="text-xs md:text-sm font-medium text-white truncate">{selectedMatch.away_teams.name} ({awayGoals.length})</p>
                </div>
                <Button size="sm" onClick={() => addGoal(false)} disabled={awayPlayers.length === 0} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-0 text-xs h-7">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Gol
                </Button>
              </div>
              {awayPlayers.length === 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-400 mb-2">No hay jugadores registrados</div>
              )}
              <div className="space-y-2">
                {awayGoals.map((goal, index) => (
                  <div key={index} className="rounded-lg bg-slate-700/30 border border-white/5 p-2">
                    <div className="flex gap-2 mb-2">
                      <Select value={goal.player_id} onValueChange={(value) => updateGoal(false, index, 'player_id', value)}>
                        <SelectTrigger className="flex-1 h-8 bg-slate-800/50 border-white/10 text-white text-xs"><SelectValue placeholder="Goleador" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {awayPlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" max="120" placeholder="Min" value={goal.minute || ''} onChange={(e) => updateGoal(false, index, 'minute', parseInt(e.target.value) || null)} className="w-14 h-8 bg-slate-800/50 border-white/10 text-white text-xs text-center" />
                      <Button variant="ghost" size="sm" onClick={() => removeGoal(false, index)} className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <Select value={goal.assist_player_id || 'none'} onValueChange={(value) => updateGoal(false, index, 'assist_player_id', value)}>
                      <SelectTrigger className="h-7 bg-slate-800/50 border-white/10 text-gray-400 text-[10px]"><SelectValue placeholder="Asistencia (opcional)" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="none" className="text-gray-400 text-xs">Sin asistencia</SelectItem>
                        {awayPlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tarjetas Local */}
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white truncate">Tarjetas {selectedMatch.home_teams.name}</p>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => addCard(true, 'yellow')} className="h-6 px-2 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-300 border-0 text-[10px]">Amarilla</Button>
                    <Button size="sm" onClick={() => addCard(true, 'red')} className="h-6 px-2 bg-red-500/30 hover:bg-red-500/40 text-red-300 border-0 text-[10px]">Roja</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {homeCards.map((card, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-slate-700/30">
                      <span className={`w-4 h-5 rounded-sm flex-shrink-0 ${card.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                      <Select value={card.player_id} onValueChange={(value) => updateCard(true, index, 'player_id', value)}>
                        <SelectTrigger className="flex-1 h-7 bg-slate-800/50 border-white/10 text-white text-[10px]"><SelectValue placeholder="Jugador" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {homePlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" max="120" placeholder="'" value={card.minute || ''} onChange={(e) => updateCard(true, index, 'minute', parseInt(e.target.value) || null)} className="w-10 h-7 bg-slate-800/50 border-white/10 text-white text-[10px] text-center p-1" />
                      <Button variant="ghost" size="sm" onClick={() => removeCard(true, index)} className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjetas Visitante */}
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white truncate">Tarjetas {selectedMatch.away_teams.name}</p>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => addCard(false, 'yellow')} className="h-6 px-2 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-300 border-0 text-[10px]">Amarilla</Button>
                    <Button size="sm" onClick={() => addCard(false, 'red')} className="h-6 px-2 bg-red-500/30 hover:bg-red-500/40 text-red-300 border-0 text-[10px]">Roja</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {awayCards.map((card, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-slate-700/30">
                      <span className={`w-4 h-5 rounded-sm flex-shrink-0 ${card.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                      <Select value={card.player_id} onValueChange={(value) => updateCard(false, index, 'player_id', value)}>
                        <SelectTrigger className="flex-1 h-7 bg-slate-800/50 border-white/10 text-white text-[10px]"><SelectValue placeholder="Jugador" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {awayPlayers.map((p) => (<SelectItem key={p.id} value={p.id} className="text-white text-xs">#{p.jersey_number} {p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" max="120" placeholder="'" value={card.minute || ''} onChange={(e) => updateCard(false, index, 'minute', parseInt(e.target.value) || null)} className="w-10 h-7 bg-slate-800/50 border-white/10 text-white text-[10px] text-center p-1" />
                      <Button variant="ghost" size="sm" onClick={() => removeCard(false, index)} className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Info + Guardar */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
                  <p className="text-[10px] md:text-xs text-blue-400">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Puedes guardar el resultado sin asignar goleadores.
                  </p>
                </div>
                <Button onClick={handleSaveResult} disabled={saving} className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white border-0 h-10">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Guardando...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Finalizar Partido</>
                  )}
                </Button>
              </div>
            </div>
          </div>
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
