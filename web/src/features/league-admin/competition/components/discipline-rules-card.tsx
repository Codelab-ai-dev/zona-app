import { Loader2, ShieldAlert } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useLeagueTournaments } from '@/features/leagues/api'

import { useDisciplineRules, useSetDisciplineRules, type DisciplineRules } from '../api'

const field = 'border-white/20 bg-white/10 text-white'

function RulesForm({ tournamentId, rules }: { tournamentId: string; rules: DisciplineRules }) {
  const save = useSetDisciplineRules(tournamentId)
  const [enabled, setEnabled] = useState(rules.yellow_accumulation_limit !== null)
  const [limit, setLimit] = useState(String(rules.yellow_accumulation_limit ?? 5))
  const [matches, setMatches] = useState(String(rules.yellow_accumulation_matches))
  const ids = { toggle: useId(), limit: useId(), matches: useId() }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate({
      yellow_accumulation_limit: enabled ? Number(limit) : null,
      yellow_accumulation_matches: Number(matches),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch id={ids.toggle} checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor={ids.toggle} className="text-white">Suspender por acumulación de amarillas</Label>
      </div>
      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={ids.limit} className="text-white/90">Cada cuántas amarillas</Label>
            <Input id={ids.limit} type="number" min={2} max={20} required value={limit} onChange={(e) => setLimit(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.matches} className="text-white/90">Partidos de suspensión</Label>
            <Input id={ids.matches} type="number" min={1} max={10} required value={matches} onChange={(e) => setMatches(e.target.value)} className={field} />
          </div>
        </div>
      )}
      <p className="text-xs text-white/70">
        Aplica a los resultados que se capturen desde ahora. No cuentan las amarillas de un partido en el que el mismo jugador fue
        expulsado (esa roja ya genera su suspensión).
      </p>
      <Button type="submit" disabled={save.isPending} className="bg-green-500/80 text-white hover:bg-green-500/90">
        {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
        Guardar reglas
      </Button>
    </form>
  )
}

/** A tournament's automatic suspension rules: yellow card accumulation, off by default (#82). */
export function DisciplineRulesCard({ leagueId }: { leagueId: string }) {
  const tournaments = useLeagueTournaments(leagueId)
  const list = tournaments.data?.data ?? []
  const [picked, setPicked] = useState('')
  const tournamentId = picked || ((list.find((t) => t.is_active) ?? list[0])?.id ?? '')
  const rules = useDisciplineRules(tournamentId || undefined)
  const selectId = useId()

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ShieldAlert className="size-5 text-yellow-300" aria-hidden="true" />
          Reglas de suspensión automática
        </CardTitle>
        <CardDescription className="text-white/80">
          La roja directa siempre suspende un partido. Aquí decides si también suspende la acumulación de amarillas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 ? (
          <p className="text-sm text-white/70">Crea un torneo para configurar sus reglas.</p>
        ) : (
          <>
            <div className="space-y-1 sm:w-72">
              <Label htmlFor={selectId} className="text-white/90">Torneo</Label>
              <Select value={tournamentId} onValueChange={setPicked}>
                <SelectTrigger id={selectId} className={field}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {list.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rules.isPending ? (
              <p role="status" className="text-sm text-white/70">Cargando reglas…</p>
            ) : rules.error ? (
              <p role="alert" className="text-sm text-red-300">{rules.error.message}</p>
            ) : (
              <RulesForm key={`${tournamentId}-${JSON.stringify(rules.data)}`} tournamentId={tournamentId} rules={rules.data} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
