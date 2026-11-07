import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { HomePage } from './home'

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('shows empty state when user has no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders league data when available', async () => {
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
    const mockStandings = {
      data: [
        {
          position: 1,
          team_id: 'team-1',
          team_name: 'Equipo A',
          matches_played: 5,
          matches_won: 4,
          matches_drawn: 1,
          matches_lost: 0,
          goals_for: 12,
          goals_against: 3,
          goal_difference: 9,
          points: 13,
          points_adjustment: 0,
        },
      ],
      page: { total: 1 },
    }
    const mockSummary = {
      league_id: 'league-1',
      league_name: 'Mi Liga',
      league_slug: 'mi-liga',
      total_income: '1000.00',
      total_charges: '800.00',
      total_collected: '700.00',
      total_pending: '100.00',
      total_overdue: '0.00',
      teams_with_transactions: 2,
      total_transactions: 5,
      overdue_transactions: 0,
    }

    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/standings': { body: mockStandings, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
    })

    renderWithProviders(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText(/resumen de la liga/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/torneos activos/i)).toBeInTheDocument()
    expect(screen.getByText(/equipos/i)).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
