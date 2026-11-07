import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { RequestsPage } from './requests-page'
import { leaguesMine, page } from './test-fixtures'

const tournament = { id: 'tournament-1', name: 'Torneo Principal', league_id: 'league-1', is_active: true }
const pending = {
  id: 'request-1',
  team_id: 'team-1',
  tournament_id: 'tournament-1',
  player_name: 'Juan Pérez',
  player_position: 'Portero',
  jersey_number: 1,
  reason: 'Refuerzo',
  status: 'pending',
  requested_by: 'owner-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const base = {
  'GET /leagues/mine': leaguesMine,
  'GET /leagues/league-1/tournaments': page([tournament]),
  'GET /tournaments/tournament-1/player-registration-requests': page([pending]),
}

async function openRequests(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
  await user.click(await screen.findByRole('option', { name: 'Torneo Principal' }))
  await screen.findByText('Juan Pérez')
}

describe('RequestsPage', () => {
  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<RequestsPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows the empty state when the league has no tournaments', async () => {
    mockApi({ 'GET /leagues/mine': leaguesMine, 'GET /leagues/league-1/tournaments': page([]) })
    renderWithProviders(<RequestsPage />)
    expect(await screen.findByText('No hay torneos')).toBeInTheDocument()
  })

  it('shows an error when the requests cannot be loaded', async () => {
    mockApi({
      ...base,
      'GET /tournaments/tournament-1/player-registration-requests': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error del servidor' } },
      },
    })
    const { user } = renderWithProviders(<RequestsPage />)
    await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
    await user.click(await screen.findByRole('option', { name: 'Torneo Principal' }))
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('lists the requests of the selected tournament', async () => {
    mockApi(base)
    const { user } = renderWithProviders(<RequestsPage />)
    await openRequests(user)
    expect(screen.getByText('Portero')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('approves a request: PATCHes the review and confirms', async () => {
    const fetchMock = mockApi({
      ...base,
      'PATCH /player-registration-requests/request-1/review': { body: { ...pending, status: 'approved' } },
    })
    const { user } = renderWithProviders(<RequestsPage />)
    await openRequests(user)

    await user.click(screen.getByRole('button', { name: /aprobar/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Solicitud revisada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /player-registration-requests/request-1/review')).toEqual([{ status: 'approved' }])
  })

  it('rejects a request with notes (uppercased by the textarea)', async () => {
    const fetchMock = mockApi({
      ...base,
      'PATCH /player-registration-requests/request-1/review': { body: { ...pending, status: 'rejected' } },
    })
    const { user } = renderWithProviders(<RequestsPage />)
    await openRequests(user)

    await user.click(screen.getByRole('button', { name: /rechazar/i }))
    await user.type(await screen.findByLabelText(/notas/i), 'sin cupo')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Solicitud revisada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /player-registration-requests/request-1/review')).toEqual([
      { status: 'rejected', review_notes: 'SIN CUPO' },
    ])
  })

  it('shows the roster-limit message when the API answers 409', async () => {
    mockApi({
      ...base,
      'PATCH /player-registration-requests/request-1/review': {
        status: 409,
        body: { error: { code: 'conflict', message: 'El equipo alcanzó el límite de jugadores del torneo' } },
      },
    })
    const { user } = renderWithProviders(<RequestsPage />)
    await openRequests(user)

    await user.click(screen.getByRole('button', { name: /aprobar/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('El equipo alcanzó el límite de jugadores del torneo')).toBeInTheDocument()
    expect(screen.queryByText('Solicitud revisada')).not.toBeInTheDocument()
  })

  it('does not send anything when the review is cancelled', async () => {
    const fetchMock = mockApi(base)
    const { user } = renderWithProviders(<RequestsPage />)
    await openRequests(user)

    await user.click(screen.getByRole('button', { name: /aprobar/i }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(requestsTo(fetchMock, 'PATCH /player-registration-requests/request-1/review')).toEqual([])
  })
})
