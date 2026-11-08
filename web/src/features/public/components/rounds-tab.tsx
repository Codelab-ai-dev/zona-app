import { useState } from 'react'

import { EmptyState } from '@/components/states'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Match } from '../types'
import { MatchList, type TeamLookup } from './match-list'

/** Round selector over the regular-phase matches (Jornada N). */
export function RoundsTab({ matches, teams }: { matches: Match[]; teams: TeamLookup }) {
  const rounds = [...new Set(matches.filter((m) => m.phase === 'regular' && m.round).map((m) => m.round as number))].sort((a, b) => a - b)
  const [chosen, setChosen] = useState<string>()
  const first = rounds[0]
  const selected = chosen ?? (first === undefined ? undefined : String(first))

  if (selected === undefined) return <EmptyState title="Aún no hay jornadas publicadas" />

  const inRound = matches.filter((m) => m.phase === 'regular' && String(m.round) === selected)
  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="round-select" className="text-xs text-gray-400">Seleccionar Jornada</Label>
        <Select value={selected} onValueChange={setChosen}>
          <SelectTrigger id="round-select" className="border-white/10 bg-slate-800/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-900 text-white">
            {rounds.map((r) => (
              <SelectItem key={r} value={String(r)} className="focus:bg-green-500/20 focus:text-green-400">Jornada {r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MatchList matches={inRound} teams={teams} />
    </div>
  )
}
