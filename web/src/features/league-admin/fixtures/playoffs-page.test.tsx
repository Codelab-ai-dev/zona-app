import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { PlayoffsPage } from './playoffs-page'

const page = { limit: 100, offset: 0 }
const tournament = {
  id: 'tour-1',
  name: 'Torneo A',
  league_id: 'league-1',
  is_active: true,
  start_date: '2024-01-01',
  end_date: '2024-03-01',
  registration_open: false,
  tournament_format: 'round_robin',
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const playoffMatch = {
  id: 'p1',
  tournament_id: 'tour-1',
  home_team_id: 'team-1',
  away_team_id: 'team-2',
  home_score: 0,
  away_score: 0,
  match_date: '2024-02-01T00:00:00Z',
  status: 'scheduled',
  phase: 'playoffs',
  playoff_round: 'final',
  is_published: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const base = {
  'GET /leagues/league-1/tournaments': { body: { data: [tournament], page } },
  'GET /tournaments/tour-1/matches': { body: { data: [], page: { limit: 1000, offset: 0 } } },
}

type User = ReturnType<typeof renderWithProviders>['user']

async function openAndPickTournament(user: User) {
  await user.click(screen.getByRole('button', { name: /generar llave/i }))
  await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
  await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
}

describe('PlayoffsPage', () => {
  it('shows the title and asks to select a tournament', () => {
    mockApi(base)
    renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    expect(screen.getByRole('heading', { name: 'Llave de Playoffs' })).toBeInTheDocument()
    expect(screen.getByText('Selecciona un torneo arriba para ver su llave')).toBeInTheDocument()
  })

  it('posts the exact playoffs request and confirms', async () => {
    const fetchMock = mockApi({
      ...base,
      'POST /tournaments/tour-1/playoffs/generate': { status: 201, body: [playoffMatch, { ...playoffMatch, id: 'p2' }] },
    })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await openAndPickTournament(user)
    await user.type(screen.getByLabelText('Inicio'), '2024-03-10')
    await user.clear(screen.getByLabelText('Cancha'))
    await user.type(screen.getByLabelText('Cancha'), '2')
    await user.click(screen.getByLabelText('Ida y vuelta'))
    await user.click(screen.getByLabelText('Partido por tercer lugar'))
    await user.click(screen.getByRole('button', { name: 'Generar' }))

    expect(await screen.findByText('Llave generada con 2 partidos')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toEqual([
      {
        tournament_id: 'tour-1',
        num_teams: 8,
        start_date: '2024-03-10T00:00:00Z',
        start_time: '10:00',
        field_number: 2,
        third_place_match: false,
        home_and_away: true,
      },
    ])
  })

  it('shows a 422 next to the field, keeps the value and the dialog open', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/playoffs/generate': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { field_number: 'debe ser mayor que 0' } } },
      },
    })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await openAndPickTournament(user)
    await user.type(screen.getByLabelText('Inicio'), '2024-03-10')
    await user.click(screen.getByRole('button', { name: 'Generar' }))

    const field = await screen.findByLabelText('Cancha')
    expect(screen.getByText('debe ser mayor que 0')).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Inicio')).toHaveValue('2024-03-10')
  })

  it('shows the bracket of the selected tournament, asking only for playoff matches', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /tournaments/tour-1/matches': { body: { data: [playoffMatch], page: { limit: 1000, offset: 0 } } },
    })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await openAndPickTournament(user)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('Final')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('phase=playoffs'))).toBe(true)
  })

  it('invalidates the tournament matches after generating', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/playoffs/generate': { status: 201, body: [playoffMatch] },
    })
    const { user, client } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    client.setQueryData(['matches', 'tournament', 'tour-1'], { data: [], page })
    await openAndPickTournament(user)
    await user.type(screen.getByLabelText('Inicio'), '2024-03-10')
    await user.click(screen.getByRole('button', { name: 'Generar' }))
    await screen.findByText('Llave generada con 1 partidos')
    expect(client.getQueryState(['matches', 'tournament', 'tour-1'])?.isInvalidated).toBe(true)
  })
})
