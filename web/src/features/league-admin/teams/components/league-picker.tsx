import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { League } from '@/features/leagues/types'

interface LeaguePickerProps {
  leagues: League[]
  value: string
  onChange: (leagueId: string) => void
}

/** Only rendered when the admin manages more than one league. */
export function LeaguePicker({ leagues, value, onChange }: LeaguePickerProps) {
  if (leagues.length < 2) return null
  return (
    <div className="space-y-2">
      <Label htmlFor="league-select">Selecciona una liga</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="league-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {leagues.map((league) => (
            <SelectItem key={league.id} value={league.id}>
              {league.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
