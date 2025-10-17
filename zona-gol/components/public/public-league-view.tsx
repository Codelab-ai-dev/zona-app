"use client"
import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { Trophy, Users, Calendar, Shield, ArrowRight } from "lucide-react"
import { Database } from "@/lib/supabase/database.types"

type League = Database['public']['Tables']['leagues']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

interface PublicLeagueViewProps {
  league: League
}

interface LeagueData {
  tournaments: Tournament[]
  teams: Team[]
  matches: any[]
  stats: any
}

export function PublicLeagueView({ league }: PublicLeagueViewProps) {
  const [data, setData] = useState<LeagueData>({
    tournaments: [],
    teams: [],
    matches: [],
    stats: null,
  })
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  useEffect(() => {
    const loadLeagueData = async () => {
      try {
        setLoading(true)
        const [tournaments, teams, stats] = await Promise.all([
          serverLeagueActions.getTournamentsByLeague(league.id),
          serverLeagueActions.getTeamsByLeague(league.id),
          serverLeagueActions.getLeagueStats(league.id),
        ])

        setData({
          tournaments: tournaments || [],
          teams: teams || [],
          matches: stats?.upcomingMatches || [],
          stats,
        })
      } catch (error) {
        console.error('Error loading league data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeagueData()
  }, [league.id])
  
  // Set default selected round to the most recent one
  useEffect(() => {
    const roundNumbers = data.stats?.roundNumbers || []
    if (roundNumbers.length > 0 && !selectedRound) {
      setSelectedRound(roundNumbers[roundNumbers.length - 1])
    }
  }, [data.stats?.roundNumbers, selectedRound])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeTournament = data.tournaments.find((t) => t.is_active)
  const upcomingMatches = data.stats?.upcomingMatches || []
  const recentMatches = data.stats?.recentMatches || []
  const leagueMatches = data.stats?.allMatches || []
  const matchesByRound = data.stats?.matchesByRound || {}
  const roundNumbers = data.stats?.roundNumbers || []

  // Get team standings from the database (all teams with their statistics)
  const teamStandings = data.stats?.teamStandings || []

  // Debug logging
  console.log('🏆 League data:', { 
    leagueId: league.id, 
    teamStandings: teamStandings.length,
    hasRealStats: data.stats?.teamStandings?.length > 0,
    upcomingMatches: upcomingMatches.length,
    recentMatches: recentMatches.length,
    allMatches: leagueMatches.length,
    rounds: roundNumbers.length,
    sample: teamStandings[0]
  })

  // Debug rounds specifically
  console.log('🗓️ Rounds debug:', {
    roundNumbers,
    matchesByRound: Object.keys(matchesByRound).map(round => ({
      round,
      matches: matchesByRound[round].length,
      finished: matchesByRound[round].filter(m => m.status === 'finished').length,
      scheduled: matchesByRound[round].filter(m => m.status !== 'finished').length
    }))
  })

  const getTeamInitials = (teamName: string) => {
    return teamName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getTeamName = (teamId: string, teamData?: any) => {
    // If team data is provided directly (from match data)
    if (teamData && teamData.name) {
      return teamData.name
    }
    
    // Fallback to finding team in teams array
    const team = data.teams.find((t) => t.id === teamId)
    return team ? team.name : "Equipo"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-soccer-green">{league.name}</h1>
              <p className="text-muted-foreground mt-1">{league.description}</p>
            </div>
            <div className="text-right">
              <Badge variant="default" className="mb-2">
                Liga Oficial
              </Badge>
              <p className="text-sm text-muted-foreground">/{league.slug}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Equipos</CardTitle>
              <Shield className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.stats?.teamsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Equipos activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jugadores</CardTitle>
              <Users className="w-4 h-4 text-soccer-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.stats?.playersCount || 0}</div>
              <p className="text-xs text-muted-foreground">Jugadores registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Partidos</CardTitle>
              <Calendar className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{data.stats?.matchesCount || 0}</div>
              <p className="text-xs text-muted-foreground">Total de partidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Torneo Actual</CardTitle>
              <Trophy className="w-4 h-4 text-soccer-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-foreground">{activeTournament ? "Activo" : "Inactivo"}</div>
              <p className="text-xs text-muted-foreground">{activeTournament?.name || "Sin torneo activo"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="standings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="standings">Tabla de Posiciones</TabsTrigger>
            <TabsTrigger value="matches">Partidos</TabsTrigger>
            <TabsTrigger value="rounds">Jornadas</TabsTrigger>
            <TabsTrigger value="teams">Equipos</TabsTrigger>
            <TabsTrigger value="tournaments">Torneos</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <CardTitle>Tabla de Posiciones</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <span>{activeTournament ? `${activeTournament.name}` : "Posiciones generales"}</span>
                  {teamStandings.some(s => s.matches_played > 0) ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-soccer-green rounded-full">
                      📊 Estadísticas en tiempo real
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-muted-foreground rounded-full">
                      📋 Equipos registrados
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 text-sm font-medium text-muted-foreground">Pos</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground">Equipo</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">PJ</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">G</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">E</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">P</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">GF</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">GC</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">DG</th>
                        <th className="pb-2 text-sm font-medium text-muted-foreground text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStandings.map((standing, index) => {
                        const hasPlayedMatches = standing.matches_played > 0
                        return (
                        <tr key={standing.team.id} className={`border-b hover:bg-muted/30 dark:bg-muted/50 ${hasPlayedMatches ? '' : 'opacity-75'}`}>
                          <td className="py-3 text-sm font-medium">
                            {hasPlayedMatches ? (
                              <span className="font-bold text-foreground">{index + 1}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                {standing.team.logo && (
                                  <AvatarImage
                                    src={standing.team.logo}
                                    alt={`Logo de ${standing.team.name}`}
                                  />
                                )}
                                <AvatarFallback className="bg-green-100 text-soccer-green text-xs font-bold">
                                  {getTeamInitials(standing.team.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{standing.team.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-sm">{standing.matches_played || 0}</td>
                          <td className="py-3 text-center text-sm">{standing.matches_won || 0}</td>
                          <td className="py-3 text-center text-sm">{standing.matches_drawn || 0}</td>
                          <td className="py-3 text-center text-sm">{standing.matches_lost || 0}</td>
                          <td className="py-3 text-center text-sm">{standing.goals_for || 0}</td>
                          <td className="py-3 text-center text-sm">{standing.goals_against || 0}</td>
                          <td className="py-3 text-center text-sm">
                            <span
                              className={
                                (standing.goal_difference || 0) > 0
                                  ? "text-soccer-green"
                                  : (standing.goal_difference || 0) < 0
                                    ? "text-soccer-red"
                                    : "text-muted-foreground"
                              }
                            >
                              {(standing.goal_difference || 0) > 0 ? "+" : ""}
                              {standing.goal_difference || 0}
                            </span>
                          </td>
                          <td className="py-3 text-center text-sm font-bold">{standing.points || 0}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {teamStandings.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay equipos registrados en esta liga</p>
                      <p className="text-sm text-muted-foreground">Los equipos aparecerán cuando se registren en la liga</p>
                    </div>
                  )}
                  {teamStandings.length > 0 && teamStandings.every(s => s.matches_played === 0) && (
                    <div className="text-center py-4 mt-4">
                      <div className="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                        ⚽ Temporada preparándose - Los partidos comenzarán pronto
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Próximos Partidos</CardTitle>
                  <CardDescription>Partidos programados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingMatches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-4 bg-muted/30 dark:bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-medium text-sm text-foreground">{getTeamName(match.home_team_id, match.home_team)}</p>
                            <p className="text-xs text-muted-foreground">vs</p>
                            <p className="font-medium text-sm text-foreground">{getTeamName(match.away_team_id, match.away_team)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatDate(match.match_date)}</p>
                          <Badge variant="outline" className="text-xs bg-soccer-blue/10 text-soccer-blue border-soccer-blue dark:bg-soccer-blue/20 dark:text-soccer-blue-light dark:border-soccer-blue/60">
                            Programado
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {upcomingMatches.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No hay partidos programados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultados Recientes</CardTitle>
                  <CardDescription>Últimos partidos jugados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentMatches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-4 bg-muted/30 dark:bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-medium text-sm">{getTeamName(match.home_team_id, match.home_team)}</p>
                            <p className="text-lg font-bold text-soccer-green">
                              {match.home_score || 0} - {match.away_score || 0}
                            </p>
                            <p className="font-medium text-sm">{getTeamName(match.away_team_id, match.away_team)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{formatDate(match.match_date)}</p>
                          <Badge variant="secondary" className="text-xs">
                            Finalizado
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {recentMatches.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p className="mb-2">No hay resultados disponibles</p>
                        <p className="text-sm text-muted-foreground">Los resultados aparecerán cuando se finalicen partidos</p>
                        {upcomingMatches.length > 0 && (
                          <p className="text-xs text-blue-600 mt-2">Hay {upcomingMatches.length} partido(s) programado(s)</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rounds">
            {roundNumbers.length > 0 ? (
              <div className="space-y-6">
                {/* Round Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Seleccionar Jornada</span>
                      <Badge variant="outline" className="text-xs">
                        {roundNumbers.length} jornadas disponibles
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedRound?.toString() || ""} 
                      onValueChange={(value) => setSelectedRound(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una jornada" />
                      </SelectTrigger>
                      <SelectContent>
                        {roundNumbers.map((roundNumber) => {
                          const roundMatches = matchesByRound[roundNumber] || []
                          const finishedMatches = roundMatches.filter(m => m.status === 'finished')
                          const isCompleted = roundMatches.length > 0 && finishedMatches.length === roundMatches.length
                          const isInProgress = finishedMatches.length > 0 && finishedMatches.length < roundMatches.length
                          
                          return (
                            <SelectItem key={roundNumber} value={roundNumber.toString()}>
                              <div className="flex items-center space-x-2 w-full">
                                <span>Jornada {roundNumber}</span>
                                {isCompleted && <span className="text-soccer-green">✅</span>}
                                {isInProgress && <span className="text-soccer-gold">⏳</span>}
                                {!isCompleted && !isInProgress && <span className="text-muted-foreground">📅</span>}
                                <span className="text-xs text-muted-foreground">({roundMatches.length} partidos)</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Selected Round Details */}
                {selectedRound && (() => {
                  const roundMatches = matchesByRound[selectedRound] || []
                  const finishedMatches = roundMatches.filter(m => m.status === 'finished')
                  const scheduledMatches = roundMatches.filter(m => m.status === 'scheduled' || m.status === 'in_progress')
                  const isCompleted = roundMatches.length > 0 && finishedMatches.length === roundMatches.length
                  const isInProgress = scheduledMatches.length > 0 && finishedMatches.length > 0
                  
                  return (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>Jornada {selectedRound}</span>
                              {isCompleted && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-soccer-green">
                                  ✅ Completada
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                  ⏳ En progreso
                                </Badge>
                              )}
                              {!isCompleted && !isInProgress && (
                                <Badge variant="outline" className="text-xs">
                                  📅 Programada
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {roundMatches.length} partido(s) • {finishedMatches.length} finalizado(s) • {scheduledMatches.length} programado(s)
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {roundMatches.map((match) => {
                            const isFinished = match.status === 'finished'
                            
                            return (
                              <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                isFinished ? 'bg-green-50 border-green-200' : 'bg-muted/30 dark:bg-muted/50 border-gray-200'
                              }`}>
                                <div className="flex items-center space-x-4">
                                  <div className="text-center min-w-[120px]">
                                    <p className="font-medium text-sm">{getTeamName(match.home_team_id, match.home_team)}</p>
                                    {isFinished ? (
                                      <p className="text-lg font-bold text-soccer-green my-1">
                                        {match.home_score || 0} - {match.away_score || 0}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground my-1">vs</p>
                                    )}
                                    <p className="font-medium text-sm">{getTeamName(match.away_team_id, match.away_team)}</p>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="flex flex-col items-end space-y-1">
                                    <p className="text-sm font-medium">
                                      {formatDate(match.match_date)}
                                      {match.match_time && (
                                        <span className="ml-2 text-muted-foreground">{match.match_time}</span>
                                      )}
                                    </p>
                                    
                                    {match.field_number && (
                                      <p className="text-xs text-muted-foreground">
                                        Campo {match.field_number}
                                      </p>
                                    )}
                                    
                                    <Badge 
                                      variant={isFinished ? "secondary" : "outline"} 
                                      className="text-xs"
                                    >
                                      {isFinished ? "Finalizado" : 
                                       match.status === 'in_progress' ? "En progreso" : 
                                       "Programado"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-2">No hay jornadas programadas</p>
                  <p className="text-sm text-muted-foreground">Las jornadas aparecerán cuando se programen partidos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        {team.logo && (
                          <AvatarImage
                            src={team.logo}
                            alt={`Logo de ${team.name}`}
                          />
                        )}
                        <AvatarFallback className="bg-soccer-blue/10 text-soccer-blue font-bold">
                          {getTeamInitials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>/{team.slug}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{team.description || "Sin descripción"}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        Equipo registrado
                      </span>
                      <Button variant="outline" size="sm">
                        Ver Equipo
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.teams.length === 0 && (
                <div className="col-span-full">
                  <p className="text-center text-muted-foreground py-8">No hay equipos registrados</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tournaments">
            <div className="grid gap-6 md:grid-cols-2">
              {data.tournaments.map((tournament) => (
                <Card key={tournament.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Trophy className="w-5 h-5 mr-2 text-soccer-gold" />
                          {tournament.name}
                        </CardTitle>
                        <CardDescription>
                          {new Date(tournament.start_date).toLocaleDateString("es-ES")} -{" "}
                          {new Date(tournament.end_date).toLocaleDateString("es-ES")}
                        </CardDescription>
                      </div>
                      <Badge variant={tournament.is_active ? "default" : "secondary"}>
                        {tournament.is_active ? "Activo" : "Finalizado"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Partidos:{" "}
                          {
                            leagueMatches.filter((m) => m.tournament_id === tournament.id && m.status === "finished")
                              .length
                          }{" "}
                          jugados
                        </p>
                        <p>
                          Programados:{" "}
                          {
                            leagueMatches.filter((m) => m.tournament_id === tournament.id && m.status === "scheduled")
                              .length
                          }
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver Detalles
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
