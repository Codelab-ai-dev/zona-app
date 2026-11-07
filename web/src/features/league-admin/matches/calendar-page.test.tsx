import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { CalendarPage } from './calendar-page'

const tournament = {
  id: 'tour-1',
  name: 'Torneo Principal',
  league_id: 'league-1',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  is_active: true,
  registration_open: true,
  tournament_format: 'round_robin',
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const team1 = { id: 'team-1', name: 'Equipo A', slug: 'equipo-a' }
const team2 = { id: 'team-2', name: 'Equipo B', slug: 'equipo-b' }

const match = {
  id: 'match-1',
  tournament_id: 'tour-1',
  home_team_id: 'team-1',
  away_team_id: 'team-2',
  home_score: 0,
  away_score: 0,
  match_date: '2024-06-15T15:00:00Z',
  match_time: '15:00',
  status: 'scheduled' as const,
  round: 1,
  field_number: 1,
  phase: 'regular' as const,
  is_published: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  home_team: team1,
  away_team: team2,
}

describe('CalendarPage', () => {
  it('renders tournament selector and matches', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: { data: [tournament], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [match], page: { limit: 1000, offset: 0 } },
      },
    })

    renderWithProviders(<CalendarPage leagueId="league-1" />)

    expect(await screen.findByRole('heading', { name: /calendario/i })).toBeInTheDocument()
    expect(await screen.findByText('Equipo A')).toBeInTheDocument()
    expect(screen.getByText('Equipo B')).toBeInTheDocument()
  })

  it('displays page structure and tournament selector', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: { data: [tournament], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [match], page: { limit: 1000, offset: 0 } },
      },
    })

    renderWithProviders(<CalendarPage leagueId="league-1" />)

    // Wait for tournaments to load
    await waitFor(() => {
      expect(screen.queryByText('Cargando torneos…')).not.toBeInTheDocument()
    })

    // Page header should be visible
    expect(screen.getByRole('heading', { name: /calendario/i })).toBeInTheDocument()
    // Tournament selector label should be visible
    expect(screen.getByText('Selecciona un torneo')).toBeInTheDocument()
  })

  it('shows empty state when no matches', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: { data: [tournament], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
    })

    renderWithProviders(<CalendarPage leagueId="league-1" />)

    expect(await screen.findByText(/no hay partidos para este torneo/i)).toBeInTheDocument()
  })
})
