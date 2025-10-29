"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
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
  tournamentId?: string
}

interface LeagueData {
  tournaments: Tournament[]
  teams: Team[]
  matches: any[]
  stats: any
}

export function PublicLeagueView({ league, tournamentId }: PublicLeagueViewProps) {
  const [data, setData] = useState<LeagueData>({
    tournaments: [],
    teams: [],
    matches: [],
    stats: null,
  })
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  useEffect(() => {
    const loadLeagueData = async () => {
      try {
        setLoading(true)

        // Si hay tournamentId, cargar solo datos de ese torneo
        if (tournamentId) {
          const [tournaments, teams, stats] = await Promise.all([
            serverLeagueActions.getTournamentsByLeague(league.id),
            serverLeagueActions.getTeamsByTournament(tournamentId),
            serverLeagueActions.getTournamentStats(tournamentId),
          ])

          setData({
            tournaments: tournaments || [],
            teams: teams || [],
            matches: stats?.upcomingMatches || [],
            stats,
          })
        } else {
          // Si no hay tournamentId, cargar todos los datos de la liga
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
        }
      } catch (error) {
        console.error('Error loading league data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeagueData()
  }, [league.id, tournamentId])
  
  // Set default selected round to the most recent one
  useEffect(() => {
    const roundNumbers = data.stats?.roundNumbers || []
    if (roundNumbers.length > 0 && !selectedRound) {
      setSelectedRound(roundNumbers[roundNumbers.length - 1].toString())
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

  // Separate regular and playoff matches
  const upcomingRegularMatches = upcomingMatches.filter(m => m.phase !== 'playoffs')
  const upcomingPlayoffMatches = upcomingMatches.filter(m => m.phase === 'playoffs')
  const recentRegularMatches = recentMatches.filter(m => m.phase !== 'playoffs')
  const recentPlayoffMatches = recentMatches.filter(m => m.phase === 'playoffs')

  // Get team standings from the database (all teams with their statistics)
  const teamStandings = data.stats?.teamStandings || []

  // Filtrar partidos de playoffs por ronda
  const playoffMatches = leagueMatches.filter(m => m.phase === 'playoffs')
  const playoffsByRound = playoffMatches.reduce((acc: any, match) => {
    const round = match.playoff_round || 'other'
    if (!acc[round]) {
      acc[round] = []
    }
    acc[round].push(match)
    return acc
  }, {})

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standings">Tabla de Posiciones</TabsTrigger>
            <TabsTrigger value="matches">Partidos</TabsTrigger>
            <TabsTrigger value="rounds">Jornadas</TabsTrigger>
            <TabsTrigger value="teams">Equipos</TabsTrigger>
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
                  <div className="space-y-6">
                    {/* Regular Matches */}
                    {upcomingRegularMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Fase Regular
                        </h3>
                        <div className="space-y-3">
                          {upcomingRegularMatches.map((match) => (
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
                        </div>
                      </div>
                    )}

                    {/* Playoff Matches */}
                    {upcomingPlayoffMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center space-x-2 text-yellow-700 dark:text-yellow-500 uppercase tracking-wide">
                          <Trophy className="w-4 h-4" />
                          <span>Liguilla</span>
                        </h3>
                        <div className="space-y-3">
                          {upcomingPlayoffMatches.map((match) => (
                            <div key={match.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="text-center min-w-[120px]">
                                  <p className="font-medium text-sm text-foreground">{getTeamName(match.home_team_id, match.home_team)}</p>
                                  <p className="text-xs text-muted-foreground">vs</p>
                                  <p className="font-medium text-sm text-foreground">{getTeamName(match.away_team_id, match.away_team)}</p>
                                </div>
                                {match.leg && (
                                  <Badge variant={match.leg === 'first' ? 'default' : 'secondary'} className="text-xs">
                                    {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                  </Badge>
                                )}
                                {match.playoff_round && (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    {match.playoff_round === 'quarterfinals' && 'Cuartos'}
                                    {match.playoff_round === 'semifinals' && 'Semifinal'}
                                    {match.playoff_round === 'third_place' && '3er Lugar'}
                                    {match.playoff_round === 'final' && 'FINAL'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-foreground">{formatDate(match.match_date)}</p>
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  Programado
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                  <div className="space-y-6">
                    {/* Regular Matches */}
                    {recentRegularMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Fase Regular
                        </h3>
                        <div className="space-y-3">
                          {recentRegularMatches.map((match) => (
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
                        </div>
                      </div>
                    )}

                    {/* Playoff Matches */}
                    {recentPlayoffMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center space-x-2 text-yellow-700 dark:text-yellow-500 uppercase tracking-wide">
                          <Trophy className="w-4 h-4" />
                          <span>Liguilla</span>
                        </h3>
                        <div className="space-y-3">
                          {recentPlayoffMatches.map((match) => (
                            <div key={match.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="text-center min-w-[120px]">
                                  <p className="font-medium text-sm">{getTeamName(match.home_team_id, match.home_team)}</p>
                                  <p className="text-lg font-bold text-soccer-green">
                                    {match.home_score || 0} - {match.away_score || 0}
                                  </p>
                                  <p className="font-medium text-sm">{getTeamName(match.away_team_id, match.away_team)}</p>
                                </div>
                                {match.leg && (
                                  <Badge variant={match.leg === 'first' ? 'default' : 'secondary'} className="text-xs">
                                    {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                  </Badge>
                                )}
                                {match.playoff_round && (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    {match.playoff_round === 'quarterfinals' && 'Cuartos'}
                                    {match.playoff_round === 'semifinals' && 'Semifinal'}
                                    {match.playoff_round === 'third_place' && '3er Lugar'}
                                    {match.playoff_round === 'final' && 'FINAL'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm">{formatDate(match.match_date)}</p>
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400">
                                  Finalizado
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                      value={selectedRound || ""}
                      onValueChange={(value) => setSelectedRound(value)}
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
                        {playoffMatches.length > 0 && (
                          <SelectItem value="playoffs">
                            <div className="flex items-center space-x-2 w-full">
                              <Trophy className="w-4 h-4 text-yellow-600" />
                              <span className="font-semibold">Liguilla</span>
                              <span className="text-xs text-muted-foreground">({playoffMatches.length} partidos)</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Selected Round Details */}
                {selectedRound && (() => {
                  // Handle playoffs selection
                  if (selectedRound === 'playoffs') {
                    return (
                      <Card className="border-2 border-yellow-400">
                        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                          <CardTitle className="flex items-center space-x-2">
                            <Trophy className="w-6 h-6 text-yellow-600" />
                            <span>Fase Final - Liguilla</span>
                          </CardTitle>
                          <CardDescription>
                            {playoffMatches.length} partido(s) de playoffs
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 mt-4">
                          {/* Cuartos de Final */}
                          {playoffsByRound['quarterfinals'] && playoffsByRound['quarterfinals'].length > 0 && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3 flex items-center">
                                <Trophy className="w-5 h-5 mr-2 text-orange-500" />
                                Cuartos de Final
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['quarterfinals'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-gray-200'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
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
                                        {match.leg && (
                                          <Badge variant={match.leg === 'first' ? 'default' : 'secondary'} className="text-xs">
                                            {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                          </Badge>
                                        )}
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
                                            <p className="text-xs text-muted-foreground">Campo {match.field_number}</p>
                                          )}
                                          <Badge variant={isFinished ? "secondary" : "outline"} className="text-xs">
                                            {isFinished ? "Finalizado" : match.status === 'in_progress' ? "En progreso" : "Programado"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Semifinales */}
                          {playoffsByRound['semifinals'] && playoffsByRound['semifinals'].length > 0 && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3 flex items-center">
                                <Trophy className="w-5 h-5 mr-2 text-amber-500" />
                                Semifinales
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['semifinals'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-gray-200'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
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
                                        {match.leg && (
                                          <Badge variant={match.leg === 'first' ? 'default' : 'secondary'} className="text-xs">
                                            {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                          </Badge>
                                        )}
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
                                            <p className="text-xs text-muted-foreground">Campo {match.field_number}</p>
                                          )}
                                          <Badge variant={isFinished ? "secondary" : "outline"} className="text-xs">
                                            {isFinished ? "Finalizado" : match.status === 'in_progress' ? "En progreso" : "Programado"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Tercer Lugar */}
                          {playoffsByRound['third_place'] && playoffsByRound['third_place'].length > 0 && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3 flex items-center">
                                <Trophy className="w-5 h-5 mr-2 text-orange-400" />
                                Tercer Lugar
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['third_place'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-gray-200'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
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
                                            <p className="text-xs text-muted-foreground">Campo {match.field_number}</p>
                                          )}
                                          <Badge variant={isFinished ? "secondary" : "outline"} className="text-xs">
                                            {isFinished ? "Finalizado" : match.status === 'in_progress' ? "En progreso" : "Programado"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Final */}
                          {playoffsByRound['final'] && playoffsByRound['final'].length > 0 && (
                            <div>
                              <h3 className="font-semibold text-xl mb-3 flex items-center">
                                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                                FINAL
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['final'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-5 rounded-lg border-2 ${
                                      isFinished ? 'bg-gradient-to-r from-yellow-50 to-green-50 border-yellow-400' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[160px]">
                                          <p className="font-bold text-base">{getTeamName(match.home_team_id, match.home_team)}</p>
                                          {isFinished ? (
                                            <p className="text-2xl font-bold text-yellow-600 my-2">
                                              {match.home_score || 0} - {match.away_score || 0}
                                            </p>
                                          ) : (
                                            <p className="text-sm text-muted-foreground my-2">vs</p>
                                          )}
                                          <p className="font-bold text-base">{getTeamName(match.away_team_id, match.away_team)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex flex-col items-end space-y-1">
                                          <p className="text-base font-bold">
                                            {formatDate(match.match_date)}
                                            {match.match_time && (
                                              <span className="ml-2 text-muted-foreground">{match.match_time}</span>
                                            )}
                                          </p>
                                          {match.field_number && (
                                            <p className="text-sm text-muted-foreground">Campo {match.field_number}</p>
                                          )}
                                          <Badge variant={isFinished ? "default" : "outline"} className="text-sm">
                                            {isFinished ? "✅ FINALIZADO" : match.status === 'in_progress' ? "⚽ EN VIVO" : "📅 PROGRAMADO"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  }

                  // Handle regular round selection
                  const roundMatches = matchesByRound[parseInt(selectedRound)] || []
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
                      <Link href={`/equipos/${team.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Equipo
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
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

        </Tabs>
      </main>
    </div>
  )
}
