import { describe, expect, it } from 'vitest'

import { firstRoundPairs, qualifiedFromGroups } from './playoff-seeding'

const t = (id: string, group: string) => ({ id, name: id, group_name: group })
const standings = (ids: string[]) =>
  ids.map((id, i) => ({ position: i + 1, team_id: id, team_name: id, points: 0, goal_difference: 0, goals_for: 0 }))

describe('qualifiedFromGroups', () => {
  const teams = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'D1', 'D2'].map((id) => t(id, id[0] as string))

  it('crosses group winners and runners-up for 8 teams: A1-B2, C1-D2, B1-A2, D1-C2', () => {
    // Table order mixes the groups; position decides inside each group.
    const table = standings(['D1', 'A1', 'B1', 'C1', 'A2', 'B2', 'D2', 'C2', 'A3', 'B3'])
    const { seeds, qualified } = qualifiedFromGroups(teams, table, 2, 8)
    expect(qualified).toBe(8)
    const pairs = firstRoundPairs(8).map(([h, a]) => `${seeds[h]}-${seeds[a]}`)
    expect(pairs).toEqual(['A1-B2', 'C1-D2', 'B1-A2', 'D1-C2'])
  })

  it('crosses two groups for 4 teams', () => {
    const two = teams.filter((x) => 'AB'.includes(x.group_name as string))
    const { seeds } = qualifiedFromGroups(two, standings(['A1', 'B1', 'A2', 'B2', 'A3', 'B3']), 2, 4)
    expect(firstRoundPairs(4).map(([h, a]) => `${seeds[h]}-${seeds[a]}`)).toEqual(['A1-B2', 'B1-A2'])
  })

  it('lists group by group like the original when the shape is not 2 per group', () => {
    const { seeds } = qualifiedFromGroups(teams, standings(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'D1', 'D2']), 1, 4)
    expect(seeds).toEqual(['A1', 'B1', 'C1', 'D1'])
  })

  it('ignores teams without group', () => {
    const { qualified } = qualifiedFromGroups([{ id: 'x', name: 'x' }], [], 2, 4)
    expect(qualified).toBe(0)
  })
})
