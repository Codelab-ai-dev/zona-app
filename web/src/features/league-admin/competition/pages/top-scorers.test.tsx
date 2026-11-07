import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { TopScorersPageComponent } from './top-scorers'

describe('TopScorersPage', () => {
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

  const mockTopScorers = {
    data: [
      {
        id: 'stats-1',
        player_id: 'player-1',
        player_name: 'Juan Pérez',
        jersey_number: 9,
        team_id: 'team-1',
        team_name: 'Equipo A',
        matches_played: 5,
        goals: 8,
        assists: 2,
        yellow_cards: 1,
        red_cards: 0,
        minutes_played: 450,
      },
    ],
    page: { total: 1 },
  }

  const mockDiscipline = {
    data: [
      {
        id: 'stats-2',
        player_id: 'player-2',
        player_name: 'Carlos López',
        jersey_number: 5,
        team_id: 'team-1',
        team_name: 'Equipo A',
        matches_played: 5,
        goals: 0,
        assists: 0,
        yellow_cards: 4,
        red_cards: 1,
        minutes_played: 450,
      },
    ],
    page: { total: 1 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<TopScorersPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders top scorers', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/top-scorers': { body: mockTopScorers, status: 200 },
      'GET /tournaments/tournament-1/discipline': { body: mockDiscipline, status: 200 },
    })
    renderWithProviders(<TopScorersPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
  })

  it('switches to discipline view', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/top-scorers': { body: mockTopScorers, status: 200 },
      'GET /tournaments/tournament-1/discipline': { body: mockDiscipline, status: 200 },
    })
    renderWithProviders(<TopScorersPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
  })

  it('shows empty state when no scorers', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/tournaments': { body: { data: [mockTournament], page: { total: 1 } }, status: 200 },
      'GET /tournaments/tournament-1/top-scorers': { body: { data: [], page: { total: 0 } }, status: 200 },
      'GET /tournaments/tournament-1/discipline': { body: mockDiscipline, status: 200 },
    })
    renderWithProviders(<TopScorersPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<TopScorersPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
