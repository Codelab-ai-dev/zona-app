import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, TOURNAMENT_ID, leagueWithQr, listBody, player, team, tournament } from '../test-fixtures'
import type { Suspension } from '../types'
import { PlayerManagementPage } from './player-management-page'

const PLAYERS = `GET /teams/${TEAM_ID}/players`
const TEAM = `GET /teams/${TEAM_ID}`
const TOURNAMENT = `GET /tournaments/${TOURNAMENT_ID}`
const CREATE = `POST /teams/${TEAM_ID}/players`
const REQUEST = `POST /teams/${TEAM_ID}/tournaments/${TOURNAMENT_ID}/player-registration-requests`

function renderPage() {
  return renderWithProviders(<PlayerManagementPage teamId={TEAM_ID} />)
}

const baseHandlers = { [TEAM]: { body: team } }

describe('PlayerManagementPage registration rules', () => {
  it('shows the closed banner, disables the button and offers the exceptional request', async () => {
    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), [TOURNAMENT]: { body: { ...tournament, registration_open: false } } })
    renderPage()

    expect(await screen.findByText('Registro de Jugadores Cerrado')).toBeInTheDocument()
    expect(screen.getByText(/puedes solicitar una aprobación especial más abajo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registros Cerrados' })).toBeDisabled()
    expect(screen.getByText('Solicitar Jugador Excepcional')).toBeInTheDocument()
  })

  it('sends the exceptional request for the team tournament and closes the dialog', async () => {
    const fetchMock = mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([player]),
      [TOURNAMENT]: { body: { ...tournament, registration_open: false } },
      [REQUEST]: { status: 201, body: { id: 'req-1' } },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Solicitar Jugador' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre del Jugador *'), 'Luis Gómez')
    await user.click(within(dialog).getByRole('combobox', { name: 'Posición *' }))
    await user.click(await screen.findByRole('option', { name: 'Portero' }))
    await user.clear(within(dialog).getByLabelText(/Número de Camiseta/))
    await user.type(within(dialog).getByLabelText(/Número de Camiseta/), '12')
    await user.type(within(dialog).getByLabelText('Justificación de la Solicitud'), 'Lesión del titular')
    await user.click(within(dialog).getByRole('button', { name: 'Enviar Solicitud' }))

    expect(await screen.findByText('Solicitud de registro enviada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, REQUEST)).toEqual([
      { player_name: 'LUIS GÓMEZ', player_position: 'Portero', jersey_number: 12, reason: 'LESIÓN DEL TITULAR' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the free slots and the limit-reached state', async () => {
    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), [TOURNAMENT]: { body: { ...tournament, max_players: 3 } } })
    const first = renderPage()

    expect(await screen.findByText('Tienes 2 espacios disponibles de 3 jugadores permitidos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo Jugador' })).toBeEnabled()
    first.unmount()

    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), [TOURNAMENT]: { body: { ...tournament, max_players: 1 } } })
    renderPage()

    expect(await screen.findByText('Límite de jugadores alcanzado')).toBeInTheDocument()
    expect(screen.getByText('Has registrado el máximo de 1 jugadores permitidos para este torneo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Límite Alcanzado' })).toBeDisabled()
  })

  it('shows the age rules and a live age result in the form, and blocks invalid ages', async () => {
    mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([]),
      [TOURNAMENT]: {
        body: { ...tournament, age_validation_enabled: true, min_age: 18, max_age: 30, age_reference_date: '2024-01-01T00:00:00Z' },
      },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Nuevo Jugador' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/Edad: 18-30 años/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Fecha de Nacimiento'), '2000-06-15')
    expect(within(dialog).getByRole('status')).toHaveTextContent('23 años - Cumple requisitos')
    expect(within(dialog).getByRole('button', { name: 'Registrar Jugador' })).toBeEnabled()

    await user.clear(within(dialog).getByLabelText('Fecha de Nacimiento'))
    await user.type(within(dialog).getByLabelText('Fecha de Nacimiento'), '2015-06-15')
    expect(within(dialog).getByRole('status')).toHaveTextContent('8 años - No cumple requisitos')
    expect(within(dialog).getByText(/No hay excepciones disponibles/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Registrar Jugador' })).toBeDisabled()
  })

  it('shows the API team_id error (registration closed / limit) inside the form', async () => {
    mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([]),
      [TOURNAMENT]: { body: tournament },
      [CREATE]: {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { team_id: 'el registro está cerrado; envía una solicitud de registro' } } },
      },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Nuevo Jugador' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre Completo'), 'Luis')
    await user.click(within(dialog).getByRole('combobox', { name: 'Posición' }))
    await user.click(await screen.findByRole('option', { name: 'Portero' }))
    await user.type(within(dialog).getByLabelText('Número de Camiseta'), '9')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Jugador' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('el registro está cerrado; envía una solicitud de registro')
    expect(within(dialog).getByLabelText('Nombre Completo')).toHaveValue('LUIS')
  })
})

describe('PlayerManagementPage suspended flag', () => {
  const suspension = (status: string): Suspension => ({
    id: `s-${status}`,
    player_id: 'player-1',
    team_id: TEAM_ID,
    league_id: 'league-1',
    suspension_type: 'red_card',
    reason: 'x',
    matches_to_serve: 2,
    matches_served: 0,
    status,
    start_date: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })

  it('marks only players with an active suspension, not cancelled ones', async () => {
    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), [`GET /teams/${TEAM_ID}/suspensions`]: listBody([suspension('cancelled')]) })
    const first = renderPage()
    await screen.findByText('Juan Pérez')
    await waitFor(() => expect(screen.queryByText('Suspendido')).not.toBeInTheDocument())
    first.unmount()

    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), [`GET /teams/${TEAM_ID}/suspensions`]: listBody([suspension('active')]) })
    renderPage()
    expect(await screen.findByText('Suspendido')).toBeInTheDocument()
  })
})

describe('PlayerManagementPage QR gating', () => {
  it('hides the credential button unless the league enabled qr_codes', async () => {
    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), 'GET /leagues/league-1': { body: { id: 'league-1', features: { qr_codes: false } } } })
    renderPage()

    await screen.findByText('Juan Pérez')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Credencial de Juan Pérez' })).not.toBeInTheDocument())
  })

  it('shows the credential button when the league enabled qr_codes', async () => {
    mockApi({ ...baseHandlers, [PLAYERS]: listBody([player]), 'GET /leagues/league-1': { body: leagueWithQr } })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Credencial de Juan Pérez' })).toBeInTheDocument()
  })
})

describe('PlayerManagementPage edit', () => {
  async function openEdit(user: ReturnType<typeof renderPage>['user']) {
    await user.click(await screen.findByRole('button', { name: 'Editar a Juan Pérez' }))
    return screen.findByRole('dialog')
  }

  it('prefills the player and PATCHes the changes, then reloads', async () => {
    const fetchMock = mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([player]),
      'PATCH /players/player-1': { body: { ...player, jersey_number: 11 } },
    })
    const { user } = renderPage()

    const dialog = await openEdit(user)
    expect(within(dialog).getByLabelText('Nombre Completo')).toHaveValue('Juan Pérez')
    expect(within(dialog).getByLabelText('Fecha de Nacimiento')).toHaveValue('2000-05-15')
    await user.clear(within(dialog).getByLabelText('Número de Camiseta'))
    await user.type(within(dialog).getByLabelText('Número de Camiseta'), '11')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Jugador actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /players/player-1')).toEqual([
      { name: 'Juan Pérez', position: 'Delantero', jersey_number: 11, birth_date: '2000-05-15T00:00:00Z' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(requestsTo(fetchMock, PLAYERS)).toHaveLength(2))
  })

  it('uploads a replacement photo first and sends its URL in the PATCH', async () => {
    const fetchMock = mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([player]),
      'POST /storage/objects': { status: 201, body: { key: 'player/player-1/n.png', url: 'https://cdn.example.com/n.png', is_public: true } },
      'PATCH /players/player-1': { body: player },
    })
    const { user } = renderPage()

    const dialog = await openEdit(user)
    await user.upload(within(dialog).getByLabelText('Foto del Jugador'), new File(['x'], 'nueva.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    await screen.findByText('Jugador actualizado')
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope')).toBe('player')
    expect(form?.get('scope_id')).toBe('player-1')
    expect(requestsTo(fetchMock, 'PATCH /players/player-1')).toEqual([
      expect.objectContaining({ photo: 'https://cdn.example.com/n.png', jersey_number: 10 }),
    ])
  })

  it('shows 422 errors on the fields, keeps the typed values and sends nothing else', async () => {
    mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([player]),
      'PATCH /players/player-1': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { jersey_number: 'ya existe un jugador con ese número' } } },
      },
    })
    const { user } = renderPage()

    const dialog = await openEdit(user)
    await user.clear(within(dialog).getByLabelText('Número de Camiseta'))
    await user.type(within(dialog).getByLabelText('Número de Camiseta'), '7')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    const jersey = within(dialog).getByLabelText('Número de Camiseta')
    expect(await within(dialog).findByText('ya existe un jugador con ese número')).toBeInTheDocument()
    expect(jersey).toHaveAttribute('aria-invalid', 'true')
    expect(jersey).toHaveValue(7)
    expect(screen.queryByText('Jugador actualizado')).not.toBeInTheDocument()
  })

  it('shows the 409 conflict message and keeps the dialog open', async () => {
    mockApi({
      ...baseHandlers,
      [PLAYERS]: listBody([player]),
      'PATCH /players/player-1': { status: 409, body: { error: { code: 'conflict', message: 'El número de camiseta ya está en uso' } } },
    })
    const { user } = renderPage()

    const dialog = await openEdit(user)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('El número de camiseta ya está en uso')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
