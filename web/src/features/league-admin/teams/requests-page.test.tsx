import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { RequestsPage } from './requests-page'
import { leaguesMine, page, team } from './test-fixtures'

const tournament = { id: 'tournament-1', name: 'Torneo Principal', league_id: 'league-1', is_active: true }
const tournament2 = { id: 'tournament-2', name: 'Copa', league_id: 'league-1', is_active: true }
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
const rejected = {
  ...pending,
  id: 'request-2',
  tournament_id: 'tournament-2',
  player_name: 'Luis Gómez',
  status: 'rejected',
  review_notes: 'Fuera de plazo',
  reviewed_at: '2024-01-03T00:00:00Z',
  created_at: '2024-01-02T00:00:00Z',
}

const base = {
  'GET /leagues/mine': leaguesMine,
  'GET /leagues/league-1/tournaments': page([tournament, tournament2]),
  'GET /teams': page([team('team-1', 'Los Campeones')]),
  'GET /leagues/league-1/users': page([{ id: 'owner-1', name: 'ANA DUEÑA', email: 'a@x.com', role: 'team_owner', is_active: true, created_at: '2024-01-01T00:00:00Z' }]),
  'GET /tournaments/tournament-1/player-registration-requests': page([pending]),
  'GET /tournaments/tournament-2/player-registration-requests': page([rejected]),
}
const review = 'PATCH /player-registration-requests/request-1/review'

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
    renderWithProviders(<RequestsPage />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('lists the requests of every tournament with team, requester and history', async () => {
    const fetchMock = mockApi(base)
    renderWithProviders(<RequestsPage />)

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Pendientes de Revisión (1)')).toBeInTheDocument()
    expect(screen.getByText('Historial de Solicitudes (1)')).toBeInTheDocument()
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument()
    expect(screen.getByText('Fuera de plazo')).toBeInTheDocument()
    expect(screen.getByText('Rechazada')).toBeInTheDocument()
    expect(screen.getAllByText('Los Campeones')).toHaveLength(2)
    expect(await screen.findByText('ANA DUEÑA')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/admin/users'))).toBe(false)
    expect(screen.getByText('Refuerzo')).toBeInTheDocument()
  })

  it('shows the original heading and the empty pending message', async () => {
    mockApi({ ...base, 'GET /tournaments/tournament-1/player-registration-requests': page([]) })
    renderWithProviders(<RequestsPage />)
    expect(await screen.findByText('No hay solicitudes pendientes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Solicitudes de Jugadores Excepcionales' })).toBeInTheDocument()
  })

  it('approves a request from the review dialog: PATCHes the review and confirms', async () => {
    const fetchMock = mockApi({ ...base, [review]: { body: { ...pending, status: 'approved' } } })
    const { user } = renderWithProviders(<RequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Revisar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revisar Solicitud de Jugador' })
    expect(within(dialog).getByText('#1')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Aprobar y Registrar Jugador' }))

    expect(await screen.findByText('El jugador ha sido registrado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, review)).toEqual([{ status: 'approved' }])
    expect(screen.queryByRole('dialog', { name: 'Revisar Solicitud de Jugador' })).not.toBeInTheDocument()
  })

  it('rejects a request with notes (uppercased by the textarea)', async () => {
    const fetchMock = mockApi({ ...base, [review]: { body: { ...pending, status: 'rejected' } } })
    const { user } = renderWithProviders(<RequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Revisar' }))
    await user.type(await screen.findByLabelText(/notas de revisión/i), 'sin cupo')
    await user.click(screen.getByRole('button', { name: 'Rechazar Solicitud' }))

    expect(await screen.findByText('Solicitud rechazada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, review)).toEqual([{ status: 'rejected', review_notes: 'SIN CUPO' }])
  })

  it('requires a reason to reject and sends nothing without it', async () => {
    const fetchMock = mockApi(base)
    const { user } = renderWithProviders(<RequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Rechazar Solicitud' }))

    expect(await screen.findByText('Por favor proporciona una razón para el rechazo')).toBeInTheDocument()
    expect(requestsTo(fetchMock, review)).toEqual([])
  })

  it('shows the roster-limit message when the API answers 409 and keeps the dialog and notes', async () => {
    mockApi({
      ...base,
      [review]: {
        status: 409,
        body: { error: { code: 'conflict', message: 'El equipo alcanzó el límite de jugadores del torneo' } },
      },
    })
    const { user } = renderWithProviders(<RequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Revisar' }))
    await user.type(await screen.findByLabelText(/notas de revisión/i), 'ok')
    await user.click(screen.getByRole('button', { name: 'Aprobar y Registrar Jugador' }))

    expect(await screen.findByText('El equipo alcanzó el límite de jugadores del torneo')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Revisar Solicitud de Jugador' })).toBeInTheDocument()
    expect(screen.getByLabelText(/notas de revisión/i)).toHaveValue('OK')
  })

  it('does not send anything when the review dialog is closed', async () => {
    const fetchMock = mockApi(base)
    const { user } = renderWithProviders(<RequestsPage />)

    await user.click(await screen.findByRole('button', { name: 'Revisar' }))
    await user.keyboard('{Escape}')

    expect(requestsTo(fetchMock, review)).toEqual([])
    expect(screen.queryByRole('dialog', { name: 'Revisar Solicitud de Jugador' })).not.toBeInTheDocument()
  })
})
