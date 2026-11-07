/** Mirrors backend/internal/{teams,matches,stats,finance} types. */

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
  home_primary_color?: string
  home_secondary_color?: string
  home_accent_color?: string
  away_primary_color?: string
  away_secondary_color?: string
  away_accent_color?: string
  alt1_shorts_color?: string
  alt2_shorts_color?: string
  group_name?: string
}

export interface UpdateTeamRequest {
  name?: string
  logo?: string
  description?: string
  group_name?: string
  home_primary_color?: string
  home_secondary_color?: string
  home_accent_color?: string
  away_primary_color?: string
  away_secondary_color?: string
  away_accent_color?: string
  alt1_shorts_color?: string
  alt2_shorts_color?: string
}

export interface Player {
  id: string
  name: string
  team_id: string
  position: string
  jersey_number: number
  photo?: string
  birth_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
  enrollment_status?: string
  id_verified: boolean
}

export interface PublicPlayer {
  id: string
  name: string
  team_id: string
  position: string
  jersey_number: number
  photo?: string
  is_active: boolean
}

export interface CreatePlayerRequest {
  name: string
  position: string
  jersey_number: number
  photo?: string
  birth_date?: string
}

export interface UpdatePlayerRequest {
  name?: string
  position?: string
  jersey_number?: number
  photo?: string
  birth_date?: string
}

export interface CoachingStaff {
  id: string
  team_id: string
  name: string
  role: string
  photo?: string
  birth_date?: string
  cedula?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PublicCoachingStaff {
  id: string
  team_id: string
  name: string
  role: string
  photo?: string
  is_active: boolean
}

export interface CreateCoachingStaffRequest {
  name: string
  role: string
  photo?: string
  birth_date?: string
  cedula?: string
}

export interface UpdateCoachingStaffRequest {
  name?: string
  role?: string
  photo?: string
  birth_date?: string
  cedula?: string
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
  home_team?: Team
  away_team?: Team
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

export interface StorageObject {
  id: string
  bucket: string
  name: string
  owner: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
  size?: number
  mime_type?: string
}

export interface MyTeam {
  id: string
  name: string
  slug: string
  league_id: string
  logo?: string
  description?: string
  is_active: boolean
}

export interface Tournament {
  id: string
  name: string
  league_id: string
  start_date: string
  end_date: string
  is_active: boolean
  registration_open: boolean
  tournament_format: string
  rounds_per_season: number
  has_third_place_match: boolean
  max_players?: number
  max_coaching_staff?: number
  number_of_groups?: number
  teams_advancing_per_group?: number
  age_validation_enabled: boolean
  min_age?: number
  max_age?: number
  age_reference_date?: string
  age_exception_count?: number
  age_exception_min_age?: number
  age_exception_max_age?: number
  id_document_required: boolean
  created_at: string
  updated_at: string
}

export interface PlayerRegistrationRequest {
  id: string
  team_id: string
  tournament_id: string
  player_name: string
  player_position: string
  jersey_number: number
  birth_date?: string
  reason: string
  status: string
  requested_by: string
  reviewed_by?: string
  review_notes?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
}

export interface CreatePlayerRegistrationRequestRequest {
  player_name: string
  player_position: string
  jersey_number: number
  birth_date?: string
  reason: string
}

export interface ReviewPlayerRegistrationRequestRequest {
  status: 'approved' | 'rejected'
  review_notes?: string
}
