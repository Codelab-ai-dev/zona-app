import { describe, expect, it } from 'vitest'

import { analyzeCalendar, buildMissingMatches, packRounds } from './calendar-analysis'
import { match1, match2, match3 } from './test-fixtures'

const team = (n: number, active = true) => ({ id: `team-${n}`, name: `Equipo ${n}`, tournament_id: 'tour-1', is_active: active })

describe('analyzeCalendar', () => {
  it('finds missing single-round pairings among active teams', () => {
    const a = analyzeCalendar([1, 2, 3, 4].map((n) => team(n)), [match1, match2, match3])
    expect(a.missingPairs.map((p) => `${p.homeId}-${p.awayId}`)).toEqual(['team-1-team-3', 'team-1-team-4', 'team-2-team-4'])
    expect(a.doubleRound).toBe(false)
    expect(a.lastRound).toBe(2)
    expect(a.config).toEqual({ weekdays: [6], startTime: '15:00', fields: 2 })
  })

  it('expects both legs when the calendar is a double round, reversing the venues', () => {
    const reverse = { ...match1, id: 'rev', home_team_id: 'team-2', away_team_id: 'team-1' }
    const a = analyzeCalendar([team(1), team(2), team(3)], [match1, reverse])
    expect(a.missingPairs.map((p) => `${p.homeId}-${p.awayId}`)).toEqual([
      'team-1-team-3',
      'team-3-team-1',
      'team-2-team-3',
      'team-3-team-2',
    ])
  })

  it('reports active teams without matches and inactive teams that still have them', () => {
    const a = analyzeCalendar([team(1), team(2, false), team(5)], [match1])
    expect(a.withoutMatches.map((t) => t.id)).toEqual(['team-5'])
    expect(a.inactiveWithMatches.map((s) => s.teamId)).toEqual(['team-2'])
  })

  it('has no pairings to add when there is no calendar yet', () => {
    const a = analyzeCalendar([team(1), team(2)], [])
    expect(a.hasCalendar).toBe(false)
    expect(a.missingPairs).toEqual([])
  })
})

describe('packRounds / buildMissingMatches', () => {
  it('never plays a team twice in the same round', () => {
    const p = (h: string, a: string) => ({ homeId: h, awayId: a, homeName: h, awayName: a })
    expect(packRounds([p('a', 'b'), p('a', 'c'), p('c', 'd'), p('b', 'd')]).map((r) => r.map((x) => x.homeId + x.awayId))).toEqual([
      ['ab', 'cd'],
      ['ac', 'bd'],
    ])
  })

  it('starts after the last match date on a detected weekday and spreads over fields', () => {
    const a = analyzeCalendar([1, 2, 3, 4].map((n) => team(n)), [match1, match2, match3])
    const built = buildMissingMatches(a, [match1, match2, match3])
    expect(built.map((m) => [m.round, m.match_date, m.field_number])).toEqual([
      [3, '2024-06-29T15:00:00Z', 1],
      [3, '2024-06-29T15:00:00Z', 2],
      [4, '2024-07-06T15:00:00Z', 1],
    ])
  })
})
