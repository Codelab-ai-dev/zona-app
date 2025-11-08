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

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type MatchInsert = Database['public']['Tables']['matches']['Insert']

interface FixtureGeneratorProps {
  leagueId: string
}

interface FixtureConfig {
  tournamentId: string
  startDate: string
  matchDays: string[] // ['saturday', 'sunday', etc.]
  matchTimes: string[] // ['10:00', '12:00', '14:00', etc.]
  fieldsAvailable: number
  doubleRound: boolean // ida y vuelta
  matchDuration: {
    halfTime: number // duration in minutes (20-45)
    breakTime: number // break time in minutes (10-15)
  }
  scheduleType: 'morning' | 'afternoon' | 'evening' | 'custom'
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

export function FixtureGenerator({ leagueId }: FixtureGeneratorProps) {
  const { teams, getTeamsByLeague } = useTeams()
  const { tournaments, getTournamentsByLeague } = useTournaments()
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedFixtures, setGeneratedFixtures] = useState<GeneratedMatch[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [config, setConfig] = useState<FixtureConfig>({
    tournamentId: "",
    startDate: "",
    matchDays: ["saturday"],
    matchTimes: ["10:00"],
    fieldsAvailable: 1,
    doubleRound: false,
    matchDuration: {
      halfTime: 20,
      breakTime: 10
    },
    scheduleType: 'morning',
    championFixedSchedule: false
  })

  useEffect(() => {
    if (leagueId) {
      getTeamsByLeague(leagueId)
      getTournamentsByLeague(leagueId)
    }
  }, [leagueId])

  const activeTournaments = tournaments.filter(t => t.is_active)
  const activeTeams = teams.filter(t => t.is_active)

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

  // Generate schedule times based on league type
  const getScheduleTimesByType = (type: string): string[] => {
    switch(type) {
      case 'morning':
        return ['08:00', '09:30', '11:00', '12:30']
      case 'afternoon':
        return ['14:00', '15:30', '17:00', '18:30']
      case 'evening':
        return ['19:00', '20:30', '22:00']
      case 'custom':
        return config.matchTimes
      default:
        return ['10:00', '12:00', '14:00']
    }
  }

  const generateFixtures = () => {
    if (!config.tournamentId || !config.startDate || activeTeams.length < 2) {
      setMessage({ type: 'error', text: 'Faltan datos requeridos o no hay suficientes equipos activos (mínimo 2)' })
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      const rounds = generateRoundRobinFixtures(activeTeams, config.doubleRound)
      const generatedMatches: GeneratedMatch[] = []
      
      // Use schedule type times if not custom
      const availableTimes = config.scheduleType === 'custom' ? config.matchTimes : getScheduleTimesByType(config.scheduleType)
      
      let currentDate = new Date(config.startDate)
      let timeIndex = 0
      let fieldIndex = 1
      
      // Helper function to get next available match date
      const getNextMatchDate = () => {
        const dayOfWeek = currentDate.getDay() // 0 = Sunday, 6 = Saturday
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
        
        // Find next available day
        let daysToAdd = 1
        while (!targetDays.includes(((dayOfWeek + daysToAdd) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
          daysToAdd++
        }
        
        const nextDate = new Date(currentDate)
        nextDate.setDate(currentDate.getDate() + daysToAdd)
        return nextDate
      }

      rounds.forEach(round => {
        round.matches.forEach(match => {
          // Check if champion team has fixed schedule preference
          let assignedTime = availableTimes[timeIndex % availableTimes.length]
          
          // If champion fixed schedule is enabled and match involves champion team
          if (config.championFixedSchedule && config.championPreferredTime) {
            // Find the champion team (assuming it's the one with most wins or manually set)
            // For now, we'll use the first team as an example - this should be improved
            const championTeamId = activeTeams[0]?.id // This should be determined by league standings
            
            if (match.home.id === championTeamId || match.away.id === championTeamId) {
              if (availableTimes.includes(config.championPreferredTime)) {
                assignedTime = config.championPreferredTime
              }
            }
          }
          
          const field = fieldIndex
          
          generatedMatches.push({
            round: round.round,
            homeTeam: match.home,
            awayTeam: match.away,
            date: currentDate.toISOString().split('T')[0],
            time: assignedTime,
            field
          })
          
          // Move to next time slot
          timeIndex++
          
          // If we've used all time slots, move to next field
          if (timeIndex >= availableTimes.length) {
            timeIndex = 0
            fieldIndex++
            
            // If we've used all fields, move to next match day
            if (fieldIndex > config.fieldsAvailable) {
              fieldIndex = 1
              currentDate = getNextMatchDate()
            }
          }
        })
        
        // After each round, reset time and field, move to next available day
        timeIndex = 0
        fieldIndex = 1
        currentDate = getNextMatchDate()
      })
      
      setGeneratedFixtures(generatedMatches)
      setIsPreviewOpen(true)
      setMessage({ type: 'success', text: `Se generaron ${generatedMatches.length} partidos en ${rounds.length} jornadas` })
      
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
      
      // Prepare matches for database insertion
      const matchesToInsert: Database['public']['Tables']['matches']['Insert'][] = generatedFixtures.map(fixture => ({
        tournament_id: config.tournamentId,
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

      setMessage({ type: 'success', text: 'Calendario guardado exitosamente' })
      setGeneratedFixtures([])
      setIsPreviewOpen(false)
      setIsGeneratorOpen(false)
      
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
        <DialogContent className="!top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-[100vw] !max-h-[100vh] !m-0 !p-0 !overflow-hidden !border-0 !rounded-none !shadow-none bg-gradient-to-br from-black via-gray-900 to-black">
          <DialogHeader className="pb-4 border-b border-white/20 px-8 pt-2">
            <DialogTitle className="text-xl text-white drop-shadow-lg">Configurar Generación de Jornadas</DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">
              Configura los parámetros para generar el calendario de partidos
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-2">
            {message && (
              <Alert className={`mb-8 backdrop-blur-xl ${message.type === 'success' ? 'border-green-300/30 bg-green-500/20' : 'border-red-300/30 bg-red-500/20'} shadow-xl`}>
                <AlertDescription className="text-white drop-shadow">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

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
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Duración de Partidos</Label>
                      <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="10" className="text-white hover:bg-white/10">10 min</SelectItem>
                              <SelectItem value="15" className="text-white hover:bg-white/10">15 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-white/90 drop-shadow mb-2 block">Tipo de Liga</Label>
                      <Select value={config.scheduleType} onValueChange={(value: any) => setConfig({...config, scheduleType: value})}>
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                          <SelectItem value="morning" className="text-white hover:bg-white/10">Liga Matutina (8:00 - 12:30)</SelectItem>
                          <SelectItem value="afternoon" className="text-white hover:bg-white/10">Liga Vespertina (14:00 - 18:30)</SelectItem>
                          <SelectItem value="evening" className="text-white hover:bg-white/10">Liga Nocturna (19:00 - 22:00)</SelectItem>
                          <SelectItem value="custom" className="text-white hover:bg-white/10">Horarios Personalizados</SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* Right Column - Schedule Configuration */}
              <div className="space-y-8">
                <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20">
                  <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-8 flex items-center gap-3">
                    <Clock className="w-6 h-6" />
                    Configuración de Horarios
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

                    {config.scheduleType === 'custom' && (
                      <div>
                        <Label className="text-sm font-medium text-foreground">Horarios Personalizados</Label>
                        <div className="grid grid-cols-5 gap-3 mt-3">
                          {['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '19:00', '20:30', '22:00'].map(time => (
                            <Button
                              key={time}
                              type="button"
                              variant={config.matchTimes.includes(time) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const times = config.matchTimes.includes(time)
                                  ? config.matchTimes.filter(t => t !== time)
                                  : [...config.matchTimes, time]
                                setConfig({...config, matchTimes: times})
                              }}
                              className="h-11 text-sm"
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 dark:bg-soccer-gold/5 p-8 rounded-xl shadow-sm border border-muted">
                  <h3 className="text-xl font-semibold text-soccer-gold dark:text-soccer-gold-light mb-8 flex items-center gap-3">
                    <Trophy className="w-6 h-6" />
                    Preferencia del Campeón
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="championFixedSchedule"
                        checked={config.championFixedSchedule}
                        onChange={(e) => setConfig({...config, championFixedSchedule: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="championFixedSchedule" className="text-sm text-foreground">
                        Horario fijo para el campeón
                      </Label>
                    </div>
                    {config.championFixedSchedule && (
                      <div>
                        <Label className="text-sm text-foreground">Horario preferido</Label>
                        <Select 
                          value={config.championPreferredTime || ''} 
                          onValueChange={(value) => setConfig({...config, championPreferredTime: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona horario" />
                          </SelectTrigger>
                          <SelectContent>
                            {(config.scheduleType === 'custom' ? config.matchTimes : getScheduleTimesByType(config.scheduleType)).map(time => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 p-8 rounded-xl shadow-xl border border-white/20 mt-8 max-w-7xl mx-auto">
              <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-6 flex items-center gap-3">
                <Users className="w-6 h-6" />
                Resumen de Configuración
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ul className="text-sm text-white/90 drop-shadow space-y-3">
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Equipos:</strong> {activeTeams.length} participantes</span>
                  </li>
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
                </ul>
                <ul className="text-sm text-white/90 drop-shadow space-y-3">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Duración:</strong> {config.matchDuration.halfTime}min + {config.matchDuration.breakTime}min descanso + {config.matchDuration.halfTime}min</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center text-blue-300 font-bold">⏱</span>
                    <span>
                      <strong className="font-medium">Tipo de liga:</strong> {
                        config.scheduleType === 'morning' ? 'Matutina' :
                        config.scheduleType === 'afternoon' ? 'Vespertina' :
                        config.scheduleType === 'evening' ? 'Nocturna' : 'Personalizada'
                      }
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                    <span><strong className="font-medium">Horarios:</strong> {config.scheduleType === 'custom' ? config.matchTimes.length : getScheduleTimesByType(config.scheduleType).length} disponibles</span>
                  </li>
                  {config.championFixedSchedule && (
                    <li className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-blue-300" />
                      <span><strong className="font-medium">Campeón:</strong> Horario fijo {config.championPreferredTime}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-6 pt-6 border-t border-white/20 mt-8">
              <Button
                type="button"
                onClick={() => setIsGeneratorOpen(false)}
                className="flex-1 h-12 text-base backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Cancelar
              </Button>
              <Button 
                onClick={generateFixtures}
                disabled={generating || !config.tournamentId || !config.startDate || config.matchDays.length === 0 || (config.scheduleType === 'custom' && config.matchTimes.length === 0)}
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
                        <div key={index} className="flex items-center justify-between p-4 border hover:bg-muted/50 dark:hover:bg-soccer-green/5 transition-colors">
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
                            <span>{new Date(match.date).toLocaleDateString('es-ES')}</span>
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-6 pt-6 border-t mt-8 max-w-7xl mx-auto">
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