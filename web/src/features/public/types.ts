/** Mirrors backend/internal/* JSON contract for public portal views. */

export interface Standing {
  team_id: string
  team_name: string
  team_logo?: string
  position: number
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  /** Points earned on the pitch; the API already ranks by points + points_adjustment. */
  points: number
  points_adjustment: number
  adjustment_reason?: string
  recent_form?: string
  last_match_date?: string
}

/** Row of /tournaments/{id}/top-scorers and /discipline (stats.PlayerStats). */
export interface PlayerStats {
  id: string
  player_id: string
  player_name: string
  jersey_number: number
  position?: string
  photo?: string
  team_id: string
  team_name: string
  matches_played: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
}

export type TopScorer = PlayerStats
export type Discipline = PlayerStats

/** Public matches carry only team ids: names come from standings / teams. */
export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  /** RFC 3339 timestamp of a calendar date (display in UTC). */
  match_date: string
  match_time?: string
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
  round?: number
  field_number?: number
  phase: 'regular' | 'playoffs'
  playoff_round?: string
  playoff_position?: number
  leg?: 'first' | 'second'
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  slug: string
  league_id: string
  tournament_id?: string
  /** Group letter (A, B…) in group_knockout tournaments. */
  group_name?: string
  owner_id: string
  logo?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/** teams.PublicPlayer: no birth_date, CURP or other PII. */
export interface Player {
  id: string
  name: string
  team_id: string
  position: string
  jersey_number: number
  photo?: string
  is_active: boolean
}

/** teams.PublicCoachingStaff: the field is `role`, not `position`. */
export interface CoachingStaff {
  id: string
  team_id: string
  name: string
  role: string
  photo?: string
  is_active: boolean
}

/** stats.TeamStats (one team_stats row). */
export interface TeamStats {
  team_id: string
  tournament_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  points_adjustment: number
  adjustment_reason?: string
}

/** GET /teams/{id}/player-stats row (stats.TeamPlayerStats). */
export interface TeamPlayerStats {
  player_id: string
  name: string
  jersey_number: number
  position: string
  photo?: string
  matches_played: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
}
