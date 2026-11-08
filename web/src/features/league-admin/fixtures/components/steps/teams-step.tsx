import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TeamsStepProps {
  teams: Array<{ id: string; name: string }>
  selected: Set<string>
  existingMatches: number
  onToggle: (teamId: string, checked: boolean) => void
  onBack: () => void
  onNext: () => void
}

/** Step 2: pick the teams that take part in the fixture. */
export function TeamsStep({ teams, selected, existingMatches, onToggle, onBack, onNext }: TeamsStepProps) {
  return (
    <div className="space-y-6">
      {existingMatches > 0 && (
        <Alert className="border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-yellow-300/90">
            Este torneo ya tiene {existingMatches} partidos. Se generarán partidos nuevos además de los existentes.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Label className="mb-1.5 block text-xs font-medium text-gray-400 md:text-sm">
          Equipos ({selected.size}/{teams.length})
        </Label>
        <ScrollArea className="h-64 rounded-lg border border-white/10 bg-slate-800/50 p-3">
          <div className="space-y-2 pr-4">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center gap-2">
                <Checkbox
                  id={`team-${team.id}`}
                  checked={selected.has(team.id)}
                  onCheckedChange={(checked) => onToggle(team.id, Boolean(checked))}
                />
                <Label htmlFor={`team-${team.id}`} className="cursor-pointer font-normal text-gray-300">
                  {team.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-gray-500">Se requieren mínimo 2 equipos.</p>
      </div>

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack}>
          Atrás
        </Button>
        <Button className="bg-green-500 text-white hover:bg-green-600" onClick={onNext} disabled={selected.size < 2}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
