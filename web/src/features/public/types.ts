/** Mirrors backend/internal/* JSON contract for public portal views. */

export interface Standing {
  team_id: string
  team_name?: string
  team_logo?: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export interface TopScorer {
  player_id: string
  player_name: string
  player_number?: number
  team_id: string
  team_name?: string
  goals: number
  assists: number
  matches_played: number
}

export interface Discipline {
  player_id: string
  player_name: string
  player_number?: number
  team_id: string
  team_name?: string
  yellow_cards: number
  red_cards: number
  matches_played: number
}

export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_team?: Team
  away_team?: Team
  home_score: number
  away_score: number
  match_date: string
  match_time?: string
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
  round?: number
  field_number?: number
  phase: 'regular' | 'playoffs'
  playoff_round?: string
  playoff_position?: number
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
  owner_id: string
  logo?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  name: string
  position?: string
  jersey_number?: number
  photo?: string
  birth_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CoachingStaff {
  id: string
  name: string
  position?: string
  photo?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamStats {
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}
