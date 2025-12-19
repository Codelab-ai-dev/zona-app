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
import { Calendar, Clock, Users, Trophy, Loader2, Plus, Eye, X } from "lucide-react"
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { generateMultipleJornadaEmbeddings } from "@/lib/utils/generate-embeddings"

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
  
  const [config, setConfig] = useState<FixtureConfig>({
    tournamentId: "",
    startDate: "",
    endDate: "",
    matchDays: ["saturday"],
    startTime: "08:00",
    endTime: "22:00",
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
  const generateRoundRobinFixtures = (teams: Team[], doubleRound = false): Array<{round: number, matches: Array<{home: Team, away: Team}>}> => {
    if (teams.length < 2) return []
    
    const teamList = [...teams]
    const rounds: Array<{round: number, matches: Array<{home: Team, away: Team}>}> = []
    
    // If odd number of teams, add a "bye" team
    if (teamList.length % 2 !== 0) {
      teamList.push({ id: 'bye', name: 'Descanso', slug: 'bye' } as Team)
    }
    
    const numTeams = teamList.length
    const numRounds = numTeams - 1
    const matchesPerRound = numTeams / 2
    
    for (let round = 0; round < numRounds; round++) {
      const roundMatches: Array<{home: Team, away: Team}> = []
      
      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1)
        const away = (numTeams - 1 - match + round) % (numTeams - 1)
        
        let homeTeam = teamList[home]
        let awayTeam = teamList[away]
        
        // The last team stays fixed
        if (match === 0) {
          awayTeam = teamList[numTeams - 1]
        }
        
        // Skip matches with "bye" team
        if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
          roundMatches.push({ home: homeTeam, away: awayTeam })
        }
      }
      
      if (roundMatches.length > 0) {
        rounds.push({ round: round + 1, matches: roundMatches })
      }
    }
    
    // If double round (ida y vuelta), add return fixtures
    if (doubleRound) {
      const returnRounds = rounds.map(round => ({
        round: round.round + numRounds,
        matches: round.matches.map(match => ({
          home: match.away,
          away: match.home
        }))
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
  const generateAvailableTimeSlots = (): string[] => {
    if (!config.startTime) return []

    const timeSlots: string[] = []
    const MAX_SLOTS_PER_DAY = 8 // Número máximo de espacios por día

    // Parse start time
    const [startHour, startMinute] = config.startTime.split(':').map(Number)

    // Convert to minutes from midnight
    let currentMinutes = startHour * 60 + startMinute

    // Calculate total match duration (including halftime, break, and rest between matches)
    const matchDurationMinutes = (config.matchDuration.halfTime * 2) + config.matchDuration.breakTime + config.breakBetweenMatches

    // Generate time slots (limited to MAX_SLOTS_PER_DAY)
    for (let i = 0; i < MAX_SLOTS_PER_DAY; i++) {
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

  const generateFixtures = () => {
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
      let allRounds: Array<{round: number, matches: Array<{home: Team, away: Team}>}> = []

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

      const generatedMatches: GeneratedMatch[] = []

      // Generate available time slots based on configuration
      const availableTimes = generateAvailableTimeSlots()

      if (availableTimes.length === 0) {
        setMessage({
          type: 'error',
          text: 'No se pueden generar horarios con la configuración actual. Verifica el horario de inicio, fin y duración de partidos.'
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
            field: fieldNumber
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

      const successMsg = selectedTournament?.tournament_format === 'group_knockout'
        ? `Se generaron ${generatedMatches.length} partidos en ${allRounds.length} jornadas para ${selectedGroups.length} grupo(s)`
        : `Se generaron ${generatedMatches.length} partidos en ${allRounds.length} jornadas`

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
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Calendar className="w-5 h-5" />
            Generador de Jornadas
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            Genera automáticamente el calendario completo de partidos para el torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-white/80 drop-shadow">
                <strong>Equipos activos:</strong> {activeTeams.length}
              </p>
              <p className="text-sm text-white/80 drop-shadow">
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
        <DialogContent className="!top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-[100vw] !max-h-[100vh] !m-0 !p-0 !overflow-hidden !border-0 !rounded-none !shadow-none bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          <DialogHeader className="pb-4 border-b border-white/20 px-8 pt-2">
            <DialogTitle className="text-xl text-white drop-shadow-lg">Configurar Generación de Jornadas</DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">
              Configura los parámetros para generar el calendario de partidos
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="px-8 pt-4 pb-2">
            <div className="backdrop-blur-xl bg-white/10 p-4 rounded-xl shadow-xl border border-white/20">
              <Label className="text-sm font-medium text-white/90 drop-shadow mb-3 block">Modo de Generación</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={mode === 'auto' ? "default" : "outline"}
                  onClick={() => setMode('auto')}
                  className={`h-16 flex flex-col items-center justify-center backdrop-blur-md ${
                    mode === 'auto'
                      ? 'bg-blue-500/80 hover:bg-blue-500/90 text-white border-0'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  }`}
                >
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-sm font-bold">Automático</span>
                  <span className="text-xs opacity-75">Algoritmo round-robin</span>
                </Button>
                <Button
                  type="button"
                  variant={mode === 'manual' ? "default" : "outline"}
                  onClick={() => setMode('manual')}
                  className={`h-16 flex flex-col items-center justify-center backdrop-blur-md ${
                    mode === 'manual'
                      ? 'bg-green-500/80 hover:bg-green-500/90 text-white border-0'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  }`}
                >
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-sm font-bold">Manual</span>
                  <span className="text-xs opacity-75">Crear partido por partido</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2">
            {message && (
              <Alert className={`mb-8 backdrop-blur-xl ${message.type === 'success' ? 'border-green-300/30 bg-green-500/20' : 'border-red-300/30 bg-red-500/20'} shadow-xl`}>
                <AlertDescription className="text-white drop-shadow">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Automatic Mode */}
            {mode === 'auto' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {/* Left Column - Basic Configuration */}
              <div className="space-y-8">
                <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20">
                  <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-8 flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    Configuración Básica
                  </h3>
                  <div className="space-y-6">

                    <div>
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Torneo</Label>
                      <Select value={config.tournamentId} onValueChange={(value) => setConfig({...config, tournamentId: value})}>
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                          <SelectValue placeholder="Selecciona un torneo" />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                          {activeTournaments.map(tournament => (
                            <SelectItem key={tournament.id} value={tournament.id} className="text-white hover:bg-white/10">
                              {tournament.name}
                              {tournament.tournament_format === 'group_knockout' && ' (Grupos + Eliminación)'}
                              {tournament.tournament_format === 'knockout' && ' (Eliminación)'}
                              {tournament.tournament_format === 'league' && ' (Liga)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Group Selection for group_knockout tournaments */}
                    {selectedTournament?.tournament_format === 'group_knockout' && selectedTournament.number_of_groups && (
                      <div className="backdrop-blur-md bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                        <Label className="text-sm font-medium text-white/90 drop-shadow mb-3 block">
                          Seleccionar Grupos para Generar Partidos
                        </Label>
                        <p className="text-xs text-white/70 drop-shadow mb-3">
                          Los partidos se generarán solo para equipos dentro de los mismos grupos (todos contra todos por grupo)
                        </p>
                        <div className="grid grid-cols-4 gap-2">
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
                                className={`h-16 flex flex-col items-center justify-center backdrop-blur-md ${
                                  isSelected
                                    ? 'bg-blue-500/80 hover:bg-blue-500/90 text-white border-0'
                                    : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                                }`}
                              >
                                <span className="text-lg font-bold">Grupo {groupLetter}</span>
                                <span className="text-xs opacity-75">{groupTeams.length} equipos</span>
                              </Button>
                            )
                          })}
                        </div>
                        <div className="flex gap-2 mt-3">
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
                            className="text-xs backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            Todos los grupos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroups([])}
                            className="text-xs backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            Ninguno
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Fecha de Inicio</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={config.startDate}
                          onChange={(e) => setConfig({...config, startDate: e.target.value})}
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Fecha de Fin</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={config.endDate}
                          onChange={(e) => setConfig({...config, endDate: e.target.value})}
                          min={config.startDate || undefined}
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg"
                        />
                      </div>
                    </div>
                    {config.startDate && config.endDate && (
                      <div className="backdrop-blur-md bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                        <p className="text-xs text-white/80 drop-shadow">
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
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Duración de Partidos</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-white/70 drop-shadow mb-2 block">Tiempo por tiempo</Label>
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
                            <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                              <SelectItem value="15" className="text-white hover:bg-white/10">15 min</SelectItem>
                              <SelectItem value="20" className="text-white hover:bg-white/10">20 min</SelectItem>
                              <SelectItem value="25" className="text-white hover:bg-white/10">25 min</SelectItem>
                              <SelectItem value="30" className="text-white hover:bg-white/10">30 min</SelectItem>
                              <SelectItem value="35" className="text-white hover:bg-white/10">35 min</SelectItem>
                              <SelectItem value="40" className="text-white hover:bg-white/10">40 min</SelectItem>
                              <SelectItem value="45" className="text-white hover:bg-white/10">45 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-white/70 drop-shadow mb-2 block">Descanso</Label>
                          <Select
                            value={config.matchDuration.breakTime.toString()}
                            onValueChange={(value) => setConfig({
                              ...config,
                              matchDuration: {...config.matchDuration, breakTime: parseInt(value)}
                            })}
                          >
                            <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                              <SelectItem value="5" className="text-white hover:bg-white/10">5 min</SelectItem>
                              <SelectItem value="10" className="text-white hover:bg-white/10">10 min</SelectItem>
                              <SelectItem value="15" className="text-white hover:bg-white/10">15 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-white/70 drop-shadow mb-2 block">Entre partidos</Label>
                          <Select
                            value={config.breakBetweenMatches.toString()}
                            onValueChange={(value) => setConfig({...config, breakBetweenMatches: parseInt(value)})}
                          >
                            <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                              <SelectItem value="0" className="text-white hover:bg-white/10">0 min</SelectItem>
                              <SelectItem value="5" className="text-white hover:bg-white/10">5 min</SelectItem>
                              <SelectItem value="10" className="text-white hover:bg-white/10">10 min</SelectItem>
                              <SelectItem value="15" className="text-white hover:bg-white/10">15 min</SelectItem>
                              <SelectItem value="20" className="text-white hover:bg-white/10">20 min</SelectItem>
                              <SelectItem value="30" className="text-white hover:bg-white/10">30 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-xs text-white/60 drop-shadow mt-2">
                        Duración total por partido: {(config.matchDuration.halfTime * 2) + config.matchDuration.breakTime + config.breakBetweenMatches} minutos
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Horarios</Label>
                      <div>
                        <Label className="text-xs text-white/70 drop-shadow mb-2 block">Horario Inicio</Label>
                        <Input
                          type="time"
                          value={config.startTime}
                          onChange={(e) => setConfig({...config, startTime: e.target.value})}
                          className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg"
                        />
                      </div>
                      {config.startTime && (
                        <div className="backdrop-blur-md bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 mt-3">
                          <p className="text-xs text-white/80 drop-shadow">
                            <strong>Horarios generados:</strong> {generateAvailableTimeSlots().length} espacios disponibles
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {generateAvailableTimeSlots().slice(0, 10).map((time, idx) => (
                              <span key={idx} className="text-xs backdrop-blur-md bg-white/10 px-2 py-1 rounded text-white">
                                {time}
                              </span>
                            ))}
                            {generateAvailableTimeSlots().length > 10 && (
                              <span className="text-xs text-white/60">
                                +{generateAvailableTimeSlots().length - 10} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Canchas</Label>
                        <Select value={config.fieldsAvailable.toString()} onValueChange={(value) => setConfig({...config, fieldsAvailable: parseInt(value)})}>
                          <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                            {[1,2,3,4,5,6].map(num => (
                              <SelectItem key={num} value={num.toString()} className="text-white hover:bg-white/10">
                                {num} cancha{num > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Formato</Label>
                        <Select value={config.doubleRound ? "double" : "single"} onValueChange={(value) => setConfig({...config, doubleRound: value === "double"})}>
                          <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                            <SelectItem value="single" className="text-white hover:bg-white/10">Una vuelta</SelectItem>
                            <SelectItem value="double" className="text-white hover:bg-white/10">Ida y vuelta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Days Configuration */}
              <div className="space-y-8">
                <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20">
                  <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-8 flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    Días de Partidos
                  </h3>
                  <div className="space-y-6">

                    <div>
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Días de Partidos</Label>
                      <div className="grid grid-cols-7 gap-3 mt-3">
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
                            className="h-12 text-base font-medium"
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-4">
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

            <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20 mt-8 max-w-7xl mx-auto">
              <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-6 flex items-center gap-3">
                <Users className="w-6 h-6" />
                Resumen de Configuración
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                <ul className="text-sm text-white/90 drop-shadow space-y-3">
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
                <ul className="text-sm text-white/90 drop-shadow space-y-3">
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

            <div className="flex gap-4 sm:p-6 pt-6 border-t border-white/20 mt-8">
              <Button
                type="button"
                onClick={() => setIsGeneratorOpen(false)}
                className="flex-1 h-12 text-base backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={generateFixtures}
                disabled={generating || !config.tournamentId || !config.startDate || !config.endDate || !config.startTime || config.matchDays.length === 0 || generateAvailableTimeSlots().length === 0}
                className="flex-1 h-12 text-base backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 mr-2" />
                    Generar Calendario
                  </>
                )}
              </Button>
            </div>
            </>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Tournament Selection */}
                <div className="backdrop-blur-xl bg-white/10 p-6 rounded-xl shadow-xl border border-white/20">
                  <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Seleccionar Torneo</Label>
                  <Select value={manualTournamentId} onValueChange={setManualTournamentId}>
                    <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                      <SelectValue placeholder="Selecciona un torneo" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                      {activeTournaments.map(tournament => (
                        <SelectItem key={tournament.id} value={tournament.id} className="text-white hover:bg-white/10">
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rounds List */}
                {manualTournamentId && (
                  <div className="space-y-4">
                    {manualRounds.length === 0 && (
                      <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-white/60" />
                        <p className="text-white/80 drop-shadow mb-4">No hay jornadas creadas aún</p>
                        <Button
                          onClick={() => setManualRounds([{ round: 1, matches: [] }])}
                          className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Primera Jornada
                        </Button>
                      </div>
                    )}

                    {manualRounds.map((roundData, roundIndex) => (
                      <div key={roundIndex} className="backdrop-blur-xl bg-white/10 p-6 rounded-xl shadow-xl border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white drop-shadow-lg flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-soccer-gold" />
                            Jornada {roundData.round}
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newRounds = manualRounds.filter((_, idx) => idx !== roundIndex)
                              setManualRounds(newRounds)
                            }}
                            className="backdrop-blur-md bg-red-500/20 border-red-400/30 text-white hover:bg-red-500/30"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Matches in this round */}
                        <div className="space-y-3 mb-4">
                          {roundData.matches.length === 0 && (
                            <p className="text-white/60 text-sm text-center py-4">No hay partidos en esta jornada</p>
                          )}

                          {roundData.matches.map((match, matchIndex) => (
                            <div key={match.id} className="backdrop-blur-md bg-white/5 p-4 rounded-lg border border-white/10">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                {/* Home Team */}
                                <div>
                                  <Label className="text-xs text-white/70 drop-shadow mb-1 block">Local</Label>
                                  <Select
                                    value={match.homeTeamId}
                                    onValueChange={(value) => {
                                      const newRounds = [...manualRounds]
                                      newRounds[roundIndex].matches[matchIndex].homeTeamId = value
                                      setManualRounds(newRounds)
                                    }}
                                  >
                                    <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/20 text-white text-xs h-9">
                                      <SelectValue placeholder="Equipo" />
                                    </SelectTrigger>
                                    <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                                      {activeTeams.map(team => (
                                        <SelectItem key={team.id} value={team.id} className="text-white hover:bg-white/10 text-xs">
                                          {team.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Away Team */}
                                <div>
                                  <Label className="text-xs text-white/70 drop-shadow mb-1 block">Visitante</Label>
                                  <Select
                                    value={match.awayTeamId}
                                    onValueChange={(value) => {
                                      const newRounds = [...manualRounds]
                                      newRounds[roundIndex].matches[matchIndex].awayTeamId = value
                                      setManualRounds(newRounds)
                                    }}
                                  >
                                    <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/20 text-white text-xs h-9">
                                      <SelectValue placeholder="Equipo" />
                                    </SelectTrigger>
                                    <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                                      {activeTeams.map(team => (
                                        <SelectItem key={team.id} value={team.id} className="text-white hover:bg-white/10 text-xs">
                                          {team.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Date */}
                                <div>
                                  <Label className="text-xs text-white/70 drop-shadow mb-1 block">Fecha</Label>
                                  <Input
                                    type="date"
                                    value={match.date}
                                    onChange={(e) => {
                                      const newRounds = [...manualRounds]
                                      newRounds[roundIndex].matches[matchIndex].date = e.target.value
                                      setManualRounds(newRounds)
                                    }}
                                    className="backdrop-blur-md bg-white/10 border-white/20 text-white h-9 text-xs"
                                  />
                                </div>

                                {/* Time */}
                                <div>
                                  <Label className="text-xs text-white/70 drop-shadow mb-1 block">Hora</Label>
                                  <Input
                                    type="time"
                                    value={match.time}
                                    onChange={(e) => {
                                      const newRounds = [...manualRounds]
                                      newRounds[roundIndex].matches[matchIndex].time = e.target.value
                                      setManualRounds(newRounds)
                                    }}
                                    className="backdrop-blur-md bg-white/10 border-white/20 text-white h-9 text-xs"
                                  />
                                </div>

                                {/* Field & Delete */}
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <Label className="text-xs text-white/70 drop-shadow mb-1 block">Cancha</Label>
                                    <Select
                                      value={match.field.toString()}
                                      onValueChange={(value) => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches[matchIndex].field = parseInt(value)
                                        setManualRounds(newRounds)
                                      }}
                                    >
                                      <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/20 text-white text-xs h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                                        {[1,2,3,4,5,6].map(num => (
                                          <SelectItem key={num} value={num.toString()} className="text-white hover:bg-white/10 text-xs">
                                            {num}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-white/70 drop-shadow mb-1 block opacity-0">-</Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newRounds = [...manualRounds]
                                        newRounds[roundIndex].matches = newRounds[roundIndex].matches.filter((_, idx) => idx !== matchIndex)
                                        setManualRounds(newRounds)
                                      }}
                                      className="backdrop-blur-md bg-red-500/20 border-red-400/30 text-white hover:bg-red-500/30 h-9 px-2"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

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
                          className="w-full backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Partido
                        </Button>
                      </div>
                    ))}

                    {/* Add Round Button */}
                    {manualRounds.length > 0 && (
                      <Button
                        onClick={() => {
                          const nextRound = Math.max(...manualRounds.map(r => r.round)) + 1
                          setManualRounds([...manualRounds, { round: nextRound, matches: [] }])
                        }}
                        className="w-full backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0 h-12"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Nueva Jornada
                      </Button>
                    )}

                    {/* Action Buttons */}
                    {manualRounds.length > 0 && manualRounds.some(r => r.matches.length > 0) && (
                      <div className="flex gap-4 pt-4 border-t border-white/20">
                        <Button
                          type="button"
                          onClick={() => setIsGeneratorOpen(false)}
                          className="flex-1 h-12 text-base backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
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
                          className="flex-1 h-12 text-base backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
                        >
                          <Eye className="w-5 h-5 mr-2" />
                          Vista Previa
                        </Button>
                      </div>
                    )}
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
              {Object.entries(groupFixturesByRound(generatedFixtures)).map(([round, matches]) => (
                <Card key={round} className="shadow-sm border-soccer-gold/20">
                  <CardHeader className="pb-4 bg-soccer-gold/10">
                    <CardTitle className="text-xl text-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-soccer-gold" />
                      Jornada {round}
                    </CardTitle>
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
              ))}

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