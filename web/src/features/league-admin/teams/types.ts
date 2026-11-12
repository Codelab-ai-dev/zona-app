/** Mirrors backend/internal/teams Team and related JSON structures */

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

export interface PlayerRegistrationRequest {
  id: string
  team_id: string
  tournament_id: string
  player_name: string
  player_position: string
  jersey_number: number
  birth_date?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_by: string
  reviewed_by?: string
  review_notes?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
}

export interface CreateTeamRequest {
  name: string
  slug: string
  league_id: string
  tournament_id?: string
  logo?: string
  description?: string
}

export interface UpdateTeamRequest {
  /** Nil UUID clears the tournament. */
  tournament_id?: string
  name?: string
  /** Public URL slug (unique in the league). */
  slug?: string
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

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  phone?: string
  role: 'team_owner' | 'league_admin'
  league_id?: string
  /** team_owner only: the new user becomes this team's owner. */
  team_id?: string
}

export interface QRBatchUpdateRequest {
  players: Array<{ id: string }>
}

export interface ReviewPlayerRegistrationRequest {
  status: 'approved' | 'rejected'
  review_notes?: string
}

/** Mirrors backend/internal/teams PlayerVerification. */
export interface PlayerVerification {
  player_id: string
  id_verified: boolean
  id_verified_at?: string
  id_verified_by?: string
  id_verification_method?: string
  document_key?: string
}

export interface VerifyPlayerRequest {
  verified: boolean
  document_key?: string
}

export type VerificationStatus = 'pending' | 'verified' | 'no_document'

/** Mirrors backend/internal/teams LeaguePlayerVerification (league-wide view). */
export interface LeaguePlayerVerification {
  player_id: string
  name: string
  jersey_number: number
  position: string
  birth_date?: string
  team_id: string
  team_name: string
  status: VerificationStatus
  document_key?: string
  id_verified_at?: string
}

/** Mirrors backend/internal/teams VerificationSummary. */
export interface VerificationSummary {
  total: number
  pending: number
  verified: number
  no_document: number
}

/** Mirrors backend/internal/accounts UpdateUserRequest (the fields the owner form edits). */
export interface UpdateUserRequest {
  name?: string
  phone?: string
  email?: string
}

/** Mirrors backend/internal/accounts User (GET /admin/users/{id}). */
export interface AccountUser {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  league_id?: string
  team_id?: string
  is_active: boolean
  created_at: string
}
