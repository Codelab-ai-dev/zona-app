import type { CoachingStaff, MyTeam, Player, Team, TeamStats } from './types'

export const TEAM_ID = 'team-123'
export const TOURNAMENT_ID = 'tournament-1'

export const serverError = {
  status: 500,
  body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
}

export function listBody<T>(data: T[]) {
  return { body: { data, page: { limit: 100, offset: 0 } } }
}

export const team: Team = {
  id: TEAM_ID,
  name: 'Águilas FC',
  slug: 'aguilas-fc',
  league_id: 'league-1',
  tournament_id: TOURNAMENT_ID,
  owner_id: 'owner-1',
  is_active: true,
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-02-01T12:00:00Z',
}

export const myTeam = (id: string, name: string): MyTeam => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  league_id: 'league-1',
  is_active: true,
})

export const player: Player = {
  id: 'player-1',
  name: 'Juan Pérez',
  team_id: TEAM_ID,
  position: 'Delantero',
  jersey_number: 10,
  birth_date: '2000-05-15T00:00:00Z',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  id_verified: true,
}

export const staffMember: CoachingStaff = {
  id: 'staff-1',
  team_id: TEAM_ID,
  name: 'Carlos García',
  role: 'Entrenador Principal',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const teamStats: TeamStats = {
  id: 'stat-1',
  team_id: TEAM_ID,
  tournament_id: TOURNAMENT_ID,
  league_id: 'league-1',
  matches_played: 10,
  matches_won: 7,
  matches_drawn: 2,
  matches_lost: 1,
  goals_for: 25,
  goals_against: 8,
  goal_difference: 17,
  points: 23,
  clean_sheets: 4,
  yellow_cards: 12,
  red_cards: 1,
  points_adjustment: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
