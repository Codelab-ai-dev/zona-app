import { EmptyState } from '@/components/states'

import type { Standing, Team } from '../types'
import { panelClass } from './public-shell'
import { StandingsTable } from './stats-tables'

interface GroupsTabProps {
  standings: Standing[]
  /** League teams: the only source of `group_name`. */
  teams: Team[]
  advancing?: number
}

/**
 * One standings table per group. The API ranks the whole tournament, so
 * positions are recomputed inside each group (the order it returns is kept).
 */
export function GroupsTab({ standings, teams, advancing }: GroupsTabProps) {
  const groupOf = new Map(teams.map((t) => [t.id, t.group_name?.toUpperCase() || undefined]))
  const groups = new Map<string, Standing[]>()
  const ungrouped: Standing[] = []
  for (const s of standings) {
    const g = groupOf.get(s.team_id)
    if (!g) ungrouped.push(s)
    else groups.set(g, [...(groups.get(g) ?? []), s])
  }
  const ranked = (rows: Standing[]) => rows.map((s, i) => ({ ...s, position: i + 1 }))
  const names = [...groups.keys()].sort()

  if (names.length === 0) {
    return <EmptyState title="Aún no hay grupos" description="Los grupos aparecerán cuando se asignen los equipos" />
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {names.map((name) => {
        const rows = groups.get(name) ?? []
        return (
          <section key={name} aria-labelledby={`group-${name}`} className={`${panelClass} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-white/10 bg-slate-800/50 p-3 md:p-4">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg bg-green-500/20 font-bold text-green-400">{name}</span>
              <div>
                <h3 id={`group-${name}`} className="text-lg font-semibold text-white">Grupo {name}</h3>
                <p className="text-xs text-gray-400">
                  {rows.length} equipos{advancing ? ` • Top ${advancing} avanzan` : ''}
                </p>
              </div>
            </div>
            <StandingsTable standings={ranked(rows)} label={`Posiciones del grupo ${name}`} advancing={advancing} />
          </section>
        )
      })}
      {ungrouped.length > 0 && (
        <p className="text-xs text-gray-400">
          {ungrouped.length} equipos aún sin grupo asignado.
        </p>
      )}
    </div>
  )
}
