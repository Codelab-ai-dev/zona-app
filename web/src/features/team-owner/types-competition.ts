/** Match, standings, stats and finance shapes (backend/internal/{matches,stats,finance}). */

/** Slim team embedded in matches. */
export interface MatchTeam {
  id: string
  name: string
  slug: string
  logo?: string
}

export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  match_date: string
  match_time?: string
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
  round?: number
  field_number?: number
  phase: 'regular' | 'playoffs'
  playoff_round?: 'quarterfinals' | 'semifinals' | 'final' | 'third_place'
  playoff_position?: number
  leg?: 'first' | 'second'
  bye_team_id?: string
  is_published: boolean
  created_at: string
  updated_at: string
  home_team?: MatchTeam
  away_team?: MatchTeam
  /** Only GET /matches/{id} embeds the events. */
  goals?: MatchGoal[]
  cards?: MatchCard[]
  incidents?: MatchIncident[]
}

export interface MatchGoal {
  id: string
  player_id: string
  team_id: string
  minute: number
  goal_type: string
  assist_player_id?: string
  description?: string
  player_name?: string
  player_jersey?: number
  assist_player_name?: string
}

export interface MatchCard {
  id: string
  player_id: string
  team_id: string
  card_type: 'yellow' | 'red'
  minute: number
  reason?: string
  player_name?: string
  player_jersey?: number
}

export interface MatchIncident {
  id: string
  incident_type: string
  description: string
  minute?: number
  player_id?: string
  team_id?: string
  player_name?: string
}

/** GET /teams/{id}/player-stats row. */
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

export interface Standings {
  position: number
  team_id: string
  team_name: string
  team_logo?: string
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
  recent_form?: string
  last_match_date?: string
}

export interface TeamStats {
  id: string
  team_id: string
  tournament_id: string
  league_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  clean_sheets: number
  yellow_cards: number
  red_cards: number
  points_adjustment: number
  adjustment_reason?: string
  recent_form?: string
  last_match_date?: string
  created_at: string
  updated_at: string
}

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

export interface Suspension {
  id: string
  player_id: string
  team_id: string
  league_id: string
  tournament_id?: string
  suspension_type: string
  reason: string
  matches_to_serve: number
  matches_served: number
  status: string
  notes?: string
  start_date: string
  end_date?: string
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface Finance {
  team_id: string
  league_id: string
  balance: number
  currency: string
}

export interface FinanceTransaction {
  id: string
  league_id: string
  team_id: string
  amount: number
  currency: string
  type: string
  reason: string
  status: string
  created_at: string
  updated_at: string
}
