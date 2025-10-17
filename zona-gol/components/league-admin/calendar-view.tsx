"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Trophy, Loader2, Edit, Save, X, RefreshCw, Trash, Settings, AlertTriangle } from "lucide-react"
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { analyzeTeamActivity, generateRoundRobinSchedule, getNextMatchDate, CalendarAdjustmentResult } from "@/lib/utils/calendar-adjuster"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

interface CalendarViewProps {
  leagueId: string
}

interface CalendarMatch {
  id: string
  round: number | null
  homeTeam: Team
  awayTeam: Team
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
}

interface EditingMatch extends CalendarMatch {
  isEditing: boolean
}

export function CalendarView({ leagueId }: CalendarViewProps) {
  const { tournaments, getTournamentsByLeague } = useTournaments()
  const { teams, getTeamsByLeague } = useTeams()
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [matches, setMatches] = useState<CalendarMatch[]>([])
  const [editingMatches, setEditingMatches] = useState<EditingMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [adjustmentAnalysis, setAdjustmentAnalysis] = useState<CalendarAdjustmentResult | null>(null)
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    if (leagueId) {
      getTournamentsByLeague(leagueId)
      getTeamsByLeague(leagueId)
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
          home_score,
          away_score,
          bye_team_id,
          phase,
          playoff_round,
          playoff_position,
          home_team:teams!matches_home_team_id_fkey(id, name, slug),
          away_team:teams!matches_away_team_id_fkey(id, name, slug)
        `)
        .eq('tournament_id', tournamentId)
        .order('match_date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      const formattedMatches: CalendarMatch[] = matchesData?.map((match: any) => {
        // Manejar correctamente la fecha para evitar problemas de zona horaria
        let dateStr = match.match_date;
        let dateOnly = dateStr.split('T')[0];

        // Si la fecha viene en formato ISO, asegurarnos de que se muestre correctamente
        if (dateStr.includes('Z') || dateStr.includes('+')) {
          const date = new Date(dateStr);
          // Usar UTC para evitar ajustes de zona horaria
          dateOnly = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }

        return {
          id: match.id,
          round: match.round,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          date: dateOnly,
          time: match.match_time || match.match_date.split('T')[1]?.substring(0, 5) || '10:00',
          field: match.field_number || 1,
          status: match.status,
          homeScore: match.home_score,
          awayScore: match.away_score,
          byeTeamId: match.bye_team_id,
          phase: match.phase || 'regular',
          playoffRound: match.playoff_round,
          playoffPosition: match.playoff_position
        };
      }) || []

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
      
      // Recargar partidos para reflejar los cambios
      if (selectedTournamentId) {
        await loadMatches(selectedTournamentId)
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

  const analyzeCalendar = async () => {
    if (!selectedTournamentId) {
      setMessage({ type: 'error', text: 'Selecciona un torneo primero' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Obtener TODOS los equipos de la liga (activos e inactivos)
      const { data: allTeamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)

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
      let timeIndex = 0
      let fieldIndex = 1

      const newMatches: Database['public']['Tables']['matches']['Insert'][] = []

      // 10. Empezar numeración de jornadas DESPUÉS de las finalizadas
      const startingRound = lastFinishedRound + 1

      rounds.forEach((round, index) => {
        // Ajustar el número de jornada para que empiece después de las finalizadas
        const adjustedRoundNumber = startingRound + index

        // Obtener el equipo que descansa en esta jornada (si existe)
        const byeTeam = round.matches[0]?.byeTeam

        round.matches.forEach(match => {
          const assignedTime = matchTimes[timeIndex % matchTimes.length]
          const field = fieldIndex

          newMatches.push({
            tournament_id: selectedTournamentId,
            home_team_id: match.home.id,
            away_team_id: match.away.id,
            match_date: `${currentDate.toISOString().split('T')[0]}T${assignedTime}:00`,
            match_time: assignedTime,
            field_number: field,
            round: adjustedRoundNumber,
            status: 'scheduled',
            bye_team_id: byeTeam?.id || null
          })

          timeIndex++
          if (timeIndex >= matchTimes.length) {
            timeIndex = 0
            fieldIndex++
            if (fieldIndex > config.fieldsAvailable) {
              fieldIndex = 1
              currentDate = getNextValidMatchDate(currentDate, config.matchDays)
            }
          }
        })

        // Después de cada jornada, resetear y avanzar fecha
        timeIndex = 0
        fieldIndex = 1
        currentDate = getNextValidMatchDate(currentDate, config.matchDays)
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

      // Recargar partidos
      if (selectedTournamentId) {
        await loadMatches(selectedTournamentId)
      }

    } catch (error: any) {
      console.error('Error adjusting calendar:', error)
      setMessage({ type: 'error', text: `Error ajustando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setAdjusting(false)
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

  const getFilteredMatches = (matches: CalendarMatch[]) => {
    if (selectedRound === 'all') return matches
    // When filtering by round, only show regular season matches for that round
    // Playoff matches will be shown separately regardless of round filter
    return matches.filter(match => match.round === selectedRound && match.phase === 'regular')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-soccer-blue/20 text-soccer-blue border-soccer-blue/50 dark:bg-soccer-blue/30 dark:text-white dark:border-soccer-blue font-medium">Programado</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-soccer-green dark:bg-soccer-green-dark">En Juego</Badge>
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
          <h2 className="text-2xl font-bold text-foreground">Calendario de Partidos</h2>
          <p className="text-muted-foreground">Visualiza y edita los partidos programados</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={analyzeCalendar}
            disabled={loading || !selectedTournamentId}
            className="bg-soccer-gold/10 hover:bg-soccer-gold/20 border-soccer-gold/50 text-soccer-gold-dark dark:text-soccer-gold-light"
          >
            <Settings className="w-4 h-4 mr-2" />
            Ajustar Calendario
          </Button>
          <Button
            variant="outline"
            onClick={() => selectedTournamentId && loadMatches(selectedTournamentId)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
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
                <span className="text-sm text-muted-foreground">Cargando...</span>
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
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Activos
                    </div>
                    {activeTournaments.map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-soccer-green" />
                          {tournament.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allTournaments.filter(t => !t.is_active).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t">
                      Inactivos
                    </div>
                    {allTournaments.filter(t => !t.is_active).map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
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
                      <Calendar className="w-4 h-4 text-soccer-blue" />
                      Todas las jornadas
                    </div>
                  </SelectItem>
                  {getAvailableRounds(matches).map(round => (
                    <SelectItem key={round} value={round.toString()}>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-soccer-gold" />
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
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay partidos en esta jornada</h3>
            <p className="text-muted-foreground mb-4">La jornada {selectedRound} no tiene partidos programados</p>
            <Button variant="outline" onClick={() => setSelectedRound('all')}>
              Ver todas las jornadas
            </Button>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && !loading && selectedTournamentId && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay partidos programados</h3>
            <p className="text-muted-foreground mb-4">Este torneo aún no tiene partidos generados</p>
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
                  <Trophy className="w-5 h-5 text-soccer-gold" />
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
                      <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 dark:hover:bg-soccer-green/5 transition-colors">
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
                                <span className="font-medium truncate">{match.homeTeam.name}</span>
                                {match.status === 'finished' && match.homeScore !== null && match.awayScore !== null ? (
                                  <span className="text-muted-foreground flex-shrink-0 font-bold px-2">
                                    {match.homeScore} - {match.awayScore}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground flex-shrink-0">vs</span>
                                )}
                                <span className="font-medium truncate">{match.awayTeam.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editingMatch.date}
                                onChange={(e) => updateEditingMatch(globalIndex, 'date', e.target.value)}
                                className="w-32 h-8"
                              />
                            ) : (
                              <span className="text-foreground">
                                {(() => {
                                  try {
                                    // Crear fecha usando los componentes de la fecha para evitar problemas de zona horaria
                                    const [year, month, day] = match.date.split('-').map(Number);
                                    // Crear fecha con UTC para evitar ajustes de zona horaria
                                    const date = new Date(Date.UTC(year, month - 1, day));
                                    return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
                                  } catch (e) {
                                    return match.date; // Fallback si hay error
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                          
                          {/* Time */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {isEditing ? (
                              <Input
                                type="time"
                                value={editingMatch.time}
                                onChange={(e) => updateEditingMatch(globalIndex, 'time', e.target.value)}
                                className="w-24 h-8"
                              />
                            ) : (
                              <span className="text-foreground">{match.time}</span>
                            )}
                          </div>
                          
                          {/* Edit & Delete Controls */}
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-soccer-green hover:text-soccer-green-dark hover:bg-soccer-green/10"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    saveMatchEdit(globalIndex);
                                  }}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleEditMatch(globalIndex);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-soccer-blue hover:text-soccer-blue-dark bg-soccer-blue/5 hover:bg-soccer-blue/10 dark:text-white dark:hover:text-soccer-blue-light dark:bg-muted/20 dark:hover:bg-muted/30"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleEditMatch(globalIndex);
                                }}
                                disabled={match.status !== 'scheduled'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {/* Delete Button */}
                            {!isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const ok = window.confirm('¿Eliminar este partido? Esta acción no se puede deshacer.')
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
                                      await loadMatches(selectedTournamentId)
                                    }
                                  } catch (e: any) {
                                    setMessage({ type: 'error', text: `Error eliminando partido: ${e.message || 'Error desconocido'}` })
                                  }
                                }}
                                disabled={match.status !== 'scheduled'}
                                title={match.status !== 'scheduled' ? 'Solo se pueden eliminar partidos programados' : 'Eliminar partido'}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Mostrar equipo que descansa si existe */}
                {(() => {
                  const byeTeam = getByeTeamForRound(roundMatches)
                  if (!byeTeam) return null

                  return (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Equipo que descansa:
                        </span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                          {byeTeam.name}
                        </Badge>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ))}
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
              <div className="h-[2px] flex-1 bg-gradient-to-r from-soccer-gold/50 to-soccer-gold"></div>
              <h3 className="text-2xl font-bold text-soccer-gold flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                FASE DE LIGUILLA
              </h3>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-soccer-gold/50 to-soccer-gold"></div>
            </div>

            {groupedPlayoffs.map(([roundKey, roundMatches]) => (
              <Card key={roundKey} className="border-soccer-gold/30 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-soccer-gold/10 to-transparent">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-soccer-gold" />
                    {getPlayoffRoundName(roundKey)}
                    <Badge variant="outline" className="ml-2 bg-soccer-gold/20 text-soccer-gold-dark border-soccer-gold">
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
                        <div key={match.id} className="flex items-center justify-between p-4 border border-soccer-gold/20 rounded-lg hover:bg-soccer-gold/5 dark:hover:bg-soccer-gold/10 transition-colors">
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
                                <Badge variant="outline" className="text-xs border-soccer-gold/50">
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
                                  <span className="font-medium truncate">{match.homeTeam.name}</span>
                                  {match.status === 'finished' && match.homeScore !== null && match.awayScore !== null ? (
                                    <span className="text-muted-foreground flex-shrink-0 font-bold px-2">
                                      {match.homeScore} - {match.awayScore}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground flex-shrink-0">vs</span>
                                  )}
                                  <span className="font-medium truncate">{match.awayTeam.name}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Date */}
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {isEditing ? (
                                <Input
                                  type="date"
                                  value={editingMatch.date}
                                  onChange={(e) => updateEditingMatch(globalIndex, 'date', e.target.value)}
                                  className="w-32 h-8"
                                />
                              ) : (
                                <span className="text-foreground">
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
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {isEditing ? (
                                <Input
                                  type="time"
                                  value={editingMatch.time}
                                  onChange={(e) => updateEditingMatch(globalIndex, 'time', e.target.value)}
                                  className="w-24 h-8"
                                />
                              ) : (
                                <span className="text-foreground">{match.time}</span>
                              )}
                            </div>

                            {/* Edit & Delete Controls */}
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-soccer-green hover:text-soccer-green-dark hover:bg-soccer-green/10"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      saveMatchEdit(globalIndex);
                                    }}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleEditMatch(globalIndex);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-soccer-blue hover:text-soccer-blue-dark bg-soccer-blue/5 hover:bg-soccer-blue/10 dark:text-white dark:hover:text-soccer-blue-light dark:bg-muted/20 dark:hover:bg-muted/30"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleEditMatch(globalIndex);
                                  }}
                                  disabled={match.status !== 'scheduled'}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {/* Delete Button */}
                              {!isEditing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                                        await loadMatches(selectedTournamentId)
                                      }
                                    } catch (e: any) {
                                      setMessage({ type: 'error', text: `Error eliminando partido: ${e.message || 'Error desconocido'}` })
                                    }
                                  }}
                                  disabled={match.status !== 'scheduled'}
                                  title={match.status !== 'scheduled' ? 'Solo se pueden eliminar partidos programados' : 'Eliminar partido'}
                                >
                                  <Trash className="w-4 h-4" />
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
        )
      })()}

      {!selectedTournamentId && tournaments.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay torneos disponibles</h3>
            <p className="text-muted-foreground mb-4">Crea un torneo primero para generar partidos</p>
            <Button variant="outline" onClick={() => window.location.href = '#tournaments'}>
              Crear Torneo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de ajuste de calendario */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="w-6 h-6 text-soccer-gold" />
              Ajustar Calendario por Equipos Inactivos
            </DialogTitle>
            <DialogDescription>
              Analiza los equipos activos e inactivos del torneo y regenera el calendario automáticamente
            </DialogDescription>
          </DialogHeader>

          {adjustmentAnalysis && (
            <div className="space-y-6 py-4">
              {/* Mensaje de sugerencia */}
              <Alert className={
                adjustmentAnalysis.suggestedAction === 'regenerate'
                  ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'
                  : adjustmentAnalysis.suggestedAction === 'warning'
                  ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-green-200 bg-green-50 dark:bg-green-900/20'
              }>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="ml-2">
                  {adjustmentAnalysis.message}
                </AlertDescription>
              </Alert>

              {/* Información de jornadas finalizadas */}
              {(adjustmentAnalysis as any).finishedRoundsCount > 0 && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Jornadas Finalizadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Jornadas completadas:
                        </span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300">
                          {(adjustmentAnalysis as any).finishedRoundsCount} jornadas
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Última jornada finalizada:
                        </span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300">
                          Jornada {(adjustmentAnalysis as any).lastFinishedRound}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Nuevas jornadas empezarán desde:
                        </span>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300">
                          Jornada {(adjustmentAnalysis as any).lastFinishedRound + 1}
                        </Badge>
                      </div>
                      <Alert className="mt-3 border-blue-300 bg-blue-100 dark:bg-blue-950/40">
                        <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                          ℹ️ Las jornadas 1-{(adjustmentAnalysis as any).lastFinishedRound} se mantendrán intactas.
                          Solo se regenerarán las jornadas futuras con los equipos activos.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Estadísticas de equipos activos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-soccer-green" />
                    Equipos Activos ({adjustmentAnalysis.activeTeams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {adjustmentAnalysis.teamStats
                      .filter(stat => stat.isActive)
                      .map(stat => (
                        <div
                          key={stat.teamId}
                          className="flex items-center justify-between p-3 border rounded-lg bg-soccer-green/5 dark:bg-soccer-green/10"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-soccer-green/20 text-soccer-green border-soccer-green/50">
                              ✓
                            </Badge>
                            <span className="font-medium">{stat.teamName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stat.finishedMatches} jugados / {stat.totalMatches} total
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Estadísticas de equipos inactivos */}
              {adjustmentAnalysis.inactiveTeams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Equipos Inactivos ({adjustmentAnalysis.inactiveTeams.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {adjustmentAnalysis.teamStats
                        .filter(stat => !stat.isActive)
                        .map(stat => (
                          <div
                            key={stat.teamId}
                            className="flex flex-col gap-2 p-3 border rounded-lg bg-red-50 dark:bg-red-900/10"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-red-100 text-red-600 border-red-300 dark:bg-red-900/30">
                                  ✗
                                </Badge>
                                <span className="font-medium">{stat.teamName}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {stat.finishedMatches} jugados / {stat.scheduledMatches} programados
                              </div>
                            </div>
                            {stat.inactivityReason && (
                              <div className="text-xs text-red-600 dark:text-red-400 ml-8 italic">
                                Motivo: {stat.inactivityReason}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Información sobre equipos impares */}
              {adjustmentAnalysis.hasOddTeams && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <AlertDescription>
                    <strong>Número impar de equipos:</strong> Como hay {adjustmentAnalysis.activeTeams.length} equipos activos,
                    un equipo diferente descansará en cada jornada. Esto se manejará automáticamente en el nuevo calendario.
                  </AlertDescription>
                </Alert>
              )}

              {/* Configuración del nuevo calendario */}
              <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Configuración del Nuevo Calendario
                  </CardTitle>
                  <CardDescription className="text-purple-700 dark:text-purple-300">
                    Se mantendrá la configuración detectada de los partidos existentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(adjustmentAnalysis as any).currentConfig ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              📅 Días de juego detectados:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(adjustmentAnalysis as any).currentConfig.matchDays.map((day: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                  {day}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              🕐 Hora de inicio detectada:
                            </span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                              {(adjustmentAnalysis as any).currentConfig.startHour !== null
                                ? `${String((adjustmentAnalysis as any).currentConfig.startHour).padStart(2, '0')}:00`
                                : '08:00'
                              }
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              ⏱️ Configuración:
                            </span>
                            <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                              <div>• Duración calculada automáticamente</div>
                              <div>• Basada en partidos existentes</div>
                              <div>• Canchas según configuración actual</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Alert className="border-purple-300 bg-purple-100 dark:bg-purple-950/40">
                        <AlertDescription className="text-xs text-purple-800 dark:text-purple-200">
                          💡 El sistema detectó automáticamente los días, horarios y duración de partidos basándose en los partidos existentes.
                          {(adjustmentAnalysis as any).lastFinishedRound > 0 && (
                            <> La nueva temporada comenzará en el próximo día de juego después de la última jornada finalizada.</>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              📅 Día de juego (por defecto):
                            </span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                              Domingos
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              🕐 Hora de inicio (por defecto):
                            </span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                              8:00 AM
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-100 block mb-1">
                              ⏱️ Duración por partido (por defecto):
                            </span>
                            <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                              <div>• 1er tiempo: 30 min</div>
                              <div>• Descanso: 15 min</div>
                              <div>• 2do tiempo: 30 min</div>
                              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 mt-1">
                                Total: 75 minutos
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Alert className="border-purple-300 bg-purple-100 dark:bg-purple-950/40">
                        <AlertDescription className="text-xs text-purple-800 dark:text-purple-200">
                          ℹ️ No se encontraron partidos existentes. Se usará la configuración por defecto: Domingos a las 8:00 AM, partidos de 75 minutos.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acciones */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsAdjustDialogOpen(false)}
                  className="flex-1"
                  disabled={adjusting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={adjustCalendar}
                  disabled={adjusting || adjustmentAnalysis.suggestedAction === 'keep_current'}
                  className="flex-1 bg-soccer-green hover:bg-soccer-green-dark"
                >
                  {adjusting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ajustando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerar Calendario
                    </>
                  )}
                </Button>
              </div>

              {/* Advertencia */}
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
                  <strong>Advertencia:</strong> Esta acción eliminará todos los partidos programados (no finalizados)
                  y generará un nuevo calendario solo con los equipos activos. Los partidos ya finalizados se mantendrán.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}