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
  /** true reactivates the member (422 when the staff limit is reached). */
  is_active?: boolean
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

export interface RefereeReport {
  id: string
  match_id: string
  referee_name?: string
  assistant_referee_1?: string
  assistant_referee_2?: string
  fourth_official?: string
  general_observations?: string
  weather_conditions?: string
  field_conditions?: string
  created_at: string
  updated_at: string
}

/** POST /storage/objects response (backend/internal/storage/service.go UploadResult). */
export interface UploadResult {
  key: string
  url?: string
  is_public: boolean
  filename?: string
}

/** GET /leagues/{id}: only the part the team owner needs. */
export interface LeagueInfo {
  id: string
  features?: { qr_codes?: boolean }
}

export * from './types-competition'
