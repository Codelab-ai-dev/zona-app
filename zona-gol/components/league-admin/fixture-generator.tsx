"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users, Trophy, Loader2, Plus, Eye, X, Sparkles, Cpu } from "lucide-react"
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { generateMultipleJornadaEmbeddings, sendJornadaNotification } from "@/lib/utils/generate-embeddings"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type MatchInsert = Database['public']['Tables']['matches']['Insert']

interface FixtureGeneratorProps {
  leagueId: string
}

interface FixtureConfig {
  tournamentId: string
  startDate: string
  endDate: string // fecha límite para completar el torneo
  matchDays: string[] // ['saturday', 'sunday', etc.]
  startTime: string // Horario de inicio (ej: '08:00')
  endTime: string // Horario de fin (ej: '22:00')
  fieldsAvailable: number
  doubleRound: boolean // ida y vuelta
  matchDuration: {
    halfTime: number // duration in minutes (20-45)
    breakTime: number // break time in minutes (10-15)
  }
  breakBetweenMatches: number // Tiempo de descanso entre partidos en minutos
  championFixedSchedule: boolean
  championPreferredTime?: string
}

interface GeneratedMatch {
  round: number
  homeTeam: Team
  awayTeam: Team
  date: string
  time: string
  field: number
  byeTeam?: Team // Equipo que descansa en esta jornada (solo en el primer partido de la jornada)
}

interface ManualMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  field: number
}

interface ManualRound {
  round: number
  matches: ManualMatch[]
}

export function FixtureGenerator({ leagueId }: FixtureGeneratorProps) {
  const { teams, getTeamsByLeague } = useTeams()
  const { tournaments, getTournamentsByLeague } = useTournaments()
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedFixtures, setGeneratedFixtures] = useState<GeneratedMatch[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedTournament, setSelectedTournament] = useState<Database['public']['Tables']['tournaments']['Row'] | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]) // For group_knockout tournaments

  // Manual mode states
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualRounds, setManualRounds] = useState<ManualRound[]>([])
  const [manualTournamentId, setManualTournamentId] = useState<string>('')
  const [nextRoundNumber, setNextRoundNumber] = useState<number>(1)
  const [loadingExistingRounds, setLoadingExistingRounds] = useState(false)
  const [existingRoundsCount, setExistingRoundsCount] = useState<number>(0)

  // Edit existing round states
  const [manualMode, setManualMode] = useState<'create' | 'edit'>('create')
  const [existingRoundsList, setExistingRoundsList] = useState<number[]>([])
  const [selectedEditRound, setSelectedEditRound] = useState<number | null>(null)
  const [editRoundMatches, setEditRoundMatches] = useState<ManualMatch[]>([])
  const [loadingEditRound, setLoadingEditRound] = useState(false)
  const [savingEditRound, setSavingEditRound] = useState(false)
  const [originalMatchIds, setOriginalMatchIds] = useState<string[]>([])

  // AI Generation state
  const [useAI, setUseAI] = useState(true) // Usar IA por defecto
  const [generatingAI, setGeneratingAI] = useState(false)

  const [config, setConfig] = useState<FixtureConfig>({
    tournamentId: "",
    startDate: "",
    endDate: "",
    matchDays: ["saturday"],
    startTime: "08:00",
    endTime: "", // Vacío = modo automático (genera los horarios necesarios)
    fieldsAvailable: 1,
    doubleRound: false,
    matchDuration: {
      halfTime: 20,
      breakTime: 10
    },
    breakBetweenMatches: 15, // 15 minutos de descanso entre partidos
    championFixedSchedule: false
  })

  useEffect(() => {
    if (leagueId) {
      getTeamsByLeague(leagueId)
      getTournamentsByLeague(leagueId)
    }
  }, [leagueId])

  // Load selected tournament details when tournament ID changes
  useEffect(() => {
    if (config.tournamentId) {
      const tournament = tournaments.find(t => t.id === config.tournamentId)
      setSelectedTournament(tournament || null)

      // For group_knockout, initialize with all groups selected
      if (tournament?.tournament_format === 'group_knockout' && tournament.number_of_groups) {
        const allGroups = Array.from({ length: tournament.number_of_groups }, (_, i) =>
          String.fromCharCode(65 + i) // A, B, C, D, etc.
        )
        setSelectedGroups(allGroups)
      } else {
        setSelectedGroups([])
      }
    } else {
      setSelectedTournament(null)
      setSelectedGroups([])
    }
  }, [config.tournamentId, tournaments])

  // Load existing rounds when manual tournament is selected
  const loadExistingRounds = async (tournamentId: string) => {
    if (!tournamentId) {
      setNextRoundNumber(1)
      setExistingRoundsCount(0)
      setExistingRoundsList([])
      setManualRounds([])
      return
    }

    setLoadingExistingRounds(true)
    try {
      const supabase = createClientSupabaseClient()

      // Get existing matches for this tournament
      const { data: existingMatches, error } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_id', tournamentId)
        .not('round', 'is', null)
        .order('round', { ascending: false })
        .limit(1)

      if (error) throw error

      // Find the highest round number
      const matchesWithRound = existingMatches as { round: number | null }[] | null
      const maxRound = matchesWithRound && matchesWithRound.length > 0
        ? (matchesWithRound[0].round || 0)
        : 0

      // Count total existing rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_id', tournamentId)
        .not('round', 'is', null)

      if (roundsError) throw roundsError

      const roundsDataTyped = roundsData as { round: number | null }[] | null
      const uniqueRounds = Array.from(new Set(roundsDataTyped?.map(m => m.round).filter((r): r is number => r !== null) || []))
      uniqueRounds.sort((a, b) => a - b)
      setExistingRoundsList(uniqueRounds)
      setExistingRoundsCount(uniqueRounds.length)
      setNextRoundNumber(maxRound + 1)
      setManualRounds([])
    } catch (error) {
      console.error('Error loading existing rounds:', error)
      setNextRoundNumber(1)
      setExistingRoundsCount(0)
      setExistingRoundsList([])
    } finally {
      setLoadingExistingRounds(false)
    }
  }

  // Load matches from a specific round for editing
  const loadRoundMatches = async (roundNumber: number) => {
    if (!manualTournamentId || roundNumber === null) return

    setLoadingEditRound(true)
    setMessage(null)
    try {
      const supabase = createClientSupabaseClient()

      const { data: matches, error } = await supabase
        .from('matches')
        .select('id, home_team_id, away_team_id, match_date, match_time, field_number')
        .eq('tournament_id', manualTournamentId)
        .eq('round', roundNumber)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })

      if (error) throw error

      type MatchRow = { id: string; home_team_id: string; away_team_id: string; match_date: string | null; match_time: string | null; field_number: number | null }
      const matchesTyped = (matches || []) as MatchRow[]
      const loadedMatches: ManualMatch[] = matchesTyped.map(m => {
        // Ensure time format is HH:MM (without seconds)
        const rawTime = m.match_time || '08:00'
        const timeFormatted = rawTime.length === 5 ? rawTime : rawTime.substring(0, 5)
        return {
          id: m.id,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          date: m.match_date ? m.match_date.split('T')[0] : '',
          time: timeFormatted,
          field: m.field_number || 1
        }
      })

      setEditRoundMatches(loadedMatches)
      setOriginalMatchIds(loadedMatches.map(m => m.id))
      setSelectedEditRound(roundNumber)
    } catch (error) {
      console.error('Error loading round matches:', error)
      setMessage({ type: 'error', text: 'Error cargando partidos de la jornada' })
    } finally {
      setLoadingEditRound(false)
    }
  }

  // Save edited round matches
  const saveEditedRound = async () => {
    if (!manualTournamentId || selectedEditRound === null) return

    setSavingEditRound(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Validate all matches have required data
      const invalidMatch = editRoundMatches.find(m => !m.homeTeamId || !m.awayTeamId || !m.date)
      if (invalidMatch) {
        setMessage({ type: 'error', text: 'Todos los partidos deben tener equipos y fecha' })
        setSavingEditRound(false)
        return
      }

      // Find matches to delete (original IDs not in current list)
      const currentIds = editRoundMatches.filter(m => !m.id.startsWith('new-')).map(m => m.id)
      const idsToDelete = originalMatchIds.filter(id => !currentIds.includes(id))

      console.log('📝 Saving edited round:', {
        selectedEditRound,
        totalMatches: editRoundMatches.length,
        toDelete: idsToDelete.length,
        toUpdate: currentIds.length,
        toInsert: editRoundMatches.filter(m => m.id.startsWith('new-')).length
      })

      // Delete removed matches
      if (idsToDelete.length > 0) {
        console.log('🗑️ Deleting matches:', idsToDelete)
        const { error: deleteError } = await (supabase
          .from('matches') as any)
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          console.error('❌ Delete error:', deleteError)
          throw new Error(`Error eliminando partidos: ${deleteError.message || JSON.stringify(deleteError)}`)
        }
        console.log('✅ Deleted successfully')
      }

      // Update existing matches
      const existingMatchesToUpdate = editRoundMatches.filter(m => !m.id.startsWith('new-'))
      for (const match of existingMatchesToUpdate) {
        console.log('📝 Updating match:', match.id)
        // Ensure time format is HH:MM (without seconds)
        const timeFormatted = match.time.length === 5 ? match.time : match.time.substring(0, 5)
        const updateData = {
          home_team_id: match.homeTeamId,
          away_team_id: match.awayTeamId,
          match_date: `${match.date}T${timeFormatted}:00`,
          match_time: timeFormatted,
          field_number: match.field,
          updated_at: new Date().toISOString()
        }
        const { error: updateError } = await (supabase
          .from('matches') as any)
          .update(updateData)
          .eq('id', match.id)

        if (updateError) {
          console.error('❌ Update error for match', match.id, ':', updateError)
          throw new Error(`Error actualizando partido: ${updateError.message || JSON.stringify(updateError)}`)
        }
        console.log('✅ Updated match:', match.id)
      }

      // Insert new matches
      const newMatches = editRoundMatches.filter(m => m.id.startsWith('new-'))
      if (newMatches.length > 0) {
        console.log('➕ Inserting new matches:', newMatches.length)
        const matchesToInsert = newMatches.map(match => {
          // Ensure time format is HH:MM (without seconds)
          const timeFormatted = match.time.length === 5 ? match.time : match.time.substring(0, 5)
          return {
            tournament_id: manualTournamentId,
            home_team_id: match.homeTeamId,
            away_team_id: match.awayTeamId,
            match_date: `${match.date}T${timeFormatted}:00`,
            match_time: timeFormatted,
            field_number: match.field,
            round: selectedEditRound,
            status: 'scheduled' as const
          }
        })

        const { error: insertError } = await (supabase
          .from('matches') as any)
          .insert(matchesToInsert)

        if (insertError) {
          console.error('❌ Insert error:', insertError)
          throw new Error(`Error insertando partidos: ${insertError.message || JSON.stringify(insertError)}`)
        }
        console.log('✅ Inserted new matches')
      }

      // Regenerate embeddings for this round
      const tournament = tournaments.find(t => t.id === manualTournamentId)
      if (tournament && leagueId) {
        generateMultipleJornadaEmbeddings(leagueId, manualTournamentId, [selectedEditRound])
          .catch(err => console.warn('Error regenerando embeddings de jornada:', err))
      }

      setMessage({ type: 'success', text: `Jornada ${selectedEditRound} actualizada exitosamente` })

      // Reset edit mode
      setSelectedEditRound(null)
      setEditRoundMatches([])
      setOriginalMatchIds([])
      setManualMode('create')

      // Reload rounds info
      await loadExistingRounds(manualTournamentId)
    } catch (error: any) {
      console.error('Error saving edited round:', error)
      setMessage({ type: 'error', text: `Error guardando jornada: ${error.message || 'Error desconocido'}` })
    } finally {
      setSavingEditRound(false)
    }
  }

  // Load existing matches from tournament to avoid duplicates in auto mode
  const loadExistingMatchPairs = async (tournamentId: string, isDoubleRound: boolean): Promise<{
    existingPairs: Set<string>,
    lastRound: number,
    totalExistingMatches: number
  }> => {
    const supabase = createClientSupabaseClient()

    const { data: existingMatches, error } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, round')
      .eq('tournament_id', tournamentId)
      .not('round', 'is', null)

    if (error) {
      console.error('Error loading existing matches:', error)
      return { existingPairs: new Set(), lastRound: 0, totalExistingMatches: 0 }
    }

    const matchesTyped = existingMatches as { home_team_id: string, away_team_id: string, round: number | null }[] | null

    if (!matchesTyped || matchesTyped.length === 0) {
      return { existingPairs: new Set(), lastRound: 0, totalExistingMatches: 0 }
    }

    const existingPairs = new Set<string>()
    let maxRound = 0

    matchesTyped.forEach(match => {
      if (isDoubleRound) {
        // For ida y vuelta: A vs B and B vs A are DIFFERENT matches
        // Only add the exact match (home-away in that order)
        existingPairs.add(`${match.home_team_id}-${match.away_team_id}`)
      } else {
        // For solo ida: A vs B and B vs A are the SAME match
        // Add both directions to filter the pair regardless of home/away
        existingPairs.add(`${match.home_team_id}-${match.away_team_id}`)
        existingPairs.add(`${match.away_team_id}-${match.home_team_id}`)
      }

      if (match.round && match.round > maxRound) {
        maxRound = match.round
      }
    })

    return {
      existingPairs,
      lastRound: maxRound,
      totalExistingMatches: matchesTyped.length
    }
  }

  // Effect to load existing rounds when manual tournament changes
  useEffect(() => {
    if (mode === 'manual' && manualTournamentId) {
      loadExistingRounds(manualTournamentId)
    }
  }, [manualTournamentId, mode])

  const activeTournaments = tournaments.filter(t => t.is_active)
  const activeTeams = teams.filter(t => t.is_active)

  // Filter teams based on tournament format and selected groups
  const getFilteredTeams = (): Team[] => {
    if (!selectedTournament) return activeTeams

    // For group_knockout, filter by selected groups
    if (selectedTournament.tournament_format === 'group_knockout') {
      if (selectedGroups.length === 0) return []
      return activeTeams.filter(team =>
        team.group_name && selectedGroups.includes(team.group_name)
      )
    }

    // For other formats, return all active teams
    return activeTeams
  }

  // Generate round-robin fixtures
  const generateRoundRobinFixtures = (teams: Team[], doubleRound = false): Array<{round: number, matches: Array<{home: Team, away: Team}>, byeTeam?: Team}> => {
    if (teams.length < 2) return []

    const teamList = [...teams]
    const rounds: Array<{round: number, matches: Array<{home: Team, away: Team}>, byeTeam?: Team}> = []
    const hasOddTeams = teamList.length % 2 !== 0

    // If odd number of teams, add a "bye" team
    if (hasOddTeams) {
      teamList.push({ id: 'bye', name: 'Descanso', slug: 'bye' } as Team)
    }

    const numTeams = teamList.length
    const numRounds = numTeams - 1
    const matchesPerRound = numTeams / 2

    for (let round = 0; round < numRounds; round++) {
      const roundMatches: Array<{home: Team, away: Team}> = []
      let byeTeam: Team | undefined = undefined

      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1)
        const away = (numTeams - 1 - match + round) % (numTeams - 1)

        let homeTeam = teamList[home]
        let awayTeam = teamList[away]

        // The last team stays fixed
        if (match === 0) {
          awayTeam = teamList[numTeams - 1]
        }

        // Track the team that has a bye (rest)
        if (homeTeam.id === 'bye') {
          byeTeam = awayTeam
        } else if (awayTeam.id === 'bye') {
          byeTeam = homeTeam
        }

        // Skip matches with "bye" team
        if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
          roundMatches.push({ home: homeTeam, away: awayTeam })
        }
      }

      if (roundMatches.length > 0) {
        rounds.push({ round: round + 1, matches: roundMatches, byeTeam })
      }
    }

    // If double round (ida y vuelta), add return fixtures
    if (doubleRound) {
      const returnRounds = rounds.map(round => ({
        round: round.round + numRounds,
        matches: round.matches.map(match => ({
          home: match.away,
          away: match.home
        })),
        byeTeam: round.byeTeam // Same team rests in both halves
      }))
      rounds.push(...returnRounds)
    }

    return rounds
  }

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Generate available time slots based on start time and match duration
  // If endTime is empty or "auto", generates enough slots for all matches in a round
  const generateAvailableTimeSlots = (matchesPerRound?: number): string[] => {
    if (!config.startTime) return []

    const timeSlots: string[] = []

    // Parse start time
    const [startHour, startMinute] = config.startTime.split(':').map(Number)

    // Convert to minutes from midnight
    let currentMinutes = startHour * 60 + startMinute

    // Calculate total match duration (including halftime, break, and rest between matches)
    const matchDurationMinutes = (config.matchDuration.halfTime * 2) + config.matchDuration.breakTime + config.breakBetweenMatches

    // Determine how many slots we need
    let maxSlots: number

    if (!config.endTime || config.endTime === 'auto') {
      // Auto mode: calculate slots needed based on matches per round and fields
      const slotsNeeded = matchesPerRound
        ? Math.ceil(matchesPerRound / config.fieldsAvailable)
        : 15 // Default to 15 slots if not specified
      maxSlots = slotsNeeded
    } else {
      // Fixed end time mode
      const [endHour, endMinute] = config.endTime.split(':').map(Number)
      const endMinutes = endHour * 60 + endMinute
      maxSlots = Math.floor((endMinutes - currentMinutes) / matchDurationMinutes)
    }

    // Generate time slots
    for (let i = 0; i < maxSlots; i++) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60

      // Stop if we go past midnight (1440 minutes)
      if (currentMinutes >= 1440) break

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      timeSlots.push(timeString)

      // Move to next slot
      currentMinutes += matchDurationMinutes
    }

    return timeSlots
  }

  // Generate fixtures using AI (Groq)
  const generateFixturesWithAI = async () => {
    const filteredTeams = getFilteredTeams()

    if (!config.tournamentId || !config.startDate || !config.endDate || filteredTeams.length < 2) {
      setMessage({ type: 'error', text: 'Faltan datos requeridos o no hay suficientes equipos' })
      return
    }

    setGeneratingAI(true)
    setMessage(null)

    try {
      // Load existing matches
      const { existingPairs, lastRound, totalExistingMatches } = await loadExistingMatchPairs(config.tournamentId, config.doubleRound)

      // Prepare teams data for AI
      const teamsData = filteredTeams.map(t => ({ id: t.id, name: t.name }))

      // Prepare existing matches data
      const supabase = createClientSupabaseClient()
      const { data: existingMatchesData } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id, round')
        .eq('tournament_id', config.tournamentId)

      const existingMatches = (existingMatchesData || []).map(m => ({
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        round: m.round || 0
      }))

      console.log('🔢 Llamando a CP-SAT Solver para generar fixtures...')

      const response = await fetch('/api/fixtures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams: teamsData,
          existingMatches,
          isDoubleRound: config.doubleRound
        })
      })

      const result = await response.json()

      if (!result.success) {
        // If there are duplicates, fetch detailed info
        if (result.error?.includes('Conflictos') || result.error?.includes('duplicado')) {
          const dupResponse = await fetch(`/api/fixtures/duplicates?tournamentId=${config.tournamentId}`)
          const dupResult = await dupResponse.json()

          if (dupResult.success && dupResult.duplicates?.length > 0) {
            const dupList = dupResult.duplicates.map((d: any) =>
              `• ${d.pair}: Jornadas ${d.matches.map((m: any) => m.round).join(' y ')} (IDs: ${d.matches.map((m: any) => m.id.slice(0,8)).join(', ')})`
            ).join('\n')

            throw new Error(`Se encontraron ${dupResult.duplicatesFound} partidos duplicados:\n\n${dupList}\n\nDebes eliminar los duplicados antes de generar nuevos fixtures.`)
          }
        }
        throw new Error(result.error || 'Error al generar fixtures')
      }

      // Transform AI response to GeneratedMatch format
      const aiRounds = result.data.rounds
      const generatedMatches: GeneratedMatch[] = []

      // Generate time slots
      const maxMatchesPerRound = Math.max(...aiRounds.map((r: any) => r.matches.length))
      const availableTimes = generateAvailableTimeSlots(maxMatchesPerRound)

      if (availableTimes.length === 0) {
        throw new Error('No se pueden generar horarios con la configuración actual')
      }

      // Calculate dates for each round
      const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number)
      const startDateObj = new Date(startYear, startMonth - 1, startDay)

      const targetDays = config.matchDays.map(day => {
        switch(day) {
          case 'sunday': return 0
          case 'monday': return 1
          case 'tuesday': return 2
          case 'wednesday': return 3
          case 'thursday': return 4
          case 'friday': return 5
          case 'saturday': return 6
          default: return 6
        }
      })

      // Find available match dates
      const getNextMatchDate = (fromDate: Date): Date => {
        const date = new Date(fromDate)
        while (!targetDays.includes(date.getDay())) {
          date.setDate(date.getDate() + 1)
        }
        return date
      }

      let currentDate = getNextMatchDate(startDateObj)

      // Create team lookup map
      const teamMap = new Map(filteredTeams.map(t => [t.id, t]))

      aiRounds.forEach((round: any, roundIdx: number) => {
        round.matches.forEach((match: any, matchIdx: number) => {
          const homeTeam = teamMap.get(match.homeTeamId)
          const awayTeam = teamMap.get(match.awayTeamId)

          if (!homeTeam || !awayTeam) {
            console.warn(`Equipo no encontrado: ${match.homeTeamId} o ${match.awayTeamId}`)
            return
          }

          const timeSlotIdx = matchIdx % availableTimes.length
          const fieldNumber = (Math.floor(matchIdx / availableTimes.length) % config.fieldsAvailable) + 1

          generatedMatches.push({
            round: round.round, // AI already returns correct round numbers
            homeTeam,
            awayTeam,
            date: formatDateToYYYYMMDD(currentDate),
            time: availableTimes[timeSlotIdx],
            field: fieldNumber,
            byeTeam: matchIdx === 0 && round.byeTeamId ? teamMap.get(round.byeTeamId) : undefined
          })
        })

        // Move to next match day for next round
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate = getNextMatchDate(currentDate)
      })

      if (generatedMatches.length === 0) {
        throw new Error('La IA no generó partidos válidos')
      }

      setGeneratedFixtures(generatedMatches)
      setIsPreviewOpen(true)
      setMessage({
        type: 'success',
        text: `✅ Se generaron ${generatedMatches.length} partidos en ${aiRounds.length} jornadas`
      })

    } catch (error) {
      console.error('Error generating fixtures:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al generar fixtures'
      })
    } finally {
      setGeneratingAI(false)
    }
  }

  const generateFixtures = async () => {
    const filteredTeams = getFilteredTeams()

    // Validations
    if (!config.tournamentId || !config.startDate || !config.endDate || filteredTeams.length < 2) {
      const errorMsg = selectedTournament?.tournament_format === 'group_knockout'
        ? 'Faltan datos requeridos (incluye fecha de inicio Y fecha de fin), no hay suficientes equipos en los grupos seleccionados (mínimo 2), o los equipos no han sido asignados a grupos'
        : 'Faltan datos requeridos (incluye fecha de inicio Y fecha de fin) o no hay suficientes equipos activos (mínimo 2)'
      setMessage({ type: 'error', text: errorMsg })
      return
    }

    // Validate that end date is after start date
    const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number)
    const startDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)

    if (endDate <= startDate) {
      setMessage({ type: 'error', text: 'La fecha de fin debe ser posterior a la fecha de inicio' })
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      // Check for existing matches in this tournament
      const { existingPairs, lastRound, totalExistingMatches } = await loadExistingMatchPairs(config.tournamentId, config.doubleRound)

      console.log('📊 Partidos existentes:', {
        totalExistingMatches,
        lastRound,
        existingPairsCount: existingPairs.size / 2 // Divided by 2 because we store both directions
      })

      let allRounds: Array<{round: number, matches: Array<{home: Team, away: Team}>, byeTeam?: Team}> = []

      // For group_knockout format, generate fixtures per group
      if (selectedTournament?.tournament_format === 'group_knockout') {
        let roundOffset = 0

        selectedGroups.forEach(groupName => {
          const groupTeams = filteredTeams.filter(team => team.group_name === groupName)
          if (groupTeams.length >= 2) {
            const groupRounds = generateRoundRobinFixtures(groupTeams, config.doubleRound)
            // Adjust round numbers to be sequential across all groups
            const adjustedRounds = groupRounds.map(round => ({
              ...round,
              round: round.round + roundOffset
            }))
            allRounds.push(...adjustedRounds)
            roundOffset = Math.max(...allRounds.map(r => r.round))
          }
        })
      } else {
        // For league and knockout formats, generate normal round-robin
        allRounds = generateRoundRobinFixtures(filteredTeams, config.doubleRound)
      }

      // If there are existing matches, filter out already played/scheduled matchups
      if (totalExistingMatches > 0) {
        console.log('🔍 Filtrando partidos ya existentes...')

        // Collect all remaining matches (not yet played)
        const remainingMatches: Array<{home: Team, away: Team}> = []

        allRounds.forEach(round => {
          round.matches.forEach(match => {
            const pairKey = `${match.home.id}-${match.away.id}`
            const isExisting = existingPairs.has(pairKey)
            if (!isExisting) {
              remainingMatches.push(match)
            } else {
              console.log(`  ⏭️ Saltando partido existente: ${match.home.name} vs ${match.away.name}`)
            }
          })
        })

        console.log(`📊 Partidos restantes por programar: ${remainingMatches.length}`)

        // Check if there are any new matches to generate
        if (remainingMatches.length === 0) {
          setMessage({
            type: 'error',
            text: 'Ya se han generado todos los partidos posibles para este torneo. No hay más emparejamientos disponibles.'
          })
          setGenerating(false)
          return
        }

        // Simple approach: filter existing matches from the original round-robin structure
        // This preserves the round-robin's natural distribution
        const teamsInTournament = filteredTeams
        const matchesPerRound = Math.floor(teamsInTournament.length / 2)

        console.log(`📊 Configuración: ${teamsInTournament.length} equipos, ${matchesPerRound} partidos por jornada`)

        // Filter each round, keeping only non-existing matches
        const filteredRounds: Array<{round: number, matches: Array<{home: Team, away: Team}>, byeTeam?: Team}> = []

        allRounds.forEach(round => {
          const filteredMatches = round.matches.filter(match => {
            const pairKey = `${match.home.id}-${match.away.id}`
            return !existingPairs.has(pairKey)
          })

          if (filteredMatches.length > 0) {
            filteredRounds.push({
              round: lastRound + filteredRounds.length + 1,
              matches: filteredMatches,
              byeTeam: round.byeTeam
            })
          }
        })

        allRounds = filteredRounds

        // Log final statistics
        const totalMatchesDistributed = allRounds.reduce((sum, r) => sum + r.matches.length, 0)
        console.log(`✅ Jornadas generadas: ${allRounds.length}`)
        console.log(`   - Partidos distribuidos: ${totalMatchesDistributed}`)
      }

      const generatedMatches: GeneratedMatch[] = []

      // Calculate max matches per round to determine time slots needed
      const maxMatchesPerRound = Math.max(...allRounds.map(r => r.matches.length))

      // Generate available time slots based on configuration
      const availableTimes = generateAvailableTimeSlots(maxMatchesPerRound)

      if (availableTimes.length === 0) {
        setMessage({
          type: 'error',
          text: 'No se pueden generar horarios con la configuración actual. Verifica el horario de inicio y duración de partidos.'
        })
        setGenerating(false)
        return
      }

      // Calculate total available match slots within the date range
      // Parse dates correctly to avoid timezone issues
      const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number)
      const startDateObj = new Date(startYear, startMonth - 1, startDay)
      const endDateObj = new Date(endYear, endMonth - 1, endDay)
      const totalMatches = allRounds.reduce((sum, round) => sum + round.matches.length, 0)

      // Calculate available days
      const targetDays = config.matchDays.map(day => {
        switch(day) {
          case 'sunday': return 0
          case 'monday': return 1
          case 'tuesday': return 2
          case 'wednesday': return 3
          case 'thursday': return 4
          case 'friday': return 5
          case 'saturday': return 6
          default: return 6
        }
      })

      // Count available match days in the date range
      let availableMatchDays = 0
      let tempDate = new Date(startDateObj.getTime()) // Use getTime() for proper copy
      while (tempDate <= endDateObj) {
        if (targetDays.includes(tempDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
          availableMatchDays++
        }
        tempDate.setDate(tempDate.getDate() + 1)
      }

      // Calculate slots per day
      const slotsPerDay = availableTimes.length * config.fieldsAvailable
      const totalAvailableSlots = availableMatchDays * slotsPerDay

      // Check if we have enough slots
      if (totalAvailableSlots < totalMatches) {
        const daysNeeded = Math.ceil(totalMatches / slotsPerDay)
        setMessage({
          type: 'error',
          text: `No hay suficientes espacios en el rango de fechas seleccionado. Se necesitan ${daysNeeded} días de partido pero solo hay ${availableMatchDays} disponibles. Aumenta la fecha de fin, agrega más días de partido, más horarios, o más canchas.`
        })
        setGenerating(false)
        return
      }

      // Initialize current date - make sure it's on a valid match day
      let currentDate = new Date(startDateObj.getTime()) // Use getTime() for proper copy

      console.log('🔍 DEBUG: Inicialización de fechas:', {
        configStartDate: config.startDate,
        configEndDate: config.endDate,
        startDateObj: startDateObj,
        currentDate: currentDate,
        currentDay: currentDate.getDate(),
        currentMonth: currentDate.getMonth() + 1,
        currentYear: currentDate.getFullYear(),
        targetDays: config.matchDays
      })

      // If the start date is not a valid match day, find the next valid day
      if (!targetDays.includes(currentDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
        let tempCheckDate = new Date(currentDate.getTime())
        let found = false

        while (tempCheckDate <= endDateObj) {
          tempCheckDate.setDate(tempCheckDate.getDate() + 1)
          if (targetDays.includes(tempCheckDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
            currentDate = tempCheckDate
            found = true
            break
          }
        }

        if (!found) {
          setMessage({
            type: 'error',
            text: 'No hay días de partido disponibles en el rango de fechas seleccionado.'
          })
          setGenerating(false)
          return
        }
      }

      // Helper function to get next available match date within the end date range
      const getNextMatchDate = () => {
        // Start from the next day
        let checkDate = new Date(currentDate.getTime())
        checkDate.setDate(checkDate.getDate() + 1)

        // Find next available day within the end date range
        while (checkDate <= endDateObj) {
          // Check if this day is in our target days
          if (targetDays.includes(checkDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
            return checkDate
          }
          checkDate.setDate(checkDate.getDate() + 1)
        }

        // No more available days
        return null
      }

      allRounds.forEach(round => {
        // Contador de partidos dentro de esta jornada (en todos los días)
        let matchCounter = 0
        const slotsPerDay = availableTimes.length * config.fieldsAvailable

        round.matches.forEach(match => {
          // Calcular en qué día va este partido dentro de la jornada
          const dayOffset = Math.floor(matchCounter / slotsPerDay)

          // Calcular posición dentro del día actual
          const slotInDay = matchCounter % slotsPerDay

          // Calcular cancha (alternando entre canchas para cada horario)
          const fieldNumber = (slotInDay % config.fieldsAvailable) + 1

          // Calcular índice de horario
          const timeSlotIndex = Math.floor(slotInDay / config.fieldsAvailable)
          let assignedTime = availableTimes[timeSlotIndex]

          // Check if champion team has fixed schedule preference
          if (config.championFixedSchedule && config.championPreferredTime) {
            const championTeamId = activeTeams[0]?.id

            if (match.home.id === championTeamId || match.away.id === championTeamId) {
              if (availableTimes.includes(config.championPreferredTime)) {
                assignedTime = config.championPreferredTime
              }
            }
          }

          // Check if current date is still within range
          if (currentDate > endDateObj) {
            throw new Error('Se excedió la fecha límite al generar partidos. Aumenta la fecha de fin o reduce el número de partidos.')
          }

          const formattedDate = formatDateToYYYYMMDD(currentDate)
          console.log('🔍 DEBUG: Generando partido:', {
            round: round.round,
            matchCounter: matchCounter,
            slotInDay: slotInDay,
            field: fieldNumber,
            time: assignedTime,
            date: formattedDate,
            dayOffset: dayOffset
          })

          generatedMatches.push({
            round: round.round,
            homeTeam: match.home,
            awayTeam: match.away,
            date: formattedDate,
            time: assignedTime,
            field: fieldNumber,
            // Solo agregar byeTeam en el primer partido de la jornada
            ...(matchCounter === 0 && round.byeTeam ? { byeTeam: round.byeTeam } : {})
          })

          matchCounter++

          // Si completamos todos los slots del día actual, avanzar al siguiente día
          if (matchCounter > 0 && matchCounter % slotsPerDay === 0) {
            const nextDate = getNextMatchDate()
            if (nextDate === null) {
              throw new Error('Se excedió la fecha límite al generar partidos. Aumenta la fecha de fin.')
            }
            currentDate = nextDate
            console.log(`   → Día completo. Continuando jornada ${round.round} en: ${formatDateToYYYYMMDD(currentDate)}`)
          }
        })

        // ✅ DESPUÉS DE CADA JORNADA: Avanzar al siguiente día válido
        const nextDate = getNextMatchDate()
        if (nextDate === null) {
          throw new Error('Se excedió la fecha límite al generar partidos. Aumenta la fecha de fin.')
        }
        currentDate = nextDate
        console.log(`✅ Jornada ${round.round} completa. Próxima jornada: ${formatDateToYYYYMMDD(currentDate)}`)
      })
      
      setGeneratedFixtures(generatedMatches)
      setIsPreviewOpen(true)

      // Build success message with info about existing rounds
      let successMsg: string
      if (selectedTournament?.tournament_format === 'group_knockout') {
        successMsg = `Se generaron ${generatedMatches.length} partidos en ${allRounds.length} jornadas para ${selectedGroups.length} grupo(s)`
      } else {
        successMsg = `Se generaron ${generatedMatches.length} partidos en ${allRounds.length} jornadas`
      }

      // Add info about continuing from previous rounds
      if (totalExistingMatches > 0) {
        const firstNewRound = allRounds[0]?.round || lastRound + 1
        successMsg += ` (continuando desde jornada ${firstNewRound}, ${totalExistingMatches} partidos previos detectados)`
      }

      setMessage({ type: 'success', text: successMsg })
      
    } catch (error: any) {
      console.error('Error generating fixtures:', error)
      setMessage({ type: 'error', text: `Error generando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setGenerating(false)
    }
  }


  const saveFixtures = async () => {
    if (generatedFixtures.length === 0) return

    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Use the correct tournament ID based on mode
      const tournamentId = mode === 'manual' ? manualTournamentId : config.tournamentId

      // Prepare matches for database insertion
      const matchesToInsert: Database['public']['Tables']['matches']['Insert'][] = generatedFixtures.map(fixture => ({
        tournament_id: tournamentId,
        home_team_id: fixture.homeTeam.id,
        away_team_id: fixture.awayTeam.id,
        match_date: `${fixture.date}T${fixture.time}:00`,
        match_time: fixture.time,
        field_number: fixture.field,
        round: fixture.round,
        status: 'scheduled' as const
      }))

      // Insert all matches
      const { error } = await supabase
        .from('matches')
        .insert(matchesToInsert as any)

      if (error) {
        throw new Error(error.message)
      }

      // Generate embeddings for all rounds (async, don't wait)
      const uniqueRounds = Array.from(new Set(generatedFixtures.map(f => f.round)))
      const tournament = tournaments.find(t => t.id === tournamentId)
      if (tournament && leagueId) {
        generateMultipleJornadaEmbeddings(leagueId, tournamentId, uniqueRounds)
          .catch(err => console.warn('Error generando embeddings de jornadas:', err))

        // Send WhatsApp notifications for each new jornada (async, don't wait)
        // First, get the league name
        console.log('📢 Iniciando envío de notificaciones WhatsApp...')
        console.log('📢 League ID:', leagueId)
        console.log('📢 Tournament ID:', tournamentId)
        console.log('📢 Fixtures to notify:', generatedFixtures.length)

        supabase.from('leagues').select('name').eq('id', leagueId).single()
          .then(({ data: league, error }) => {
            if (error) {
              console.error('❌ Error obteniendo liga:', error)
              return
            }
            console.log('✅ Liga encontrada:', league?.name)
            const leagueName = league?.name || 'Liga'

            // Group fixtures by round and send notification for each round
            const fixturesByRound = generatedFixtures.reduce((acc, fixture) => {
              if (!acc[fixture.round]) acc[fixture.round] = []
              acc[fixture.round].push(fixture)
              return acc
            }, {} as Record<number, typeof generatedFixtures>)

            console.log('📢 Rounds to notify:', Object.keys(fixturesByRound))

            // Send notification for each round
            Object.entries(fixturesByRound).forEach(([round, matches]) => {
              console.log(`📢 Sending notification for round ${round} with ${matches.length} matches`)
              sendJornadaNotification({
                league_id: leagueId,
                tournament_id: tournamentId,
                round: parseInt(round),
                league_name: leagueName,
                tournament_name: tournament.name,
                matches: matches.map(m => ({
                  home_team: m.homeTeam.name,
                  away_team: m.awayTeam.name,
                  date: m.date,
                  time: m.time,
                  field: m.field,
                })),
              }).catch(err => console.warn('Error enviando notificación de jornada:', err))
            })
          })
          .catch(err => console.warn('Error obteniendo nombre de liga:', err))
      }

      setMessage({ type: 'success', text: 'Calendario guardado exitosamente' })
      setGeneratedFixtures([])
      setIsPreviewOpen(false)
      setIsGeneratorOpen(false)

      // Reset manual mode state
      if (mode === 'manual') {
        setManualRounds([])
        setManualTournamentId('')
      }
      
    } catch (error: any) {
      console.error('Error saving fixtures:', error)
      setMessage({ type: 'error', text: `Error guardando calendario: ${error.message || 'Error desconocido'}` })
    } finally {
      setSaving(false)
    }
  }


  const groupFixturesByRound = (fixtures: GeneratedMatch[]) => {
    const rounds: Record<number, GeneratedMatch[]> = {}
    fixtures.forEach(fixture => {
      if (!rounds[fixture.round]) rounds[fixture.round] = []
      rounds[fixture.round].push(fixture)
    })
    return rounds
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5" />
            Generador de Jornadas
          </CardTitle>
          <CardDescription className="text-gray-400">
            Genera automáticamente el calendario completo de partidos para el torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-400">
                <strong>Equipos activos:</strong> {activeTeams.length}
              </p>
              <p className="text-sm text-gray-400">
                <strong>Torneos activos:</strong> {activeTournaments.length}
              </p>
            </div>
            <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
                  disabled={activeTeams.length < 2 || activeTournaments.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generar Jornadas
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Generator Dialog */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="!top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-[100vw] !max-h-[100vh] !m-0 !p-0 !overflow-hidden !border-0 !rounded-none !shadow-none bg-slate-950">
          <DialogHeader className="pb-3 md:pb-4 border-b border-white/10 px-4 md:px-8 pt-2">
            <DialogTitle className="text-sm md:text-lg text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              Generar Jornadas
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs md:text-sm">
              Configura los parámetros para generar el calendario
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="px-4 md:px-8 pt-3 pb-2">
            <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-white/10">
              <Label className="text-xs md:text-sm font-medium text-gray-400 mb-2 block">Modo de Generación</Label>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <Button
                  type="button"
                  variant={mode === 'auto' ? "default" : "outline"}
                  onClick={() => setMode('auto')}
                  className={`h-12 md:h-14 flex flex-col items-center justify-center ${
                    mode === 'auto'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white border-0'
                      : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 mb-0.5" />
                  <span className="text-xs md:text-sm font-medium">Automático</span>
                </Button>
                <Button
                  type="button"
                  variant={mode === 'manual' ? "default" : "outline"}
                  onClick={() => setMode('manual')}
                  className={`h-12 md:h-14 flex flex-col items-center justify-center ${
                    mode === 'manual'
                      ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                      : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4 mb-0.5" />
                  <span className="text-xs md:text-sm font-medium">Manual</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-2">
            {message && (
              <div className={`mb-4 p-3 rounded-lg border ${message.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                <p className={`text-xs md:text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Automatic Mode */}
            {mode === 'auto' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-7xl mx-auto">
              {/* Left Column - Basic Configuration */}
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 md:p-6 rounded-xl border border-white/10">
                  <h3 className="text-sm md:text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Configuración Básica
                  </h3>
                  <div className="space-y-4">

                    <div>
                      <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Torneo</Label>
                      <Select value={config.tournamentId} onValueChange={(value) => setConfig({...config, tournamentId: value})}>
                        <SelectTrigger className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm">
                          <SelectValue placeholder="Selecciona un torneo" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTournaments.map(tournament => (
                            <SelectItem key={tournament.id} value={tournament.id}>
                              {tournament.name}
                              {tournament.tournament_format === 'group_knockout' && ' (Grupos)'}
                              {tournament.tournament_format === 'knockout' && ' (Eliminación)'}
                              {tournament.tournament_format === 'league' && ' (Liga)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Group Selection for group_knockout tournaments */}
                    {selectedTournament?.tournament_format === 'group_knockout' && selectedTournament.number_of_groups && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <Label className="text-[10px] md:text-xs font-medium text-blue-400 mb-2 block">
                          Seleccionar Grupos
                        </Label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {Array.from({ length: selectedTournament.number_of_groups }, (_, i) => {
                            const groupLetter = String.fromCharCode(65 + i)
                            const isSelected = selectedGroups.includes(groupLetter)
                            const groupTeams = activeTeams.filter(t => t.group_name === groupLetter)

                            return (
                              <Button
                                key={groupLetter}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedGroups(selectedGroups.filter(g => g !== groupLetter))
                                  } else {
                                    setSelectedGroups([...selectedGroups, groupLetter])
                                  }
                                }}
                                className={`h-10 md:h-12 flex flex-col items-center justify-center ${
                                  isSelected
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white border-0'
                                    : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700'
                                }`}
                              >
                                <span className="text-xs md:text-sm font-medium">{groupLetter}</span>
                                <span className="text-[8px] md:text-[10px] opacity-75">{groupTeams.length} eq.</span>
                              </Button>
                            )
                          })}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allGroups = Array.from({ length: selectedTournament.number_of_groups || 0 }, (_, i) =>
                                String.fromCharCode(65 + i)
                              )
                              setSelectedGroups(allGroups)
                            }}
                            className="text-[10px] h-7 bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700"
                          >
                            Todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroups([])}
                            className="text-[10px] h-7 bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700"
                          >
                            Ninguno
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="startDate" className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Fecha Inicio</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={config.startDate}
                          onChange={(e) => setConfig({...config, startDate: e.target.value})}
                          className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Fecha Fin</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={config.endDate}
                          onChange={(e) => setConfig({...config, endDate: e.target.value})}
                          min={config.startDate || undefined}
                          className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm"
                        />
                      </div>
                    </div>
                    {config.startDate && config.endDate && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                        <p className="text-[10px] md:text-xs text-blue-300">
                          <strong>Duración del torneo:</strong> {
                            (() => {
                              const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number)
                              const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number)
                              const start = new Date(startYear, startMonth - 1, startDay)
                              const end = new Date(endYear, endMonth - 1, endDay)
                              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                              return `${days} día${days !== 1 ? 's' : ''}`
                            })()
                          }
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Duración de Partidos</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[8px] md:text-[10px] text-gray-500 mb-1 block">Por tiempo</Label>
                          <Select
                            value={config.matchDuration.halfTime.toString()}
                            onValueChange={(value) => setConfig({
                              ...config,
                              matchDuration: {
                                ...config.matchDuration,
                                halfTime: parseInt(value),
                                breakTime: parseInt(value) >= 40 ? 15 : 10
                              }
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-700/50 border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="25">25 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="35">35 min</SelectItem>
                              <SelectItem value="40">40 min</SelectItem>
                              <SelectItem value="45">45 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[8px] md:text-[10px] text-gray-500 mb-1 block">Descanso</Label>
                          <Select
                            value={config.matchDuration.breakTime.toString()}
                            onValueChange={(value) => setConfig({
                              ...config,
                              matchDuration: {...config.matchDuration, breakTime: parseInt(value)}
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-700/50 border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 min</SelectItem>
                              <SelectItem value="10">10 min</SelectItem>
                              <SelectItem value="15">15 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[8px] md:text-[10px] text-gray-500 mb-1 block">Entre partidos</Label>
                          <Select
                            value={config.breakBetweenMatches.toString()}
                            onValueChange={(value) => setConfig({...config, breakBetweenMatches: parseInt(value)})}
                          >
                            <SelectTrigger className="h-8 bg-slate-700/50 border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 min</SelectItem>
                              <SelectItem value="5">5 min</SelectItem>
                              <SelectItem value="10">10 min</SelectItem>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1.5">
                        Total: {(config.matchDuration.halfTime * 2) + config.matchDuration.breakTime + config.breakBetweenMatches} min/partido
                      </p>
                    </div>

                    <div>
                      <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Hora Inicio</Label>
                      <Input
                        type="time"
                        value={config.startTime}
                        onChange={(e) => setConfig({...config, startTime: e.target.value})}
                        className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm"
                      />
                      {config.startTime && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mt-2">
                          <p className="text-[10px] text-blue-300">
                            {generateAvailableTimeSlots().length} horarios disponibles
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generateAvailableTimeSlots().slice(0, 6).map((time, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-gray-300">
                                {time}
                              </span>
                            ))}
                            {generateAvailableTimeSlots().length > 6 && (
                              <span className="text-[10px] text-gray-500">+{generateAvailableTimeSlots().length - 6}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Canchas</Label>
                        <Select value={config.fieldsAvailable.toString()} onValueChange={(value) => setConfig({...config, fieldsAvailable: parseInt(value)})}>
                          <SelectTrigger className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} cancha{num > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-1.5 block">Formato</Label>
                        <Select value={config.doubleRound ? "double" : "single"} onValueChange={(value) => setConfig({...config, doubleRound: value === "double"})}>
                          <SelectTrigger className="h-9 bg-slate-700/50 border-white/10 text-white text-xs md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Una vuelta</SelectItem>
                            <SelectItem value="double">Ida y vuelta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Days Configuration */}
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 md:p-6 rounded-xl border border-white/10">
                  <h3 className="text-sm md:text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    Días de Partidos
                  </h3>
                  <div className="space-y-4">

                    <div>
                      <Label className="text-[10px] md:text-xs font-medium text-gray-400 mb-2 block">Selecciona los días</Label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {[
                          { value: 'monday', label: 'L' },
                          { value: 'tuesday', label: 'M' },
                          { value: 'wednesday', label: 'X' },
                          { value: 'thursday', label: 'J' },
                          { value: 'friday', label: 'V' },
                          { value: 'saturday', label: 'S' },
                          { value: 'sunday', label: 'D' }
                        ].map(day => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={config.matchDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const days = config.matchDays.includes(day.value)
                                ? config.matchDays.filter(d => d !== day.value)
                                : [...config.matchDays, day.value]
                              setConfig({...config, matchDays: days})
                            }}
                            className={`h-9 md:h-10 text-xs md:text-sm font-medium ${
                              config.matchDays.includes(day.value)
                                ? 'bg-purple-500 hover:bg-purple-600 text-white border-0'
                                : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700'
                            }`}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig({
                            ...config, 
                            matchDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                          })}
                          className="text-sm px-4 py-2 h-10"
                        >
                          Todos los días
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig({...config, matchDays: ['saturday', 'sunday']})}
                          className="text-sm px-4 py-2 h-10"
                        >
                          Fines de semana
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-xl shadow-xl border border-white/10 mt-8 max-w-7xl mx-auto">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <Users className="w-6 h-6" />
                Resumen de Configuración
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                <ul className="text-sm text-gray-300 space-y-3">
                  {selectedTournament?.tournament_format === 'group_knockout' ? (
                    <>
                      <li className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-300" />
                        <span><strong className="font-medium">Grupos seleccionados:</strong> {selectedGroups.length} de {selectedTournament.number_of_groups}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-300" />
                        <span><strong className="font-medium">Equipos en grupos:</strong> {getFilteredTeams().length} participantes</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-300" />
                      <span><strong className="font-medium">Equipos:</strong> {activeTeams.length} participantes</span>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Jornadas:</strong> {config.doubleRound ? activeTeams.length * 2 - 2 : activeTeams.length - 1}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center text-blue-300 font-bold">Σ</span>
                    <span><strong className="font-medium">Partidos total:</strong> {config.doubleRound ? activeTeams.length * (activeTeams.length - 1) : activeTeams.length * (activeTeams.length - 1) / 2}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Días por semana:</strong> {config.matchDays.length}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center text-blue-300 font-bold">⚽</span>
                    <span><strong className="font-medium">Canchas:</strong> {config.fieldsAvailable} disponibles</span>
                  </li>
                  {config.startDate && config.endDate && (
                    <>
                      <li className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-300" />
                        <span>
                          <strong className="font-medium">Duración:</strong>{' '}
                          {(() => {
                            const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number)
                            const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number)
                            const start = new Date(startYear, startMonth - 1, startDay)
                            const end = new Date(endYear, endMonth - 1, endDay)
                            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                            return `${days} día${days !== 1 ? 's' : ''}`
                          })()}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-blue-300 font-bold">📅</span>
                        <span>
                          <strong className="font-medium">Capacidad:</strong>{' '}
                          {(() => {
                            const targetDays = config.matchDays.map(day => {
                              switch(day) {
                                case 'sunday': return 0
                                case 'monday': return 1
                                case 'tuesday': return 2
                                case 'wednesday': return 3
                                case 'thursday': return 4
                                case 'friday': return 5
                                case 'saturday': return 6
                                default: return 6
                              }
                            })
                            let availableMatchDays = 0
                            const [startYr, startMo, startDy] = config.startDate.split('-').map(Number)
                            const [endYr, endMo, endDy] = config.endDate.split('-').map(Number)
                            let tempDate = new Date(startYr, startMo - 1, startDy)
                            const endDate = new Date(endYr, endMo - 1, endDy)
                            while (tempDate <= endDate) {
                              if (targetDays.includes(tempDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                                availableMatchDays++
                              }
                              tempDate.setDate(tempDate.getDate() + 1)
                            }
                            const availableTimes = generateAvailableTimeSlots()
                            const totalSlots = availableMatchDays * availableTimes.length * config.fieldsAvailable
                            const totalMatches = config.doubleRound
                              ? (selectedTournament?.tournament_format === 'group_knockout' ? getFilteredTeams().length : activeTeams.length) * ((selectedTournament?.tournament_format === 'group_knockout' ? getFilteredTeams().length : activeTeams.length) - 1)
                              : (selectedTournament?.tournament_format === 'group_knockout' ? getFilteredTeams().length : activeTeams.length) * ((selectedTournament?.tournament_format === 'group_knockout' ? getFilteredTeams().length : activeTeams.length) - 1) / 2
                            const percentageUsed = totalMatches > 0 ? Math.round((totalMatches / totalSlots) * 100) : 0
                            return `${totalSlots} espacios (${percentageUsed}% usado)`
                          })()}
                        </span>
                      </li>
                    </>
                  )}
                </ul>
                <ul className="text-sm text-gray-300 space-y-3">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span>
                      <strong className="font-medium">Duración del partido:</strong>{' '}
                      {config.matchDuration.halfTime}min + {config.matchDuration.breakTime}min + {config.matchDuration.halfTime}min
                      {' = '}{(config.matchDuration.halfTime * 2) + config.matchDuration.breakTime}min
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center text-blue-300 font-bold">⏱</span>
                    <span>
                      <strong className="font-medium">Descanso entre partidos:</strong> {config.breakBetweenMatches}min
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span>
                      <strong className="font-medium">Total por espacio:</strong>{' '}
                      {(config.matchDuration.halfTime * 2) + config.matchDuration.breakTime + config.breakBetweenMatches}min
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span>
                      <strong className="font-medium">Horario de inicio:</strong> {config.startTime}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Horarios generados:</strong> {generateAvailableTimeSlots().length} por día</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Toggle between AI and traditional algorithm */}
            <div className="flex items-center justify-center gap-4 sm:p-4 pt-4 border-t border-white/10 mt-6">
              <button
                type="button"
                onClick={() => setUseAI(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  useAI
                    ? 'bg-purple-500/30 border border-purple-400/50 text-purple-300'
                    : 'bg-slate-700/30 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">CP-SAT Solver</span>
              </button>
              <button
                type="button"
                onClick={() => setUseAI(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  !useAI
                    ? 'bg-blue-500/30 border border-blue-400/50 text-blue-300'
                    : 'bg-slate-700/30 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span className="text-sm font-medium">Algoritmo tradicional</span>
              </button>
            </div>

            <div className="flex gap-4 sm:p-6 pt-4">
              <Button
                type="button"
                onClick={() => setIsGeneratorOpen(false)}
                className="flex-1 h-12 text-base bg-slate-700/50 border-white/10 text-white hover:bg-white/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={useAI ? generateFixturesWithAI : generateFixtures}
                disabled={(useAI ? generatingAI : generating) || !config.tournamentId || !config.startDate || !config.endDate || !config.startTime || config.matchDays.length === 0}
                className={`flex-1 h-12 text-base backdrop-blur-md text-white border-0 shadow-lg ${
                  useAI
                    ? 'bg-purple-500/80 hover:bg-purple-500/90'
                    : 'bg-green-500/80 hover:bg-green-500/90'
                }`}
              >
                {(useAI ? generatingAI : generating) ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {useAI ? 'Calculando...' : 'Generando...'}
                  </>
                ) : (
                  <>
                    {useAI ? <Sparkles className="w-5 h-5 mr-2" /> : <Calendar className="w-5 h-5 mr-2" />}
                    {useAI ? 'Generar con CP-SAT' : 'Generar Calendario'}
                  </>
                )}
              </Button>
            </div>
            </>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Tournament Selection */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10">
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 block">Seleccionar Torneo</Label>
                  <Select value={manualTournamentId} onValueChange={setManualTournamentId}>
                    <SelectTrigger className="h-10 bg-slate-700/50 border-white/10 text-white">
                      <SelectValue placeholder="Selecciona un torneo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {activeTournaments.map(tournament => (
                        <SelectItem key={tournament.id} value={tournament.id} className="text-white">
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rounds List */}
                {manualTournamentId && (
                  <div className="space-y-4">
                    {/* Create/Edit Mode Toggle - Only show when there are existing rounds */}
                    {existingRoundsCount > 0 && (
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-white/10">
                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 block">Acción</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={manualMode === 'create' ? "default" : "outline"}
                            onClick={() => {
                              setManualMode('create')
                              setSelectedEditRound(null)
                              setEditRoundMatches([])
                            }}
                            className={`h-10 flex items-center justify-center gap-2 ${
                              manualMode === 'create'
                                ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                                : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-medium">Crear Nueva</span>
                          </Button>
                          <Button
                            type="button"
                            variant={manualMode === 'edit' ? "default" : "outline"}
                            onClick={() => {
                              setManualMode('edit')
                              setManualRounds([])
                            }}
                            className={`h-10 flex items-center justify-center gap-2 ${
                              manualMode === 'edit'
                                ? 'bg-orange-500 hover:bg-orange-600 text-white border-0'
                                : 'bg-slate-700/50 border-white/10 text-gray-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-medium">Editar Anterior</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Edit Existing Round Mode */}
                    {manualMode === 'edit' && existingRoundsCount > 0 && (
                      <div className="space-y-4">
                        {/* Round Selector */}
                        {selectedEditRound === null && (
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                            <Label className="text-[10px] text-orange-400 uppercase tracking-wide mb-3 block">Seleccionar Jornada a Editar</Label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {existingRoundsList.map(roundNum => (
                                <Button
                                  key={roundNum}
                                  type="button"
                                  onClick={() => loadRoundMatches(roundNum)}
                                  disabled={loadingEditRound}
                                  className="h-12 flex flex-col items-center justify-center bg-slate-700/50 border-white/10 text-gray-300 hover:bg-orange-500/30 hover:text-orange-300 hover:border-orange-500/30"
                                >
                                  <span className="text-sm font-semibold">J{roundNum}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Loading indicator */}
                        {loadingEditRound && (
                          <div className="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-white/10 text-center">
                            <Loader2 className="w-8 h-8 mx-auto mb-2 text-orange-400 animate-spin" />
                            <p className="text-gray-400 text-sm">Cargando partidos de la jornada...</p>
                          </div>
                        )}

                        {/* Edit Round Form */}
                        {selectedEditRound !== null && !loadingEditRound && (
                          <div className="bg-slate-800/50 rounded-xl border border-orange-500/20 overflow-hidden">
                            {/* Round Header */}
                            <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-orange-500/10">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                                <span className="text-sm md:text-base font-semibold text-white">Editando Jornada {selectedEditRound}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">
                                  {editRoundMatches.length} partido{editRoundMatches.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEditRound(null)
                                  setEditRoundMatches([])
                                  setOriginalMatchIds([])
                                }}
                                className="h-8 px-3 bg-slate-600/50 hover:bg-slate-600/70 text-gray-300 border-0"
                              >
                                Cambiar Jornada
                              </Button>
                            </div>

                            {/* Matches in this round */}
                            <div className="p-3 md:p-4 space-y-3">
                              {editRoundMatches.length === 0 && (
                                <p className="text-gray-500 text-xs text-center py-3">No hay partidos en esta jornada</p>
                              )}

                              {editRoundMatches.map((match, matchIndex) => (
                                <div key={match.id} className="bg-slate-700/30 p-3 rounded-lg border border-white/5">
                                  <div className="space-y-3">
                                    {/* Teams Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Local</Label>
                                        <Select
                                          value={match.homeTeamId}
                                          onValueChange={(value) => {
                                            const newMatches = [...editRoundMatches]
                                            newMatches[matchIndex].homeTeamId = value
                                            setEditRoundMatches(newMatches)
                                          }}
                                        >
                                          <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                            <SelectValue placeholder="Seleccionar" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-white/10">
                                            {activeTeams.map(team => (
                                              <SelectItem key={team.id} value={team.id} className="text-white text-xs">
                                                {team.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Visitante</Label>
                                        <Select
                                          value={match.awayTeamId}
                                          onValueChange={(value) => {
                                            const newMatches = [...editRoundMatches]
                                            newMatches[matchIndex].awayTeamId = value
                                            setEditRoundMatches(newMatches)
                                          }}
                                        >
                                          <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                            <SelectValue placeholder="Seleccionar" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-white/10">
                                            {activeTeams.map(team => (
                                              <SelectItem key={team.id} value={team.id} className="text-white text-xs">
                                                {team.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {/* Date, Time, Field Row */}
                                    <div className="grid grid-cols-4 gap-2">
                                      <div className="col-span-2 sm:col-span-1">
                                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Fecha</Label>
                                        <Input
                                          type="date"
                                          value={match.date}
                                          onChange={(e) => {
                                            const newMatches = [...editRoundMatches]
                                            newMatches[matchIndex].date = e.target.value
                                            setEditRoundMatches(newMatches)
                                          }}
                                          className="bg-slate-800/50 border-white/10 text-white h-9 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Hora</Label>
                                        <Input
                                          type="time"
                                          value={match.time}
                                          onChange={(e) => {
                                            const newMatches = [...editRoundMatches]
                                            newMatches[matchIndex].time = e.target.value
                                            setEditRoundMatches(newMatches)
                                          }}
                                          className="bg-slate-800/50 border-white/10 text-white h-9 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Cancha</Label>
                                        <Select
                                          value={match.field.toString()}
                                          onValueChange={(value) => {
                                            const newMatches = [...editRoundMatches]
                                            newMatches[matchIndex].field = parseInt(value)
                                            setEditRoundMatches(newMatches)
                                          }}
                                        >
                                          <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-white/10">
                                            {[1,2,3,4,5,6].map(num => (
                                              <SelectItem key={num} value={num.toString()} className="text-white text-xs">
                                                {num}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newMatches = editRoundMatches.filter((_, idx) => idx !== matchIndex)
                                            setEditRoundMatches(newMatches)
                                          }}
                                          className="h-9 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Add Match Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditRoundMatches([...editRoundMatches, {
                                    id: `new-${Date.now()}-${Math.random()}`,
                                    homeTeamId: '',
                                    awayTeamId: '',
                                    date: '',
                                    time: '08:00',
                                    field: 1
                                  }])
                                }}
                                className="w-full h-9 bg-slate-600/50 border-white/10 text-gray-300 hover:bg-slate-600/70 hover:text-white text-xs"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Agregar Partido
                              </Button>
                            </div>

                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-3 p-3 md:p-4 border-t border-white/10 bg-slate-700/30">
                              <Button
                                type="button"
                                onClick={() => {
                                  setSelectedEditRound(null)
                                  setEditRoundMatches([])
                                  setOriginalMatchIds([])
                                }}
                                className="flex-1 h-10 text-sm bg-slate-600/50 border-white/10 text-gray-300 hover:bg-slate-600/70 hover:text-white"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={saveEditedRound}
                                disabled={savingEditRound || editRoundMatches.length === 0}
                                className="flex-1 h-10 text-sm bg-orange-500 hover:bg-orange-600 text-white border-0"
                              >
                                {savingEditRound ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Guardar Cambios
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create New Round Mode */}
                    {manualMode === 'create' && (
                      <>
                        {/* Existing Rounds Info */}
                        {existingRoundsCount > 0 && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-500/20">
                                <Trophy className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-blue-300">
                                  {existingRoundsCount} jornada{existingRoundsCount !== 1 ? 's' : ''} existente{existingRoundsCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-blue-400/70">
                                  Las nuevas jornadas comenzarán desde la Jornada {nextRoundNumber}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {loadingExistingRounds && (
                          <div className="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-white/10 text-center">
                            <Loader2 className="w-8 h-8 mx-auto mb-2 text-green-400 animate-spin" />
                            <p className="text-gray-400 text-sm">Cargando jornadas existentes...</p>
                          </div>
                        )}

                        {!loadingExistingRounds && manualRounds.length === 0 && (
                          <div className="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-white/10 text-center">
                            <Calendar className="w-10 h-10 mx-auto mb-3 text-white/60" />
                            <p className="text-gray-400 text-sm mb-4">
                              {existingRoundsCount > 0
                                ? 'Agrega una nueva jornada para continuar el torneo'
                                : 'No hay jornadas creadas aún'}
                            </p>
                            <Button
                              onClick={() => setManualRounds([{ round: nextRoundNumber, matches: [] }])}
                              className="bg-green-500 hover:bg-green-600 text-white border-0"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {existingRoundsCount > 0
                                ? `Crear Jornada ${nextRoundNumber}`
                                : 'Crear Primera Jornada'}
                            </Button>
                          </div>
                        )}

                    {manualRounds.map((roundData, roundIndex) => (
                      <div key={roundIndex} className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
                        {/* Round Header */}
                        <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-slate-700/30">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                            <span className="text-sm md:text-base font-semibold text-white">Jornada {roundData.round}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-600/50 text-gray-400">
                              {roundData.matches.length} partido{roundData.matches.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newRounds = manualRounds.filter((_, idx) => idx !== roundIndex)
                              setManualRounds(newRounds)
                            }}
                            className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Matches in this round */}
                        <div className="p-3 md:p-4 space-y-3">
                          {roundData.matches.length === 0 && (
                            <p className="text-gray-500 text-xs text-center py-3">No hay partidos en esta jornada</p>
                          )}

                          {roundData.matches.map((match, matchIndex) => (
                            <div key={match.id} className="bg-slate-700/30 p-3 rounded-lg border border-white/5">
                              {/* Mobile: Stacked layout */}
                              <div className="space-y-3">
                                {/* Teams Row */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Local</Label>
                                    <Select
                                      value={match.homeTeamId}
                                      onValueChange={(value) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].homeTeamId = value
                                        setManualRounds(newRounds)
                                      }}
                                    >
                                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                        <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-900 border-white/10">
                                        {activeTeams.map(team => (
                                          <SelectItem key={team.id} value={team.id} className="text-white text-xs">
                                            {team.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Visitante</Label>
                                    <Select
                                      value={match.awayTeamId}
                                      onValueChange={(value) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].awayTeamId = value
                                        setManualRounds(newRounds)
                                      }}
                                    >
                                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                        <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-900 border-white/10">
                                        {activeTeams.map(team => (
                                          <SelectItem key={team.id} value={team.id} className="text-white text-xs">
                                            {team.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Date, Time, Field Row */}
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="col-span-2 sm:col-span-1">
                                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Fecha</Label>
                                    <Input
                                      type="date"
                                      value={match.date}
                                      onChange={(e) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].date = e.target.value
                                        setManualRounds(newRounds)
                                      }}
                                      className="bg-slate-800/50 border-white/10 text-white h-9 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Hora</Label>
                                    <Input
                                      type="time"
                                      value={match.time}
                                      onChange={(e) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].time = e.target.value
                                        setManualRounds(newRounds)
                                      }}
                                      className="bg-slate-800/50 border-white/10 text-white h-9 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Cancha</Label>
                                    <Select
                                      value={match.field.toString()}
                                      onValueChange={(value) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].field = parseInt(value)
                                        setManualRounds(newRounds)
                                      }}
                                    >
                                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white text-xs h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-900 border-white/10">
                                        {[1,2,3,4,5,6].map(num => (
                                          <SelectItem key={num} value={num.toString()} className="text-white text-xs">
                                            {num}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches = newRounds[roundIndex].matches.filter((_, idx) => idx !== matchIndex)
                                        setManualRounds(newRounds)
                                      }}
                                      className="h-9 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Match Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newRounds = [...manualRounds]
                              newRounds[roundIndex].matches.push({
                                id: `match-${Date.now()}-${Math.random()}`,
                                homeTeamId: '',
                                awayTeamId: '',
                                date: '',
                                time: '08:00',
                                field: 1
                              })
                              setManualRounds(newRounds)
                            }}
                            className="w-full h-9 bg-slate-600/50 border-white/10 text-gray-300 hover:bg-slate-600/70 hover:text-white text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Agregar Partido
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Round Button */}
                    {manualRounds.length > 0 && (
                      <Button
                        onClick={() => {
                          const currentMaxRound = Math.max(...manualRounds.map(r => r.round))
                          const newRound = Math.max(currentMaxRound + 1, nextRoundNumber + manualRounds.length)
                          setManualRounds([...manualRounds, { round: newRound, matches: [] }])
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 h-11"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Jornada {Math.max(...manualRounds.map(r => r.round)) + 1}
                      </Button>
                    )}

                    {/* Action Buttons */}
                    {manualRounds.length > 0 && manualRounds.some(r => r.matches.length > 0) && (
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                        <Button
                          type="button"
                          onClick={() => setIsGeneratorOpen(false)}
                          className="sm:flex-1 h-10 text-sm bg-slate-700/50 border-white/10 text-gray-300 hover:bg-slate-700 hover:text-white"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            // Convert manual rounds to generated fixtures for preview
                            const fixtures: GeneratedMatch[] = []
                            manualRounds.forEach(round => {
                              round.matches.forEach(match => {
                                const homeTeam = activeTeams.find(t => t.id === match.homeTeamId)
                                const awayTeam = activeTeams.find(t => t.id === match.awayTeamId)
                                if (homeTeam && awayTeam && match.date && match.time) {
                                  fixtures.push({
                                    round: round.round,
                                    homeTeam,
                                    awayTeam,
                                    date: match.date,
                                    time: match.time,
                                    field: match.field
                                  })
                                }
                              })
                            })

                            if (fixtures.length === 0) {
                              setMessage({ type: 'error', text: 'No hay partidos válidos para guardar' })
                              return
                            }

                            setGeneratedFixtures(fixtures)
                            setIsPreviewOpen(true)
                          }}
                          className="sm:flex-1 h-10 text-sm bg-green-500 hover:bg-green-600 text-white border-0"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Vista Previa
                        </Button>
                      </div>
                    )}
                      </>
                    )}
                    {/* End of Create Mode */}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="!top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-[100vw] !max-h-[100vh] !m-0 !p-0 !overflow-hidden !border-0 !rounded-none !shadow-none">
          <DialogHeader className="pb-4 border-b px-4 pt-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-6 h-6" />
              Vista Previa del Calendario
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Revisa el calendario generado antes de guardarlo
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {message && (
              <Alert className={`mb-8 ${message.type === 'success' ? 'border-green-200 bg-muted/30 dark:bg-soccer-green/5' : 'border-red-200 bg-red-50'}`}>
                <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-8 max-w-7xl mx-auto">
              {Object.entries(groupFixturesByRound(generatedFixtures)).map(([round, matches]) => {
                // Buscar el equipo que descansa en esta jornada (está en el primer partido)
                const byeTeam = matches.find(m => m.byeTeam)?.byeTeam
                return (
                <Card key={round} className="shadow-sm border-soccer-gold/20">
                  <CardHeader className="pb-4 bg-soccer-gold/10">
                    <CardTitle className="text-xl text-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-soccer-gold" />
                      Jornada {round}
                    </CardTitle>
                    {byeTeam && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <Users className="w-3 h-3 mr-1" />
                          Descansa: {byeTeam.name}
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-4">
                      {matches.map((match, index) => (
                        <div key={index} className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 border hover:bg-muted/50 dark:hover:bg-soccer-green/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <Badge variant="outline" className="text-xs bg-soccer-blue/10 text-soccer-blue border-soccer-blue/30">
                                Cancha {match.field}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-medium truncate text-foreground">{match.homeTeam.name}</span>
                              <span className="text-muted-foreground font-bold">vs</span>
                              <span className="font-medium truncate text-foreground">{match.awayTeam.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{(() => {
                              // Parse date correctly to avoid timezone issues
                              const [year, month, day] = match.date.split('-').map(Number)
                              const date = new Date(year, month - 1, day)
                              return date.toLocaleDateString('es-ES')
                            })()}</span>
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )})}


              <div className="flex gap-4 sm:p-6 pt-6 border-t mt-8 max-w-7xl mx-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPreviewOpen(false)
                    setGeneratedFixtures([])
                  }}
                  className="flex-1 h-12 text-base"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={saveFixtures}
                  disabled={saving}
                  className="flex-1 h-12 text-base bg-soccer-green hover:bg-soccer-green-dark"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-5 h-5 mr-2" />
                      Guardar Calendario
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}