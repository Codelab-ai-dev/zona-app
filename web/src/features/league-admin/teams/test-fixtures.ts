import type { Team } from './types'

const stamp = { created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }

export const league = { id: 'league-1', name: 'Liga Mayor', slug: 'liga-mayor', admin_id: 'admin-1', is_active: true, product_mode: 'full', ...stamp }

export const page = (data: unknown[]) => ({ body: { data, page: { limit: 100, offset: 0, total: data.length } } })

export const leaguesMine = page([league])

export function team(id: string, name: string, extra: Partial<Team> = {}): Team {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    league_id: 'league-1',
    owner_id: `owner-${id}`,
    is_active: true,
    ...stamp,
    ...extra,
  }
}
