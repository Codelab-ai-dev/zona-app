/** Mirrors backend/internal/leagues, stats, finance, directory and notifications. */

export interface Tournament {
  id: string
  name: string
  league_id: string
  start_date: string
  end_date: string
  is_active: boolean
  max_players?: number
  registration_open: boolean
  max_coaching_staff?: number
  tournament_format: 'league' | 'knockout' | 'group_knockout'
  number_of_groups?: number
  teams_advancing_per_group?: number
  rounds_per_season: number
  has_third_place_match: boolean
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
  suspension_type: 'red_card' | 'yellow_accumulation' | 'disciplinary_committee' | 'other'
  reason: string
  matches_to_serve: number
  matches_served: number
  status: 'active' | 'completed' | 'cancelled'
  notes?: string
  start_date: string
  end_date?: string
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface WhatsAppLink {
  id: string
  phone_number: string
  user_id?: string
  league_id: string
  tournament_id?: string
  role: string
  is_active: boolean
  linked_at: string
  last_interaction_at?: string
  display_name?: string
  preferred_language: string
  created_at: string
  updated_at: string
}

export interface FinanceConfig {
  id: string
  league_id: string
  tournament_id?: string
  name: string
  team_registration_fee: string
  player_registration_fee: string
  late_registration_surcharge: string
  yellow_card_fine: string
  red_card_fine: string
  double_yellow_fine: string
  absence_fine: string
  late_arrival_fine: string
  misconduct_fine: string
  uniform_violation_fine: string
  referee_fee_per_match: string
  assistant_referee_fee: string
  field_rental_per_match: string
  currency: string
  payment_due_days: number
  auto_generate_fines: boolean
  auto_generate_referee_fees: boolean
  notify_on_new_charge: boolean
  notify_on_overdue: boolean
  overdue_grace_days: number
  payment_instructions?: string
  bank_account_info?: string
  is_active: boolean
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  league_id: string
  tournament_id?: string
  team_id?: string
  player_id?: string
  match_id?: string
  transaction_type: string
  description: string
  notes?: string
  amount: string
  amount_paid: string
  is_income: boolean
  transaction_date: string
  due_date?: string
  paid_at?: string
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'waived'
  payment_method?: string
  payment_reference?: string
  receipt_number?: string
  external_payment_id?: string
  external_payment_status?: string
  auto_generated: boolean
  source_stat_id?: string
  parent_transaction_id?: string
  created_by?: string
  updated_by?: string
  cancelled_by?: string
  cancelled_at?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
}

export interface TeamBalance {
  team_id: string
  team_name: string
  team_slug: string
  team_logo?: string
  league_id: string
  league_name: string
  tournament_id?: string
  total_charges: string
  total_paid: string
  balance: string
  pending_balance: string
  overdue_count: number
  pending_fines_count: number
  last_transaction_at?: string
}

export interface LeagueSummary {
  league_id: string
  league_name: string
  league_slug: string
  total_income: string
  total_charges: string
  total_collected: string
  total_pending: string
  total_overdue: string
  teams_with_transactions: number
  total_transactions: number
  overdue_transactions: number
  total_card_fines: number
  first_transaction_date?: string
  last_transaction_date?: string
}

export interface League {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  admin_id: string
  is_active: boolean
  product_mode: 'full' | 'web_only'
  features?: Record<string, boolean>
  created_at: string
  updated_at: string
}
