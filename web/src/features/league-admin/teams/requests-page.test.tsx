import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { RequestsPage } from './requests-page'

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays page title', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
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

  it('shows empty state when admin has no leagues', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<RequestsPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay ligas')).toBeInTheDocument()
    })
  })

  it('shows empty state when no tournaments', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
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

  it('shows requests when tournament is selected', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [
            {
              id: 'tournament-1',
              name: 'Torneo Principal',
              league_id: 'league-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /tournaments/tournament-1/player-registration-requests': {
        body: {
          data: [
            {
              id: 'request-1',
              team_id: 'team-1',
              tournament_id: 'tournament-1',
              player_name: 'Juan Pérez',
              player_position: 'Portero',
              jersey_number: 1,
              status: 'pending',
              requested_by: 'owner-1',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })

    renderWithProviders(<RequestsPage />)

    // Select tournament
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Selecciona un torneo')).toBeInTheDocument()
    })

    const tournamentSelect = screen.getByPlaceholderText('Selecciona un torneo')
    fireEvent.click(tournamentSelect)

    await waitFor(() => {
      const option = screen.getByText('Torneo Principal')
      fireEvent.click(option)
    })

    // Check that request is shown
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
  })
})
