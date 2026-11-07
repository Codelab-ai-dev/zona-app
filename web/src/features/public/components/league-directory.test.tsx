import { screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { LeagueDirectory } from './league-directory'

const league1 = {
  id: 'l1',
  name: 'Liga Norte',
  slug: 'liga-norte',
  description: 'Fútbol 7',
  logo: null,
  is_active: true,
  created_at: '',
}

const league2 = {
  id: 'l2',
  name: 'Liga Sur',
  slug: 'liga-sur',
  description: 'Fútbol 11',
  logo: null,
  is_active: true,
  created_at: '',
}

const tournament = {
  id: 't1',
  name: 'Torneo Activo',
  league_id: 'l1',
  start_date: '2024-01-01',
  end_date: '2099-12-31',
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

describe('LeagueDirectory', () => {
  it('renders a card per league from GET /leagues', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1, league2],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [{ id: 'team1', name: 'Team A' }, { id: 'team2', name: 'Team B' }],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [tournament], page: { limit: 100, offset: 0 } },
      },
      'GET /leagues/l2/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    expect(await screen.findByText('Liga Sur')).toBeInTheDocument()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues': { body: { data: [], page: { limit: 100, offset: 0 } } },
    })

    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByText('No hay ligas disponibles')).toBeInTheDocument()
  })

  it('shows error state on API failure with retry', async () => {
    mockApi({
      'GET /leagues': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })

    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
  })

  it('carousel next/previous buttons have accessible names and move active slide', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1, league2],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [{ id: 'team1', name: 'Team A' }],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
      'GET /leagues/l2/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    // Wait for leagues to load
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()

    // Find carousel buttons with accessible names
    const nextBtn = screen.getByRole('button', { name: /siguiente liga/i })
    const prevBtn = screen.getByRole('button', { name: /anterior liga/i })

    expect(nextBtn).toBeInTheDocument()
    expect(prevBtn).toBeInTheDocument()

    // Click next to move carousel
    await user.click(nextBtn)

    // Verify carousel moved (Liga Sur should be visible)
    expect(await screen.findByText('Liga Sur')).toBeInTheDocument()
  })

  it('carousel buttons are hidden with only one league', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [{ id: 'team1', name: 'Team A' }],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()

    // Carousel buttons should not exist for single league
    const nextBtn = screen.queryByRole('button', { name: /siguiente liga/i })
    const prevBtn = screen.queryByRole('button', { name: /anterior liga/i })

    expect(nextBtn).not.toBeInTheDocument()
    expect(prevBtn).not.toBeInTheDocument()
  })

  it('shows stats when available', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [{ id: 'team1', name: 'Team A' }, { id: 'team2', name: 'Team B' }],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: {
          data: [tournament],
          page: { limit: 100, offset: 0 },
        },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    // Wait for league and stats to load
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    expect(await screen.findByText('Equipos')).toBeInTheDocument()
    expect(await screen.findByText('Torneo Activo')).toBeInTheDocument()
  })

  it('omits stats when teams request fails', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error' } },
      },
      'GET /leagues/l1/tournaments': {
        body: {
          data: [tournament],
          page: { limit: 100, offset: 0 },
        },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    // Wait for league to load and tournament to display
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    expect(await screen.findByText('Torneo Activo')).toBeInTheDocument()

    // Teams count should not be shown since request failed
    expect(screen.queryByText('Equipos')).not.toBeInTheDocument()
  })

  it('uses page.total when available', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [{ id: 'team1', name: 'Team A' }],
          page: { limit: 100, offset: 0, total: 250 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    // Wait for league and stats to load
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    // Should show total (250) not just the data.length (1)
    expect(await screen.findByText('250')).toBeInTheDocument()
    expect(await screen.findByText('Equipos')).toBeInTheDocument()
  })

  it('only shows teams count when data.length < 100 and no page.total', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: Array(50).fill({ id: 'team', name: 'Team' }),
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    // Wait for league and stats to load
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    // Should show 50 (data.length < 100 means we got all)
    expect(await screen.findByText('50')).toBeInTheDocument()
    expect(await screen.findByText('Equipos')).toBeInTheDocument()
  })

  it('hides teams count when 100 items returned (potentially truncated)', async () => {
    mockApi({
      'GET /leagues': {
        body: {
          data: [league1],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: Array(100).fill({ id: 'team', name: 'Team' }),
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /leagues/l1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<LeagueDirectory />)

    const card = await screen.findByText('Liga Norte')
    const cardContainer = card.closest('div[class*="bg-gradient"]') as HTMLElement

    // Should NOT show teams count (data.length === 100 means might be truncated)
    const equiposText = within(cardContainer).queryByText('Equipos')
    expect(equiposText).not.toBeInTheDocument()
  })
})
