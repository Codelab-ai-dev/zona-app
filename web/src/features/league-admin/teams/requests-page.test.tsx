import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { RequestsPage } from './requests-page'

// Mock useAuth to provide profile with league_id
vi.mock('@/lib/auth/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth/auth-context')
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      status: 'authenticated',
      profile: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'league_admin',
        league_id: 'league-1',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
  }
})

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays page title', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<RequestsPage />)

    expect(screen.getByText('Solicitudes de Registros')).toBeInTheDocument()
    expect(screen.getByText('Aprueba o rechaza solicitudes de jugadores')).toBeInTheDocument()
  })

  it('shows empty state when no tournaments', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<RequestsPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay información para mostrar')).toBeInTheDocument()
    })
  })
})
