/** Shared API fixtures for the competition tests (shapes mirror the Go JSON). */
import type { League, Standings, Suspension, Tournament, Transaction, WhatsAppLink } from './types'

export const page = (total: number) => ({ limit: 100, offset: 0, total })
export const list = <T,>(data: T[]) => ({ body: { data, page: page(data.length) } })

export const league = (over: Partial<League> = {}): League => ({
  id: 'league-1',
  name: 'Liga Norte',
  slug: 'liga-norte',
  description: 'Liga de prueba',
  admin_id: 'admin-1',
  is_active: true,
  product_mode: 'full',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

export const mineOne = { 'GET /leagues/mine': list([league()]) }

export const tournament = (over: Partial<Tournament> = {}): Tournament => ({
  id: 'tour-1',
  name: 'Apertura 2026',
  league_id: 'league-1',
  start_date: '2026-02-01',
  end_date: '2026-06-30',
  is_active: true,
  registration_open: true,
  tournament_format: 'league',
  rounds_per_season: 2,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

export const standing = (over: Partial<Standings> = {}): Standings => ({
  position: 1,
  team_id: 'team-1',
  team_name: 'Tigres',
  matches_played: 5,
  matches_won: 4,
  matches_drawn: 0,
  matches_lost: 1,
  goals_for: 10,
  goals_against: 4,
  goal_difference: 6,
  points: 12,
  points_adjustment: 0,
  ...over,
})

export const suspension = (over: Partial<Suspension> = {}): Suspension => ({
  id: 'susp-1',
  player_id: 'player-1',
  team_id: 'team-1',
  league_id: 'league-1',
  suspension_type: 'red_card',
  reason: 'Agresión',
  matches_to_serve: 3,
  matches_served: 1,
  status: 'active',
  notes: 'Revisar video',
  start_date: '2026-03-01',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...over,
})

export const transaction = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  league_id: 'league-1',
  team_id: 'team-1',
  transaction_type: 'team_registration',
  description: 'Inscripción Tigres',
  amount: '1500.50',
  amount_paid: '500.00',
  is_income: false,
  transaction_date: '2026-03-01T00:00:00Z',
  status: 'partial',
  auto_generated: false,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...over,
})

export const whatsappLink = (over: Partial<WhatsAppLink> = {}): WhatsAppLink => ({
  id: 'wa-1',
  phone_number: '5215512345678',
  league_id: 'league-1',
  role: 'team_owner',
  is_active: true,
  linked_at: '2026-03-01T00:00:00Z',
  display_name: 'TESORERIA',
  preferred_language: 'es',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...over,
})

export const apiError = (status: number, code: string, message: string, fields?: Record<string, string>) => ({
  status,
  body: { error: { code, message, ...(fields ? { fields } : {}) } },
})

export const summary = {
  league_id: 'league-1',
  league_name: 'Liga Norte',
  league_slug: 'liga-norte',
  total_income: '2500.00',
  total_charges: '3000.00',
  total_collected: '1800.50',
  total_pending: '700.25',
  total_overdue: '100.00',
  teams_with_transactions: 3,
  total_transactions: 12,
  overdue_transactions: 2,
  total_card_fines: 1,
}
