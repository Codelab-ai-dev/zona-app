import type { Team } from './types'

export const GROUP_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

export interface Assignment {
  teamId: string
  group: string
}

/** First `count` group letters (A, B, C…), clamped to 1..26. */
export const lettersFor = (count: number) => GROUP_LETTERS.slice(0, Math.min(Math.max(count, 1), 26))

/**
 * Random even distribution like the original: every team is shuffled and
 * dealt round-robin across the groups. `random` is injectable for tests.
 */
export function planAutoDistribute(teams: Team[], groupCount: number, random: () => number = Math.random): Assignment[] {
  const letters = lettersFor(groupCount)
  const shuffled = [...teams]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j] as Team, shuffled[i] as Team]
  }
  return shuffled.map((team, index) => ({ teamId: team.id, group: letters[index % letters.length] as string }))
}

/** Teams whose group is missing or outside the tournament's groups. */
export function unassignedTeams(teams: Team[], groupCount: number): Team[] {
  const letters = lettersFor(groupCount)
  return teams.filter((t) => !t.group_name || !letters.includes(t.group_name))
}

/** Every group of the tournament (empty ones included), in letter order. */
export function groupTeams(teams: Team[], groupCount: number): Array<[string, Team[]]> {
  return lettersFor(groupCount).map((letter): [string, Team[]] => [letter, teams.filter((t) => t.group_name === letter)])
}
