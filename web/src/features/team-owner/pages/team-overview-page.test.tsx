import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'
import { TeamOverviewPage } from './team-overview-page'

const mockTeamId = 'team-123'
const mockTeam = {
  id: mockTeamId,
  name: 'Águilas FC',
  slug: 'aguilas-fc',
  league_id: 'league-1',
  owner_id: 'owner-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const mockTeamStats = {
  id: 'stat-1',
  team_id: mockTeamId,
  tournament_id: 'tournament-1',
  league_id: 'league-1',
  matches_played: 10,
  matches_won: 7,
  matches_drawn: 2,
  matches_lost: 1,
  goals_for: 25,
  goals_against: 8,
  goal_difference: 17,
  points: 23,
  clean_sheets: 4,
  yellow_cards: 12,
  red_cards: 1,
  points_adjustment: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('TeamOverviewPage', () => {
  it('renders team name and description', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    expect(await screen.findByText('Resumen del Equipo')).toBeInTheDocument()
    expect(await screen.findByText('Águilas FC')).toBeInTheDocument()
  })

  it('displays team statistics', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    expect(await screen.findByText('Partidos Jugados')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument() // goals_for
    expect(screen.getByText('23')).toBeInTheDocument() // points
  })

  it('shows empty state when no stats available', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    await screen.findByText('Resumen del Equipo')
    // Stats should not be displayed
    expect(screen.queryByText('Partidos Jugados')).not.toBeInTheDocument()
  })

  it('shows error state and retry button on API error', async () => {
    mockApi({
      'GET /teams/team-123': { status: 500, body: { error: { code: 'internal_error', message: 'Error interno del servidor' } } },
      'GET /teams/team-123/stats': { body: { data: [], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('displays all stat cards with correct values', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    await screen.findByText('Partidos Jugados')
    expect(screen.getByText('Goles a Favor')).toBeInTheDocument()
    expect(screen.getByText('Goles en Contra')).toBeInTheDocument()
    expect(screen.getByText('Diferencia de Goles')).toBeInTheDocument()
    expect(screen.getByText('Vallas Invictas')).toBeInTheDocument()
    expect(screen.getByText('Tarjetas Amarillas')).toBeInTheDocument()
    expect(screen.getByText('Tarjetas Rojas')).toBeInTheDocument()
  })
})
