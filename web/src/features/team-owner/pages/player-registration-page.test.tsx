import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, TOURNAMENT_ID, listBody, serverError } from '../test-fixtures'
import { PlayerRegistrationPage } from './player-registration-page'

const LIST = `GET /teams/${TEAM_ID}/player-registration-requests`
const CREATE = `POST /teams/${TEAM_ID}/tournaments/${TOURNAMENT_ID}/player-registration-requests`

const request = {
  id: 'req-1',
  team_id: TEAM_ID,
  tournament_id: TOURNAMENT_ID,
  player_name: 'Juan Pérez',
  player_position: 'Delantero',
  jersey_number: 10,
  birth_date: '2000-05-15T00:00:00Z',
  reason: 'Transferencia de otra liga',
  review_notes: 'Falta identificación',
  status: 'pending',
  requested_by: 'owner-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function renderPage({ tournament = true }: { tournament?: boolean } = {}) {
  return renderWithProviders(
    <PlayerRegistrationPage teamId={TEAM_ID} tournamentId={tournament ? TOURNAMENT_ID : undefined} />,
  )
}

async function fillForm(user: ReturnType<typeof renderPage>['user'], opts: { birthDate?: string } = {}) {
  await user.click(await screen.findByRole('button', { name: /Nueva Solicitud/i }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText(/Nombre del Jugador/i), 'Carlos López')
  await user.click(within(dialog).getByRole('combobox', { name: /Posición/i }))
  await user.click(await screen.findByRole('option', { name: 'Portero' }))
  await user.clear(within(dialog).getByLabelText(/Número de Camiseta/i))
  await user.type(within(dialog).getByLabelText(/Número de Camiseta/i), '7')
  if (opts.birthDate) await user.type(within(dialog).getByLabelText(/Fecha de Nacimiento/i), opts.birthDate)
  await user.type(within(dialog).getByLabelText(/Motivo de la Solicitud/i), 'Refuerzo para el torneo')
  await user.click(within(dialog).getByRole('button', { name: /Enviar Solicitud/i }))
  return dialog
}

describe('PlayerRegistrationPage', () => {
  it('lists requests with status, number, formatted dates and reason', async () => {
    mockApi({ [LIST]: listBody([request]) })
    renderPage()

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Solicitudes de Registro de Jugadores' })).toBeInTheDocument()
    expect(screen.getByText('Delantero')).toBeInTheDocument()
    expect(screen.getByText(/#10/)).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('15 de mayo de 2000')).toBeInTheDocument()
    expect(screen.getByText('Transferencia de otra liga')).toBeInTheDocument()
    expect(screen.getByText('Falta identificación')).toBeInTheDocument()
  })

  it('shows the empty state when there are no requests', async () => {
    mockApi({ [LIST]: listBody([]) })
    renderPage()

    expect(await screen.findByText('Sin solicitudes')).toBeInTheDocument()
  })

  it('shows the API error with a retry that reloads the list', async () => {
    const fetchMock = mockApi({ [LIST]: serverError })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')

    mockApi({ [LIST]: listBody([request]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('warns and hides the create button when no tournament is selected', async () => {
    mockApi({ [LIST]: listBody([]) })
    renderPage({ tournament: false })

    expect(await screen.findByText('No hay torneo seleccionado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nueva Solicitud/i })).not.toBeInTheDocument()
  })

  it('sends the request for the team and tournament, closes the dialog and refreshes the list', async () => {
    const created = { ...request, id: 'req-2', player_name: 'CARLOS LÓPEZ' }
    const fetchMock = mockApi({ [LIST]: listBody([request]), [CREATE]: { status: 201, body: created } })
    const { user } = renderPage()

    await fillForm(user, { birthDate: '2001-03-20' })

    expect(await screen.findByText('Solicitud de registro enviada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, CREATE)).toEqual([
      {
        player_name: 'CARLOS LÓPEZ',
        player_position: 'Portero',
        jersey_number: 7,
        birth_date: '2001-03-20T00:00:00Z',
        reason: 'REFUERZO PARA EL TORNEO',
      },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // the list was invalidated and fetched again
    expect(requestsTo(fetchMock, LIST).length).toBe(2)
  })

  it('omits birth_date when it is left empty', async () => {
    const fetchMock = mockApi({ [LIST]: listBody([]), [CREATE]: { status: 201, body: request } })
    const { user } = renderPage()

    await fillForm(user)

    await screen.findByText('Solicitud de registro enviada')
    const [body] = requestsTo(fetchMock, CREATE) as Record<string, unknown>[]
    expect(body).not.toHaveProperty('birth_date')
  })

  it('shows 422 field errors next to the inputs and keeps what the user typed', async () => {
    mockApi({
      [LIST]: listBody([]),
      [CREATE]: {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: {
              birth_date: 'El jugador debe tener al menos 16 años',
              jersey_number: 'El número ya está registrado',
            },
          },
        },
      },
    })
    const { user } = renderPage()

    const dialog = await fillForm(user, { birthDate: '2015-01-01' })

    expect(await within(dialog).findByText('El jugador debe tener al menos 16 años')).toBeInTheDocument()
    const jersey = within(dialog).getByLabelText(/Número de Camiseta/i)
    expect(within(dialog).getByText('El número ya está registrado')).toBeInTheDocument()
    expect(jersey).toHaveAttribute('aria-invalid', 'true')
    expect(jersey).toHaveAttribute('aria-describedby', 'jersey_number-error')
    expect(jersey).toHaveValue(7)
    expect(within(dialog).getByLabelText(/Fecha de Nacimiento/i)).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByLabelText(/Nombre del Jugador/i)).toHaveValue('CARLOS LÓPEZ')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the rule violation about the tournament in a banner', async () => {
    mockApi({
      [LIST]: listBody([]),
      [CREATE]: {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { tournament_id: 'el registro para este torneo está cerrado' },
          },
        },
      },
    })
    const { user } = renderPage()

    const dialog = await fillForm(user)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('el registro para este torneo está cerrado')
  })

  it('validates required fields in the browser before sending anything', async () => {
    const fetchMock = mockApi({ [LIST]: listBody([]), [CREATE]: { status: 201, body: request } })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: /Nueva Solicitud/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Enviar Solicitud/i }))

    expect(await within(dialog).findByText('El nombre es requerido')).toBeInTheDocument()
    expect(within(dialog).getByText('La posición es requerida')).toBeInTheDocument()
    expect(within(dialog).getByText('El motivo es requerido')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Nombre del Jugador/i)).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, CREATE)).toEqual([])
  })
})
