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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 backdrop-blur-xl bg-white/10 rounded w-1/3" />
            <div className="h-4 backdrop-blur-xl bg-white/10 rounded w-1/2" />
            <div className="grid gap-6 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 backdrop-blur-xl bg-white/10 rounded" />
              ))}
            </div>
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-xl bg-white/10 shadow-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">{league.name}</h1>
                <p className="text-white/80 mt-1 drop-shadow">{league.description}</p>
              </div>
              <div className="text-right">
                <Badge className="mb-2 backdrop-blur-md bg-green-500/80 text-white border-0">
                Liga Oficial
              </Badge>
              <p className="text-sm text-white/70 drop-shadow">/{league.slug}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90 drop-shadow">Equipos</CardTitle>
              <Shield className="w-4 h-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white drop-shadow-lg">{data.stats?.teamsCount || 0}</div>
              <p className="text-xs text-white/70 drop-shadow">Equipos activos</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90 drop-shadow">Jugadores</CardTitle>
              <Users className="w-4 h-4 text-green-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white drop-shadow-lg">{data.stats?.playersCount || 0}</div>
              <p className="text-xs text-white/70 drop-shadow">Jugadores registrados</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90 drop-shadow">Partidos</CardTitle>
              <Calendar className="w-4 h-4 text-purple-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white drop-shadow-lg">{data.stats?.matchesCount || 0}</div>
              <p className="text-xs text-white/70 drop-shadow">Total de partidos</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
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
          <TabsList className="grid w-full grid-cols-4 backdrop-blur-xl bg-white/10 border-white/20">
            <TabsTrigger value="standings" className="data-[state=active]:backdrop-blur-md data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Tabla de Posiciones</TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:backdrop-blur-md data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Partidos</TabsTrigger>
            <TabsTrigger value="rounds" className="data-[state=active]:backdrop-blur-md data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Jornadas</TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:backdrop-blur-md data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Equipos</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-lg">Tabla de Posiciones</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <span className="text-white/80 drop-shadow">{activeTournament ? `${activeTournament.name}` : "Posiciones generales"}</span>
                  {teamStandings.some(s => s.matches_played > 0) ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium backdrop-blur-md bg-green-500/80 text-white rounded-full border-0">
                      📊 Estadísticas en tiempo real
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium backdrop-blur-md bg-white/10 text-white/70 rounded-full border-white/30">
                      📋 Equipos registrados
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20 text-left">
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow">Pos</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow">Equipo</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">PJ</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">G</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">E</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">P</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">GF</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">GC</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">DG</th>
                        <th className="pb-2 text-sm font-medium text-white/90 drop-shadow text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStandings.map((standing, index) => {
                        const hasPlayedMatches = standing.matches_played > 0
                        return (
                        <tr key={standing.team.id} className={`border-b border-white/20 hover:bg-white/5 ${hasPlayedMatches ? '' : 'opacity-75'}`}>
                          <td className="py-3 text-sm font-medium">
                            {hasPlayedMatches ? (
                              <span className="font-bold text-white drop-shadow">{index + 1}</span>
                            ) : (
                              <span className="text-white/50">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8 border border-white/30">
                                {standing.team.logo && (
                                  <AvatarImage
                                    src={standing.team.logo}
                                    alt={`Logo de ${standing.team.name}`}
                                  />
                                )}
                                <AvatarFallback className="backdrop-blur-md bg-green-500/80 text-white text-xs font-bold">
                                  {getTeamInitials(standing.team.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-white drop-shadow">{standing.team.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.matches_played || 0}</td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.matches_won || 0}</td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.matches_drawn || 0}</td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.matches_lost || 0}</td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.goals_for || 0}</td>
                          <td className="py-3 text-center text-sm text-white/80">{standing.goals_against || 0}</td>
                          <td className="py-3 text-center text-sm">
                            <span
                              className={
                                (standing.goal_difference || 0) > 0
                                  ? "text-green-300 drop-shadow"
                                  : (standing.goal_difference || 0) < 0
                                    ? "text-red-300 drop-shadow"
                                    : "text-white/50"
                              }
                            >
                              {(standing.goal_difference || 0) > 0 ? "+" : ""}
                              {standing.goal_difference || 0}
                            </span>
                          </td>
                          <td className="py-3 text-center text-sm font-bold text-white drop-shadow">{standing.points || 0}</td>
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
              <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-lg">Próximos Partidos</CardTitle>
                  <CardDescription className="text-white/80 drop-shadow">Partidos programados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Regular Matches */}
                    {upcomingRegularMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/90 drop-shadow uppercase tracking-wide">
                          Fase Regular
                        </h3>
                        <div className="space-y-3">
                          {upcomingRegularMatches.map((match) => (
                            <div key={match.id} className="flex items-center justify-between p-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                  <p className="text-xs text-white/70">vs</p>
                                  <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-white drop-shadow">{formatDate(match.match_date)}</p>
                                <Badge className="text-xs backdrop-blur-md bg-blue-500/80 text-white border-0">
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
                        <h3 className="text-sm font-semibold flex items-center space-x-2 text-yellow-300 drop-shadow uppercase tracking-wide">
                          <Trophy className="w-4 h-4" />
                          <span>Liguilla</span>
                        </h3>
                        <div className="space-y-3">
                          {upcomingPlayoffMatches.map((match) => (
            <div key={match.id} className="flex items-center justify-between p-4 backdrop-blur-md bg-yellow-500/20 rounded-lg border border-yellow-400/30">
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
                      <p className="text-center text-white/70 drop-shadow py-8">No hay partidos programados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-lg">Resultados Recientes</CardTitle>
                  <CardDescription className="text-white/80 drop-shadow">Últimos partidos jugados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Regular Matches */}
                    {recentRegularMatches.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/90 drop-shadow uppercase tracking-wide">
                          Fase Regular
                        </h3>
                        <div className="space-y-3">
                          {recentRegularMatches.map((match) => (
                            <div key={match.id} className="flex items-center justify-between p-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                  <p className="text-lg font-bold text-green-300 drop-shadow">
                                    {match.home_score || 0} - {match.away_score || 0}
                                  </p>
                                  <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-white/80 drop-shadow">{formatDate(match.match_date)}</p>
                                <Badge className="text-xs backdrop-blur-md bg-gray-500/80 text-white border-0">
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
                        <h3 className="text-sm font-semibold flex items-center space-x-2 text-yellow-300 drop-shadow uppercase tracking-wide">
                          <Trophy className="w-4 h-4" />
                          <span>Liguilla</span>
                        </h3>
                        <div className="space-y-3">
                          {recentPlayoffMatches.map((match) => (
                            <div key={match.id} className="flex items-center justify-between p-4 backdrop-blur-md bg-green-500/20 rounded-lg border border-green-400/30">
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
                <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white drop-shadow-lg">
                      <span>Seleccionar Jornada</span>
                      <Badge className="text-xs backdrop-blur-md bg-white/10 text-white border-white/30">
                        {roundNumbers.length} jornadas disponibles
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedRound || ""}
                      onValueChange={(value) => setSelectedRound(value)}
                    >
                      <SelectTrigger className="w-full backdrop-blur-md bg-white/10 border-white/30 text-white">
                        <SelectValue placeholder="Selecciona una jornada" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
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
                      <Card className="backdrop-blur-xl bg-transparent border-2 border-yellow-400/50">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-white drop-shadow-lg">
                            <Trophy className="w-6 h-6 text-yellow-300" />
                            <span>Fase Final - Liguilla</span>
                          </CardTitle>
                          <CardDescription className="text-white/80 drop-shadow">
                            {playoffMatches.length} partido(s) de playoffs
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 mt-4">
                          {/* Cuartos de Final */}
                          {playoffsByRound['quarterfinals'] && playoffsByRound['quarterfinals'].length > 0 && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                                Cuartos de Final
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['quarterfinals'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                          {isFinished ? (
                                            <p className="text-lg font-bold text-green-300 drop-shadow my-1">
                                              {match.home_score || 0} - {match.away_score || 0}
                                            </p>
                                          ) : (
                                            <p className="text-xs text-white/70 my-1">vs</p>
                                          )}
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                        </div>
                                        {match.leg && (
                                          <Badge className="text-xs backdrop-blur-md bg-blue-500/80 text-white border-0">
                                            {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="flex flex-col items-end space-y-1">
                                          <p className="text-sm font-medium text-white drop-shadow">
                                            {formatDate(match.match_date)}
                                            {match.match_time && (
                                              <span className="ml-2 text-white/70">{match.match_time}</span>
                                            )}
                                          </p>
                                          {match.field_number && (
                                            <p className="text-xs text-white/70 drop-shadow">Campo {match.field_number}</p>
                                          )}
                                          <Badge className={`text-xs backdrop-blur-md border-0 ${isFinished ? 'bg-gray-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
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
                              <h3 className="font-semibold text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                <Trophy className="w-5 h-5 mr-2 text-amber-300" />
                                Semifinales
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['semifinals'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                          {isFinished ? (
                                            <p className="text-lg font-bold text-green-300 drop-shadow my-1">
                                              {match.home_score || 0} - {match.away_score || 0}
                                            </p>
                                          ) : (
                                            <p className="text-xs text-white/70 my-1">vs</p>
                                          )}
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                        </div>
                                        {match.leg && (
                                          <Badge className="text-xs backdrop-blur-md bg-blue-500/80 text-white border-0">
                                            {match.leg === 'first' ? 'IDA' : 'VUELTA'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="flex flex-col items-end space-y-1">
                                          <p className="text-sm font-medium text-white drop-shadow">
                                            {formatDate(match.match_date)}
                                            {match.match_time && (
                                              <span className="ml-2 text-white/70">{match.match_time}</span>
                                            )}
                                          </p>
                                          {match.field_number && (
                                            <p className="text-xs text-white/70 drop-shadow">Campo {match.field_number}</p>
                                          )}
                                          <Badge className={`text-xs backdrop-blur-md border-0 ${isFinished ? 'bg-gray-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
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
                              <h3 className="font-semibold text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                                Tercer Lugar
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['third_place'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                      isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[140px]">
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                          {isFinished ? (
                                            <p className="text-lg font-bold text-green-300 drop-shadow my-1">
                                              {match.home_score || 0} - {match.away_score || 0}
                                            </p>
                                          ) : (
                                            <p className="text-xs text-white/70 my-1">vs</p>
                                          )}
                                          <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex flex-col items-end space-y-1">
                                          <p className="text-sm font-medium text-white drop-shadow">
                                            {formatDate(match.match_date)}
                                            {match.match_time && (
                                              <span className="ml-2 text-white/70">{match.match_time}</span>
                                            )}
                                          </p>
                                          {match.field_number && (
                                            <p className="text-xs text-white/70 drop-shadow">Campo {match.field_number}</p>
                                          )}
                                          <Badge className={`text-xs backdrop-blur-md border-0 ${isFinished ? 'bg-gray-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
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
                              <h3 className="font-semibold text-xl mb-3 flex items-center text-white drop-shadow-lg">
                                <Trophy className="w-6 h-6 mr-2 text-yellow-300" />
                                FINAL
                              </h3>
                              <div className="space-y-3">
                                {playoffsByRound['final'].map((match: any) => {
                                  const isFinished = match.status === 'finished'
                                  return (
                                    <div key={match.id} className={`flex items-center justify-between p-5 rounded-lg border-2 ${
                                      isFinished ? 'backdrop-blur-xl bg-yellow-500/30 border-yellow-400/50' : 'backdrop-blur-xl bg-yellow-500/20 border-yellow-400/40'
                                    }`}>
                                      <div className="flex items-center space-x-4 flex-1">
                                        <div className="text-center min-w-[160px]">
                                          <p className="font-bold text-base text-white drop-shadow-lg">{getTeamName(match.home_team_id, match.home_team)}</p>
                                          {isFinished ? (
                                            <p className="text-2xl font-bold text-yellow-300 drop-shadow-lg my-2">
                                              {match.home_score || 0} - {match.away_score || 0}
                                            </p>
                                          ) : (
                                            <p className="text-sm text-white/70 my-2">vs</p>
                                          )}
                                          <p className="font-bold text-base text-white drop-shadow-lg">{getTeamName(match.away_team_id, match.away_team)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex flex-col items-end space-y-1">
                                          <p className="text-base font-bold text-white drop-shadow">
                                            {formatDate(match.match_date)}
                                            {match.match_time && (
                                              <span className="ml-2 text-white/70">{match.match_time}</span>
                                            )}
                                          </p>
                                          {match.field_number && (
                                            <p className="text-sm text-white/70 drop-shadow">Campo {match.field_number}</p>
                                          )}
                                          <Badge className={`text-sm backdrop-blur-md border-0 ${isFinished ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-white'}`}>
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
                    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-2 text-white drop-shadow-lg">
                              <span>Jornada {selectedRound}</span>
                              {isCompleted && (
                                <Badge className="text-xs backdrop-blur-md bg-green-500/80 text-white border-0">
                                  ✅ Completada
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge className="text-xs backdrop-blur-md bg-yellow-500/80 text-white border-0">
                                  ⏳ En progreso
                                </Badge>
                              )}
                              {!isCompleted && !isInProgress && (
                                <Badge className="text-xs backdrop-blur-md bg-blue-500/80 text-white border-0">
                                  📅 Programada
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-white/80 drop-shadow">
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
                                isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                              }`}>
                                <div className="flex items-center space-x-4">
                                  <div className="text-center min-w-[120px]">
                                    <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                    {isFinished ? (
                                      <p className="text-lg font-bold text-green-300 drop-shadow my-1">
                                        {match.home_score || 0} - {match.away_score || 0}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-white/70 my-1">vs</p>
                                    )}
                                    <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.away_team_id, match.away_team)}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="flex flex-col items-end space-y-1">
                                    <p className="text-sm font-medium text-white drop-shadow">
                                      {formatDate(match.match_date)}
                                      {match.match_time && (
                                        <span className="ml-2 text-white/70">{match.match_time}</span>
                                      )}
                                    </p>

                                    {match.field_number && (
                                      <p className="text-xs text-white/70 drop-shadow">
                                        Campo {match.field_number}
                                      </p>
                                    )}

                                    <Badge
                                      className={`text-xs backdrop-blur-md border-0 ${
                                        isFinished ? 'bg-gray-500/80 text-white' :
                                        match.status === 'in_progress' ? 'bg-yellow-500/80 text-white' :
                                        'bg-blue-500/80 text-white'
                                      }`}
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
              <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                <CardContent className="text-center py-12">
                  <p className="text-white/80 drop-shadow mb-2">No hay jornadas programadas</p>
                  <p className="text-sm text-white/70 drop-shadow">Las jornadas aparecerán cuando se programen partidos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.teams.map((team) => (
                <Card key={team.id} className="backdrop-blur-xl bg-white/10 border-white/20">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 border border-white/30">
                        {team.logo && (
                          <AvatarImage
                            src={team.logo}
                            alt={`Logo de ${team.name}`}
                          />
                        )}
                        <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white font-bold">
                          {getTeamInitials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg text-white drop-shadow-lg">{team.name}</CardTitle>
                        <CardDescription className="text-white/70 drop-shadow">/{team.slug}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/80 drop-shadow mb-3">{team.description || "Sin descripción"}</p>
                    <div className="flex items-center justify-between text-sm text-white/80">
                      <span className="flex items-center drop-shadow">
                        <Users className="w-4 h-4 mr-1" />
                        Equipo registrado
                      </span>
                      <Link href={`/equipos/${team.id}`}>
                        <Button className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg" size="sm">
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
                  <p className="text-center text-white/70 drop-shadow py-8">No hay equipos registrados</p>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </main>
      </div>
    </div>
  )
}
