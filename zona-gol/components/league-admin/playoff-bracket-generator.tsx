"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Plus,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Save
} from "lucide-react"
import { useTeams } from "@/lib/hooks/use-teams"
import { useTournaments } from "@/lib/hooks/use-tournaments"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

interface PlayoffBracketGeneratorProps {
  leagueId: string
}

interface PlayoffMatch {
  round: 'quarterfinals' | 'semifinals' | 'final' | 'third_place'
  position: number
  homeTeam: Team | null
  awayTeam: Team | null
  date: string
  time: string
  field: number
  leg?: 'first' | 'second' // Para partidos de ida y vuelta
}

interface StandingsTeam {
  team: Team
  points: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export function PlayoffBracketGenerator({ leagueId }: PlayoffBracketGeneratorProps) {
  const { teams, getTeamsByLeague } = useTeams()
  const { tournaments, getTournamentsByLeague } = useTournaments()

  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Playoff configuration
  const [numTeams, setNumTeams] = useState<4 | 8>(8)
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("10:00")
  const [fieldNumber, setFieldNumber] = useState(1)
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(true)
  const [homeAndAway, setHomeAndAway] = useState(false)

  // Selected teams for playoffs
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([])
  const [standings, setStandings] = useState<StandingsTeam[]>([])

  // Generated playoff matches
  const [playoffMatches, setPlayoffMatches] = useState<PlayoffMatch[]>([])
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)

  useEffect(() => {
    if (leagueId) {
      getTournamentsByLeague(leagueId)
      getTeamsByLeague(leagueId)
    }
  }, [leagueId])

  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournamentId) {
      const activeTournament = tournaments.find(t => t.is_active) || tournaments[0]
      setSelectedTournamentId(activeTournament.id)
    }
  }, [tournaments, selectedTournamentId])

  // Calculate standings from regular season matches
  const calculateStandings = async (tournamentId: string): Promise<StandingsTeam[]> => {
    const supabase = createClientSupabaseClient()

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'finished')
      .or('phase.is.null,phase.eq.regular')

    if (error) throw error

    const teamStats = new Map<string, StandingsTeam>()

    // Initialize all teams
    teams.forEach(team => {
      if (team.tournament_id === tournamentId && team.is_active) {
        teamStats.set(team.id, {
          team,
          points: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0
        })
      }
    })

    // Calculate stats from matches
    matches?.forEach((match: any) => {
      const homeTeam = teamStats.get(match.home_team_id)
      const awayTeam = teamStats.get(match.away_team_id)

      if (!homeTeam || !awayTeam || match.home_score === null || match.away_score === null) return

      homeTeam.played++
      awayTeam.played++
      homeTeam.goalsFor += match.home_score
      homeTeam.goalsAgainst += match.away_score
      awayTeam.goalsFor += match.away_score
      awayTeam.goalsAgainst += match.home_score

      if (match.home_score > match.away_score) {
        homeTeam.won++
        homeTeam.points += 3
        awayTeam.lost++
      } else if (match.home_score < match.away_score) {
        awayTeam.won++
        awayTeam.points += 3
        homeTeam.lost++
      } else {
        homeTeam.drawn++
        awayTeam.drawn++
        homeTeam.points += 1
        awayTeam.points += 1
      }

      homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst
      awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst
    })

    // Sort by points, goal difference, goals for
    const sortedStandings = Array.from(teamStats.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    return sortedStandings
  }

  const loadStandings = async () => {
    if (!selectedTournamentId) return

    setLoading(true)
    setMessage(null)

    try {
      const standings = await calculateStandings(selectedTournamentId)
      setStandings(standings)

      // Auto-select top teams
      setSelectedTeams(standings.slice(0, numTeams).map(s => s.team))

      setMessage({
        type: 'success',
        text: `Tabla cargada. Top ${numTeams} equipos seleccionados automáticamente`
      })
    } catch (error: any) {
      console.error('Error loading standings:', error)
      setMessage({ type: 'error', text: `Error cargando tabla: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const generatePlayoffBracket = () => {
    if (selectedTeams.length !== numTeams) {
      setMessage({
        type: 'error',
        text: `Debes seleccionar exactamente ${numTeams} equipos para la liguilla`
      })
      return
    }

    if (!startDate || !startTime) {
      setMessage({ type: 'error', text: 'Debes especificar fecha y hora de inicio' })
      return
    }

    const matches: PlayoffMatch[] = []
    let currentDate = new Date(startDate)
    let timeOffset = 0

    // Helper to add time
    const getMatchDateTime = (daysOffset: number, matchIndex: number) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() + daysOffset)

      const [hours, minutes] = startTime.split(':').map(Number)
      const matchTime = new Date(date)
      matchTime.setHours(hours + Math.floor(matchIndex * 1.5))
      matchTime.setMinutes(minutes)

      return {
        date: date.toISOString().split('T')[0],
        time: `${String(matchTime.getHours()).padStart(2, '0')}:${String(matchTime.getMinutes()).padStart(2, '0')}`
      }
    }

    if (numTeams === 8) {
      // Quarterfinals (8 teams -> 4 matches, or 8 if home and away)
      // Traditional seeding: 1v8, 4v5, 2v7, 3v6
      const quarterfinalPairs = [
        [0, 7], // 1st vs 8th
        [3, 4], // 4th vs 5th
        [1, 6], // 2nd vs 7th
        [2, 5]  // 3rd vs 6th
      ]

      quarterfinalPairs.forEach((pair, index) => {
        // Partido de ida
        const firstLegDateTime = getMatchDateTime(0, index)
        matches.push({
          round: 'quarterfinals',
          position: index + 1,
          homeTeam: selectedTeams[pair[0]],
          awayTeam: selectedTeams[pair[1]],
          date: firstLegDateTime.date,
          time: firstLegDateTime.time,
          field: fieldNumber,
          leg: homeAndAway ? 'first' : undefined
        })

        // Partido de vuelta (si está activado)
        if (homeAndAway) {
          const secondLegDateTime = getMatchDateTime(3, index)
          matches.push({
            round: 'quarterfinals',
            position: index + 1,
            homeTeam: selectedTeams[pair[1]], // Equipos invertidos
            awayTeam: selectedTeams[pair[0]],
            date: secondLegDateTime.date,
            time: secondLegDateTime.time,
            field: fieldNumber,
            leg: 'second'
          })
        }
      })

      // Semifinals (4 teams -> 2 matches, or 4 if home and away)
      for (let i = 0; i < 2; i++) {
        // Partido de ida
        const firstLegDateTime = getMatchDateTime(homeAndAway ? 7 : 7, i)
        matches.push({
          round: 'semifinals',
          position: i + 1,
          homeTeam: null, // TBD from quarterfinals
          awayTeam: null,
          date: firstLegDateTime.date,
          time: firstLegDateTime.time,
          field: fieldNumber,
          leg: homeAndAway ? 'first' : undefined
        })

        // Partido de vuelta (si está activado)
        if (homeAndAway) {
          const secondLegDateTime = getMatchDateTime(10, i)
          matches.push({
            round: 'semifinals',
            position: i + 1,
            homeTeam: null, // TBD from quarterfinals
            awayTeam: null,
            date: secondLegDateTime.date,
            time: secondLegDateTime.time,
            field: fieldNumber,
            leg: 'second'
          })
        }
      }
    } else {
      // 4 teams: Direct semifinals
      const semifinalPairs = [
        [0, 3], // 1st vs 4th
        [1, 2]  // 2nd vs 3rd
      ]

      semifinalPairs.forEach((pair, index) => {
        // Partido de ida
        const firstLegDateTime = getMatchDateTime(0, index)
        matches.push({
          round: 'semifinals',
          position: index + 1,
          homeTeam: selectedTeams[pair[0]],
          awayTeam: selectedTeams[pair[1]],
          date: firstLegDateTime.date,
          time: firstLegDateTime.time,
          field: fieldNumber,
          leg: homeAndAway ? 'first' : undefined
        })

        // Partido de vuelta (si está activado)
        if (homeAndAway) {
          const secondLegDateTime = getMatchDateTime(3, index)
          matches.push({
            round: 'semifinals',
            position: index + 1,
            homeTeam: selectedTeams[pair[1]], // Equipos invertidos
            awayTeam: selectedTeams[pair[0]],
            date: secondLegDateTime.date,
            time: secondLegDateTime.time,
            field: fieldNumber,
            leg: 'second'
          })
        }
      })
    }

    // Third place match (siempre partido único)
    if (thirdPlaceMatch) {
      const dateTime = getMatchDateTime(numTeams === 8 ? (homeAndAway ? 14 : 14) : (homeAndAway ? 7 : 7), 0)
      matches.push({
        round: 'third_place',
        position: 1,
        homeTeam: null, // TBD from semifinals
        awayTeam: null,
        date: dateTime.date,
        time: dateTime.time,
        field: fieldNumber
      })
    }

    // Final (siempre partido único)
    const finalDateTime = getMatchDateTime(numTeams === 8 ? (homeAndAway ? 14 : 14) : (homeAndAway ? 7 : 7), thirdPlaceMatch ? 1 : 0)
    matches.push({
      round: 'final',
      position: 1,
      homeTeam: null, // TBD from semifinals
      awayTeam: null,
      date: finalDateTime.date,
      time: finalDateTime.time,
      field: fieldNumber
    })

    setPlayoffMatches(matches)
    setIsPreviewDialogOpen(true)
    setMessage({
      type: 'success',
      text: `Bracket de liguilla generado con ${matches.length} partidos`
    })
  }

  const savePlayoffBracket = async () => {
    if (playoffMatches.length === 0) return

    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClientSupabaseClient()

      // Usar dos equipos diferentes como placeholder para partidos "Por definir"
      // Esto evita el constraint "different_teams" que impide que un equipo juegue contra sí mismo
      const placeholderHome = selectedTeams[0]
      const placeholderAway = selectedTeams[1]

      console.log('🔍 Debug Info:', {
        playoffMatchesCount: playoffMatches.length,
        placeholderHome: placeholderHome?.name,
        placeholderAway: placeholderAway?.name,
        selectedTournamentId
      })

      const matchesToInsert = playoffMatches
        .map(match => {
          const matchData: any = {
            tournament_id: selectedTournamentId,
            // Si no hay equipo asignado, usar placeholders diferentes para home y away
            home_team_id: match.homeTeam?.id || placeholderHome.id,
            away_team_id: match.awayTeam?.id || placeholderAway.id,
            match_date: `${match.date}T${match.time}:00`,
            match_time: match.time,
            field_number: match.field,
            round: null, // No round number for playoffs
            status: 'scheduled',
            phase: 'playoffs',
            playoff_round: match.round,
            playoff_position: match.position,
            leg: match.leg || null
          }

          console.log('📝 Match to insert:', {
            round: match.round,
            homeTeam: match.homeTeam?.name || 'PLACEHOLDER (HOME)',
            awayTeam: match.awayTeam?.name || 'PLACEHOLDER (AWAY)',
            date: match.date,
            time: match.time,
            fullData: matchData
          })

          return matchData
        })

      console.log('💾 Inserting matches:', matchesToInsert.length)

      const { data, error } = await supabase
        .from('matches')
        .insert(matchesToInsert as any)
        .select()

      console.log('✅ Insert result:', { data, error })

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      const matchesWithPlaceholder = playoffMatches.filter(m => m.homeTeam === null || m.awayTeam === null).length

      setMessage({
        type: 'success',
        text: `Liguilla guardada exitosamente. ${matchesToInsert.length} partidos creados.${
          matchesWithPlaceholder > 0
            ? ` ${matchesWithPlaceholder} partido(s) tienen equipos "Por definir" - edítalos en el Calendario cuando conozcas los ganadores.`
            : ''
        }`
      })

      setPlayoffMatches([])
      setIsPreviewDialogOpen(false)
      setIsSetupDialogOpen(false)

    } catch (error: any) {
      console.error('Error saving playoff bracket:', error)
      setMessage({ type: 'error', text: `Error guardando liguilla: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const getRoundName = (round: string) => {
    switch(round) {
      case 'quarterfinals': return 'Cuartos de Final'
      case 'semifinals': return 'Semifinales'
      case 'final': return 'Final'
      case 'third_place': return 'Tercer Lugar'
      default: return round
    }
  }

  const activeTournaments = tournaments.filter(t => t.is_active)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fase de Liguilla</h2>
          <p className="text-muted-foreground">
            Configura y genera el bracket de playoffs al finalizar la fase regular
          </p>
        </div>
        <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-soccer-gold hover:bg-soccer-gold-dark dark:bg-soccer-gold dark:hover:bg-soccer-gold-light">
              <Plus className="w-4 h-4 mr-2" />
              Generar Liguilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="w-7 h-7 text-soccer-gold" />
                Configurar Liguilla
              </DialogTitle>
              <DialogDescription className="text-base">
                Selecciona los equipos clasificados y configura el formato de la liguilla
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8 py-2">
              {message && (
                <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}>
                  <AlertDescription className={message.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* Tournament Selection */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Seleccionar Torneo</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un torneo" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTournaments.map(tournament => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Playoff Format Configuration */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Formato de Liguilla</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-0">
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-3">
                        <Label className="text-base font-medium block">Número de Equipos</Label>
                        <Select
                          value={numTeams.toString()}
                          onValueChange={(val) => {
                            setNumTeams(parseInt(val) as 4 | 8)
                            setSelectedTeams([])
                          }}
                        >
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4 equipos (Semifinales)</SelectItem>
                            <SelectItem value="8">8 equipos (Cuartos de Final)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium block">Fecha de Inicio</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-12 w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-3">
                        <Label className="text-base font-medium block">Hora de Inicio</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-12 w-full"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium block">Cancha</Label>
                        <Select value={fieldNumber.toString()} onValueChange={(val) => setFieldNumber(parseInt(val))}>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                Cancha {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="thirdPlace"
                        checked={thirdPlaceMatch}
                        onChange={(e) => setThirdPlaceMatch(e.target.checked)}
                        className="rounded w-4 h-4"
                      />
                      <Label htmlFor="thirdPlace" className="text-base cursor-pointer">Incluir partido por el tercer lugar</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="homeAndAway"
                        checked={homeAndAway}
                        onChange={(e) => setHomeAndAway(e.target.checked)}
                        className="rounded w-4 h-4"
                      />
                      <Label htmlFor="homeAndAway" className="text-base cursor-pointer">Partidos de ida y vuelta</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Load Standings */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Clasificación de la Fase Regular</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Carga la tabla de posiciones para seleccionar equipos automáticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={loadStandings}
                    disabled={loading || !selectedTournamentId}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando tabla...
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        Cargar Tabla de Posiciones
                      </>
                    )}
                  </Button>

                  {standings.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-base font-semibold">Tabla de Posiciones:</p>
                      <div className="border rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-semibold">Pos</th>
                              <th className="text-left p-3 font-semibold">Equipo</th>
                              <th className="text-center p-3 font-semibold">PJ</th>
                              <th className="text-center p-3 font-semibold">Pts</th>
                              <th className="text-center p-3 font-semibold">DG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.slice(0, 12).map((standing, index) => (
                              <tr
                                key={standing.team.id}
                                className={
                                  index < numTeams
                                    ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500'
                                    : 'hover:bg-muted/50'
                                }
                              >
                                <td className="p-3 font-medium">{index + 1}</td>
                                <td className="p-3">{standing.team.name}</td>
                                <td className="p-3 text-center">{standing.played}</td>
                                <td className="p-3 text-center font-bold">{standing.points}</td>
                                <td className="p-3 text-center">{standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        Los primeros {numTeams} equipos están seleccionados automáticamente (resaltados en verde)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Team Selection */}
              {selectedTeams.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Equipos Clasificados</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Ajusta manualmente el orden si es necesario
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-3">
                      {Array.from({ length: numTeams }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Badge variant="outline" className="w-14 h-10 justify-center text-base font-semibold">
                            {index + 1}°
                          </Badge>
                          <Select
                            value={selectedTeams[index]?.id || ''}
                            onValueChange={(teamId) => {
                              const team = teams.find(t => t.id === teamId)
                              if (team) {
                                const newTeams = [...selectedTeams]
                                newTeams[index] = team
                                setSelectedTeams(newTeams)
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleccionar equipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams
                                .filter(t => t.tournament_id === selectedTournamentId && t.is_active)
                                .map(team => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generate Button */}
              <div className="flex gap-4 pt-4 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsSetupDialogOpen(false)}
                  className="flex-1 h-12 text-base"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={generatePlayoffBracket}
                  disabled={selectedTeams.length !== numTeams || !startDate}
                  className="flex-1 h-12 text-base bg-soccer-green hover:bg-soccer-green-dark"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Generar Bracket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-7 h-7 text-soccer-gold" />
              Vista Previa - Bracket de Liguilla
            </DialogTitle>
            <DialogDescription className="text-base">
              Revisa el bracket generado antes de guardarlo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {message && (
              <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Group matches by round */}
            {['quarterfinals', 'semifinals', 'third_place', 'final'].map(roundKey => {
              const roundMatches = playoffMatches.filter(m => m.round === roundKey)
              if (roundMatches.length === 0) return null

              return (
                <Card key={roundKey} className="border-soccer-gold/30 shadow-sm">
                  <CardHeader className="bg-soccer-gold/10 pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-soccer-gold" />
                      {getRoundName(roundKey)}
                      <Badge variant="outline" className="ml-2 bg-soccer-gold/20 border-soccer-gold">
                        {roundMatches.length} {roundMatches.length === 1 ? 'partido' : 'partidos'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {roundMatches.map((match, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-5 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <Badge variant="outline" className="bg-soccer-blue/10 px-3 py-1">
                              Cancha {match.field}
                            </Badge>
                            {match.leg && (
                              <Badge variant={match.leg === 'first' ? 'default' : 'secondary'} className="px-3 py-1">
                                {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                              </Badge>
                            )}
                            <div className="flex items-center gap-3 flex-1">
                              <span className="font-semibold text-base">
                                {match.homeTeam?.name || <span className="text-muted-foreground italic">Por definir</span>}
                              </span>
                              <span className="text-muted-foreground font-medium">vs</span>
                              <span className="font-semibold text-base">
                                {match.awayTeam?.name || <span className="text-muted-foreground italic">Por definir</span>}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">{new Date(match.date).toLocaleDateString('es-ES')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{match.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Save Button */}
            <div className="flex gap-4 pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPreviewDialogOpen(false)
                  setPlayoffMatches([])
                }}
                className="flex-1 h-12 text-base"
              >
                Cancelar
              </Button>
              <Button
                onClick={savePlayoffBracket}
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
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Liguilla
                  </>
                )}
              </Button>
            </div>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 mt-4">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <AlertDescription className="ml-2 text-blue-800 dark:text-blue-200 text-base">
                <strong>Nota importante:</strong> Los partidos marcados como "Por definir" se crearán con equipos temporales.
                Deberás editarlos desde el Calendario de Partidos una vez que se completen las rondas anteriores
                y conozcas los equipos que realmente avanzaron a la Final y Tercer Lugar.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-soccer-gold" />
            ¿Cómo funciona la Liguilla?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1. Finaliza la fase regular:</strong> Asegúrate de que todos los partidos de
            la fase regular estén finalizados y los resultados ingresados correctamente.
          </p>
          <p>
            <strong>2. Genera la liguilla:</strong> El sistema cargará automáticamente la tabla
            de posiciones y seleccionará los primeros 4 u 8 equipos según el formato elegido.
          </p>
          <p>
            <strong>3. Ajusta manualmente:</strong> Puedes modificar el orden de los equipos
            clasificados si hay criterios especiales de desempate.
          </p>
          <p>
            <strong>4. Formato automático:</strong> Los emparejamientos se crean automáticamente:
            1° vs 8°, 2° vs 7°, etc. (para 8 equipos) o 1° vs 4°, 2° vs 3° (para 4 equipos).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
