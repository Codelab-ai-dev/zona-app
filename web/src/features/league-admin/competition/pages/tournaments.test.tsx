import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { TournamentsPage } from './tournaments'

describe('TournamentsPage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
  }

  const mockTournament = {
    id: 'tournament-1',
    name: 'Torneo 2024',
    league_id: 'league-1',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_active: true,
    registration_open: true,
    tournament_format: 'league' as const,
    rounds_per_season: 2,
    has_third_place_match: false,
    age_validation_enabled: false,
    id_document_required: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no tournaments', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText(/sin torneos/i)).toBeInTheDocument()
    })
  })

  it('renders tournaments list', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
    })
    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText('Torneo 2024')).toBeInTheDocument()
    })
  })

  it('handles tournament creation success', async () => {
    const newTournament = {
      ...mockTournament,
      id: 'tournament-2',
      name: 'Nuevo Torneo',
    }

    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'POST /tournaments': { body: newTournament, status: 201 },
    })

    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText('Torneo 2024')).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })

  it('creates tournament with validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [], page: { total: 0 } }, status: 200 },
      'POST /tournaments': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: {
            name: 'El nombre es requerido',
            start_date: 'La fecha de inicio es requerida',
          },
        },
      },
    })
    renderWithProviders(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText(/sin torneos/i)).toBeInTheDocument()
    })
  })
})
