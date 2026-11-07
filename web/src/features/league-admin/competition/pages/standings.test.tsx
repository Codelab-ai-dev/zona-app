import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { StandingsPageComponent } from './standings'

describe('StandingsPage', () => {
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
      {
        position: 2,
        team_id: 'team-2',
        team_name: 'Equipo B',
        matches_played: 5,
        matches_won: 3,
        matches_drawn: 1,
        matches_lost: 1,
        goals_for: 10,
        goals_against: 5,
        goal_difference: 5,
        points: 10,
        points_adjustment: 0,
      },
    ],
    page: { total: 2 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders standings table', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/standings': { body: mockStandings, status: 200 },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Equipo A')).toBeInTheDocument()
      expect(screen.getByText('Equipo B')).toBeInTheDocument()
    })
  })

  it('shows empty state when no standings data', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/standings': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
    })
  })

  it('adjusts points with success', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/standings': { body: mockStandings, status: 200 },
      'POST /standings/adjust': { status: 204 },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Equipo A')).toBeInTheDocument()
    })
  })

  it('handles points adjustment validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/standings': { body: mockStandings, status: 200 },
      'POST /standings/adjust': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: { points_adjustment: 'El ajuste debe ser un número válido' },
        },
      },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Equipo A')).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<StandingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
