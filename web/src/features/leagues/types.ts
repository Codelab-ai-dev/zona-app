/** Mirrors backend/internal/leagues League and Tournament JSON. */

export type ProductMode = 'full' | 'web_only'

export interface League {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  admin_id: string
  is_active: boolean
  product_mode: ProductMode
  features?: Record<string, boolean>
  created_at: string
  updated_at: string
}

export type TournamentFormat = 'round_robin' | 'groups' | 'knockout' | string

export interface Tournament {
  id: string
  name: string
  league_id: string
  /** YYYY-MM-DD */
  start_date: string
  /** YYYY-MM-DD */
  end_date: string
  is_active: boolean
  registration_open: boolean
  tournament_format: TournamentFormat
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
