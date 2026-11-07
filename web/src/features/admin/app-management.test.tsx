import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, mockApi } from '@/test/render'
import { AppManagement } from './components/app-management'

const mockLeague = {
  id: '1',
  name: 'Liga Premier',
  slug: 'liga-premier',
  description: 'Liga premier mexicana',
  admin_id: 'admin1',
  is_active: true,
  product_mode: 'full' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('AppManagement', () => {
  it('renders loading state initially', () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
    })
    renderWithProviders(<AppManagement />)
    expect(screen.getByText('Cargando ligas…')).toBeInTheDocument()
  })

  it('renders with league title', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [mockLeague],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })
    renderWithProviders(<AppManagement />)

    await waitFor(() => {
      expect(screen.getByText('Gestión de Aplicación Móvil')).toBeInTheDocument()
    })
  })

  it('renders empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: { data: [], page: { limit: 100, offset: 0, total: 0 } },
      },
    })
    renderWithProviders(<AppManagement />)

    await waitFor(() => {
      expect(screen.getByText('No hay información para mostrar')).toBeInTheDocument()
    })
  })
})
