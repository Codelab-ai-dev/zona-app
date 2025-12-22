"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Trophy, AlertCircle, Medal } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTeamById, useTournamentStandings } from "@/lib/queries"
import { cn } from "@/lib/utils"

interface TeamStandingsProps {
  teamId: string
}

export function TeamStandings({ teamId }: TeamStandingsProps) {
  // Obtener datos del equipo para conseguir el tournament_id
  const { data: team, isLoading: loadingTeam } = useTeamById(teamId)

  // Obtener tabla de posiciones del torneo
  const tournamentId = team?.tournament_id || undefined
  const { data: standings = [], isLoading: loadingStandings, error } = useTournamentStandings(tournamentId)

  const isLoading = loadingTeam || loadingStandings

  // Encontrar la posición del equipo actual
  const teamPosition = standings.findIndex(s => s.id === teamId) + 1

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Badge className="backdrop-blur-md bg-yellow-500/80 hover:bg-yellow-500/90 text-white border-0">
          <Medal className="w-3 h-3 mr-1" />
          1°
        </Badge>
      )
    } else if (position === 2) {
      return (
        <Badge className="backdrop-blur-md bg-gray-400/80 hover:bg-gray-400/90 text-white border-0">
          <Medal className="w-3 h-3 mr-1" />
          2°
        </Badge>
      )
    } else if (position === 3) {
      return (
        <Badge className="backdrop-blur-md bg-orange-600/80 hover:bg-orange-600/90 text-white border-0">
          <Medal className="w-3 h-3 mr-1" />
          3°
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="font-bold backdrop-blur-md bg-white/20 border-white/30 text-white">
          {position}°
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Tabla de Posiciones</h2>
          <p className="text-white/80 drop-shadow">Posición de tu equipo en la liga</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
            <span className="text-base sm:text-lg text-white drop-shadow">Cargando tabla de posiciones...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Tabla de Posiciones</h2>
          <p className="text-white/80 drop-shadow">Posición de tu equipo en la liga</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-400 mb-4" />
            <p className="text-white/80 drop-shadow">Error al cargar la tabla de posiciones</p>
            <p className="text-sm text-white/70 drop-shadow mt-2">Por favor intenta de nuevo más tarde</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tournamentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Tabla de Posiciones</h2>
          <p className="text-white/80 drop-shadow">Posición de tu equipo en la liga</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-12">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" />
            <p className="text-white/80 drop-shadow">Tu equipo no está inscrito en ningún torneo</p>
            <p className="text-sm text-white/70 drop-shadow mt-2">Contacta al administrador de la liga para más información</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Tabla de Posiciones</h2>
        <p className="text-white/80 drop-shadow">
          {team?.name} - {teamPosition > 0 ? `Posición ${teamPosition}° de ${standings.length}` : 'Posición actual en la liga'}
        </p>
      </div>

      {/* Resumen de posición del equipo */}
      {teamPosition > 0 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-full backdrop-blur-md border-2",
                  teamPosition === 1 && "bg-yellow-500/30 border-yellow-400",
                  teamPosition === 2 && "bg-gray-400/30 border-gray-300",
                  teamPosition === 3 && "bg-orange-500/30 border-orange-400",
                  teamPosition > 3 && "bg-white/20 border-white/30"
                )}>
                  <span className={cn(
                    "text-2xl font-bold",
                    teamPosition === 1 && "text-yellow-400",
                    teamPosition === 2 && "text-gray-300",
                    teamPosition === 3 && "text-orange-400",
                    teamPosition > 3 && "text-white"
                  )}>
                    {teamPosition}°
                  </span>
                </div>
                <Avatar className="w-14 h-14 border-2 border-white/30">
                  {team?.logo ? (
                    <AvatarImage src={team.logo} alt={team?.name || ''} />
                  ) : null}
                  <AvatarFallback className="bg-slate-700 text-white text-lg">
                    {getTeamInitials(team?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow">{team?.name}</h3>
                  <p className="text-sm text-white/70 drop-shadow">
                    {standings[teamPosition - 1]?.points || 0} puntos
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 backdrop-blur-md bg-green-500/20 rounded-xl border border-green-300/30">
                  <p className="text-lg font-bold text-green-400">{standings[teamPosition - 1]?.wins || 0}</p>
                  <p className="text-xs text-white/70">Victorias</p>
                </div>
                <div className="p-3 backdrop-blur-md bg-yellow-500/20 rounded-xl border border-yellow-300/30">
                  <p className="text-lg font-bold text-yellow-400">{standings[teamPosition - 1]?.draws || 0}</p>
                  <p className="text-xs text-white/70">Empates</p>
                </div>
                <div className="p-3 backdrop-blur-md bg-red-500/20 rounded-xl border border-red-300/30">
                  <p className="text-lg font-bold text-red-400">{standings[teamPosition - 1]?.losses || 0}</p>
                  <p className="text-xs text-white/70">Derrotas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla completa de posiciones */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Clasificación General
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">
            {standings.length} equipos en el torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {standings.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" />
              <p className="text-white/80 drop-shadow">No hay datos de posiciones todavía</p>
              <p className="text-sm text-white/70 drop-shadow mt-2">Los resultados aparecerán cuando se jueguen partidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse text-xs sm:text-sm">
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableHead className="w-10 sm:w-16 text-white/90 drop-shadow bg-transparent px-1 sm:px-4">#</TableHead>
                    <TableHead className="text-white/90 drop-shadow bg-transparent px-1 sm:px-4">Equipo</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">PJ</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">G</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">E</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">P</TableHead>
                    <TableHead className="hidden sm:table-cell text-center text-white/90 drop-shadow bg-transparent px-2">GF</TableHead>
                    <TableHead className="hidden sm:table-cell text-center text-white/90 drop-shadow bg-transparent px-2">GC</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">DG</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent px-1 sm:px-2">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((standing, index) => {
                    const position = index + 1
                    const isCurrentTeam = standing.id === teamId
                    const isTopThree = position <= 3

                    return (
                      <TableRow
                        key={standing.id}
                        className={cn(
                          "border-white/10 transition-colors",
                          isCurrentTeam
                            ? "bg-green-500/30 hover:bg-green-500/40 border-l-4 border-l-green-400"
                            : isTopThree
                              ? "bg-yellow-500/10 hover:bg-yellow-500/15"
                              : "bg-transparent hover:bg-white/5"
                        )}
                      >
                        <TableCell className="bg-transparent px-1 sm:px-4">
                          <span className="sm:hidden font-bold text-white">{position}</span>
                          <span className="hidden sm:inline">{getPositionBadge(position)}</span>
                        </TableCell>
                        <TableCell className={cn(
                          "font-semibold drop-shadow bg-transparent px-1 sm:px-4",
                          isCurrentTeam ? "text-green-300" : "text-white"
                        )}>
                          <div className="flex items-center gap-1 sm:gap-3">
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border border-white/20">
                              {standing.logo ? (
                                <AvatarImage src={standing.logo} alt={standing.name} />
                              ) : null}
                              <AvatarFallback className="bg-slate-700 text-white text-[10px] sm:text-xs">
                                {getTeamInitials(standing.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[80px] sm:max-w-none">{standing.name}</span>
                            {isCurrentTeam && (
                              <Badge className="hidden sm:inline-flex text-xs backdrop-blur-md bg-green-500/50 text-white border-0">
                                Tu equipo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-white/80 drop-shadow bg-transparent px-1 sm:px-2">
                          {standing.played}
                        </TableCell>
                        <TableCell className="text-center text-green-400 drop-shadow bg-transparent px-1 sm:px-2">
                          {standing.wins}
                        </TableCell>
                        <TableCell className="text-center text-yellow-400 drop-shadow bg-transparent px-1 sm:px-2">
                          {standing.draws}
                        </TableCell>
                        <TableCell className="text-center text-red-400 drop-shadow bg-transparent px-1 sm:px-2">
                          {standing.losses}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center text-white/80 drop-shadow bg-transparent px-2">
                          {standing.goalsFor}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center text-white/80 drop-shadow bg-transparent px-2">
                          {standing.goalsAgainst}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center drop-shadow bg-transparent px-1 sm:px-2",
                          standing.goalDifference > 0 ? "text-green-400" :
                          standing.goalDifference < 0 ? "text-red-400" : "text-white/80"
                        )}>
                          {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                        </TableCell>
                        <TableCell className="text-center bg-transparent px-1 sm:px-2">
                          <Badge
                            variant="default"
                            className={cn(
                              "backdrop-blur-md border-0 text-xs sm:text-sm px-1.5 sm:px-2",
                              isCurrentTeam
                                ? "bg-green-500/80 hover:bg-green-500/90"
                                : "bg-blue-500/80 hover:bg-blue-500/90"
                            )}
                          >
                            {standing.points}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
