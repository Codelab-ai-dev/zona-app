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

    expect(await screen.findByText('Estadísticas del Equipo')).toBeInTheDocument()
    expect(await screen.findByText('Águilas FC - Resumen de rendimiento')).toBeInTheDocument()
  })

  it('displays team statistics', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    expect(await screen.findByText('Partidos Jugados')).toBeInTheDocument()
    const headline = screen.getByText('Partidos Jugados').closest('[data-slot="card"]')
    expect(headline?.querySelector('.font-bold')?.textContent).toBe('10')
    const tileValue = (title: string) => screen.getByText(title).nextElementSibling?.textContent
    expect(tileValue('Goles a Favor')).toBe('25')
    expect(tileValue('Puntos')).toBe('23')
  })

  it('shows empty state when no stats available', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    await screen.findByText('Águilas FC - Resumen de rendimiento')
    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
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

  it('reloads the team when Reintentar is pressed', async () => {
    mockApi({
      'GET /teams/team-123': { status: 500, body: { error: { code: 'internal_error', message: 'Error interno del servidor' } } },
      'GET /teams/team-123/stats': { body: { data: [], page: { limit: 10, offset: 0 } } },
    })
    const { user } = renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)
    await screen.findByRole('alert')

    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [], page: { limit: 10, offset: 0 } } },
    })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Águilas FC - Resumen de rendimiento')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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

  it('shows the player-derived tiles from the per-player totals', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
      'GET /teams/team-123/player-stats': {
        body: {
          data: [
            { player_id: 'a', name: 'A', jersey_number: 1, position: 'Portero', matches_played: 4, goals: 3, assists: 0, yellow_cards: 2, red_cards: 0, minutes_played: 300 },
            { player_id: 'b', name: 'B', jersey_number: 2, position: 'Defensa', matches_played: 2, goals: 0, assists: 1, yellow_cards: 0, red_cards: 0, minutes_played: 100 },
            { player_id: 'c', name: 'C', jersey_number: 3, position: 'Delantero', matches_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0 },
          ],
        },
      },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    const tile = async (label: string) => {
      const caption = (await screen.findAllByText(label)).find((el) => el.tagName === 'P')
      return caption?.parentElement?.querySelectorAll('p')[1]?.textContent
    }
    expect(await tile('Goles por Jugador')).toBe('1.0')
    expect(await tile('Tarjetas por Jugador')).toBe('0.7')
    expect(await tile('Jugadores sin Tarjetas')).toBe('2')
    expect(await tile('Partidos Jugados (Total)')).toBe('6')
    expect(await tile('Minutos Jugados (Total)')).toBe("400'")
    expect(await tile('Promedio Minutos por Jugador')).toBe("133'")
    expect(await tile('Jugadores Activos')).toBe('2')
  })

  it('keeps the team tiles and hides the player-derived ones when the per-player totals fail', async () => {
    mockApi({
      'GET /teams/team-123': { body: mockTeam },
      'GET /teams/team-123/stats': { body: { data: [mockTeamStats], page: { limit: 10, offset: 0 } } },
    })
    renderWithProviders(<TeamOverviewPage teamId={mockTeamId} />)

    expect(await screen.findByText('Goles a Favor')).toBeInTheDocument()
    expect(screen.queryByText('Goles por Jugador')).not.toBeInTheDocument()
  })
})
