import { describe, expect, it } from 'vitest'

import { groupTeams, planAutoDistribute } from './groups-logic'
import { team } from './test-fixtures'

describe('planAutoDistribute', () => {
  it('balances unassigned teams across the first N groups, in list order', () => {
    const teams = ['t1', 't2', 't3', 't4', 't5'].map((id) => team(id, id))
    expect(planAutoDistribute(teams, 2)).toEqual([
      { teamId: 't1', group: 'A' },
      { teamId: 't2', group: 'B' },
      { teamId: 't3', group: 'A' },
      { teamId: 't4', group: 'B' },
      { teamId: 't5', group: 'A' },
    ])
  })

  it('counts teams that already have a group and never moves them', () => {
    const teams = [team('t1', 't1', { group_name: 'A' }), team('t2', 't2', { group_name: 'A' }), team('t3', 't3'), team('t4', 't4')]
    expect(planAutoDistribute(teams, 2)).toEqual([
      { teamId: 't3', group: 'B' },
      { teamId: 't4', group: 'B' },
    ])
  })

  it('is deterministic and clamps the group count to 1..26', () => {
    const teams = [team('t1', 't1'), team('t2', 't2')]
    expect(planAutoDistribute(teams, 2)).toEqual(planAutoDistribute(teams, 2))
    expect(planAutoDistribute(teams, 0).map((a) => a.group)).toEqual(['A', 'A'])
    expect(planAutoDistribute(teams, 99).map((a) => a.group)).toEqual(['A', 'B'])
  })
})

describe('groupTeams', () => {
  it('returns only non-empty groups in letter order', () => {
    const grouped = groupTeams([team('t1', 't1', { group_name: 'C' }), team('t2', 't2', { group_name: 'A' })])
    expect(grouped.map(([letter, list]) => [letter, list.length])).toEqual([['A', 1], ['C', 1]])
  })
})
