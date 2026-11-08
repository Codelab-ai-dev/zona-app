import { AlertTriangle, Ban, Calendar, FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { glassCard, glassTile } from '../glass'
import type { Match, Player, Suspension } from '../types'

const suspensionLabels: Record<string, string> = {
  red_card: 'Tarjeta Roja',
  yellow_accumulation: 'Acum. Amarillas',
  disciplinary_committee: 'Comité Disciplinario',
  other: 'Otro',
}

const positionGroups: [string, string[]][] = [
  ['Portero', ['Portero']],
  ['Defensa', ['Defensa', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo']],
  ['Mediocampista', ['Medio', 'Mediocampista', 'Mediocampista Central', 'Mediocampista Defensivo', 'Mediocampista Ofensivo']],
  ['Delantero', ['Delantero', 'Extremo Derecho', 'Extremo Izquierdo']],
]

export function PositionsCard({ players }: { players: Player[] }) {
  const active = players.filter((p) => p.is_active)
  const grouped = positionGroups
    .map(([label, names]) => ({ label, count: active.filter((p) => names.includes(p.position)).length }))
    .filter((g) => g.count > 0)
  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Distribución por Posición</CardTitle>
        <CardDescription className="text-white/70 drop-shadow">Jugadores activos por posición</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {grouped.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-3 backdrop-blur-md bg-white/10 rounded-xl border border-white/20"
            >
              <span className="font-medium text-white drop-shadow">{stat.label}</span>
              <span className="text-sm font-bold text-blue-400 drop-shadow">{stat.count} {stat.count === 1 ? 'jugador' : 'jugadores'}</span>
            </div>
          ))}
          {grouped.length === 0 && <p className="text-center text-white/70 drop-shadow py-4">Sin jugadores activos</p>}
        </div>
      </CardContent>
    </Card>
  )
}

interface ResultsCardProps {
  teamId: string
  matches: Match[]
  teamName: (id: string) => string | undefined
  onViewReport: (matchId: string) => void
}

export function ResultsCard({ teamId, matches, teamName, onViewReport }: ResultsCardProps) {
  const finished = matches.filter((m) => m.status === 'finished').slice(0, 3)
  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Últimos Resultados</CardTitle>
        <CardDescription className="text-white/70 drop-shadow">Resultados de partidos recientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {finished.map((match) => {
            const isHome = match.home_team_id === teamId
            const teamScore = isHome ? match.home_score : match.away_score
            const opponentScore = isHome ? match.away_score : match.home_score
            const opponentName = (isHome ? match.away_team : match.home_team)?.name ?? teamName(isHome ? match.away_team_id : match.home_team_id)
            const result = teamScore > opponentScore ? 'Victoria' : teamScore === opponentScore ? 'Empate' : 'Derrota'
            const resultColor =
              result === 'Victoria'
                ? 'bg-green-100 text-green-800'
                : result === 'Empate'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            return (
              <div key={match.id} className="p-3 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 space-y-2 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white drop-shadow">vs {opponentName || 'Equipo Rival'}</p>
                    <p className="text-sm text-white/70 drop-shadow">
                      {teamScore} - {opponentScore}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/60 drop-shadow">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      <span>{new Date(match.match_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                      {match.round && <span>• Jornada {match.round}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${resultColor}`}>{result}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewReport(match.id)}
                      className="p-2 h-8 w-8 backdrop-blur-md bg-white/10 border-white/30 hover:bg-white/20"
                      title="Ver cédula arbitral"
                      aria-label="Ver cédula arbitral"
                    >
                      <FileText className="w-4 h-4 text-white" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
          {finished.length === 0 && <p className="text-center text-white/70 drop-shadow py-4">No hay partidos jugados aún</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function SuspensionsCard({ suspensions, players }: { suspensions: Suspension[]; players: Player[] }) {
  const active = suspensions.filter((s) => s.status === 'active' || s.matches_served < s.matches_to_serve)
  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Ban className="w-5 h-5" aria-hidden="true" />
          Jugadores Suspendidos
        </CardTitle>
        <CardDescription className="text-white/70 drop-shadow">
          {active.length > 0
            ? `${active.length} jugador${active.length > 1 ? 'es' : ''} con suspensión activa`
            : 'No hay suspensiones activas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full backdrop-blur-md bg-green-500/20 border border-green-300/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-green-400" aria-hidden="true" />
            </div>
            <p className="text-sm text-white/80 drop-shadow">Todos los jugadores están habilitados para jugar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((s) => {
              const player = players.find((p) => p.id === s.player_id)
              return (
                <div key={s.id} className="p-4 backdrop-blur-md bg-red-500/20 border border-red-300/30 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-white drop-shadow">{player?.name ?? 'Jugador'}</span>
                    {player && <Badge variant="outline" className="border-white/30 text-white">#{player.jersey_number}</Badge>}
                    <Badge variant="destructive" className="text-xs bg-red-600/80 border-0">SUSPENDIDO</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <span className="text-white/80 drop-shadow">Tipo:</span>
                      <Badge variant="secondary" className="text-xs backdrop-blur-md bg-white/20 border-white/30 text-white">
                        {suspensionLabels[s.suspension_type] ?? s.suspension_type}
                      </Badge>
                    </div>
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <span className="text-white/80 drop-shadow">Partidos pendientes:</span>
                      <span className="font-bold text-red-300 drop-shadow">
                        {Math.max(s.matches_to_serve - s.matches_served, 0)} de {s.matches_to_serve}
                      </span>
                    </div>
                    {s.reason && (
                      <div className="pt-2 border-t border-red-300/30">
                        <p className="text-xs text-white/80 drop-shadow">
                          <span className="font-medium">Motivo:</span> {s.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatTile({ label, value, valueClass = 'text-white', tint = glassTile }: { label: string; value: number | string; valueClass?: string; tint?: string }) {
  return (
    <div className={tint}>
      <p className="text-sm text-white/80 drop-shadow mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold drop-shadow-lg ${valueClass}`}>{value}</p>
    </div>
  )
}
