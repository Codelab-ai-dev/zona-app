import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface GroupsStepProps {
  /** Every group letter of the tournament with its teams (possibly empty). */
  groups: Array<{ name: string; teams: Array<{ id: string; name: string }> }>
  /** Active teams of the tournament with no valid group. */
  unassigned: Array<{ id: string; name: string }>
  selected: Set<string>
  onToggle: (group: string, checked: boolean) => void
  onBack: () => void
  onNext: () => void
}

/** Step 2 of a group stage: which groups get a calendar (blocked while a team has no group). */
export function GroupsStep({ groups, unassigned, selected, onToggle, onBack, onNext }: GroupsStepProps) {
  const chosen = groups.filter((g) => selected.has(g.name))
  const tooSmall = chosen.filter((g) => g.teams.length < 2)
  const blocked = unassigned.length > 0 || chosen.length === 0 || tooSmall.length > 0

  return (
    <div className="space-y-6">
      {unassigned.length > 0 && (
        <Alert role="alert" className="border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
          <AlertDescription className="space-y-1 text-red-300">
            <p>
              {unassigned.length === 1 ? 'Este equipo no tiene grupo' : `Estos ${unassigned.length} equipos no tienen grupo`}: {unassigned.map((t) => t.name).join(', ')}.
              Asígnalos antes de generar los partidos.
            </p>
            <Link to="/liga-admin/grupos" className="underline">Ir a Grupos</Link>
          </AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-1.5 block text-xs font-medium text-gray-400 md:text-sm">
          Seleccionar Grupos ({chosen.length} de {groups.length})
        </legend>
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-slate-800/50 p-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.name} className="flex items-center gap-2">
              <Checkbox id={`group-${g.name}`} checked={selected.has(g.name)} onCheckedChange={(c) => onToggle(g.name, Boolean(c))} />
              <Label htmlFor={`group-${g.name}`} className="cursor-pointer font-normal text-gray-300">
                Grupo {g.name} <span className="text-xs text-gray-500">({g.teams.length} {g.teams.length === 1 ? 'equipo' : 'equipos'})</span>
              </Label>
            </div>
          ))}
        </div>
        {tooSmall.length > 0 && (
          <p role="alert" className="text-xs text-red-400">
            Cada grupo necesita al menos 2 equipos: revisa {tooSmall.map((g) => `Grupo ${g.name}`).join(', ')}.
          </p>
        )}
      </fieldset>

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack}>
          Atrás
        </Button>
        <Button className="bg-green-500 text-white hover:bg-green-600" onClick={onNext} disabled={blocked}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
