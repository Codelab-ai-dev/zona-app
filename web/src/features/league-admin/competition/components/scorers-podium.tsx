import { Trophy } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { PlayerStats } from '../types'

const places = [
  { index: 1, order: 'order-1', height: 'h-32', bg: 'bg-gray-400/80', border: 'border-gray-300', medal: '🥈', medalSize: 'text-4xl', name: 'text-base sm:text-lg', goals: 'text-2xl text-gray-300' },
  { index: 0, order: 'order-2', height: 'h-40', bg: 'bg-yellow-400/80', border: 'border-yellow-400', medal: '🥇', medalSize: 'text-5xl', name: 'text-xl', goals: 'text-2xl sm:text-3xl text-yellow-300' },
  { index: 2, order: 'order-3', height: 'h-24', bg: 'bg-orange-500/80', border: 'border-orange-500', medal: '🥉', medalSize: 'text-2xl sm:text-3xl', name: 'text-base sm:text-lg', goals: 'text-2xl text-orange-400' },
]

/** Top-3 podium (needs at least three scorers). */
export function ScorersPodium({ scorers }: { scorers: PlayerStats[] }) {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Trophy className="w-5 h-5 text-yellow-300" aria-hidden="true" />
          Podio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {places.map((p) => {
            const scorer = scorers[p.index]
            if (!scorer) return null
            return (
              <div key={p.index} className={`text-center ${p.order}`}>
                <div className={`${p.height} backdrop-blur-md ${p.bg} rounded-t-lg flex items-end justify-center pb-4`}>
                  <span className={p.medalSize} aria-hidden="true">{p.medal}</span>
                </div>
                <div className={`backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 ${p.border}`}>
                  <p className={`font-bold ${p.name} text-white drop-shadow`}>{scorer.player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorer.team_name}</p>
                  <p className={`font-bold mt-2 drop-shadow ${p.goals}`}>{scorer.goals} ⚽</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
