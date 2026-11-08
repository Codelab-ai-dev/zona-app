import { Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react'

import { QueryState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { useTeamStats } from '../api'
import { glassCard } from '../glass'
import type { TeamStats } from '../types'

const recordTone = {
  played: ['bg-gray-500/20 border-gray-300/30', 'text-white'],
  won: ['bg-green-500/20 border-green-300/30', 'text-green-400'],
  drawn: ['bg-yellow-500/20 border-yellow-300/30', 'text-yellow-400'],
  lost: ['bg-red-500/20 border-red-300/30', 'text-red-400'],
} as const

function RecordCard({ stat }: { stat: TeamStats }) {
  const record = [
    { label: 'Jugados', value: stat.matches_played, tone: recordTone.played },
    { label: 'Ganados', value: stat.matches_won, tone: recordTone.won },
    { label: 'Empatados', value: stat.matches_drawn, tone: recordTone.drawn },
    { label: 'Perdidos', value: stat.matches_lost, tone: recordTone.lost },
  ]
  const positiveDiff = stat.goal_difference >= 0
  const goals = [
    { label: 'A Favor', value: stat.goals_for, icon: TrendingUp, good: true },
    { label: 'En Contra', value: stat.goals_against, icon: TrendingDown, good: false },
    { label: 'Diferencia', value: positiveDiff ? `+${stat.goal_difference}` : stat.goal_difference, icon: Target, good: positiveDiff },
    {
      label: 'Promedio por Partido',
      value: stat.matches_played > 0 ? (stat.goals_for / stat.matches_played).toFixed(2) : '0',
      icon: Target,
      good: true,
    },
  ]
  const winRate = stat.matches_played > 0 ? (stat.matches_won / stat.matches_played) * 100 : 0

  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Trophy className="w-5 h-5" aria-hidden="true" />
          Récord del Equipo
        </CardTitle>
        <CardDescription className="text-white/70 drop-shadow">Estadísticas de la temporada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 sm:p-6 backdrop-blur-md bg-gradient-to-r from-blue-500/80 to-blue-600/80 rounded-xl text-white border border-blue-300/30 shadow-lg">
          <div className="text-center">
            <p className="text-sm font-medium opacity-90">Puntos</p>
            <p className="text-5xl font-bold mt-2">{stat.points}</p>
            <p className="text-xs opacity-75 mt-2">
              {stat.matches_won} victorias × 3 pts + {stat.matches_drawn} empates × 1 pt
              {stat.points_adjustment !== 0 && ` (ajuste ${stat.points_adjustment > 0 ? '+' : ''}${stat.points_adjustment})`}
            </p>
            {stat.adjustment_reason && <p className="text-xs opacity-75 mt-1">Motivo: {stat.adjustment_reason}</p>}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white drop-shadow-lg mb-3">Récord de Partidos</h3>
          <div className="grid grid-cols-2 gap-3">
            {record.map((r) => (
              <div key={r.label} className={cn('p-4 rounded-xl backdrop-blur-md border shadow-lg', r.tone[0])}>
                <p className="text-xs text-white/80 drop-shadow mb-1">{r.label}</p>
                <p className={cn('text-2xl font-bold drop-shadow-lg', r.tone[1])}>{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white drop-shadow-lg mb-3">Estadísticas de Goles</h3>
          <div className="space-y-3">
            {goals.map((g) => {
              const Icon = g.icon
              return (
                <div
                  key={g.label}
                  className={cn(
                    'flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 p-4 rounded-xl backdrop-blur-md border shadow-lg',
                    g.good ? 'bg-green-500/20 border-green-300/30' : 'bg-red-500/20 border-red-300/30',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-full backdrop-blur-md border', g.good ? 'bg-green-500/30 border-green-300/50' : 'bg-red-500/30 border-red-300/50')}>
                      <Icon className={cn('w-4 h-4', g.good ? 'text-green-300' : 'text-red-300')} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium text-white drop-shadow">{g.label}</span>
                  </div>
                  <span className={cn('text-2xl font-bold drop-shadow-lg', g.good ? 'text-green-400' : 'text-red-400')}>{g.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white drop-shadow-lg mb-3">Defensa y Disciplina</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Vallas Invictas', value: stat.clean_sheets, tone: 'bg-white/10 border-white/20', text: 'text-white' },
              { label: 'Tarjetas Amarillas', value: stat.yellow_cards, tone: 'bg-yellow-500/20 border-yellow-300/30', text: 'text-yellow-400' },
              { label: 'Tarjetas Rojas', value: stat.red_cards, tone: 'bg-red-500/20 border-red-300/30', text: 'text-red-400' },
            ].map((t) => (
              <div key={t.label} className={cn('p-4 rounded-xl backdrop-blur-md border shadow-lg', t.tone)}>
                <p className="text-xs text-white/80 drop-shadow mb-1">{t.label}</p>
                <p className={cn('text-2xl font-bold drop-shadow-lg', t.text)}>{t.value}</p>
              </div>
            ))}
          </div>
        </div>

        {stat.matches_played > 0 && (
          <div className="pt-4 border-t border-white/20">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-sm">
              <span className="text-white/80 drop-shadow">Porcentaje de Victorias</span>
              <span className="font-bold text-green-400 drop-shadow">{winRate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 backdrop-blur-md bg-white/20 rounded-full overflow-hidden border border-white/30" role="presentation">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${winRate}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Estadísticas tab: the team record in the original glass card. */
export function TeamRecordPage({ teamId }: { teamId: string }) {
  const stats = useTeamStats(teamId)
  return (
    <QueryState query={stats} isEmpty={(res) => res.data.length === 0}>
      {(res) => (res.data[0] ? <RecordCard stat={res.data[0]} /> : null)}
    </QueryState>
  )
}
