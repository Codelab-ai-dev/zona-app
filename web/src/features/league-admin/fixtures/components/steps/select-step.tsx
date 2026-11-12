import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Tournament } from '@/features/leagues/types'

interface SelectStepProps {
  tournaments: Tournament[]
  value: string
  onSelect: (tournamentId: string) => void
}

/** Step 1: choose the tournament; selecting one advances to the teams step. */
export function SelectStep({ tournaments, value, onSelect }: SelectStepProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="tournament-select" className="mb-1.5 block text-xs font-medium text-gray-400 md:text-sm">
        Selecciona el torneo
      </Label>
      <Select value={value} onValueChange={onSelect}>
        <SelectTrigger id="tournament-select" className="h-9 w-full border-white/10 bg-slate-700/50 text-sm text-white">
          <SelectValue placeholder="Elige un torneo" />
        </SelectTrigger>
        <SelectContent>
          {tournaments.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">{tournaments.length} torneos disponibles</p>
    </div>
  )
}
