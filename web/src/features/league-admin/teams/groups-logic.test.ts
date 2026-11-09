import { describe, expect, it } from 'vitest'

import { groupTeams, lettersFor, planAutoDistribute, unassignedTeams } from './groups-logic'
import { team } from './test-fixtures'

const ids = (n: number) => Array.from({ length: n }, (_, i) => team(`t${i + 1}`, `t${i + 1}`))
const identity = () => 0.999 // Fisher-Yates with j = i keeps the order

describe('planAutoDistribute', () => {
  it('deals every team round-robin across the first N groups', () => {
    expect(planAutoDistribute(ids(5), 2, identity)).toEqual([
      { teamId: 't1', group: 'A' },
      { teamId: 't2', group: 'B' },
      { teamId: 't3', group: 'A' },
      { teamId: 't4', group: 'B' },
      { teamId: 't5', group: 'A' },
    ])
  })

  it('reassigns teams that already have a group (the original redistributes all)', () => {
    const teams = [team('t1', 't1', { group_name: 'A' }), team('t2', 't2', { group_name: 'A' })]
    expect(planAutoDistribute(teams, 2, identity).map((a) => a.group)).toEqual(['A', 'B'])
  })

  it('shuffles: a different random source gives a different order, never losing a team', () => {
    const plan = planAutoDistribute(ids(6), 3, () => 0)
    expect(plan.map((a) => a.teamId).sort()).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
    expect(plan.map((a) => a.teamId)).not.toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
    expect(plan.filter((a) => a.group === 'A')).toHaveLength(2)
  })

  it('clamps the group count to 1..26', () => {
    expect(planAutoDistribute(ids(2), 0, identity).map((a) => a.group)).toEqual(['A', 'A'])
    expect(lettersFor(99)).toHaveLength(26)
  })
})

describe('groupTeams / unassignedTeams', () => {
  it('returns every group of the tournament, empty ones included', () => {
    const grouped = groupTeams([team('t1', 't1', { group_name: 'C' })], 3)
    expect(grouped.map(([letter, list]) => [letter, list.length])).toEqual([['A', 0], ['B', 0], ['C', 1]])
  })

  it('treats teams outside the tournament groups as unassigned', () => {
    const teams = [team('t1', 't1'), team('t2', 't2', { group_name: 'Z' }), team('t3', 't3', { group_name: 'A' })]
    expect(unassignedTeams(teams, 2).map((t) => t.id)).toEqual(['t1', 't2'])
  })
})
