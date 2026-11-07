import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, mockApi } from '@/test/render'
import { SystemStats } from './components/system-stats'

describe('SystemStats', () => {
  it('renders loading state initially', () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 1, offset: 0, total: 0 } } },
      'GET /users': { status: 200, body: { data: [], page: { limit: 1, offset: 0, total: 0 } } },
    })
    renderWithProviders(<SystemStats />)
    expect(screen.getByText('Cargando estadísticas…')).toBeInTheDocument()
  })

  it('renders stats with data', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [
            { id: '1', name: 'Liga A', is_active: true, product_mode: 'full', admin_id: 'admin1', slug: 'liga-a', description: '', created_at: '', updated_at: '' },
            { id: '2', name: 'Liga B', is_active: false, product_mode: 'web_only', admin_id: 'admin2', slug: 'liga-b', description: '', created_at: '', updated_at: '' },
          ],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
      'GET /users': {
        status: 200,
        body: {
          data: [
            { id: 'admin1', name: 'Admin 1', email: 'admin1@test.com', role: 'league_admin', is_active: true, created_at: '' },
            { id: 'admin2', name: 'Admin 2', email: 'admin2@test.com', role: 'league_admin', is_active: true, created_at: '' },
          ],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
    })

    renderWithProviders(<SystemStats />)

    await waitFor(() => {
      expect(screen.getByText('Estadísticas del Sistema')).toBeInTheDocument()
    })

    expect(screen.getByText('Ligas')).toBeInTheDocument()
    expect(screen.getByText('Estadísticas del Sistema')).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
  })

  it('renders empty state on error', async () => {
    mockApi({
      'GET /leagues/admin': { status: 500, body: { error: { message: 'Internal server error' } } },
      'GET /users': { status: 200, body: { data: [], page: { limit: 1, offset: 0, total: 0 } } },
    })

    renderWithProviders(<SystemStats />)

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las estadísticas')).toBeInTheDocument()
    })
  })
})
