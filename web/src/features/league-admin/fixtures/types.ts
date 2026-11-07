/** Mirrors backend/internal/matches for fixtures & playoffs */

export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  match_date: string
  match_time?: string
  status: MatchStatus
  round?: number
  field_number?: number
  phase: Phase
  playoff_round?: PlayoffRound
  playoff_position?: number
  leg?: Leg
  bye_team_id?: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
export type Phase = 'regular' | 'playoffs'
export type PlayoffRound = 'quarterfinals' | 'semifinals' | 'final' | 'third_place'
export type Leg = 'first' | 'second'

export interface Team {
  id: string
  name: string
  slug: string
  logo?: string
}

export interface DuplicateMatch {
  id: string
  round?: number
  date: string
  home_team: string
  away_team: string
}

export interface DuplicateMatchGroup {
  pair: string
  matches: DuplicateMatch[]
}

export interface GenerateFixturesRequest {
  tournament_id: string
  teams: Array<{ id: string; name: string }>
  is_double_round?: boolean
}

export interface GenerateFixturesResponse {
  matches: Match[]
  rounds: number
}

export interface GeneratePlayoffsRequest {
  tournament_id: string
  num_teams: 4 | 8
  start_date: string
  start_time: string
  field_number: number
  third_place_match: boolean
  home_and_away: boolean
}

export interface Tournament {
  id: string
  name: string
  league_id: string
  is_active: boolean
}
