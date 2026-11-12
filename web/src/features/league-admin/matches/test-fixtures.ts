import type { MatchWithRelations, Team } from './types'

export const teamA: Team = { id: 'team-1', name: 'Tigres FC', slug: 'tigres-fc' }
export const teamB: Team = { id: 'team-2', name: 'Leones United', slug: 'leones-united' }
export const teamC: Team = { id: 'team-3', name: 'Águilas SC', slug: 'aguilas-sc' }
export const teamD: Team = { id: 'team-4', name: 'Pumas CD', slug: 'pumas-cd' }

export const tournament = {
  id: 'tour-1',
  name: 'Torneo Apertura',
  league_id: 'league-1',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  is_active: true,
  registration_open: true,
  tournament_format: 'round_robin',
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

/** A scheduled match between teamA (home) and teamB (away). */
export const match1: MatchWithRelations = {
  id: 'match-1',
  tournament_id: 'tour-1',
  home_team_id: teamA.id,
  away_team_id: teamB.id,
  home_score: 0,
  away_score: 0,
  match_date: '2024-06-15T15:00:00Z',
  match_time: '15:00',
  status: 'scheduled',
  round: 1,
  field_number: 1,
  phase: 'regular',
  is_published: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  home_team_name: teamA.name,
  away_team_name: teamB.name,
}

export const match2: MatchWithRelations = {
  ...match1,
  id: 'match-2',
  home_team_id: teamC.id,
  away_team_id: teamD.id,
  home_team_name: teamC.name,
  away_team_name: teamD.name,
  match_date: '2024-06-15T17:00:00Z',
  match_time: '17:00',
  field_number: 2,
}

/** Round 2, already published. */
export const match3: MatchWithRelations = {
  ...match1,
  id: 'match-3',
  home_team_id: teamB.id,
  away_team_id: teamC.id,
  home_team_name: teamB.name,
  away_team_name: teamC.name,
  match_date: '2024-06-22T15:00:00Z',
  round: 2,
  is_published: true,
}

export const page = (data: unknown[], limit = 100) => ({ body: { data, page: { limit, offset: 0 } } })

export const validationError = (fields: Record<string, string>) => ({
  status: 422,
  body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields } },
})
