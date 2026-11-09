import type { CardType, GoalType, MatchWithRelations, PostMatchResultRequest } from '../types'

export type Side = 'home' | 'away'

export interface FormGoal {
  id: string
  side: Side
  player_id: string
  minute: number
  goal_type: GoalType
  /** '' = no assist. */
  assist_player_id: string
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
 * Teams whose registered goals exceed their score (the original blocked saving).
 * An own goal is credited to the other team.
 */
export function goalsExceedingScore(form: ResultFormState): Side[] {
  const credited = (side: Side) =>
    form.goals.filter((g) => (g.goal_type === 'own_goal' ? g.side !== side : g.side === side)).length
  const score = (side: Side) => (side === 'home' ? form.homeScore : form.awayScore)
  // A negative score is the API's 422 to report, not this check's.
  return (['home', 'away'] as const).filter((side) => score(side) >= 0 && credited(side) > score(side))
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
      ...(g.assist_player_id ? { assist_player_id: g.assist_player_id } : {}),
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

export const EMPTY_FORM: ResultFormState = { homeScore: 0, awayScore: 0, goals: [], cards: [], observations: '' }

/** Prefills the form from a stored result (goals/cards come with GET /matches/{id}). */
export function formFromMatch(match: MatchWithRelations, observations = ''): ResultFormState {
  const sideOf = (teamId: string): Side => (teamId === match.home_team_id ? 'home' : 'away')
  return {
    homeScore: match.home_score,
    awayScore: match.away_score,
    observations,
    goals: (match.goals ?? []).map((g) => ({
      id: g.id,
      side: sideOf(g.team_id),
      player_id: g.player_id,
      minute: g.minute,
      goal_type: g.goal_type,
      assist_player_id: g.assist_player_id ?? '',
    })),
    cards: (match.cards ?? []).map((c) => ({
      id: c.id,
      side: sideOf(c.team_id),
      player_id: c.player_id,
      minute: c.minute,
      card_type: c.card_type,
    })),
  }
}
