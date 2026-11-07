import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'
import { PlayerStatisticsPage } from './player-statistics-page'

const mockTeamId = 'team-123'

const mockPlayers = [
  {
    id: 'player-1',
    name: 'Juan Pérez',
    team_id: mockTeamId,
    position: 'Delantero',
    jersey_number: 10,
    photo: 'https://example.com/photo1.jpg',
    birth_date: '2000-05-15',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    id_verified: true,
  },
  {
    id: 'player-2',
    name: 'Carlos López',
    team_id: mockTeamId,
    position: 'Portero',
    jersey_number: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    id_verified: true,
  },
]

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

describe('PlayerStatisticsPage', () => {
  beforeEach(() => {
    mockApi({
      'GET /teams/team-123/players': {
        body: { data: mockPlayers, page: { limit: 100, offset: 0 } },
      },
      'GET /teams/team-123/stats': {
        body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } },
      },
    })
  })

  it('renders the page title and description', async () => {
    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    expect(await screen.findByText('Estadísticas de Jugadores')).toBeInTheDocument()
    expect(
      screen.getByText('Rendimiento individual de cada jugador del equipo.'),
    ).toBeInTheDocument()
  })

  it('displays player count and team statistics summary', async () => {
    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    expect(await screen.findByText('2')).toBeInTheDocument() // player count
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument() // goals_for
    expect(screen.getByText('Goles Totales')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument() // yellow_cards
    expect(screen.getByText('Tarjetas Amarillas')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // red_cards
    expect(screen.getByText('Tarjetas Rojas')).toBeInTheDocument()
  })

  it('displays all players in the table', async () => {
    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
    expect(screen.getByText('Delantero')).toBeInTheDocument()
    expect(screen.getByText('Portero')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('shows empty state when no players available', async () => {
    mockApi({
      'GET /teams/team-123/players': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
      'GET /teams/team-123/stats': {
        body: { data: [], page: { limit: 10, offset: 0 } },
      },
    })

    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    expect(await screen.findByText('Sin jugadores registrados')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo',
      ),
    ).toBeInTheDocument()
  })

  it('shows error state on players API failure', async () => {
    mockApi({
      'GET /teams/team-123/players': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
      },
      'GET /teams/team-123/stats': {
        body: { data: [], page: { limit: 10, offset: 0 } },
      },
    })

    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('displays zero statistics when no team stats available', async () => {
    mockApi({
      'GET /teams/team-123/players': {
        body: { data: mockPlayers, page: { limit: 100, offset: 0 } },
      },
      'GET /teams/team-123/stats': {
        body: { data: [], page: { limit: 10, offset: 0 } },
      },
    })

    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    await screen.findByText('Goles Totales')
    // Should show 0 when no stats
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('displays statistics note about detailed stats availability', async () => {
    renderWithProviders(<PlayerStatisticsPage teamId={mockTeamId} />)

    await screen.findByText('Estadísticas de Jugadores')
    expect(
      screen.getByText(/Las estadísticas detalladas.*se mostrarán cuando el árbitro/),
    ).toBeInTheDocument()
  })
})
