"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { Trophy, Users, Calendar, Shield, ArrowRight, Home, ArrowLeft, Loader2 } from "lucide-react"
import { Database } from "@/lib/supabase/database.types"

type League = Database['public']['Tables']['leagues']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

type Match = Database['public']['Tables']['matches']['Row'] & {
  home_team?: { name: string; logo: string | null }
  away_team?: { name: string; logo: string | null }
}

interface InitialData {
  tournaments: Tournament[]
  teams: Team[]
  stats: any
}

interface PublicLeagueViewProps {
  league: League
  tournamentId?: string
  initialData?: InitialData
}

interface LeagueData {
  tournaments: Tournament[]
  teams: Team[]
  matches: Match[]
  stats: any
}

export function PublicLeagueView({ league, tournamentId, initialData }: PublicLeagueViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')

  // Si hay initialData, usarlo directamente sin cargar del cliente
  const [data, setData] = useState<LeagueData>(() => {
    if (initialData) {
      return {
        tournaments: initialData.tournaments,
        teams: initialData.teams,
        matches: initialData.stats?.upcomingMatches || [],
        stats: initialData.stats,
      }
    }
    return {
      tournaments: [],
      teams: [],
      matches: [],
      stats: null,
    }
  })
  const [loading, setLoading] = useState(!initialData)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)
  const [navigating, setNavigating] = useState<string | null>(null) // Track which button is navigating

  useEffect(() => {
    // Si ya tenemos initialData, no cargar de nuevo
    if (initialData) {
      return
    }

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
  }, [league.id, tournamentId, initialData])

  // Set default selected round to the most recent one
  useEffect(() => {
    const roundNumbers = data.stats?.roundNumbers || []
    if (roundNumbers.length > 0 && !selectedRound) {
      setSelectedRound(roundNumbers[roundNumbers.length - 1].toString())
    }
  }, [data.stats?.roundNumbers, selectedRound])

  // Get active tournament and format
  const activeTournament = data.tournaments.find((t) => t.is_active)
  const tournamentFormat = activeTournament?.tournament_format || 'league'

  // State for active tab - read from URL if available
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || "standings")

  // Update active tab when tournament format changes or data loads (only if no tab from URL)
  useEffect(() => {
    if (!loading && activeTournament && !tabFromUrl) {
      const defaultTab = activeTournament.tournament_format === 'group_knockout' ? 'groups' : 'standings'
      setActiveTab(defaultTab)
    }
  }, [loading, activeTournament?.tournament_format, tabFromUrl])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
          <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-1/3" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const upcomingMatches = (data.stats?.upcomingMatches || []) as Match[]
  const recentMatches = (data.stats?.recentMatches || []) as Match[]
  const leagueMatches = (data.stats?.allMatches || []) as Match[]
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
  const playoffsByRound = playoffMatches.reduce((acc: Record<string, Match[]>, match) => {
    const round = match.playoff_round || 'other'
    if (!acc[round]) {
      acc[round] = []
    }
    acc[round].push(match)
    return acc
  }, {})


  const getTeamInitials = (teamName: string) => {
    return teamName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getTeamLogo = (teamData?: { name: string; logo: string | null }) => {
    return teamData?.logo || null
  }

  const getTeamName = (teamId: string, teamData?: { name: string }) => {
    // If team data is provided directly (from match data)
    if (teamData && teamData.name) {
      return teamData.name
    }

    // Fallback to finding team in teams array
    const team = data.teams.find((t) => t.id === teamId)
    return team ? team.name : "Equipo"
  }

  const formatDate = (dateString: string) => {
    // Parse the date and treat it as-is (without timezone conversion)
    // The dates are stored with the local time but marked as UTC
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC", // Treat as UTC to avoid timezone conversion
    })
  }

  const formatTime = (timeString: string) => {
    // Format time string (HH:MM:SS) to HH:MM
    if (!timeString) return ""
    return timeString.substring(0, 5)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Fondo con elementos deportivos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
          <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
        </div>
        <div className="absolute top-10 right-10 w-48 h-48 bg-green-500/5 rounded-full blur-2xl" />
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={() => {
                  setNavigating('back')
                  router.push(`/liga/${league.slug}`)
                }}
                variant="ghost"
                size="sm"
                disabled={navigating !== null}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                {navigating === 'back' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                )}
                Torneos
              </Button>
              <Button
                onClick={() => {
                  setNavigating('home')
                  router.push('/')
                }}
                variant="ghost"
                size="sm"
                disabled={navigating !== null}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                {navigating === 'home' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Home className="w-4 h-4 mr-2" />
                )}
                Inicio
              </Button>
            </div>

            {/* League Info Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/20 to-transparent transform rotate-12 translate-x-8 -translate-y-8" />
              <div className="relative p-5 md:p-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-green-500/30 shadow-lg shadow-green-500/20">
                    {league.logo && (
                      <AvatarImage src={league.logo} alt={league.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xl font-bold">
                      {league.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{league.name}</h1>
                    {league.description && (
                      <p className="text-gray-400 text-sm mb-2 line-clamp-1">{league.description}</p>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        {activeTournament?.name || "Sin torneo activo"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Stats Overview */}
          <div className="grid gap-2 md:gap-4 grid-cols-4 mb-4 md:mb-6">
            <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mx-auto mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-white">{data.stats?.teamsCount || 0}</p>
              <span className="text-[10px] md:text-xs text-gray-500">Equipos</span>
            </div>

            <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-green-400 mx-auto mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-white">{data.stats?.playersCount || 0}</p>
              <span className="text-[10px] md:text-xs text-gray-500">Jugadores</span>
            </div>

            <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-400 mx-auto mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-white">{data.stats?.matchesCount || 0}</p>
              <span className="text-[10px] md:text-xs text-gray-500">Partidos</span>
            </div>

            <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 mx-auto mb-1 md:mb-2" />
              <p className="text-sm md:text-xl font-bold text-white">{activeTournament ? "Activo" : "-"}</p>
              <span className="text-[10px] md:text-xs text-gray-500">Estado</span>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-slate-800 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  {tournamentFormat === 'group_knockout' ? (
                    <>
                      <SelectItem value="groups" className="text-white focus:bg-green-500/20 focus:text-green-400">Grupos</SelectItem>
                      <SelectItem value="knockout" className="text-white focus:bg-green-500/20 focus:text-green-400">Eliminación</SelectItem>
                      <SelectItem value="matches" className="text-white focus:bg-green-500/20 focus:text-green-400">Partidos</SelectItem>
                      <SelectItem value="teams" className="text-white focus:bg-green-500/20 focus:text-green-400">Equipos</SelectItem>
                    </>
                  ) : tournamentFormat === 'knockout' ? (
                    <>
                      <SelectItem value="knockout" className="text-white focus:bg-green-500/20 focus:text-green-400">Eliminación</SelectItem>
                      <SelectItem value="matches" className="text-white focus:bg-green-500/20 focus:text-green-400">Partidos</SelectItem>
                      <SelectItem value="teams" className="text-white focus:bg-green-500/20 focus:text-green-400">Equipos</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="standings" className="text-white focus:bg-green-500/20 focus:text-green-400">Tabla de Posiciones</SelectItem>
                      <SelectItem value="matches" className="text-white focus:bg-green-500/20 focus:text-green-400">Partidos</SelectItem>
                      <SelectItem value="rounds" className="text-white focus:bg-green-500/20 focus:text-green-400">Jornadas</SelectItem>
                      <SelectItem value="teams" className="text-white focus:bg-green-500/20 focus:text-green-400">Equipos</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden md:flex w-full bg-slate-800/50 border border-white/10 rounded-xl p-1 gap-1">
              {tournamentFormat === 'group_knockout' ? (
                <>
                  <TabsTrigger value="groups" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Grupos</TabsTrigger>
                  <TabsTrigger value="knockout" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Eliminación</TabsTrigger>
                  <TabsTrigger value="matches" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Partidos</TabsTrigger>
                  <TabsTrigger value="teams" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Equipos</TabsTrigger>
                </>
              ) : tournamentFormat === 'knockout' ? (
                <>
                  <TabsTrigger value="knockout" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Eliminación</TabsTrigger>
                  <TabsTrigger value="matches" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Partidos</TabsTrigger>
                  <TabsTrigger value="teams" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Equipos</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="standings" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Posiciones</TabsTrigger>
                  <TabsTrigger value="matches" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Partidos</TabsTrigger>
                  <TabsTrigger value="rounds" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Jornadas</TabsTrigger>
                  <TabsTrigger value="teams" className="flex-1 rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400 text-sm py-2 px-3">Equipos</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Groups Tab - for group_knockout tournaments */}
            <TabsContent value="groups" className="min-h-[400px]">
              {(() => {
                if (!activeTournament || !activeTournament.number_of_groups) {
                  return (
                    <div className="rounded-xl bg-slate-800/50 border border-white/10 p-8 text-center">
                      <p className="text-gray-400 mb-2">No hay grupos configurados</p>
                      <p className="text-sm text-gray-500">Configura los grupos en la administración del torneo</p>
                    </div>
                  )
                }

                // Group teams by group_name
                const teamsByGroup: Record<string, typeof data.teams> = {}
                const numberOfGroups = activeTournament.number_of_groups

                // Initialize groups
                for (let i = 0; i < numberOfGroups; i++) {
                  const groupLetter = String.fromCharCode(65 + i) // A, B, C, D, etc.
                  teamsByGroup[groupLetter] = []
                }

                // Assign teams to their groups
                data.teams.forEach(team => {
                  if (team.group_name && teamsByGroup[team.group_name]) {
                    teamsByGroup[team.group_name].push(team)
                  }
                })

                // Get standings for each group
                const groupStandings: Record<string, any[]> = {}
                Object.keys(teamsByGroup).forEach(groupName => {
                  groupStandings[groupName] = teamsByGroup[groupName].map(team => {
                    const standing = teamStandings.find((s: any) => s.team.id === team.id)
                    return standing || {
                      team,
                      matches_played: 0,
                      matches_won: 0,
                      matches_drawn: 0,
                      matches_lost: 0,
                      goals_for: 0,
                      goals_against: 0,
                      goal_difference: 0,
                      points: 0
                    }
                  }).sort((a, b) => {
                    // Sort by points, then goal difference, then goals for
                    if (b.points !== a.points) return b.points - a.points
                    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
                    return b.goals_for - a.goals_for
                  })
                })

                return (
                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    {Object.keys(teamsByGroup).sort().map(groupName => (
                      <div key={groupName} className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                              {groupName}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">Grupo {groupName}</h3>
                              <p className="text-xs text-gray-400">
                                {teamsByGroup[groupName].length} equipos • Top {activeTournament.teams_advancing_per_group} avanzan
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          {teamsByGroup[groupName].length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-gray-500">No hay equipos asignados a este grupo</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-white/10 text-left">
                                    <th className="pb-2 text-xs font-medium text-gray-400">Pos</th>
                                    <th className="pb-2 text-xs font-medium text-gray-400">Equipo</th>
                                    <th className="pb-2 text-xs font-medium text-gray-400 text-center">PJ</th>
                                    <th className="pb-2 text-xs font-medium text-gray-400 text-center">Pts</th>
                                    <th className="pb-2 text-xs font-medium text-gray-400 text-center">DG</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupStandings[groupName].map((standing, index) => {
                                    const isQualified = index < (activeTournament.teams_advancing_per_group || 2)
                                    return (
                                      <tr
                                        key={standing.team.id}
                                        className={`border-b border-white/5 ${isQualified ? 'bg-green-500/10' : ''}`}
                                      >
                                        <td className="py-2 text-sm">
                                          <span className={`font-bold ${isQualified ? 'text-green-400' : 'text-white'}`}>
                                            {index + 1}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          <div className="flex items-center space-x-2">
                                            <Avatar className="w-6 h-6 border border-white/10">
                                              {standing.team.logo && (
                                                <AvatarImage src={standing.team.logo} alt={standing.team.name} />
                                              )}
                                              <AvatarFallback className="bg-green-500/20 text-green-400 text-xs font-bold">
                                                {getTeamInitials(standing.team.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-white">{standing.team.name}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 text-center text-sm text-gray-400">{standing.matches_played || 0}</td>
                                        <td className="py-2 text-center text-sm font-bold text-white">{standing.points || 0}</td>
                                        <td className="py-2 text-center text-sm">
                                          <span className={
                                            (standing.goal_difference || 0) > 0 ? "text-green-400" :
                                              (standing.goal_difference || 0) < 0 ? "text-red-400" : "text-gray-500"
                                          }>
                                            {(standing.goal_difference || 0) > 0 ? "+" : ""}{standing.goal_difference || 0}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </TabsContent>

            {/* Knockout Tab - for knockout and group_knockout tournaments */}
            <TabsContent value="knockout" className="min-h-[400px]">
              <Card className="backdrop-blur-xl bg-transparent border-2 border-yellow-400/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white drop-shadow-lg">
                    <Trophy className="w-6 h-6 text-yellow-300" />
                    <span>Fase de Eliminación Directa</span>
                  </CardTitle>
                  <CardDescription className="text-white/80 drop-shadow">
                    {playoffMatches.length} partido(s) de eliminación
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                  {playoffMatches.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-12 h-12 text-white/50 mx-auto mb-4 drop-shadow-lg" />
                      <p className="text-white/80 drop-shadow mb-2">No hay partidos de eliminación programados</p>
                      <p className="text-sm text-white/70 drop-shadow">
                        {tournamentFormat === 'group_knockout'
                          ? 'Los partidos de eliminación se generarán cuando termine la fase de grupos'
                          : 'Los partidos de eliminación aparecerán cuando se programen'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Cuartos de Final */}
                      {playoffsByRound['quarterfinals'] && playoffsByRound['quarterfinals'].length > 0 && (
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                            <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                            Cuartos de Final
                          </h3>
                          <div className="space-y-3">
                            {playoffsByRound['quarterfinals'].map((match) => {
                              const isFinished = match.status === 'finished'
                              return (
                                <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                  }`}>
                                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                    <div className="text-center min-w-[140px]">
                                      <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                      {isFinished ? (
                                        <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                          <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
                                        )}
                                      </p>
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
                          <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                            <Trophy className="w-5 h-5 mr-2 text-amber-300" />
                            Semifinales
                          </h3>
                          <div className="space-y-3">
                            {playoffsByRound['semifinals'].map((match) => {
                              const isFinished = match.status === 'finished'
                              return (
                                <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                  }`}>
                                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                    <div className="text-center min-w-[140px]">
                                      <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                      {isFinished ? (
                                        <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                          <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
                                        )}
                                      </p>
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
                          <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                            <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                            Tercer Lugar
                          </h3>
                          <div className="space-y-3">
                            {playoffsByRound['third_place'].map((match) => {
                              const isFinished = match.status === 'finished'
                              return (
                                <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                  }`}>
                                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                    <div className="text-center min-w-[140px]">
                                      <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                      {isFinished ? (
                                        <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                          <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
                                        )}
                                      </p>
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
                            {playoffsByRound['final'].map((match) => {
                              const isFinished = match.status === 'finished'
                              return (
                                <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-5 rounded-lg border-2 ${isFinished ? 'backdrop-blur-xl bg-yellow-500/30 border-yellow-400/50' : 'backdrop-blur-xl bg-yellow-500/20 border-yellow-400/40'
                                  }`}>
                                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
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
                                          <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
                                        )}
                                      </p>
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
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings" className="min-h-[300px]">
              <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
                <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm md:text-lg font-semibold text-white">Tabla de Posiciones</h3>
                  {teamStandings.some((s: any) => s.matches_played > 0) ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] md:text-xs px-1.5 py-0">
                      En vivo
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] md:text-xs px-1.5 py-0">
                      Sin partidos
                    </Badge>
                  )}
                </div>
                <div className="p-2 md:p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="pb-2 md:pb-3 pr-1 md:pr-2 text-[10px] md:text-xs font-medium text-gray-500 w-6 md:w-10">Pos</th>
                          <th className="pb-2 md:pb-3 pr-2 md:pr-4 text-[10px] md:text-xs font-medium text-gray-500">Equipo</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-7 md:w-10">PJ</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-7 md:w-10">G</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-7 md:w-10">E</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-7 md:w-10">P</th>
                          <th className="hidden md:table-cell pb-3 text-xs font-medium text-gray-500 text-center w-10">GF</th>
                          <th className="hidden md:table-cell pb-3 text-xs font-medium text-gray-500 text-center w-10">GC</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-8 md:w-10">DG</th>
                          <th className="pb-2 md:pb-3 text-[10px] md:text-xs font-medium text-gray-500 text-center w-8 md:w-12">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStandings.map((standing: any, index: number) => {
                          const hasPlayedMatches = standing.matches_played > 0
                          return (
                            <tr key={standing.team.id} className={`border-b border-white/5 hover:bg-white/5 ${hasPlayedMatches ? '' : 'opacity-50'}`}>
                              <td className="py-1.5 md:py-3 pr-1 md:pr-2 text-xs md:text-sm">
                                <span className={`font-bold ${hasPlayedMatches ? 'text-white' : 'text-gray-600'}`}>
                                  {hasPlayedMatches ? index + 1 : '-'}
                                </span>
                              </td>
                              <td className="py-1.5 md:py-3 pr-2 md:pr-4">
                                <div className="flex items-center space-x-2 md:space-x-3">
                                  <Avatar className="w-5 h-5 md:w-8 md:h-8 border border-white/10">
                                    {standing.team.logo && (
                                      <AvatarImage src={standing.team.logo} alt={standing.team.name} />
                                    )}
                                    <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-xs font-bold">
                                      {getTeamInitials(standing.team.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-white text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{standing.team.name}</span>
                                </div>
                              </td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm text-gray-400">{standing.matches_played || 0}</td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm text-gray-400">{standing.matches_won || 0}</td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm text-gray-400">{standing.matches_drawn || 0}</td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm text-gray-400">{standing.matches_lost || 0}</td>
                              <td className="hidden md:table-cell py-3 text-center text-sm text-gray-400">{standing.goals_for || 0}</td>
                              <td className="hidden md:table-cell py-3 text-center text-sm text-gray-400">{standing.goals_against || 0}</td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm">
                                <span className={
                                  (standing.goal_difference || 0) > 0 ? "text-green-400" :
                                  (standing.goal_difference || 0) < 0 ? "text-red-400" : "text-gray-500"
                                }>
                                  {(standing.goal_difference || 0) > 0 ? "+" : ""}{standing.goal_difference || 0}
                                </span>
                              </td>
                              <td className="py-1.5 md:py-3 text-center text-xs md:text-sm font-bold text-white">{standing.points || 0}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {teamStandings.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-gray-400 text-sm">No hay equipos registrados</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="matches" className="min-h-[400px]">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Próximos Partidos */}
                <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-white/10">
                    <h3 className="text-sm md:text-base font-semibold text-white">Próximos Partidos</h3>
                    <p className="text-xs text-gray-400">Partidos programados</p>
                  </div>
                  <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                    {upcomingRegularMatches.length > 0 && upcomingRegularMatches.map((match) => (
                      <div key={match.id} className="flex items-center p-2 md:p-3 bg-slate-700/30 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                            {getTeamLogo(match.home_team) && <AvatarImage src={getTeamLogo(match.home_team)!} />}
                            <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-[10px]">
                              {getTeamInitials(getTeamName(match.home_team_id, match.home_team))}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[11px] md:text-sm text-white truncate">{getTeamName(match.home_team_id, match.home_team)}</span>
                        </div>
                        <span className="text-[10px] md:text-xs text-gray-500 px-2 md:px-3 flex-shrink-0">vs</span>
                        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end min-w-0">
                          <span className="font-medium text-[11px] md:text-sm text-white truncate text-right">{getTeamName(match.away_team_id, match.away_team)}</span>
                          <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                            {getTeamLogo(match.away_team) && <AvatarImage src={getTeamLogo(match.away_team)!} />}
                            <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-[10px]">
                              {getTeamInitials(getTeamName(match.away_team_id, match.away_team))}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="text-right ml-2 md:ml-4 flex-shrink-0">
                          <p className="text-[9px] md:text-xs text-gray-400">
                            {formatDate(match.match_date)}
                            {match.match_time && (
                              <span className="ml-1 text-white/70">{formatTime(match.match_time)}</span>
                            )}
                          </p>
                          <Badge className="text-[9px] md:text-[10px] bg-blue-500/20 text-blue-400 border-0 px-1 md:px-1.5 py-0">
                            Prog.
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {upcomingPlayoffMatches.length > 0 && (
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Liguilla
                        </p>
                        {upcomingPlayoffMatches.map((match) => (
                          <div key={match.id} className="flex items-center p-2 md:p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-yellow-500/30 flex-shrink-0">
                                {getTeamLogo(match.home_team) && <AvatarImage src={getTeamLogo(match.home_team)!} />}
                                <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-[8px]">
                                  {getTeamInitials(getTeamName(match.home_team_id, match.home_team))}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-[11px] md:text-sm text-white truncate">{getTeamName(match.home_team_id, match.home_team)}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 px-2 flex-shrink-0">vs</span>
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                              <span className="font-medium text-[11px] md:text-sm text-white truncate text-right">{getTeamName(match.away_team_id, match.away_team)}</span>
                              <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-yellow-500/30 flex-shrink-0">
                                {getTeamLogo(match.away_team) && <AvatarImage src={getTeamLogo(match.away_team)!} />}
                                <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-[8px]">
                                  {getTeamInitials(getTeamName(match.away_team_id, match.away_team))}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className="text-[9px] text-gray-400">
                                {formatDate(match.match_date)}
                                {match.match_time && (
                                  <span className="ml-1 text-white/70">{formatTime(match.match_time)}</span>
                                )}
                              </p>
                              {match.playoff_round && (
                                <Badge className="text-[9px] bg-yellow-500/20 text-yellow-400 border-0 px-1 py-0">
                                  {match.playoff_round === 'final' ? 'Final' : match.playoff_round === 'semifinals' ? 'Semi' : 'Cuartos'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {upcomingMatches.length === 0 && (
                      <p className="text-center text-gray-500 py-6 text-sm">No hay partidos programados</p>
                    )}
                  </div>
                </div>

                {/* Resultados Recientes */}
                <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-white/10">
                    <h3 className="text-sm md:text-base font-semibold text-white">Resultados Recientes</h3>
                    <p className="text-xs text-gray-400">Últimos partidos jugados</p>
                  </div>
                  <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                    {recentRegularMatches.length > 0 && recentRegularMatches.map((match) => (
                      <div key={match.id} className="flex items-center p-2 md:p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                            {getTeamLogo(match.home_team) && <AvatarImage src={getTeamLogo(match.home_team)!} />}
                            <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-[10px]">
                              {getTeamInitials(getTeamName(match.home_team_id, match.home_team))}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[11px] md:text-sm text-white truncate">{getTeamName(match.home_team_id, match.home_team)}</span>
                        </div>
                        <div className="px-2 md:px-3 py-1 bg-green-500/20 rounded flex-shrink-0">
                          <span className="text-xs md:text-sm font-bold text-green-400">{match.home_score || 0} - {match.away_score || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end min-w-0">
                          <span className="font-medium text-[11px] md:text-sm text-white truncate text-right">{getTeamName(match.away_team_id, match.away_team)}</span>
                          <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-white/10 flex-shrink-0">
                            {getTeamLogo(match.away_team) && <AvatarImage src={getTeamLogo(match.away_team)!} />}
                            <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px] md:text-[10px]">
                              {getTeamInitials(getTeamName(match.away_team_id, match.away_team))}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-[9px] md:text-xs text-gray-400">
                            {formatDate(match.match_date)}
                            {match.match_time && (
                              <span className="ml-1 text-white/70">{formatTime(match.match_time)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}

                    {recentPlayoffMatches.length > 0 && (
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Liguilla
                        </p>
                        {recentPlayoffMatches.map((match) => (
                          <div key={match.id} className="flex items-center p-2 md:p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-green-500/30 flex-shrink-0">
                                {getTeamLogo(match.home_team) && <AvatarImage src={getTeamLogo(match.home_team)!} />}
                                <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px]">
                                  {getTeamInitials(getTeamName(match.home_team_id, match.home_team))}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-[11px] md:text-sm text-white truncate">{getTeamName(match.home_team_id, match.home_team)}</span>
                            </div>
                            <div className="px-2 py-1 bg-green-500/20 rounded flex-shrink-0">
                              <span className="text-xs md:text-sm font-bold text-green-400">{match.home_score || 0} - {match.away_score || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                              <span className="font-medium text-[11px] md:text-sm text-white truncate text-right">{getTeamName(match.away_team_id, match.away_team)}</span>
                              <Avatar className="w-6 h-6 md:w-8 md:h-8 border border-green-500/30 flex-shrink-0">
                                {getTeamLogo(match.away_team) && <AvatarImage src={getTeamLogo(match.away_team)!} />}
                                <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px]">
                                  {getTeamInitials(getTeamName(match.away_team_id, match.away_team))}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className="text-[9px] text-gray-400">
                                {formatDate(match.match_date)}
                                {match.match_time && (
                                  <span className="ml-1 text-white/70">{formatTime(match.match_time)}</span>
                                )}
                              </p>
                              {match.playoff_round && (
                                <Badge className="text-[9px] bg-green-500/20 text-green-400 border-0 px-1 py-0">
                                  {match.playoff_round === 'final' ? 'Final' : match.playoff_round === 'semifinals' ? 'Semi' : 'Cuartos'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {recentMatches.length === 0 && (
                      <p className="text-center text-gray-500 py-6 text-sm">No hay resultados recientes</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rounds" className="min-h-[400px]">
              {roundNumbers.length > 0 ? (
                <div className="space-y-6">
                  {/* Round Selector */}
                  <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-white drop-shadow-lg">
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
                          {roundNumbers.map((roundNumber: number) => {
                            const roundMatches = matchesByRound[roundNumber] || []
                            const finishedMatches = roundMatches.filter((m: any) => m.status === 'finished')
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
                                <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                  <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                                  Cuartos de Final
                                </h3>
                                <div className="space-y-3">
                                  {playoffsByRound['quarterfinals'].map((match: any) => {
                                    const isFinished = match.status === 'finished'
                                    return (
                                      <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                        }`}>
                                        <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                          <div className="text-center min-w-[140px]">
                                            <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                            {isFinished ? (
                                              <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                                <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
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
                                <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                  <Trophy className="w-5 h-5 mr-2 text-amber-300" />
                                  Semifinales
                                </h3>
                                <div className="space-y-3">
                                  {playoffsByRound['semifinals'].map((match: any) => {
                                    const isFinished = match.status === 'finished'
                                    return (
                                      <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                        }`}>
                                        <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                          <div className="text-center min-w-[140px]">
                                            <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                            {isFinished ? (
                                              <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                                <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
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
                                <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center text-white drop-shadow-lg">
                                  <Trophy className="w-5 h-5 mr-2 text-orange-300" />
                                  Tercer Lugar
                                </h3>
                                <div className="space-y-3">
                                  {playoffsByRound['third_place'].map((match: any) => {
                                    const isFinished = match.status === 'finished'
                                    return (
                                      <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-lg border ${isFinished ? 'backdrop-blur-md bg-green-500/20 border-green-400/30' : 'backdrop-blur-md bg-white/10 border-white/20'
                                        }`}>
                                        <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
                                          <div className="text-center min-w-[140px]">
                                            <p className="font-medium text-sm text-white drop-shadow">{getTeamName(match.home_team_id, match.home_team)}</p>
                                            {isFinished ? (
                                              <p className="text-base sm:text-lg font-bold text-green-300 drop-shadow my-1">
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
                                                <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
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
                                      <div key={match.id} className={`flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-5 rounded-lg border-2 ${isFinished ? 'backdrop-blur-xl bg-yellow-500/30 border-yellow-400/50' : 'backdrop-blur-xl bg-yellow-500/20 border-yellow-400/40'
                                        }`}>
                                        <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
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
                                                <span className="ml-2 text-white/70">{formatTime(match.match_time)}</span>
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
                    const finishedMatches = roundMatches.filter((m: any) => m.status === 'finished')
                    const scheduledMatches = roundMatches.filter((m: any) => m.status === 'scheduled' || m.status === 'in_progress')
                    const isCompleted = roundMatches.length > 0 && finishedMatches.length === roundMatches.length
                    const isInProgress = scheduledMatches.length > 0 && finishedMatches.length > 0

                    return (
                      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                        <CardHeader>
                          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
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
                            {roundMatches.map((match: any) => {
                              const isFinished = match.status === 'finished'

                              return (
                                <div key={match.id} className={`flex items-center justify-between p-3 rounded-lg border ${isFinished ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-800/50 border-white/10'}`}>
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Avatar className="w-7 h-7 border border-white/10">
                                        {getTeamLogo(match.home_team) && <AvatarImage src={getTeamLogo(match.home_team)!} />}
                                        <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px]">
                                          {getTeamInitials(getTeamName(match.home_team_id, match.home_team))}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-xs text-white truncate max-w-[70px] md:max-w-[100px]">{getTeamName(match.home_team_id, match.home_team)}</span>
                                    </div>
                                    {isFinished ? (
                                      <div className="px-3 py-1 bg-green-500/20 rounded">
                                        <span className="text-sm font-bold text-green-400">{match.home_score || 0} - {match.away_score || 0}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-500 px-2">vs</span>
                                    )}
                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                      <span className="font-medium text-xs text-white truncate max-w-[70px] md:max-w-[100px] text-right">{getTeamName(match.away_team_id, match.away_team)}</span>
                                      <Avatar className="w-7 h-7 border border-white/10">
                                        {getTeamLogo(match.away_team) && <AvatarImage src={getTeamLogo(match.away_team)!} />}
                                        <AvatarFallback className="bg-green-500/20 text-green-400 text-[8px]">
                                          {getTeamInitials(getTeamName(match.away_team_id, match.away_team))}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  </div>
                                  <div className="text-right ml-3">
                                    <p className="text-[10px] text-gray-400">
                                      {formatDate(match.match_date)}
                                      {match.match_time && (
                                        <span className="ml-1 text-white/70">{formatTime(match.match_time)}</span>
                                      )}
                                    </p>
                                    {match.field_number && (
                                      <p className="text-[10px] text-gray-500">Campo {match.field_number}</p>
                                    )}
                                    <Badge
                                      className={`text-[10px] border-0 px-1.5 py-0 ${isFinished ? 'bg-gray-500/20 text-gray-400' :
                                        match.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-blue-500/20 text-blue-400'
                                        }`}
                                    >
                                      {isFinished ? "Fin" :
                                        match.status === 'in_progress' ? "En vivo" :
                                          "Prog."}
                                      </Badge>
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
                <div className="rounded-xl bg-slate-800/50 border border-white/10 p-8 text-center">
                  <p className="text-gray-400 mb-2">No hay jornadas programadas</p>
                  <p className="text-sm text-gray-500">Las jornadas aparecerán cuando se programen partidos</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="teams" className="min-h-[400px]">
              <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                          <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg">{team.name}</CardTitle>
                          <CardDescription className="text-white/70 drop-shadow">/{team.slug}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white/80 drop-shadow mb-3">{team.description || "Sin descripción"}</p>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-white/80">
                        <span className="flex items-center drop-shadow flex-shrink-0">
                          <Users className="w-4 h-4 mr-1" />
                          Equipo registrado
                        </span>
                        <Link href={`/equipos/${team.id}?from=${encodeURIComponent(`/liga/${league.slug}/torneo/${tournamentId}?tab=teams`)}`} className="flex-shrink-0">
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

        {/* Footer */}
        <footer className="mt-auto py-3">
          <div className="text-center">
            <p className="text-gray-700 text-[10px]">
              © {new Date().getFullYear()} Zona Gol
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
