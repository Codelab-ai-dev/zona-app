"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trophy, Target, AlertCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTeamScorers } from "@/lib/queries"

interface TeamScorersProps {
  teamId: string
}

export function TeamScorers({ teamId }: TeamScorersProps) {
  // React Query hook
  const { data: scorers = [], isLoading, error } = useTeamScorers(teamId)

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Badge className="backdrop-blur-md bg-yellow-500/80 hover:bg-yellow-500/90 text-white border-0">
          🥇 1°
        </Badge>
      )
    } else if (position === 2) {
      return (
        <Badge className="backdrop-blur-md bg-gray-400/80 hover:bg-gray-400/90 text-white border-0">
          🥈 2°
        </Badge>
      )
    } else if (position === 3) {
      return (
        <Badge className="backdrop-blur-md bg-orange-600/80 hover:bg-orange-600/90 text-white border-0">
          🥉 3°
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Goleadores del Equipo</h2>
        <p className="text-white/80 drop-shadow">Tabla de goleo de tus jugadores</p>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Máximos Goleadores
          </CardTitle>
          <CardDescription className="text-white/70 drop-shadow">
            {scorers.length > 0 ? `${scorers.length} jugador${scorers.length > 1 ? 'es' : ''} con goles` : 'No hay goles registrados aún'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
              <span className="text-base sm:text-lg text-white drop-shadow">Cargando goleadores...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-400 mb-4" />
              <p className="text-white/80 drop-shadow">Error al cargar los goleadores</p>
              <p className="text-sm text-white/70 drop-shadow mt-2">Por favor intenta de nuevo más tarde</p>
            </div>
          ) : scorers.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" />
              <p className="text-white/80 drop-shadow">No hay goles registrados todavía</p>
              <p className="text-sm text-white/70 drop-shadow mt-2">Los goles aparecerán aquí cuando se registren en los partidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-transparent">
                    <TableHead className="w-20 text-white/90 drop-shadow bg-transparent">Posición</TableHead>
                    <TableHead className="text-white/90 drop-shadow bg-transparent">Jugador</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent">Dorsal</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow bg-transparent">Goles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorers.map((scorer, index) => {
                    const position = index + 1
                    const isTopThree = position <= 3
                    return (
                      <TableRow
                        key={scorer.id}
                        className={`border-white/10 hover:bg-white/5 ${isTopThree ? 'bg-yellow-500/10' : 'bg-transparent'}`}
                      >
                        <TableCell className="bg-transparent">{getPositionBadge(position)}</TableCell>
                        <TableCell className="font-semibold text-white drop-shadow bg-transparent">
                          {scorer.name}
                        </TableCell>
                        <TableCell className="text-center bg-transparent">
                          <Badge variant="outline" className="font-bold backdrop-blur-md bg-white/20 border-white/30 text-white">
                            #{scorer.jersey_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center bg-transparent">
                          <Badge variant="default" className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 border-0">
                            ⚽ {scorer.goals}
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

      {/* Top 3 Podium */}
      {scorers.length >= 3 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Podio del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* 2nd Place */}
              <div className="text-center order-1">
                <div className="h-28 sm:h-32 backdrop-blur-md bg-slate-500/30 border border-slate-400/30 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-3xl sm:text-4xl">🥈</span>
                </div>
                <div className="backdrop-blur-md bg-slate-800/50 p-3 sm:p-4 rounded-b-xl border-t-4 border-slate-400/50 border border-slate-600/30">
                  <p className="font-bold text-sm sm:text-lg truncate text-white drop-shadow">{scorers[1].name}</p>
                  <p className="text-xs sm:text-sm text-white/70 drop-shadow">#{scorers[1].jersey_number}</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-300 drop-shadow-lg mt-2">
                    {scorers[1].goals} ⚽
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center order-2">
                <div className="h-36 sm:h-40 backdrop-blur-md bg-yellow-600/30 border border-yellow-500/30 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-4xl sm:text-5xl">🥇</span>
                </div>
                <div className="backdrop-blur-md bg-slate-800/50 p-3 sm:p-4 rounded-b-xl border-t-4 border-yellow-500/50 border border-slate-600/30">
                  <p className="font-bold text-base sm:text-xl truncate text-white drop-shadow-lg">{scorers[0].name}</p>
                  <p className="text-xs sm:text-sm text-white/70 drop-shadow">#{scorers[0].jersey_number}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-400 drop-shadow-lg mt-2">
                    {scorers[0].goals} ⚽
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center order-3">
                <div className="h-20 sm:h-24 backdrop-blur-md bg-orange-700/30 border border-orange-500/30 rounded-t-xl flex items-end justify-center pb-4">
                  <span className="text-2xl sm:text-3xl">🥉</span>
                </div>
                <div className="backdrop-blur-md bg-slate-800/50 p-3 sm:p-4 rounded-b-xl border-t-4 border-orange-500/50 border border-slate-600/30">
                  <p className="font-bold text-sm sm:text-lg truncate text-white drop-shadow">{scorers[2].name}</p>
                  <p className="text-xs sm:text-sm text-white/70 drop-shadow">#{scorers[2].jersey_number}</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-400 drop-shadow-lg mt-2">
                    {scorers[2].goals} ⚽
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
