"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Trophy, Loader2, Edit, Save, X, RefreshCw, Trash, Settings, AlertTriangle, Shield, Eye, EyeOff, Send, ImageDown } from "lucide-react"
import Image from "next/image"
import { useTeamsByLeague, useTournamentsByLeague, useMatchesByTournament, useInvalidateMatches } from "@/lib/queries"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { analyzeTeamActivity, generateRoundRobinSchedule, getNextMatchDate, CalendarAdjustmentResult } from "@/lib/utils/calendar-adjuster"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateMatchScheduleEmbedding, sendJornadaNotification, generateMatchResultEmbedding, generateStandingsEmbedding, sendMatchResultNotification } from "@/lib/utils/generate-embeddings"
import { MatchPosterGenerator } from "./match-poster-generator"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

interface CalendarViewProps {
  leagueId: string
}

interface CalendarTeam {
  id: string
  name: string
  slug: string
  logo?: string | null
}

interface CalendarMatch {
  id: string
  round: number | null
  homeTeam: CalendarTeam
  awayTeam: CalendarTeam
  date: string
  time: string
  field: number
  status: string
  homeScore?: number | null
  awayScore?: number | null
  byeTeamId?: string | null
  phase?: 'regular' | 'playoffs'
  playoffRound?: 'quarterfinals' | 'semifinals' | 'final' | 'third_place' | null
  playoffPosition?: number | null
  isPublished?: boolean
}

interface EditingMatch extends CalendarMatch {
  isEditing: boolean
}

export function CalendarView({ leagueId }: CalendarViewProps) {
  // TanStack Query para datos con caché
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournamentsByLeague(leagueId)
  const { data: teams = [] } = useTeamsByLeague(leagueId)

  const [selectedTournamentId, setSelectedTournamentId] = useState("")

  // React Query para partidos - se activa cuando hay un torneo seleccionado
  const {
    data: matchesData = [],
    isLoading: matchesLoading,
    refetch: refetchMatches
  } = useMatchesByTournament(selectedTournamentId || undefined)

  // Hook para invalidar cache
  const { invalidateByTournament } = useInvalidateMatches()

  // Transform matches data to CalendarMatch format (memoized to prevent infinite loops)
  const matches: CalendarMatch[] = useMemo(() => {
    return matchesData.map((match: any) => {
      let dateStr = match.match_date
      let dateOnly = dateStr?.split('T')[0] || ''

      if (dateStr && (dateStr.includes('Z') || dateStr.includes('+'))) {
        const date = new Date(dateStr)
        dateOnly = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      }

      return {
        id: match.id,
        round: match.round,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        date: dateOnly,
        time: match.match_time || match.match_date?.split('T')[1]?.substring(0, 5) || '10:00',
        field: match.field_number || 1,
        status: match.status,
        homeScore: match.home_score,
        awayScore: match.away_score,
        byeTeamId: match.bye_team_id,
        phase: match.phase || 'regular',
        playoffRound: match.playoff_round,
        playoffPosition: match.playoff_position,
        isPublished: match.is_published ?? false
      }
    })
  }, [matchesData])

  const [editingMatches, setEditingMatches] = useState<EditingMatch[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all')
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [adjustmentAnalysis, setAdjustmentAnalysis] = useState<CalendarAdjustmentResult | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPosterDialogOpen, setIsPosterDialogOpen] = useState(false)

  // Score editing state
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false)
  const [editingScoreMatch, setEditingScoreMatch] = useState<CalendarMatch | null>(null)
  const [editHomeScore, setEditHomeScore] = useState<number>(0)
  const [editAwayScore, setEditAwayScore] = useState<number>(0)
  const [savingScore, setSavingScore] = useState(false)

  // Publishing state
  const [publishingRound, setPublishingRound] = useState<number | null>(null)

  // Deleting round state
  const [deletingRound, setDeletingRound] = useState<number | null>(null)
  const [confirmDeleteRound, setConfirmDeleteRound] = useState<number | null>(null)

  // Ref para evitar cargar múltiples veces
  const initialLoadDone = useRef(false)

  // Auto-select first active tournament
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournamentId && !initialLoadDone.current) {
      initialLoadDone.current = true
      const activeTournament = tournaments.find(t => t.is_active) || tournaments[0]
      setSelectedTournamentId(activeTournament.id)
    }
  }, [tournaments, selectedTournamentId])

  // Update editingMatches when matchesData changes - use stringified IDs for comparison
  const matchIds = useMemo(() => matchesData.map(m => m.id).join(','), [matchesData])

  useEffect(() => {
    setEditingMatches(matches.map(m => ({ ...m, isEditing: false })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIds])

  // Alias for loading state
  const loading = matchesLoading

  // Check if a round is fully published
  const isRoundPublished = (roundMatches: CalendarMatch[]): boolean => {
    return roundMatches.length > 0 && roundMatches.every(m => m.isPublished)
  }

  // Publish/Unpublish a round
  const toggleRoundPublish = async (round: number, publish: boolean) => {
    if (!selectedTournamentId) return

    setPublishingRound(round)
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from('matches')
        .update({ is_published: publish, updated_at: new Date().toISOString() })
        .eq('tournament_id', selectedTournamentId)
        .eq('round', round)

      if (error) throw error

      // Refresh matches data
      await refetchMatches()

      setMessage({
        type: 'success',
        text: publish
          ? `Jornada ${round} publicada exitosamente. Ahora es visible para equipos y público.`
          : `Jornada ${round} despublicada. Ya no es visible públicamente.`
      })

      // If publishing, also send notification
      if (publish) {
        const roundMatches = matches.filter(m => m.round === round)
        const tournament = tournaments.find(t => t.id === selectedTournamentId)
        const league = { id: leagueId } // Simplified

        if (tournament && roundMatches.length > 0) {
          try {
            await sendJornadaNotification({
              league_id: leagueId,
              league_name: tournament.name,
              tournament_name: tournament.name,
              round: round,
              matches: roundMatches.map(m => ({
                home_team: m.homeTeam.name,
                away_team: m.awayTeam.name,
                date: m.date,
                time: m.time,
                field: m.field
              }))
            })
          } catch (notifError) {
            console.warn('Error enviando notificación:', notifError)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling round publish:', error)
      setMessage({
        type: 'error',
        text: `Error al ${publish ? 'publicar' : 'despublicar'} la jornada ${round}`
      })
    } finally {
      setPublishingRound(null)
    }
  }

  // Delete all matches from a round
  const deleteRound = async (round: number) => {
    if (!selectedTournamentId) return

    setDeletingRound(round)
    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', selectedTournamentId)
        .eq('round', round)

      if (error) throw error

      // Refresh matches data
      await refetchMatches()
      invalidateByTournament(selectedTournamentId)

      setMessage({
        type: 'success',
        text: `Jornada ${round} eliminada exitosamente.`
      })

      setConfirmDeleteRound(null)
    } catch (error) {
      console.error('Error deleting round:', error)
      setMessage({
        type: 'error',
        text: `Error al eliminar la jornada ${round}`
      })
    } finally {
      setDeletingRound(null)
    }
  }

  const updateMatch = async (matchId: string, updates: Partial<CalendarMatch>) => {
    try {
      const supabase = createClientSupabaseClient()
      
      // Enfoque simple: usar un objeto plano para la actualización
      const updateData: Record<string, any> = {};
      
      // Construir objeto de actualización con los campos necesarios
      if (updates.date || updates.time) {
        // Asegurarnos de manejar correctamente la fecha sin problemas de zona horaria
        const dateStr = updates.date || '2024-01-01';
        const timeStr = updates.time || '10:00';
        
        // Crear fecha en UTC para evitar ajustes de zona horaria
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Crear objeto Date y formatear como ISO string
        const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        updateData.match_date = date.toISOString();
      }
      if (updates.time) updateData.match_time = updates.time;
      if (updates.field) updateData.field_number = updates.field;
      if (updates.homeTeam && updates.homeTeam.id) updateData.home_team_id = updates.homeTeam.id;
      if (updates.awayTeam && updates.awayTeam.id) updateData.away_team_id = updates.awayTeam.id;

      // Verificar que haya datos para actualizar
      if (Object.keys(updateData).length === 0) {
        console.log('⚠️ No hay cambios para actualizar');
        return;
      }

      console.log('🔄 Actualizando partido:', { matchId, updateData });
      
      // Usar el método .update() con type assertion
      const { data, error } = await supabase
        .from('matches')
        // @ts-ignore - Ignorar el error de tipado
        .update(updateData)
        .eq('id', matchId)
        .select()

      if (error) {
        console.error('❌ Error actualizando partido:', error);
        throw new Error(error.message)
      }
      
      console.log('✅ Partido actualizado exitosamente:', data);
      
    } catch (error: any) {
      console.error('Error updating match:', error)
      setMessage({ type: 'error', text: `Error actualizando partido: ${error.message || 'Error desconocido'}` })
      throw error; // Re-lanzar el error para que lo capture saveMatchEdit
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

    console.log('💾 Guardando cambios del partido:', {
      id: match.id,
      date: match.date,
      time: match.time,
      field: match.field,
      homeTeam: match.homeTeam?.name,
      homeTeamId: match.homeTeam?.id,
      awayTeam: match.awayTeam?.name,
      awayTeamId: match.awayTeam?.id
    });

    try {
      // Validar que no sean el mismo equipo
      if (match.homeTeam?.id === match.awayTeam?.id) {
        setMessage({ type: 'error', text: 'El equipo local y visitante no pueden ser el mismo' })
        return
      }

      // Validar que el equipo local y visitante existan
      const homeTeamExists = teams.some(team => team.id === match.homeTeam?.id)
      const awayTeamExists = teams.some(team => team.id === match.awayTeam?.id)
      if (!homeTeamExists || !awayTeamExists) {
        setMessage({ type: 'error', text: 'El equipo local o visitante no existe' })
        return
      }

      // Primero desactivar modo edición para evitar problemas de estado
      setEditingMatches(prev =>
        prev.map((m, i) =>
          i === index ? { ...m, isEditing: false } : m
        )
      )

      // Crear una copia local de los datos para la actualización
      const updateData = {
        date: match.date,
        time: match.time,
        field: match.field,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      };

      // Mostrar mensaje de guardando
      setMessage({ type: 'success', text: 'Guardando cambios...' })

      // Luego actualizar en la base de datos
      await updateMatch(match.id, updateData)

      // Capture match data for notification BEFORE reloading
      const matchForNotification = {
        round: match.round,
        home_team: match.homeTeam?.name || 'TBD',
        away_team: match.awayTeam?.name || 'TBD',
        date: match.date,
        time: match.time,
        field: match.field,
      }
      const tournamentName = tournaments.find(t => t.id === selectedTournamentId)?.name || 'Torneo'

      // Recargar partidos para reflejar los cambios
      if (selectedTournamentId) {
        await refetchMatches()
      }

      // Generate embedding and send notification for updated match schedule
      if (match.round && leagueId && selectedTournamentId) {
        // Generate embedding (async, don't block)
        generateMatchScheduleEmbedding(leagueId, selectedTournamentId, match.round)
          .catch(err => console.warn('Error generando embedding:', err))

        // Get league name and send notification
        console.log('📢 [NOTIF] Iniciando envío de notificación...')
        const supabase = createClientSupabaseClient()
        supabase
          .from('leagues')
          .select('name')
          .eq('id', leagueId)
          .single()
          .then(({ data: league, error }) => {
            console.log('📢 [NOTIF] Liga obtenida:', league, 'Error:', error)
            const leagueName = league?.name || 'Liga'
            // Send notification - this will log to server when API is called
            console.log('📢 [NOTIF] Llamando sendJornadaNotification...')
            return sendJornadaNotification({
              league_id: leagueId,
              tournament_id: selectedTournamentId,
              round: matchForNotification.round!,
              league_name: leagueName,
              tournament_name: tournamentName,
              matches: [matchForNotification],
            })
          })
          .catch(err => console.error('❌ [NOTIF] Error en notificación de edición:', err))
      }

      // Mensaje de éxito
      setMessage({ type: 'success', text: 'Partido actualizado exitosamente' })
    } catch (error) {
      console.error('❌ Error en saveMatchEdit:', error);
      setMessage({ type: 'error', text: `Error guardando cambios: ${error instanceof Error ? error.message : 'Error desconocido'}` })
      
      // Volver a modo edición si hay error para que el usuario pueda corregir
      setEditingMatches(prev =>
        prev.map((m, i) =>
          i === index ? { ...m, isEditing: true } : m
        )
      )
    }
  }

  const updateEditingMatch = (index: number, field: keyof CalendarMatch, value: any) => {
    setEditingMatches(prev =>
      prev.map((match, i) =>
        i === index ? { ...match, [field]: value } : match
      )
    )
  }

  // Score editing functions
  const openScoreEditDialog = (match: CalendarMatch) => {
    setEditingScoreMatch(match)
    setEditHomeScore(match.homeScore ?? 0)
    setEditAwayScore(match.awayScore ?? 0)
    setIsScoreDialogOpen(true)
  }

  const closeScoreEditDialog = () => {
    setIsScoreDialogOpen(false)
    setEditingScoreMatch(null)
    setEditHomeScore(0)
    setEditAwayScore(0)
  }

  const saveScoreEdit = async () => {
    if (!editingScoreMatch || !selectedTournamentId) return

    setSavingScore(true)
    setMessage({ type: 'success', text: 'Guardando marcador...' })

    try {
      const supabase = createClientSupabaseClient()

      // 1. Update match score
      console.log('📝 Actualizando marcador:', {
        matchId: editingScoreMatch.id,
        homeScore: editHomeScore,
        awayScore: editAwayScore
      })

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          home_score: editHomeScore,
          away_score: editAwayScore,
          status: 'finished', // Mark as finished when score is set
        })
        .eq('id', editingScoreMatch.id)

      if (updateError) throw new Error(updateError.message)

      // 2. Recalculate standings
      console.log('📊 Recalculando tabla de posiciones...')

      // Get all finished matches for the tournament
      const { data: allMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .eq('status', 'finished')

      if (matchesError) throw new Error(matchesError.message)

      // Calculate standings from scratch
      const standingsMap = new Map<string, {
        team_id: string
        matches_played: number
        matches_won: number
        matches_drawn: number
        matches_lost: number
        goals_for: number
        goals_against: number
        goal_difference: number
        points: number
      }>()

      // Initialize all teams
      for (const match of allMatches || []) {
        if (!standingsMap.has(match.home_team_id)) {
          standingsMap.set(match.home_team_id, {
            team_id: match.home_team_id,
            matches_played: 0, matches_won: 0, matches_drawn: 0, matches_lost: 0,
            goals_for: 0, goals_against: 0, goal_difference: 0, points: 0
          })
        }
        if (!standingsMap.has(match.away_team_id)) {
          standingsMap.set(match.away_team_id, {
            team_id: match.away_team_id,
            matches_played: 0, matches_won: 0, matches_drawn: 0, matches_lost: 0,
            goals_for: 0, goals_against: 0, goal_difference: 0, points: 0
          })
        }
      }

      // Calculate stats from all finished matches
      for (const match of allMatches || []) {
        if (match.home_score === null || match.away_score === null) continue

        const homeStats = standingsMap.get(match.home_team_id)!
        const awayStats = standingsMap.get(match.away_team_id)!

        // Played
        homeStats.matches_played++
        awayStats.matches_played++

        // Goals
        homeStats.goals_for += match.home_score
        homeStats.goals_against += match.away_score
        awayStats.goals_for += match.away_score
        awayStats.goals_against += match.home_score

        // Result
        if (match.home_score > match.away_score) {
          homeStats.matches_won++
          homeStats.points += 3
          awayStats.matches_lost++
        } else if (match.home_score < match.away_score) {
          awayStats.matches_won++
          awayStats.points += 3
          homeStats.matches_lost++
        } else {
          homeStats.matches_drawn++
          awayStats.matches_drawn++
          homeStats.points += 1
          awayStats.points += 1
        }

        // Goal difference
        homeStats.goal_difference = homeStats.goals_for - homeStats.goals_against
        awayStats.goal_difference = awayStats.goals_for - awayStats.goals_against
      }

      // Update team_stats in database
      // Note: goal_difference and points are GENERATED columns, so we don't include them
      console.log('📊 Actualizando team_stats para', standingsMap.size, 'equipos')
      let updateErrors = 0

      for (const [teamId, stats] of standingsMap) {
        console.log('📝 Upsert team_stats:', {
          teamId,
          leagueId,
          tournamentId: selectedTournamentId,
          matches_played: stats.matches_played,
          matches_won: stats.matches_won,
          matches_drawn: stats.matches_drawn,
          matches_lost: stats.matches_lost,
          goals_for: stats.goals_for,
          goals_against: stats.goals_against,
        })

        const { data, error: standingsError } = await supabase
          .from('team_stats')
          .upsert({
            league_id: leagueId,
            tournament_id: selectedTournamentId,
            team_id: teamId,
            matches_played: stats.matches_played,
            matches_won: stats.matches_won,
            matches_drawn: stats.matches_drawn,
            matches_lost: stats.matches_lost,
            goals_for: stats.goals_for,
            goals_against: stats.goals_against,
            // goal_difference and points are auto-calculated by the database
          }, {
            onConflict: 'team_id,tournament_id'
          })
          .select()

        if (standingsError) {
          console.error('❌ Error updating team_stats for team', teamId, standingsError)
          updateErrors++
        } else {
          console.log('✅ Updated team_stats:', data)
        }
      }

      if (updateErrors > 0) {
        console.warn(`⚠️ ${updateErrors} errores actualizando team_stats`)
      }

      console.log('✅ Tabla de posiciones actualizada')

      // 3. Regenerate embeddings
      console.log('🔄 Regenerando embeddings...')

      // Regenerate match result embedding
      generateMatchResultEmbedding({
        match_id: editingScoreMatch.id,
        league_id: leagueId,
        tournament_id: selectedTournamentId,
      }).catch(err => console.warn('Error generando embedding de resultado:', err))

      // Regenerate standings embedding
      generateStandingsEmbedding({
        league_id: leagueId,
        tournament_id: selectedTournamentId,
      }).catch(err => console.warn('Error generando embedding de standings:', err))

      // Regenerate jornada embedding
      if (editingScoreMatch.round) {
        generateMatchScheduleEmbedding(leagueId, selectedTournamentId, editingScoreMatch.round)
          .catch(err => console.warn('Error generando embedding de jornada:', err))
      }

      // 4. Send WhatsApp notification for match result
      const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
      if (selectedTournament) {
        // Get league name
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('name')
          .eq('id', leagueId)
          .single()

        const leagueName = leagueData?.name || 'Liga'

        sendMatchResultNotification({
          league_id: leagueId,
          tournament_id: selectedTournamentId,
          home_team: editingScoreMatch.homeTeam.name,
          away_team: editingScoreMatch.awayTeam.name,
          home_score: editHomeScore,
          away_score: editAwayScore,
          round: editingScoreMatch.round || undefined,
          league_name: leagueName,
          tournament_name: selectedTournament.name,
        }).catch(err => console.warn('Error enviando notificación de resultado:', err))
      }

      // 5. Reload matches and close dialog
      await refetchMatches()
      closeScoreEditDialog()
      setMessage({ type: 'success', text: 'Marcador actualizado y tabla recalculada exitosamente' })

    } catch (error) {
      console.error('❌ Error guardando marcador:', error)
      setMessage({ type: 'error', text: `Error guardando marcador: ${error instanceof Error ? error.message : 'Error desconocido'}` })
    } finally {
      setSavingScore(false)
    }
  }

  const analyzeCalendar = async () => {
    if (!selectedTournamentId) {
      setMessage({ type: 'error', text: 'Selecciona un torneo primero' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Obtener equipos del torneo seleccionado
      const { data: allTeamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .eq('tournament_id', selectedTournamentId)

      if (teamsError) throw new Error(teamsError.message)

      // Obtener todos los partidos del torneo
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)

      if (matchesError) throw new Error(matchesError.message)

      const analysis = analyzeTeamActivity(allTeamsData || [], matchesData || [])

      // Calcular jornadas finalizadas para información adicional
      const finishedRounds = new Set(
        matchesData?.filter(m => m.status === 'finished').map(m => m.round) || []
      )
      const scheduledRounds = new Set(
        matchesData?.filter(m => m.status === 'scheduled').map(m => m.round) || []
      )

      // Analizar configuración actual del calendario
      const analyzeConfig = (matches: any[]) => {
        if (!matches || matches.length === 0) return null

        const daysOfWeek = new Set<number>()
        const hours = new Set<number>()

        matches.forEach(match => {
          const date = new Date(match.match_date)
          daysOfWeek.add(date.getDay())

          if (match.match_time) {
            const [hour] = match.match_time.split(':').map(Number)
            hours.add(hour)
          }
        })

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const sortedDays = Array.from(daysOfWeek).sort()
        const sortedHours = Array.from(hours).sort((a, b) => a - b)

        return {
          matchDays: sortedDays.map(d => dayNames[d]),
          startHour: sortedHours.length > 0 ? sortedHours[0] : null
        }
      }

      const currentConfig = analyzeConfig(matchesData || [])

      // Agregar información adicional al análisis
      const enhancedAnalysis = {
        ...analysis,
        finishedRoundsCount: finishedRounds.size,
        scheduledRoundsCount: scheduledRounds.size,
        lastFinishedRound: finishedRounds.size > 0 ? Math.max(...Array.from(finishedRounds)) : 0,
        currentConfig
      }

      setAdjustmentAnalysis(enhancedAnalysis as any)
      setIsAdjustDialogOpen(true)

    } catch (error: any) {
      console.error('Error analyzing calendar:', error)
      setMessage({ type: 'error', text: `Error analizando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setLoading(false)
    }
  }

  const adjustCalendar = async () => {
    if (!adjustmentAnalysis || !selectedTournamentId) return

    setAdjusting(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // 1. Obtener todos los partidos del torneo para analizar jornadas finalizadas
      const { data: allMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .order('round', { ascending: true })

      if (fetchError) throw new Error(fetchError.message)

      // 2. Identificar la última jornada con partidos finalizados
      const finishedRounds = new Set(
        allMatches
          ?.filter(m => m.status === 'finished')
          .map(m => m.round)
      )

      const lastFinishedRound = finishedRounds.size > 0
        ? Math.max(...Array.from(finishedRounds))
        : 0

      console.log(`📊 Última jornada finalizada: ${lastFinishedRound}`)

      // 3. Eliminar SOLO partidos programados (mantener finalizados, in_progress, cancelled)
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', selectedTournamentId)
        .eq('status', 'scheduled')

      if (deleteError) throw new Error(deleteError.message)

      // 4. Obtener configuración del torneo para mantener consistencia
      const tournament = tournaments.find(t => t.id === selectedTournamentId)
      if (!tournament) throw new Error('Torneo no encontrado')

      // 5. Analizar configuración de partidos existentes para mantener consistencia
      const analyzeExistingConfiguration = (matches: any[]) => {
        if (!matches || matches.length === 0) {
          // Configuración por defecto si no hay partidos
          return {
            matchDays: [0], // Domingo
            startHour: 8,
            startMinute: 0,
            matchDurationMinutes: 75,
            fieldsAvailable: 2
          }
        }

        // Detectar días de juego basándose en partidos existentes
        const daysOfWeek = new Set<number>()
        const hours = new Set<number>()
        const minutes = new Set<number>()

        matches.forEach(match => {
          const date = new Date(match.match_date)
          daysOfWeek.add(date.getDay()) // 0-6 (Domingo-Sábado)

          if (match.match_time) {
            const [hour, minute] = match.match_time.split(':').map(Number)
            hours.add(hour)
            minutes.add(minute)
          }
        })

        // Ordenar días
        const sortedDays = Array.from(daysOfWeek).sort()

        // Encontrar la hora más temprana
        const sortedHours = Array.from(hours).sort((a, b) => a - b)
        const sortedMinutes = Array.from(minutes).sort((a, b) => a - b)
        const startHour = sortedHours.length > 0 ? sortedHours[0] : 8
        const startMinute = sortedMinutes.length > 0 ? sortedMinutes[0] : 0

        // Calcular duración promedio entre partidos
        const times: number[] = []
        matches.forEach(match => {
          if (match.match_time) {
            const [hour, minute] = match.match_time.split(':').map(Number)
            times.push(hour * 60 + minute)
          }
        })

        times.sort((a, b) => a - b)
        let totalDiff = 0
        let diffCount = 0
        for (let i = 1; i < times.length; i++) {
          const diff = times[i] - times[i - 1]
          if (diff > 0 && diff <= 180) { // Solo diferencias razonables (menos de 3 horas)
            totalDiff += diff
            diffCount++
          }
        }

        const matchDurationMinutes = diffCount > 0
          ? Math.round(totalDiff / diffCount)
          : 75

        // Detectar número de canchas
        const fieldNumbers = new Set(matches.map(m => m.field_number).filter(Boolean))
        const fieldsAvailable = fieldNumbers.size > 0 ? Math.max(...Array.from(fieldNumbers)) : 2

        console.log(`📊 Configuración detectada:`, {
          matchDays: sortedDays,
          startHour,
          startMinute,
          matchDurationMinutes,
          fieldsAvailable
        })

        return {
          matchDays: sortedDays,
          startHour,
          startMinute,
          matchDurationMinutes,
          fieldsAvailable
        }
      }

      // Analizar configuración de partidos existentes
      const config = analyzeExistingConfiguration(allMatches || [])

      // 6. Generar nuevo calendario con equipos activos
      const rounds = generateRoundRobinSchedule(adjustmentAnalysis.activeTeams, false)

      // 7. Calcular fecha de inicio basándose en la última jornada finalizada
      let startDate: Date

      if (lastFinishedRound > 0 && allMatches && allMatches.length > 0) {
        // Obtener la fecha del último partido de la última jornada finalizada
        const lastRoundMatches = allMatches.filter(m => m.round === lastFinishedRound)
        const lastMatchDate = lastRoundMatches.length > 0
          ? new Date(lastRoundMatches[lastRoundMatches.length - 1].match_date)
          : new Date()

        // Calcular la próxima fecha de juego después de la última jornada
        startDate = new Date(lastMatchDate)
        startDate.setDate(startDate.getDate() + 1) // Día siguiente

        // Buscar el próximo día de juego válido
        let attempts = 0
        while (!config.matchDays.includes(startDate.getDay()) && attempts < 7) {
          startDate.setDate(startDate.getDate() + 1)
          attempts++
        }
      } else {
        // Si no hay jornadas finalizadas, empezar en el próximo día de juego
        startDate = new Date()
        let attempts = 0
        while (!config.matchDays.includes(startDate.getDay()) && attempts < 7) {
          startDate.setDate(startDate.getDate() + 1)
          attempts++
        }
      }

      console.log(`📅 Nueva fecha de inicio: ${startDate.toISOString().split('T')[0]}`)

      // 8. Generar horarios automáticamente
      const generateMatchTimes = (startHour: number, startMinute: number, matchCount: number, durationMinutes: number) => {
        const times: string[] = []
        let currentHour = startHour
        let currentMinute = startMinute

        for (let i = 0; i < matchCount; i++) {
          times.push(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`)

          // Sumar duración del partido
          currentMinute += durationMinutes
          while (currentMinute >= 60) {
            currentMinute -= 60
            currentHour++
          }
        }

        return times
      }

      // Generar hasta 8 horarios posibles (suficiente para la mayoría de casos)
      const matchTimes = generateMatchTimes(
        config.startHour,
        config.startMinute,
        8,
        config.matchDurationMinutes
      )

      console.log(`⏰ Horarios generados:`, matchTimes)

      // 9. Función helper para obtener la próxima fecha de juego
      const getNextValidMatchDate = (currentDate: Date, validDays: number[]) => {
        const nextDate = new Date(currentDate)
        nextDate.setDate(nextDate.getDate() + 1)

        let attempts = 0
        while (!validDays.includes(nextDate.getDay()) && attempts < 7) {
          nextDate.setDate(nextDate.getDate() + 1)
          attempts++
        }

        return nextDate
      }

      let currentDate = new Date(startDate)

      const newMatches: Database['public']['Tables']['matches']['Insert'][] = []

      // 10. Empezar numeración de jornadas DESPUÉS de las finalizadas
      const startingRound = lastFinishedRound + 1

      rounds.forEach((round, index) => {
        // Ajustar el número de jornada para que empiece después de las finalizadas
        const adjustedRoundNumber = startingRound + index

        // Obtener el equipo que descansa en esta jornada (si existe)
        const byeTeam = round.matches[0]?.byeTeam

        // NUEVA LÓGICA CORREGIDA: Programar todos los partidos de la jornada
        const matchesInRound = round.matches.length
        const slotsPerDay = matchTimes.length * config.fieldsAvailable

        // Calcular cuántos días se necesitan para esta jornada
        const daysNeeded = Math.ceil(matchesInRound / slotsPerDay)

        console.log(`📅 Jornada ${adjustedRoundNumber}: ${matchesInRound} partidos, ${config.fieldsAvailable} canchas, ${matchTimes.length} horarios`)
        console.log(`   → Slots por día: ${slotsPerDay}, Días necesarios: ${daysNeeded}`)

        // Fecha inicial para esta jornada
        let roundDate = new Date(currentDate)
        let lastMatchDate = roundDate  // Rastrear la fecha del último partido

        round.matches.forEach((match, matchIndex) => {
          // Calcular en qué slot va este partido (0, 1, 2, 3, ...)
          const slotNumber = matchIndex

          // Calcular en qué día va este slot
          const dayOffset = Math.floor(slotNumber / slotsPerDay)

          // Calcular posición dentro del día
          const slotInDay = slotNumber % slotsPerDay

          // Calcular cancha y horario
          const fieldNumber = (slotInDay % config.fieldsAvailable) + 1
          const timeSlotIndex = Math.floor(slotInDay / config.fieldsAvailable)
          const assignedTime = matchTimes[timeSlotIndex]

          // Calcular la fecha correcta para este partido
          let matchDate = new Date(roundDate)
          for (let i = 0; i < dayOffset; i++) {
            matchDate = getNextValidMatchDate(matchDate, config.matchDays)
          }

          // Actualizar la fecha del último partido procesado
          lastMatchDate = matchDate

          console.log(`   Partido ${matchIndex + 1}/${matchesInRound}: Slot ${slotNumber}, Día ${dayOffset}, Campo ${fieldNumber}, Hora ${assignedTime}, Fecha: ${matchDate.toISOString().split('T')[0]}`)

          newMatches.push({
            tournament_id: selectedTournamentId,
            home_team_id: match.home.id,
            away_team_id: match.away.id,
            match_date: `${matchDate.toISOString().split('T')[0]}T${assignedTime}:00`,
            match_time: assignedTime,
            field_number: fieldNumber,
            round: adjustedRoundNumber,
            status: 'scheduled',
            bye_team_id: byeTeam?.id || null
          })
        })

        // Después de cada jornada, avanzar al siguiente día válido desde el ÚLTIMO día usado
        currentDate = getNextValidMatchDate(lastMatchDate, config.matchDays)
        console.log(`✅ Jornada ${adjustedRoundNumber} completa. Último partido: ${lastMatchDate.toISOString().split('T')[0]}, Próxima jornada: ${currentDate.toISOString().split('T')[0]}`)
      })

      // 5. Insertar nuevos partidos
      const { error: insertError } = await supabase
        .from('matches')
        .insert(newMatches as any)

      if (insertError) throw new Error(insertError.message)

      setMessage({
        type: 'success',
        text: `Calendario ajustado exitosamente. ${newMatches.length} partidos programados con ${adjustmentAnalysis.activeTeams.length} equipos activos. ${lastFinishedRound > 0 ? `Las jornadas 1-${lastFinishedRound} (finalizadas) se mantuvieron. Nuevas jornadas empiezan desde la ${startingRound}.` : ''}`
      })

      setIsAdjustDialogOpen(false)

      // Send WhatsApp notifications for new jornadas (async, don't wait)
      supabase.from('leagues').select('name').eq('id', leagueId).single()
        .then(({ data: league }) => {
          const leagueName = league?.name || 'Liga'

          // Group new matches by round and send notification for each
          const matchesByRound = newMatches.reduce((acc, match) => {
            const round = match.round as number
            if (!acc[round]) acc[round] = []
            acc[round].push(match)
            return acc
          }, {} as Record<number, typeof newMatches>)

          // Send notification for each new round
          Object.entries(matchesByRound).forEach(([round, roundMatches]) => {
            // Get team names for the matches
            const matchesWithNames = roundMatches.map(m => {
              const homeTeam = adjustmentAnalysis.activeTeams.find(t => t.id === m.home_team_id)
              const awayTeam = adjustmentAnalysis.activeTeams.find(t => t.id === m.away_team_id)
              return {
                home_team: homeTeam?.name || 'TBD',
                away_team: awayTeam?.name || 'TBD',
                date: m.match_date?.split('T')[0] || '',
                time: m.match_time || '',
                field: m.field_number || undefined,
              }
            })

            sendJornadaNotification({
              league_id: leagueId,
              tournament_id: selectedTournamentId,
              round: parseInt(round),
              league_name: leagueName,
              tournament_name: tournament?.name || 'Torneo',
              matches: matchesWithNames,
            }).catch(err => console.warn(`Error enviando notificación jornada ${round}:`, err))
          })
        })
        .catch(err => console.warn('Error obteniendo nombre de liga:', err))

      // Recargar partidos
      if (selectedTournamentId) {
        await refetchMatches()
      }

    } catch (error: any) {
      console.error('Error adjusting calendar:', error)
      setMessage({ type: 'error', text: `Error ajustando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setAdjusting(false)
    }
  }

  const deleteAllCalendar = async () => {
    if (!selectedTournamentId) {
      setMessage({ type: 'error', text: 'Selecciona un torneo primero' })
      return
    }

    setDeleting(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Obtener información del torneo para el mensaje
      const tournament = tournaments.find(t => t.id === selectedTournamentId)

      // Contar partidos antes de eliminar
      const { count: totalMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', selectedTournamentId)

      if (!totalMatches || totalMatches === 0) {
        setMessage({ type: 'error', text: 'No hay partidos para eliminar' })
        setIsDeleteDialogOpen(false)
        setDeleting(false)
        return
      }

      // Eliminar TODOS los partidos del torneo (incluyendo finalizados)
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', selectedTournamentId)

      if (deleteError) throw new Error(deleteError.message)

      setMessage({
        type: 'success',
        text: `Calendario eliminado exitosamente. Se eliminaron ${totalMatches} partidos del torneo "${tournament?.name || 'seleccionado'}".`
      })

      setIsDeleteDialogOpen(false)

      // Recargar partidos para mostrar la lista vacía
      setMatches([])
      setEditingMatches([])

    } catch (error: any) {
      console.error('Error deleting calendar:', error)
      setMessage({ type: 'error', text: `Error eliminando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setDeleting(false)
    }
  }

  const groupMatchesByRound = (matches: CalendarMatch[]) => {
    const rounds: Record<number, CalendarMatch[]> = {}
    matches.forEach(match => {
      // Solo agrupar partidos regulares (que tienen round number)
      if (match.round !== null && match.phase === 'regular') {
        if (!rounds[match.round]) rounds[match.round] = []
        rounds[match.round].push(match)
      }
    })
    return rounds
  }

  const getPlayoffMatches = (matches: CalendarMatch[]) => {
    return matches.filter(m => m.phase === 'playoffs')
  }

  const groupPlayoffMatches = (playoffMatches: CalendarMatch[]) => {
    const groups: Record<string, CalendarMatch[]> = {
      quarterfinals: [],
      semifinals: [],
      third_place: [],
      final: []
    }

    playoffMatches.forEach(match => {
      if (match.playoffRound) {
        if (!groups[match.playoffRound]) groups[match.playoffRound] = []
        groups[match.playoffRound].push(match)
      }
    })

    // Retornar solo los grupos que tengan partidos
    return Object.entries(groups).filter(([_, matches]) => matches.length > 0)
  }

  const getPlayoffRoundName = (round: string) => {
    switch(round) {
      case 'quarterfinals': return 'Cuartos de Final'
      case 'semifinals': return 'Semifinales'
      case 'final': return 'Final'
      case 'third_place': return 'Tercer Lugar'
      default: return round
    }
  }

  const getByeTeamForRound = (roundMatches: CalendarMatch[]) => {
    // Obtener el bye_team_id del primer partido de la jornada (todos tienen el mismo)
    const byeTeamId = roundMatches[0]?.byeTeamId
    if (!byeTeamId) return null

    // Buscar el equipo en la lista de equipos
    return teams.find(team => team.id === byeTeamId)
  }

  const getAvailableRounds = (matches: CalendarMatch[]) => {
    const rounds = Array.from(new Set(matches.map(match => match.round).filter(r => r !== null))).sort((a, b) => (a as number) - (b as number))
    return rounds as number[]
  }

  const getAvailableTeams = (matches: CalendarMatch[]) => {
    const teamMap = new Map<string, CalendarTeam>()
    matches.forEach(match => {
      if (match.homeTeam?.id) teamMap.set(match.homeTeam.id, match.homeTeam)
      if (match.awayTeam?.id) teamMap.set(match.awayTeam.id, match.awayTeam)
    })
    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const getFilteredMatches = (matches: CalendarMatch[]) => {
    let filtered = matches
    if (selectedRound !== 'all') {
      filtered = filtered.filter(match => match.round === selectedRound && match.phase === 'regular')
    }
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(match => match.homeTeam?.id === selectedTeam || match.awayTeam?.id === selectedTeam)
    }
    return filtered
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">Programado</Badge>
      case 'in_progress':
        return <Badge className="backdrop-blur-md bg-green-500/80 text-white border-0">En Juego</Badge>
      case 'finished':
        return <Badge className="backdrop-blur-md bg-gray-500/80 text-white border-0">Finalizado</Badge>
      case 'cancelled':
        return <Badge className="backdrop-blur-md bg-red-500/80 text-white border-0">Cancelado</Badge>
      default:
        return <Badge className="backdrop-blur-md bg-white/10 text-white border-white/30">Desconocido</Badge>
    }
  }

  const activeTournaments = tournaments.filter(t => t.is_active)
  const allTournaments = tournaments

  // Show loading skeleton while tournaments are loading
  if (tournamentsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Calendario de Partidos</h2>
            <p className="text-gray-400 text-sm">Cargando datos...</p>
          </div>
        </div>
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
          <div className="h-10 bg-slate-700/50 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-700/30 p-4">
                <div className="h-4 bg-slate-600/50 rounded animate-pulse w-1/4 mb-3" />
                <div className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="h-4 bg-slate-600/50 rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-slate-600/50 rounded animate-pulse w-8" />
                      <div className="h-4 bg-slate-600/50 rounded animate-pulse w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Calendario de Partidos</h2>
          <p className="text-white/80 drop-shadow">Visualiza y edita los partidos programados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={analyzeCalendar}
            disabled={loading || !selectedTournamentId}
            className="backdrop-blur-md bg-yellow-500/80 hover:bg-yellow-500/90 text-white border-0 shadow-lg"
          >
            <Settings className="w-4 h-4 mr-2" />
            Ajustar Calendario
          </Button>
          <Button
            onClick={() => setIsPosterDialogOpen(true)}
            disabled={loading || !selectedTournamentId || matches.filter(m => m.status === 'scheduled').length === 0}
            className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
          >
            <ImageDown className="w-4 h-4 mr-2" />
            Generar Imagen
          </Button>
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={loading || !selectedTournamentId || matches.length === 0}
            className="backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0 shadow-lg"
          >
            <Trash className="w-4 h-4 mr-2" />
            Eliminar Calendario
          </Button>
          <Button
            onClick={() => selectedTournamentId && refetchMatches()}
            disabled={loading}
            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle className="text-white drop-shadow-lg">Seleccionar Torneo</CardTitle>
              <CardDescription className="text-white/80 drop-shadow">Elige el torneo para ver sus partidos</CardDescription>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="text-sm text-white/70 drop-shadow">Cargando...</span>
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
                // React Query automáticamente recarga cuando cambia el tournamentId
              }}
            >
              <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                {activeTournaments.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-white/70 uppercase tracking-wider">
                      Activos
                    </div>
                    {activeTournaments.map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id} className="text-white hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-green-300" />
                          {tournament.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allTournaments.filter(t => !t.is_active).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-white/70 uppercase tracking-wider border-t border-white/20">
                      Inactivos
                    </div>
                    {allTournaments.filter(t => !t.is_active).map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id} className="text-white hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-white/50" />
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
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-white">Filtrar partidos</h3>
              <p className="text-xs text-gray-500">Filtra por jornada o equipo</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  value={selectedRound === 'all' ? 'all' : selectedRound.toString()}
                  onValueChange={(value) => setSelectedRound(value === 'all' ? 'all' : parseInt(value))}
                >
                  <SelectTrigger className="h-9 bg-slate-700/50 border-white/10 text-white text-sm">
                    <SelectValue placeholder="Jornada" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all" className="text-white hover:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        Todas las jornadas
                      </div>
                    </SelectItem>
                    {getAvailableRounds(matches).map(round => (
                      <SelectItem key={round} value={round.toString()} className="text-white hover:bg-slate-800">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                          Jornada {round}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-52">
                <Select
                  value={selectedTeam}
                  onValueChange={(value) => setSelectedTeam(value)}
                >
                  <SelectTrigger className="h-9 bg-slate-700/50 border-white/10 text-white text-sm">
                    <SelectValue placeholder="Equipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all" className="text-white hover:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        Todos los equipos
                      </div>
                    </SelectItem>
                    {getAvailableTeams(matches).map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-white hover:bg-slate-800">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-green-400" />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {getFilteredMatches(matches).length === 0 && matches.length > 0 && (selectedRound !== 'all' || selectedTeam !== 'all') && (
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-6 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-500" />
          <h3 className="text-sm font-medium text-white mb-1">No hay partidos con estos filtros</h3>
          <p className="text-xs text-gray-500 mb-4">
            {selectedRound !== 'all' && selectedTeam !== 'all'
              ? `No hay partidos en la jornada ${selectedRound} para el equipo seleccionado`
              : selectedRound !== 'all'
                ? `La jornada ${selectedRound} no tiene partidos programados`
                : 'El equipo seleccionado no tiene partidos programados'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedRound('all'); setSelectedTeam('all') }}
            className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white text-xs"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {matches.length === 0 && !loading && selectedTournamentId && (
        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-6 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-500" />
          <h3 className="text-sm font-medium text-white mb-1">No hay partidos programados</h3>
          <p className="text-xs text-gray-500 mb-4">Este torneo aún no tiene partidos generados</p>
          <Button
            size="sm"
            onClick={() => window.location.href = '#tournaments'}
            className="bg-green-500 hover:bg-green-600 text-white text-xs"
          >
            Ir a Torneos para generar partidos
          </Button>
        </div>
      )}

      {getFilteredMatches(matches).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupMatchesByRound(getFilteredMatches(matches))).map(([round, roundMatches]) => {
            const published = isRoundPublished(roundMatches)
            const roundNum = parseInt(round)
            return (
            <div key={round} className={`rounded-xl border ${published ? 'bg-slate-800/50 border-green-500/30' : 'bg-slate-800/50 border-white/10'}`}>
              <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                  <span className="text-sm md:text-base font-semibold text-white">Jornada {round}</span>
                  {published ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                      <Eye className="w-3 h-3 mr-1" />
                      Publicada
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Borrador
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-gray-400">
                    {roundMatches.length} partidos
                  </span>
                  <Button
                    size="sm"
                    variant={published ? "outline" : "default"}
                    onClick={() => toggleRoundPublish(roundNum, !published)}
                    disabled={publishingRound === roundNum}
                    className={published
                      ? "h-7 text-xs bg-transparent border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                      : "h-7 text-xs bg-green-500/80 hover:bg-green-500 text-white border-0"
                    }
                  >
                    {publishingRound === roundNum ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : published ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Despublicar
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1" />
                        Publicar
                      </>
                    )}
                  </Button>
                  {/* Delete Round Button */}
                  {confirmDeleteRound === roundNum ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRound(roundNum)}
                        disabled={deletingRound === roundNum}
                        className="h-7 text-xs bg-red-600 hover:bg-red-700"
                      >
                        {deletingRound === roundNum ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Confirmar"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDeleteRound(null)}
                        disabled={deletingRound === roundNum}
                        className="h-7 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteRound(roundNum)}
                      className="h-7 text-xs bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/20"
                      title="Eliminar jornada"
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {roundMatches.map((match, matchIndex) => {
                  const globalIndex = editingMatches.findIndex(m => m.id === match.id)
                  const editingMatch = editingMatches[globalIndex]
                  const isEditing = editingMatch?.isEditing || false

                  return (
                    <div key={match.id} className="p-3 md:p-4 hover:bg-slate-700/20 transition-colors">
                      {isEditing ? (
                        /* Editing Mode */
                        <div className="rounded-lg bg-slate-700/30 border border-white/10 p-3 space-y-3">
                          {/* Teams */}
                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Equipos</label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={editingMatch.homeTeam.id}
                                onValueChange={(value) => {
                                  const t = teams.find(t => t.id === value)
                                  if (t) updateEditingMatch(globalIndex, 'homeTeam', t as any)
                                }}
                              >
                                <SelectTrigger className="flex-1 h-8 bg-slate-800/50 border-white/10 text-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                  {teams.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-white text-xs">{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-gray-500">vs</span>
                              <Select
                                value={editingMatch.awayTeam.id}
                                onValueChange={(value) => {
                                  const t = teams.find(t => t.id === value)
                                  if (t) updateEditingMatch(globalIndex, 'awayTeam', t as any)
                                }}
                              >
                                <SelectTrigger className="flex-1 h-8 bg-slate-800/50 border-white/10 text-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                  {teams.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-white text-xs">{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Date, Time, Field */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Fecha</label>
                              <Input
                                type="date"
                                value={editingMatch.date}
                                onChange={(e) => updateEditingMatch(globalIndex, 'date', e.target.value)}
                                className="h-8 bg-slate-800/50 border-white/10 text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Hora</label>
                              <Input
                                type="time"
                                value={editingMatch.time}
                                onChange={(e) => updateEditingMatch(globalIndex, 'time', e.target.value)}
                                className="h-8 bg-slate-800/50 border-white/10 text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Cancha</label>
                              <Select
                                value={editingMatch.field.toString()}
                                onValueChange={(value) => updateEditingMatch(globalIndex, 'field', parseInt(value))}
                              >
                                <SelectTrigger className="h-8 bg-slate-800/50 border-white/10 text-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                  {[1,2,3,4,5,6].map(num => (
                                    <SelectItem key={num} value={num.toString()} className="text-white">Cancha {num}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Acciones</label>
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMatchEdit(globalIndex); }}
                                  className="flex-1 h-8 bg-green-500 hover:bg-green-600 text-white text-xs"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEditMatch(globalIndex); }}
                                  className="flex-1 h-8 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal View */
                        <div className="space-y-2">
                          {/* Teams Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {match.homeTeam.logo ? (
                                <Image
                                  src={match.homeTeam.logo}
                                  alt={match.homeTeam.name}
                                  width={24}
                                  height={24}
                                  className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                  <Shield className="w-3 h-3 text-gray-500" />
                                </div>
                              )}
                              <p className="text-xs md:text-sm font-medium text-white truncate">{match.homeTeam.name}</p>
                            </div>
                            <div className="flex-shrink-0 px-2">
                              {match.status === 'finished' && match.homeScore !== null && match.awayScore !== null ? (
                                <span className="text-sm md:text-base font-bold text-green-400">
                                  {match.homeScore} - {match.awayScore}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">vs</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2 justify-end">
                              <p className="text-xs md:text-sm font-medium text-white truncate">{match.awayTeam.name}</p>
                              {match.awayTeam.logo ? (
                                <Image
                                  src={match.awayTeam.logo}
                                  alt={match.awayTeam.name}
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

                          {/* Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {(() => {
                                  try {
                                    const [year, month, day] = match.date.split('-').map(Number);
                                    const date = new Date(Date.UTC(year, month - 1, day));
                                    return date.toLocaleDateString('es-ES', { timeZone: 'UTC', day: '2-digit', month: 'short' });
                                  } catch (e) { return match.date; }
                                })()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {match.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                C{match.field}
                              </span>
                              {getStatusBadge(match.status)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {match.status === 'scheduled' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEditMatch(globalIndex); }}
                                    className="h-7 w-7 p-0 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-0"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={async (e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      const ok = window.confirm('¿Eliminar este partido?')
                                      if (!ok) return
                                      try {
                                        setMessage({ type: 'success', text: 'Eliminando...' })
                                        const supabase = createClientSupabaseClient()
                                        const { error } = await supabase.from('matches').delete().eq('id', match.id)
                                        if (error) throw new Error(error.message)
                                        setMessage({ type: 'success', text: 'Partido eliminado' })
                                        if (selectedTournamentId) await refetchMatches()
                                      } catch (e: any) {
                                        setMessage({ type: 'error', text: `Error: ${e.message}` })
                                      }
                                    }}
                                    className="h-7 w-7 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {match.status === 'finished' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openScoreEditDialog(match); }}
                                  className="h-7 px-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-0 text-[10px]"
                                >
                                  <Edit className="w-3 h-3 mr-1" /> Editar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bye Team */}
              {(() => {
                const byeTeam = getByeTeamForRound(roundMatches)
                if (!byeTeam) return null
                return (
                  <div className="p-3 border-t border-white/10">
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-blue-400">Descansa:</span>
                      <span className="text-xs font-medium text-white">{byeTeam.name}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )})}
        </div>
      )}

      {/* Playoff Matches Section - Only show when viewing all rounds */}
      {selectedRound === 'all' && (() => {
        const playoffMatches = getPlayoffMatches(matches)
        if (playoffMatches.length === 0) return null

        const groupedPlayoffs = groupPlayoffMatches(playoffMatches)

        return (
          <div className="space-y-6 mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-green-500/50 to-green-400"></div>
              <h3 className="text-2xl font-bold text-green-300 drop-shadow-lg flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                FASE DE LIGUILLA
              </h3>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-green-500/50 to-green-400"></div>
            </div>

            {groupedPlayoffs.map(([roundKey, roundMatches]) => (
              <Card key={roundKey} className="backdrop-blur-xl bg-white/10 border-green-400/30 shadow-xl">
                <CardHeader className="pb-3 backdrop-blur-md bg-green-500/10">
                  <CardTitle className="text-xl flex items-center gap-2 text-white drop-shadow-lg">
                    <Trophy className="w-6 h-6 text-green-300" />
                    {getPlayoffRoundName(roundKey)}
                    <Badge className="ml-2 backdrop-blur-md bg-green-500/80 text-white border-0">
                      {roundMatches.length} {roundMatches.length === 1 ? 'partido' : 'partidos'}
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
                        <div key={match.id} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 border border-green-400/20 rounded-lg hover:bg-green-500/5 transition-colors backdrop-blur-md bg-white/5">
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
                                <Badge className="text-xs backdrop-blur-md bg-white/10 text-white border-white/30">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Cancha {match.field}
                                </Badge>
                              )}
                            </div>

                            {/* Teams */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isEditing ? (
                                <>
                                  <Select
                                    value={editingMatch.homeTeam.id}
                                    onValueChange={(value) => {
                                      const t = teams.find(t => t.id === value)
                                      if (t) updateEditingMatch(globalIndex, 'homeTeam', t as any)
                                    }}
                                  >
                                    <SelectTrigger className="w-44 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-muted-foreground flex-shrink-0">vs</span>
                                  <Select
                                    value={editingMatch.awayTeam.id}
                                    onValueChange={(value) => {
                                      const t = teams.find(t => t.id === value)
                                      if (t) updateEditingMatch(globalIndex, 'awayTeam', t as any)
                                    }}
                                  >
                                    <SelectTrigger className="w-44 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    {match.homeTeam.logo ? (
                                      <Image
                                        src={match.homeTeam.logo}
                                        alt={match.homeTeam.name}
                                        width={24}
                                        height={24}
                                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-3 h-3 text-gray-500" />
                                      </div>
                                    )}
                                    <span className="font-medium truncate text-white drop-shadow">{match.homeTeam.name}</span>
                                  </div>
                                  {match.status === 'finished' && match.homeScore !== null && match.awayScore !== null ? (
                                    <span className="text-white/90 flex-shrink-0 font-bold px-2 drop-shadow">
                                      {match.homeScore} - {match.awayScore}
                                    </span>
                                  ) : (
                                    <span className="text-white/70 flex-shrink-0 drop-shadow">vs</span>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate text-white drop-shadow">{match.awayTeam.name}</span>
                                    {match.awayTeam.logo ? (
                                      <Image
                                        src={match.awayTeam.logo}
                                        alt={match.awayTeam.name}
                                        width={24}
                                        height={24}
                                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-3 h-3 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Date */}
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-white/70" />
                              {isEditing ? (
                                <Input
                                  type="date"
                                  value={editingMatch.date}
                                  onChange={(e) => updateEditingMatch(globalIndex, 'date', e.target.value)}
                                  className="w-32 h-8"
                                />
                              ) : (
                                <span className="text-white/90 drop-shadow">
                                  {(() => {
                                    try {
                                      const [year, month, day] = match.date.split('-').map(Number);
                                      const date = new Date(Date.UTC(year, month - 1, day));
                                      return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
                                    } catch (e) {
                                      return match.date;
                                    }
                                  })()}
                                </span>
                              )}
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-white/70" />
                              {isEditing ? (
                                <Input
                                  type="time"
                                  value={editingMatch.time}
                                  onChange={(e) => updateEditingMatch(globalIndex, 'time', e.target.value)}
                                  className="w-24 h-8"
                                />
                              ) : (
                                <span className="text-white/90 drop-shadow">{match.time}</span>
                              )}
                            </div>

                            {/* Edit & Delete Controls */}
                            {match.status === 'scheduled' && (
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        saveMatchEdit(globalIndex);
                                      }}
                                      className="h-8 w-8 p-0 backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleEditMatch(globalIndex);
                                      }}
                                      className="h-8 w-8 p-0 backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-white/30"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleEditMatch(globalIndex);
                                      }}
                                      className="h-8 w-8 p-0 backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {/* Delete Button */}
                                    <Button
                                      size="sm"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const ok = window.confirm('¿Eliminar este partido de liguilla? Esta acción no se puede deshacer.')
                                        if (!ok) return
                                        try {
                                          setMessage({ type: 'success', text: 'Eliminando partido...' })
                                          const supabase = createClientSupabaseClient()
                                          const { error } = await supabase
                                            .from('matches')
                                            .delete()
                                            .eq('id', match.id)
                                          if (error) throw new Error(error.message)
                                          setMessage({ type: 'success', text: 'Partido eliminado' })
                                          if (selectedTournamentId) {
                                            await refetchMatches()
                                          }
                                        } catch (e: any) {
                                          setMessage({ type: 'error', text: `Error eliminando partido: ${e.message || 'Error desconocido'}` })
                                        }
                                      }}
                                      className="h-8 w-8 p-0 backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Edit Score Button for finished playoff matches */}
                            {match.status === 'finished' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openScoreEditDialog(match);
                                }}
                                className="h-8 px-3 backdrop-blur-md bg-orange-500/80 hover:bg-orange-500/90 text-white border-0"
                                title="Editar marcador"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                <span className="text-xs">Marcador</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      })()}

      {!selectedTournamentId && tournaments.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No hay torneos disponibles</h3>
            <p className="text-muted-foreground mb-4">Crea un torneo primero para generar partidos</p>
            <Button variant="outline" onClick={() => window.location.href = '#tournaments'}>
              Crear Torneo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de ajuste de calendario */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm md:text-base text-white">
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
              Ajustar Calendario
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Analiza equipos y regenera el calendario automáticamente
            </DialogDescription>
          </DialogHeader>

          {adjustmentAnalysis && (
            <div className="space-y-4 py-3">
              {/* Mensaje de sugerencia */}
              <div className={`rounded-lg p-3 border ${
                adjustmentAnalysis.suggestedAction === 'regenerate'
                  ? 'border-orange-500/20 bg-orange-500/10'
                  : adjustmentAnalysis.suggestedAction === 'warning'
                  ? 'border-yellow-500/20 bg-yellow-500/10'
                  : 'border-green-500/20 bg-green-500/10'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    adjustmentAnalysis.suggestedAction === 'regenerate' ? 'text-orange-400' :
                    adjustmentAnalysis.suggestedAction === 'warning' ? 'text-yellow-400' : 'text-green-400'
                  }`} />
                  <p className="text-xs md:text-sm text-gray-300">{adjustmentAnalysis.message}</p>
                </div>
              </div>

              {/* Información de jornadas finalizadas */}
              {(adjustmentAnalysis as any).finishedRoundsCount > 0 && (
                <div className="rounded-lg bg-slate-800/50 border border-blue-500/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs md:text-sm font-medium text-white">Jornadas Finalizadas</h4>
                  </div>
                  <div className="space-y-1.5 text-xs md:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Completadas:</span>
                      <span className="text-blue-400 font-medium">{(adjustmentAnalysis as any).finishedRoundsCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Última finalizada:</span>
                      <span className="text-blue-400 font-medium">Jornada {(adjustmentAnalysis as any).lastFinishedRound}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Nuevas desde:</span>
                      <span className="text-green-400 font-medium">Jornada {(adjustmentAnalysis as any).lastFinishedRound + 1}</span>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-2 bg-slate-700/30 p-2 rounded">
                      Las jornadas 1-{(adjustmentAnalysis as any).lastFinishedRound} se mantendrán intactas.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid de equipos activos e inactivos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Equipos Activos */}
                <div className="rounded-lg bg-slate-800/50 border border-green-500/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-green-400" />
                    <h4 className="text-xs md:text-sm font-medium text-white">Activos ({adjustmentAnalysis.activeTeams.length})</h4>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {adjustmentAnalysis.teamStats
                      .filter(stat => stat.isActive)
                      .map(stat => (
                        <div key={stat.teamId} className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white">✓</span>
                            <span className="text-[10px] md:text-xs text-white truncate max-w-[100px] md:max-w-[150px]">{stat.teamName}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{stat.finishedMatches}/{stat.totalMatches}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Equipos Inactivos */}
                {adjustmentAnalysis.inactiveTeams.length > 0 && (
                  <div className="rounded-lg bg-slate-800/50 border border-red-500/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <h4 className="text-xs md:text-sm font-medium text-white">Inactivos ({adjustmentAnalysis.inactiveTeams.length})</h4>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {adjustmentAnalysis.teamStats
                        .filter(stat => !stat.isActive)
                        .map(stat => (
                          <div key={stat.teamId} className="p-2 rounded bg-red-500/10 border border-red-500/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">✗</span>
                                <span className="text-[10px] md:text-xs text-white truncate max-w-[100px] md:max-w-[150px]">{stat.teamName}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">{stat.finishedMatches}/{stat.scheduledMatches}</span>
                            </div>
                            {stat.inactivityReason && (
                              <p className="text-[8px] md:text-[10px] text-red-400 mt-1 ml-5 italic">{stat.inactivityReason}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Información sobre equipos impares */}
              {adjustmentAnalysis.hasOddTeams && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-[10px] md:text-xs text-blue-300">
                    <strong>Número impar:</strong> {adjustmentAnalysis.activeTeams.length} equipos activos, un equipo descansará cada jornada.
                  </p>
                </div>
              )}

              {/* Configuración del nuevo calendario */}
              <div className="rounded-lg bg-slate-800/50 border border-purple-500/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs md:text-sm font-medium text-white">Configuración</h4>
                </div>
                {(adjustmentAnalysis as any).currentConfig ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                      <div>
                        <span className="text-gray-400 text-[10px] md:text-xs">Días:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(adjustmentAnalysis as any).currentConfig.matchDays.map((day: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] md:text-xs">Hora inicio:</span>
                        <p className="text-purple-400 font-medium">
                          {(adjustmentAnalysis as any).currentConfig.startHour !== null
                            ? `${String((adjustmentAnalysis as any).currentConfig.startHour).padStart(2, '0')}:00`
                            : '08:00'
                          }
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 bg-purple-500/10 p-2 rounded">
                      Configuración detectada de partidos existentes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                      <div>
                        <span className="text-gray-400 text-[10px] md:text-xs">Día:</span>
                        <p className="text-purple-400 font-medium">Domingos</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] md:text-xs">Hora:</span>
                        <p className="text-purple-400 font-medium">8:00 AM</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 bg-purple-500/10 p-2 rounded">
                      Configuración por defecto (75 min por partido).
                    </p>
                  </div>
                )}
              </div>

              {/* Advertencia */}
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-[10px] md:text-xs text-red-400">
                  <strong>Advertencia:</strong> Esta acción eliminará partidos programados y regenerará el calendario con equipos activos.
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAdjustDialogOpen(false)}
                  className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
                  disabled={adjusting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={adjustCalendar}
                  disabled={adjusting || adjustmentAnalysis.suggestedAction === 'keep_current'}
                  className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm"
                >
                  {adjusting ? (
                    <>
                      <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
                      Ajustando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
                      Regenerar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de eliminación de calendario */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm md:text-base text-white">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Eliminar Calendario
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Esta acción es irreversible
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Lista de lo que se eliminará */}
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-2">
              <p className="text-red-400 font-medium text-xs md:text-sm">Se eliminará:</p>
              <ul className="text-[10px] md:text-xs text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[6px] text-white">✗</span>
                  Partidos programados y finalizados
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[6px] text-white">✗</span>
                  Resultados y estadísticas
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[6px] text-white">✗</span>
                  Fase regular y liguilla
                </li>
              </ul>
            </div>

            {/* Información del torneo */}
            {selectedTournamentId && (
              <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-gray-400">Torneo:</span>
                  <span className="text-white font-medium">{tournaments.find(t => t.id === selectedTournamentId)?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs md:text-sm mt-1">
                  <span className="text-gray-400">A eliminar:</span>
                  <span className="text-red-400 font-medium">{matches.length} partidos</span>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={deleteAllCalendar}
                disabled={deleting}
                className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
                    Eliminar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Score Edit Dialog */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-sm bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-sm md:text-base flex items-center gap-2">
              <Edit className="w-4 h-4 text-orange-400" />
              Editar Marcador
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              La tabla se recalculará automáticamente.
            </DialogDescription>
          </DialogHeader>

          {editingScoreMatch && (
            <div className="space-y-4 py-2">
              {/* Match Info */}
              <div className="text-center py-3 bg-slate-800/50 rounded-lg border border-white/10">
                <div className="flex items-center justify-center gap-2 text-xs md:text-sm">
                  <span className="font-medium text-white truncate max-w-[80px] md:max-w-[120px]">
                    {editingScoreMatch.homeTeam.name}
                  </span>
                  <span className="text-gray-500">vs</span>
                  <span className="font-medium text-white truncate max-w-[80px] md:max-w-[120px]">
                    {editingScoreMatch.awayTeam.name}
                  </span>
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 mt-1">
                  Jornada {editingScoreMatch.round}
                </div>
              </div>

              {/* Score Inputs */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <Label className="text-gray-400 text-[10px] md:text-xs mb-1 block truncate max-w-[70px] md:max-w-[100px]">
                    {editingScoreMatch.homeTeam.name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editHomeScore}
                    onChange={(e) => setEditHomeScore(parseInt(e.target.value) || 0)}
                    className="w-14 h-12 md:w-16 md:h-14 text-center text-xl md:text-2xl font-bold bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <span className="text-2xl md:text-3xl text-gray-500 font-bold mt-4">-</span>
                <div className="text-center">
                  <Label className="text-gray-400 text-[10px] md:text-xs mb-1 block truncate max-w-[70px] md:max-w-[100px]">
                    {editingScoreMatch.awayTeam.name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editAwayScore}
                    onChange={(e) => setEditAwayScore(parseInt(e.target.value) || 0)}
                    className="w-14 h-12 md:w-16 md:h-14 text-center text-xl md:text-2xl font-bold bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Original Score Reference */}
              <div className="text-center text-[10px] md:text-xs text-gray-500">
                Original: {editingScoreMatch.homeScore} - {editingScoreMatch.awayScore}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeScoreEditDialog}
                  disabled={savingScore}
                  className="flex-1 h-9 bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700/50 text-xs md:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveScoreEdit}
                  disabled={savingScore}
                  className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 text-white text-xs md:text-sm"
                >
                  {savingScore ? (
                    <>
                      <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MatchPosterGenerator
        open={isPosterDialogOpen}
        onOpenChange={setIsPosterDialogOpen}
        matches={matches}
        leagueId={leagueId}
        tournamentName={tournaments.find(t => t.id === selectedTournamentId)?.name || 'Torneo'}
      />
    </div>
  )
}