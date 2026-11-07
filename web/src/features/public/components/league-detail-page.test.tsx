import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { LeagueDetailPage } from './league-detail-page'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ slug: 'liga-norte' }),
  }
})

const league = {
  id: 'l1',
  name: 'Liga Norte',
  slug: 'liga-norte',
  description: 'Fútbol 7 los domingos',
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

describe('LeagueDetailPage', () => {
  it('displays league details and tournaments', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page: { limit: 100, offset: 0 } } },
    })
    renderWithProviders(<LeagueDetailPage />, { route: '/liga/liga-norte' })

    // Wait for the league heading
    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /torneos/i })).toBeInTheDocument()
    // Check for tournament in card
    expect(await screen.findByText('Torneo Principal')).toBeInTheDocument()
  })

  it('shows empty state when no tournaments', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [], page: { limit: 100, offset: 0 } } },
    })
    renderWithProviders(<LeagueDetailPage />, { route: '/liga/liga-norte' })

    expect(await screen.findByText('Liga Norte')).toBeInTheDocument()
    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })
    renderWithProviders(<LeagueDetailPage />, { route: '/liga/liga-norte' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
  })
})
