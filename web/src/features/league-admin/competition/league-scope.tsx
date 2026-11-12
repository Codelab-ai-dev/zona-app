import { useState, type ReactNode } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMyLeagues } from '@/features/leagues/api'

/**
 * Resolves which league the admin is working on. With one league it renders
 * the children directly; with several it shows a selector (first league is
 * preselected) so nothing is silently scoped to the first one.
 */
export function LeagueScope({ children }: { children: (leagueId: string) => ReactNode }) {
  const leagues = useMyLeagues()
  const [selected, setSelected] = useState<string>('')

  return (
    <QueryState
      query={leagues}
      loadingLabel="Cargando ligas…"
      isEmpty={(res) => res.data.length === 0}
      empty={<EmptyState title="Sin liga asignada" description="No tienes ligas para administrar" />}
    >
      {(res) => {
        const current = res.data.find((l) => l.id === selected) ?? res.data[0]
        if (!current) return null
        return (
          <div className="space-y-6">
            {res.data.length > 1 && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="league-select">Liga</Label>
                <Select value={current.id} onValueChange={setSelected}>
                  <SelectTrigger id="league-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {res.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* key resets page-local state (selected tournament, dialogs) on league change */}
            <div key={current.id}>{children(current.id)}</div>
          </div>
        )
      }}
    </QueryState>
  )
}
