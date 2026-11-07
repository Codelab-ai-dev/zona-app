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
      <Label htmlFor="tournament-select" className="text-base font-semibold">
        Selecciona el torneo
      </Label>
      <Select value={value} onValueChange={onSelect}>
        <SelectTrigger id="tournament-select">
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
      <p className="text-xs text-muted-foreground">{tournaments.length} torneos disponibles</p>
    </div>
  )
}
