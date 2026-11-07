import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { TeamsListPage } from './teams-list-page'

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

describe('TeamsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders teams list when data is available', async () => {
    mockApi({
      'GET /teams': {
        body: {
          data: [
            {
              id: '1',
              name: 'Los Campeones',
              slug: 'los-campeones',
              league_id: 'league-1',
              owner_id: 'owner-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })

    renderWithProviders(<TeamsListPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })
    expect(screen.getByText('Equipos')).toBeInTheDocument()
  })

  it('renders empty state when no teams exist', async () => {
    mockApi({
      'GET /teams': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<TeamsListPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay información para mostrar')).toBeInTheDocument()
    })
  })

  it('shows error state on API error', async () => {
    mockApi({
      'GET /teams': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error del servidor' } },
      },
    })

    renderWithProviders(<TeamsListPage />)

    await waitFor(() => {
      expect(screen.getByText('Error del servidor')).toBeInTheDocument()
    })
  })

  it('has button to create team', () => {
    mockApi({
      'GET /teams': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<TeamsListPage />)

    expect(screen.getByText('Crear equipo')).toBeInTheDocument()
  })
})
