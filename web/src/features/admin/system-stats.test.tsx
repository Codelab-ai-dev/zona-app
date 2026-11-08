import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { SystemStats } from './components/system-stats'
import { emptyPage, errorBody, inactiveLeague, league, pageOf } from './test-fixtures'
import type { SystemStatsData } from './types'

const stats: SystemStatsData = {
  leagues: { total: 12, active: 9 },
  tournaments: { total: 30, active: 30 },
  teams: { total: 250, active: 240 },
  players: { total: 4100, active: 4000 },
  users: { total: 300, active: 290 },
  league_admins: 11,
  team_owners: 250,
}

const card = (title: string) => screen.getByText(title).closest('div')!.parentElement!

describe('SystemStats', () => {
  it('shows the loading state first', () => {
    mockApi({ 'GET /admin/stats': { body: stats }, 'GET /leagues/admin': { body: emptyPage } })
    renderWithProviders(<SystemStats />)
    expect(screen.getByText('Cargando estadísticas…')).toBeInTheDocument()
  })

  it('renders the server-side counts (active/total), not counts derived from a page of rows', async () => {
    const fetchMock = mockApi({
      'GET /admin/stats': { body: stats },
      'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    })
    renderWithProviders(<SystemStats />)

    expect(await screen.findByText('Estadísticas del Sistema')).toBeInTheDocument()
    for (const [title, active, total] of [
      ['Ligas', '9', '/12'],
      ['Torneos', '30', '/30'],
      ['Equipos', '240', '/250'],
      ['Jugadores', '4000', '/4100'],
    ] as const) {
      expect(within(card(title)).getByText(active)).toBeInTheDocument()
      expect(within(card(title)).getByText(total)).toBeInTheDocument()
    }
    expect(within(card('Ligas')).getByText('3 inactivos')).toBeInTheDocument()
    expect(within(card('Torneos')).getByText('Todos activos')).toBeInTheDocument()
    expect(screen.getByText('290/300')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /users')).toHaveLength(0)
  })

  it('shows the failure message when the stats request fails', async () => {
    mockApi({
      'GET /admin/stats': { status: 500, body: errorBody('internal', 'Internal server error') },
      'GET /leagues/admin': { body: emptyPage },
    })
    renderWithProviders(<SystemStats />)
    expect(await screen.findByText('No se pudieron cargar las estadísticas')).toBeInTheDocument()
  })
})
