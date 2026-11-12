import { Loader2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const NONE = 'none'

interface PlayoffSeedsProps {
  numTeams: number
  /** Team id per seed, '' = not chosen. */
  seeds: string[]
  teams: Array<{ id: string; name: string }>
  error?: string
  /** Present only for group + knockout tournaments. */
  onLoadQualified?: () => void
  loadingQualified?: boolean
  onChange: (index: number, teamId: string) => void
  onClear: () => void
}

/** Optional manual seeding: leave empty to build the bracket from the standings. */
export function PlayoffSeeds({ numTeams, seeds, teams, error, onLoadQualified, loadingQualified, onChange, onClear }: PlayoffSeedsProps) {
  const chosen = new Set(seeds.filter(Boolean))
  return (
    <fieldset className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-3">
      <legend className="px-1 text-sm font-medium text-white/90">Equipos clasificados (opcional)</legend>
      <p className="text-xs text-white/60">
        Sin elegir equipos, la llave se arma con la tabla general. Para decidir tú el orden, llena los {numTeams} lugares:
        el 1.º juega contra el último, etc.
      </p>
      <div className="flex flex-wrap gap-2">
        {onLoadQualified && (
          <Button type="button" size="sm" onClick={onLoadQualified} disabled={loadingQualified} className="h-8 bg-blue-500/80 text-xs text-white hover:bg-blue-500">
            {loadingQualified ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" /> : <Users className="mr-1 h-3 w-3" aria-hidden="true" />}
            {loadingQualified ? 'Cargando equipos clasificados…' : 'Cargar Equipos Clasificados'}
          </Button>
        )}
        {chosen.size > 0 && (
          <Button type="button" size="sm" onClick={onClear} className="h-8 border border-white/20 bg-transparent text-xs text-white/80 hover:bg-white/10">
            Limpiar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: numTeams }, (_, i) => (
          <div key={i}>
            <Label htmlFor={`seed-${i + 1}`} className="mb-1 block text-xs text-white/70">
              Lugar {i + 1}
            </Label>
            <Select value={seeds[i] || NONE} onValueChange={(v) => onChange(i, v === NONE ? '' : v)}>
              <SelectTrigger id={`seed-${i + 1}`} aria-invalid={Boolean(error)} aria-describedby={error ? 'team_ids-error' : undefined} className="h-9 w-full border-white/30 bg-white/10 text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin elegir</SelectItem>
                {teams
                  .filter((t) => t.id === seeds[i] || !chosen.has(t.id))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      {error && (
        <p id="team_ids-error" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  )
}
