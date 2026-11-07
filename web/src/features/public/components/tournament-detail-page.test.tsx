import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { TournamentDetailPage } from './tournament-detail-page'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ slug: 'liga-norte', tournamentId: 't1' }),
  }
})

const league = {
  id: 'l1',
  name: 'Liga Norte',
  slug: 'liga-norte',
  description: 'Fútbol 7',
  admin_id: 'a1',
  is_active: true,
  product_mode: 'full',
  created_at: '',
  updated_at: '',
}

const tournament = {
  id: 't1',
  name: 'Torneo Principal',
  league_id: 'l1',
  start_date: '2024-01-01',
  end_date: '2024-06-30',
  is_active: true,
  registration_open: true,
  tournament_format: 'round_robin',
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '',
  updated_at: '',
}

const standing = {
  team_id: 'team1',
  team_name: 'Equipo A',
  position: 1,
  played: 5,
  won: 4,
  drawn: 1,
  lost: 0,
  goals_for: 15,
  goals_against: 5,
  goal_difference: 10,
  points: 13,
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
  match_time: '19:00',
  status: 'finished',
  round: 5,
  phase: 'regular',
  is_published: true,
  created_at: '',
  updated_at: '',
}

const scorer = {
  player_id: 'p1',
  player_name: 'Juan Pérez',
  player_number: 10,
  team_id: 'team1',
  team_name: 'Equipo A',
  goals: 8,
  assists: 2,
  matches_played: 5,
}

const discipline = {
  player_id: 'p2',
  player_name: 'Carlos Gómez',
  player_number: 7,
  team_id: 'team1',
  team_name: 'Equipo A',
  yellow_cards: 2,
  red_cards: 0,
  matches_played: 5,
}

describe('TournamentDetailPage', () => {
  it('displays tournament standings', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/standings': { body: { data: [standing], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/top-scorers': { body: { data: [scorer], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/discipline': { body: { data: [discipline], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TournamentDetailPage />, { route: '/liga/liga-norte/torneo/t1' })

    expect(await screen.findByRole('heading', { name: /torneo principal/i })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /equipo a/i })).toBeInTheDocument()
  })

  it('shows matches tab with match data', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/standings': { body: { data: [standing], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/top-scorers': { body: { data: [scorer], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/discipline': { body: { data: [discipline], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TournamentDetailPage />, { route: '/liga/liga-norte/torneo/t1' })

    const matchesTab = await screen.findByRole('tab', { name: /partidos/i })
    await user.click(matchesTab)

    expect(await screen.findByText(/equipo a/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows top scorers tab', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/standings': { body: { data: [standing], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/top-scorers': { body: { data: [scorer], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/discipline': { body: { data: [discipline], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TournamentDetailPage />, { route: '/liga/liga-norte/torneo/t1' })

    const scorersTab = await screen.findByRole('tab', { name: /goleadores/i })
    await user.click(scorersTab)

    expect(await screen.findByText(/juan pérez/i)).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows discipline tab', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/standings': { body: { data: [standing], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/matches': { body: { data: [match], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/top-scorers': { body: { data: [scorer], page: { limit: 100, offset: 0 } } },
      'GET /tournaments/t1/discipline': { body: { data: [discipline], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<TournamentDetailPage />, { route: '/liga/liga-norte/torneo/t1' })

    const disciplineTab = await screen.findByRole('tab', { name: /disciplina/i })
    await user.click(disciplineTab)

    expect(await screen.findByText(/carlos gómez/i)).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })

    renderWithProviders(<TournamentDetailPage />, { route: '/liga/liga-norte/torneo/t1' })

    // The error might be a network error or API error; just check that an alert appears
    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
  })
})
