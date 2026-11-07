import type { Team } from './types'

export const GROUP_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

export interface Assignment {
  teamId: string
  group: string
}

/**
 * Deterministic balanced distribution: teams without group, in list order,
 * each go to the group (among the first `groupCount` letters) that currently
 * has the fewest teams; ties resolve to the earliest letter.
 */
export function planAutoDistribute(teams: Team[], groupCount: number): Assignment[] {
  const letters = GROUP_LETTERS.slice(0, Math.min(Math.max(groupCount, 1), 26))
  const sizes = new Map(letters.map((letter) => [letter, 0]))
  for (const team of teams) {
    if (team.group_name && sizes.has(team.group_name)) sizes.set(team.group_name, (sizes.get(team.group_name) ?? 0) + 1)
  }
  return teams
    .filter((team) => !team.group_name)
    .map((team) => {
      let best = letters[0] ?? 'A'
      for (const letter of letters) if ((sizes.get(letter) ?? 0) < (sizes.get(best) ?? 0)) best = letter
      sizes.set(best, (sizes.get(best) ?? 0) + 1)
      return { teamId: team.id, group: best }
    })
}

export function groupTeams(teams: Team[]): Array<[string, Team[]]> {
  return GROUP_LETTERS.map((letter): [string, Team[]] => [letter, teams.filter((t) => t.group_name === letter)]).filter(
    ([, list]) => list.length > 0,
  )
}
