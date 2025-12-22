"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react"
import { useMatchesByTeam } from "@/lib/queries"
import { cn } from "@/lib/utils"

interface TeamCalendarProps {
  teamId: string
}

export function TeamCalendar({ teamId }: TeamCalendarProps) {
  const { data: matches = [], isLoading, error } = useMatchesByTeam(teamId)

  // Separar y agrupar partidos por jornada
  const { finishedByRound, scheduledByRound, finishedMatches, scheduledMatches } = useMemo(() => {
    const finished = matches
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

    const scheduled = matches
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

    // Agrupar por jornada
    const groupByRound = (matchList: typeof matches) => {
      const grouped = new Map<number | null, typeof matches>()
      matchList.forEach(match => {
        const round = match.round
        if (!grouped.has(round)) {
          grouped.set(round, [])
        }
        grouped.get(round)!.push(match)
      })
      // Ordenar por número de jornada
      return Array.from(grouped.entries()).sort((a, b) => {
        if (a[0] === null) return 1
        if (b[0] === null) return -1
        return a[0] - b[0]
      })
    }

    return {
      finishedByRound: groupByRound(finished),
      scheduledByRound: groupByRound(scheduled),
      finishedMatches: finished,
      scheduledMatches: scheduled
    }
  }, [matches])

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMatchResult = (match: typeof matches[0]) => {
    if (match.status !== 'finished') return null

    const isHome = match.home_team_id === teamId
    const teamScore = isHome ? match.home_score : match.away_score
    const opponentScore = isHome ? match.away_score : match.home_score

    if (teamScore === null || opponentScore === null) return null

    if (teamScore > opponentScore) return 'win'
    if (teamScore < opponentScore) return 'loss'
    return 'draw'
  }

  const MatchCard = ({ match }: { match: typeof matches[0] }) => {
    const isHome = match.home_team_id === teamId
    const opponent = isHome ? match.away_team : match.home_team
    const result = getMatchResult(match)
    const isFinished = match.status === 'finished'

    return (
      <div className={cn(
        "p-3 sm:p-4 backdrop-blur-md rounded-xl border shadow-lg transition-all",
        result === 'win' && "bg-green-500/20 border-green-300/30",
        result === 'loss' && "bg-red-500/20 border-red-300/30",
        result === 'draw' && "bg-yellow-500/20 border-yellow-300/30",
        !isFinished && "bg-white/10 border-white/20"
      )}>
        <div className="flex items-center justify-between gap-2">
          {/* Equipo local */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/20">
              {match.home_team?.logo ? (
                <AvatarImage src={match.home_team.logo} alt={match.home_team?.name || ''} />
              ) : null}
              <AvatarFallback className="bg-slate-700 text-white text-xs">
                {getTeamInitials(match.home_team?.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={cn(
                "font-semibold text-xs sm:text-sm truncate drop-shadow",
                match.home_team_id === teamId ? "text-green-300" : "text-white"
              )}>
                {match.home_team?.name}
              </p>
              <p className="text-[10px] sm:text-xs text-white/60">Local</p>
            </div>
          </div>

          {/* Marcador o VS */}
          <div className="flex-shrink-0 text-center px-2 sm:px-4">
            {isFinished ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className={cn(
                  "text-lg sm:text-2xl font-bold",
                  match.home_team_id === teamId
                    ? (result === 'win' ? "text-green-400" : result === 'loss' ? "text-red-400" : "text-yellow-400")
                    : "text-white"
                )}>
                  {match.home_score}
                </span>
                <span className="text-white/50 text-sm sm:text-lg">-</span>
                <span className={cn(
                  "text-lg sm:text-2xl font-bold",
                  match.away_team_id === teamId
                    ? (result === 'win' ? "text-green-400" : result === 'loss' ? "text-red-400" : "text-yellow-400")
                    : "text-white"
                )}>
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-white/60 text-sm sm:text-lg font-medium">VS</span>
            )}
            {isFinished && result && (
              <Badge className={cn(
                "mt-1 text-[10px] sm:text-xs",
                result === 'win' && "bg-green-500/80",
                result === 'loss' && "bg-red-500/80",
                result === 'draw' && "bg-yellow-500/80"
              )}>
                {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Empate'}
              </Badge>
            )}
          </div>

          {/* Equipo visitante */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3 justify-end">
            <div className="min-w-0 text-right">
              <p className={cn(
                "font-semibold text-xs sm:text-sm truncate drop-shadow",
                match.away_team_id === teamId ? "text-green-300" : "text-white"
              )}>
                {match.away_team?.name}
              </p>
              <p className="text-[10px] sm:text-xs text-white/60">Visitante</p>
            </div>
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/20">
              {match.away_team?.logo ? (
                <AvatarImage src={match.away_team.logo} alt={match.away_team?.name || ''} />
              ) : null}
              <AvatarFallback className="bg-slate-700 text-white text-xs">
                {getTeamInitials(match.away_team?.name || '')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Info del partido */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-white/70">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(match.match_date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(match.match_date)}</span>
          </div>
          {match.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px] sm:max-w-none">{match.location}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Calendario</h2>
          <p className="text-white/80 drop-shadow">Partidos de tu equipo</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
            <span className="text-base sm:text-lg text-white drop-shadow">Cargando calendario...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Calendario</h2>
          <p className="text-white/80 drop-shadow">Partidos de tu equipo</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-400 mb-4" />
            <p className="text-white/80 drop-shadow">Error al cargar el calendario</p>
            <p className="text-sm text-white/70 drop-shadow mt-2">Por favor intenta de nuevo más tarde</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Calendario</h2>
        <p className="text-white/80 drop-shadow">
          {matches.length} partido{matches.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-4 sm:pt-6 text-center">
            <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{matches.length}</p>
            <p className="text-xs sm:text-sm text-white/80 drop-shadow">Total</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-4 sm:pt-6 text-center">
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{finishedMatches.length}</p>
            <p className="text-xs sm:text-sm text-white/80 drop-shadow">Jugados</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-4 sm:pt-6 text-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{scheduledMatches.length}</p>
            <p className="text-xs sm:text-sm text-white/80 drop-shadow">Programados</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-4 sm:pt-6 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 flex items-center justify-center">
              <span className="text-lg sm:text-xl">🏆</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-400 drop-shadow-lg">
              {finishedMatches.filter(m => getMatchResult(m) === 'win').length}
            </p>
            <p className="text-xs sm:text-sm text-white/80 drop-shadow">Victorias</p>
          </CardContent>
        </Card>
      </div>

      {/* Partidos finalizados por jornada */}
      {finishedByRound.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white drop-shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Partidos Finalizados
          </h3>
          {finishedByRound.map(([round, roundMatches]) => (
            <Card key={`finished-${round}`} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg flex items-center justify-between">
                  <span>{round ? `Jornada ${round}` : 'Sin jornada asignada'}</span>
                  <div className="flex gap-1">
                    {roundMatches.map(m => {
                      const result = getMatchResult(m)
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            result === 'win' && "bg-green-400",
                            result === 'loss' && "bg-red-400",
                            result === 'draw' && "bg-yellow-400"
                          )}
                        />
                      )
                    })}
                  </div>
                </CardTitle>
                <CardDescription className="text-white/70 drop-shadow text-xs sm:text-sm">
                  {roundMatches.length} partido{roundMatches.length !== 1 ? 's' : ''} jugado{roundMatches.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roundMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Próximos partidos por jornada */}
      {scheduledByRound.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white drop-shadow-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Próximos Partidos
          </h3>
          {scheduledByRound.map(([round, roundMatches]) => (
            <Card key={`scheduled-${round}`} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg">
                  {round ? `Jornada ${round}` : 'Sin jornada asignada'}
                </CardTitle>
                <CardDescription className="text-white/70 drop-shadow text-xs sm:text-sm">
                  {roundMatches.length} partido{roundMatches.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roundMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sin partidos */}
      {matches.length === 0 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" />
            <p className="text-white/80 drop-shadow">No hay partidos programados todavía</p>
            <p className="text-sm text-white/70 drop-shadow mt-2">Los partidos aparecerán aquí cuando se programen</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
