import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { TeamDetailPage } from './team-detail-page'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ teamId: 'team1' }),
  }
})

const team = {
  id: 'team1',
  name: 'Equipo A',
  slug: 'equipo-a',
  league_id: 'l1',
  owner_id: 'user1',
  logo: null,
  description: 'Equipo profesional',
  is_active: true,
  created_at: '',
  updated_at: '',
}

const player = {
  id: 'p1',
  name: 'Juan Pérez',
  position: 'Delantero',
  jersey_number: 10,
  photo: null,
  is_active: true,
  created_at: '',
  updated_at: '',
}

const coachingStaff = {
  id: 'staff1',
  name: 'Carlos López',
  position: 'Entrenador',
  photo: null,
  is_active: true,
  created_at: '',
  updated_at: '',
}

const stats = {
  matches_played: 10,
  wins: 7,
  draws: 2,
  losses: 1,
  goals_for: 25,
  goals_against: 8,
  goal_difference: 17,
  points: 23,
}

const match = {
  id: 'm1',
  tournament_id: 't1',
  home_team_id: 'team1',
  away_team_id: 'team2',
  home_team: { id: 'team1', name: 'Equipo A', logo: null },
  away_team: { id: 'team2', name: 'Equipo B', logo: null },
  home_score: 3,
  away_score: 1,
  match_date: '2024-02-01',
  status: 'finished',
  round: 5,
  phase: 'regular',
  is_published: true,
  created_at: '',
  updated_at: '',
}

describe('TeamDetailPage', () => {
  it('renders team details with stats', async () => {
    mockApi({
      'GET /teams/team1': { body: team },
      'GET /teams/team1/stats': { body: stats },
      'GET /teams/team1/players': { body: { data: [player], page: { limit: 100, offset: 0 } } },
      'GET /teams/team1/coaching-staff': { body: { data: [coachingStaff], page: { limit: 50, offset: 0 } } },
      'GET /teams/team1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    expect(await screen.findByRole('heading', { name: /equipo a/i })).toBeInTheDocument()
    // Check that stats sections are rendered
    expect(await screen.findByRole('heading', { name: /jugadores/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /cuerpo técnico/i })).toBeInTheDocument()
  })

  it('renders team players list', async () => {
    mockApi({
      'GET /teams/team1': { body: team },
      'GET /teams/team1/stats': { body: stats },
      'GET /teams/team1/players': { body: { data: [player], page: { limit: 100, offset: 0 } } },
      'GET /teams/team1/coaching-staff': { body: { data: [coachingStaff], page: { limit: 50, offset: 0 } } },
      'GET /teams/team1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    expect(await screen.findByRole('heading', { name: /jugadores/i })).toBeInTheDocument()
    expect(await screen.findByText(/juan pérez/i)).toBeInTheDocument()
    // Check for jersey number in player row
    const playerRow = await screen.findByRole('cell', { name: /juan pérez/i })
    expect(playerRow.closest('tr')).toHaveTextContent('10')
  })

  it('renders coaching staff', async () => {
    mockApi({
      'GET /teams/team1': { body: team },
      'GET /teams/team1/stats': { body: stats },
      'GET /teams/team1/players': { body: { data: [player], page: { limit: 100, offset: 0 } } },
      'GET /teams/team1/coaching-staff': { body: { data: [coachingStaff], page: { limit: 50, offset: 0 } } },
      'GET /teams/team1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    expect(await screen.findByRole('heading', { name: /cuerpo técnico/i })).toBeInTheDocument()
    expect(await screen.findByText(/carlos lópez/i)).toBeInTheDocument()
  })

  it('renders recent matches', async () => {
    mockApi({
      'GET /teams/team1': { body: team },
      'GET /teams/team1/stats': { body: stats },
      'GET /teams/team1/players': { body: { data: [player], page: { limit: 100, offset: 0 } } },
      'GET /teams/team1/coaching-staff': { body: { data: [coachingStaff], page: { limit: 50, offset: 0 } } },
      'GET /teams/team1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    expect(await screen.findByRole('heading', { name: /partidos recientes/i })).toBeInTheDocument()
    expect(await screen.findByText(/equipo b/i)).toBeInTheDocument()
  })

  it('shows empty state when no players', async () => {
    mockApi({
      'GET /teams/team1': { body: team },
      'GET /teams/team1/stats': { body: stats },
      'GET /teams/team1/players': { body: { data: [], page: { limit: 100, offset: 0 } } },
      'GET /teams/team1/coaching-staff': { body: { data: [coachingStaff], page: { limit: 50, offset: 0 } } },
      'GET /teams/team1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    // Should still render the page, but with no players in the table
    expect(await screen.findByRole('heading', { name: /jugadores/i })).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /teams/team1': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })

    renderWithProviders(<TeamDetailPage />, { route: '/equipos/team1' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
  })
})
