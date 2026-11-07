import type { CardType, GoalType, MatchWithRelations, PostMatchResultRequest } from '../types'

export type Side = 'home' | 'away'

export interface FormGoal {
  id: string
  side: Side
  player_id: string
  minute: number
  goal_type: GoalType
}

export interface FormCard {
  id: string
  side: Side
  player_id: string
  minute: number
  card_type: CardType
}

export interface ResultFormState {
  homeScore: number
  awayScore: number
  goals: FormGoal[]
  cards: FormCard[]
  observations: string
}

/** True when every goal/card has a player picked. */
export function hasUnpickedPlayer(form: ResultFormState): boolean {
  return [...form.goals, ...form.cards].some((e) => !e.player_id)
}

/**
 * Builds the exact PostMatchResultRequest the Go API expects: team_id derived
 * from the roster the player was picked from, events in ascending minute order
 * (the API rejects unordered lists).
 */
export function buildResultRequest(match: MatchWithRelations, form: ResultFormState): PostMatchResultRequest {
  const teamOf = (side: Side) => (side === 'home' ? match.home_team_id : match.away_team_id)
  const byMinute = <T extends { minute: number }>(a: T, b: T) => a.minute - b.minute
  const observations = form.observations.trim()

  const data: PostMatchResultRequest = {
    home_score: form.homeScore,
    away_score: form.awayScore,
    goals: [...form.goals].sort(byMinute).map((g) => ({
      player_id: g.player_id,
      team_id: teamOf(g.side),
      minute: g.minute,
      goal_type: g.goal_type,
    })),
    cards: [...form.cards].sort(byMinute).map((c) => ({
      player_id: c.player_id,
      team_id: teamOf(c.side),
      card_type: c.card_type,
      minute: c.minute,
    })),
  }
  if (observations) data.observations = observations
  return data
}
