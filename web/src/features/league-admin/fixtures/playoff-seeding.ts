import type { StandingRow } from './types'

/** Pairs of seed indexes (0-based) for the first round, in bracket order. */
export function firstRoundPairs(numTeams: 4 | 8): Array<[number, number]> {
  return numTeams === 8
    ? [[0, 7], [3, 4], [1, 6], [2, 5]]
    : [[0, 3], [1, 2]]
}

interface GroupTeam {
  id: string
  name: string
  group_name?: string
}

export interface QualifiedResult {
  /** Seeds in order, as team ids. */
  seeds: string[]
  /** How many teams advance from the groups in total (can be fewer than numTeams). */
  qualified: number
}

/**
 * Teams that advance from the group stage, ordered as playoff seeds.
 *
 * With 2 advancing per group and exactly numTeams/2 groups, groups are paired
 * so the winner of one meets the runner-up of the other (A1 vs B2, B1 vs A2,
 * C1 vs D2, D1 vs C2) in the 1v8, 4v5, 2v7, 3v6 bracket. In any other shape the
 * teams are listed group by group (A1, A2, B1, B2…) like the original app did.
 */
export function qualifiedFromGroups(
  teams: GroupTeam[],
  standings: StandingRow[],
  perGroup: number,
  numTeams: 4 | 8,
): QualifiedResult {
  const position = new Map(standings.map((s) => [s.team_id, s.position]))
  const groups = new Map<string, GroupTeam[]>()
  teams.forEach((t) => {
    if (!t.group_name) return
    groups.set(t.group_name, [...(groups.get(t.group_name) ?? []), t])
  })
  const names = [...groups.keys()].sort()
  const top = names.map((g) =>
    [...(groups.get(g) ?? [])]
      .sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity) || a.name.localeCompare(b.name))
      .slice(0, perGroup)
      .map((t) => t.id),
  )
  const qualified = top.reduce((n, g) => n + g.length, 0)

  if (perGroup === 2 && top.length * 2 === numTeams && top.length % 2 === 0 && top.every((g) => g.length === 2)) {
    // Bracket slots (seed index): 0v7, 3v4, 1v6, 2v5 (8 teams) or 0v3, 1v2 (4 teams).
    const seeds: string[] = Array<string>(numTeams).fill('')
    const slots = firstRoundPairs(numTeams)
    let slot = 0
    for (let g = 0; g < top.length; g += 2) {
      const [a1, a2] = top[g] as [string, string]
      const [b1, b2] = top[g + 1] as [string, string]
      // Two slots per pair of groups: pair j takes the j-th and the (j+half)-th slots.
      const first = slots[slot === 0 ? 0 : 1]
      const second = slots[slot === 0 ? 2 : 3]
      if (numTeams === 4) {
        seeds[0] = a1
        seeds[3] = b2
        seeds[1] = b1
        seeds[2] = a2
      } else if (first && second) {
        seeds[first[0]] = a1
        seeds[first[1]] = b2
        seeds[second[0]] = b1
        seeds[second[1]] = a2
      }
      slot++
    }
    return { seeds, qualified }
  }

  return { seeds: top.flat().slice(0, numTeams), qualified }
}
