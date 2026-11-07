import type { League, User } from './types'

export const emptyPage = { data: [], page: { limit: 100, offset: 0, total: 0 } }

export function pageOf<T>(data: T[]) {
  return { data, page: { limit: 100, offset: 0, total: data.length } }
}

export const league: League = {
  id: 'league1',
  name: 'Liga Premier',
  slug: 'liga-premier',
  description: 'Liga premier mexicana',
  admin_id: 'admin1',
  is_active: true,
  product_mode: 'full',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const inactiveLeague: League = { ...league, id: 'league2', name: 'Liga Ascenso', slug: 'liga-ascenso', description: 'Segunda división', is_active: false }

export const juan: User = {
  id: 'user1',
  name: 'Juan Pérez',
  email: 'juan@example.com',
  phone: '+52 555 1234567',
  role: 'league_admin',
  league_id: 'league1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

export const maria: User = {
  id: 'user2',
  name: 'María García',
  email: 'maria@example.com',
  phone: '+52 555 7654321',
  role: 'team_owner',
  league_id: 'league2',
  is_active: true,
  created_at: '2024-01-02T00:00:00Z',
}

export function errorBody(code: string, message: string, fields?: Record<string, string>) {
  return { error: { code, message, ...(fields ? { fields } : {}) } }
}
