import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, suspension } from '../test-fixtures'
import { SuspensionsPageComponent } from './suspensions'

const listRoute = 'GET /leagues/league-1/suspensions'
const team = { id: 'team-1', name: 'Tigres', slug: 'tigres', league_id: 'league-1', owner_id: 'o', is_active: true, created_at: '', updated_at: '' }
const player = { id: 'player-1', name: 'Carlos Ruiz', team_id: 'team-1', position: 'DEL', jersey_number: 9, is_active: true }
const roster = {
  'GET /teams': list([team]),
  'GET /teams/team-1/players': list([player]),
}

describe('Suspensions page', () => {
  it('lists suspensions with their status and progress', async () => {
    mockApi({
      ...mineOne,
      [listRoute]: list([suspension(), suspension({ id: 's2', reason: 'Insultos', status: 'completed' })]),
    })
    renderWithProviders(<SuspensionsPageComponent />)

    expect(await screen.findByText('Agresión')).toBeInTheDocument()
    expect(screen.getByText('Insultos')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Completada')).toBeInTheDocument()
    expect(screen.getAllByText('1 / 3')).toHaveLength(2)
    // only the active one offers actions
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(1)
  })

  it('shows the empty state', async () => {
    mockApi({ ...mineOne, [listRoute]: list([]) })
    renderWithProviders(<SuspensionsPageComponent />)

    expect(await screen.findByText('No hay suspensiones registradas')).toBeInTheDocument()
  })

  it('shows the API error', async () => {
    mockApi({ ...mineOne, [listRoute]: apiError(500, 'internal', 'Falla en suspensiones') })
    renderWithProviders(<SuspensionsPageComponent />)

    expect(await screen.findByText('Falla en suspensiones')).toBeInTheDocument()
  })

  it('creates a suspension picking team and player from the league roster', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      ...roster,
      [listRoute]: list([]),
      'POST /suspensions': { status: 201, body: suspension() },
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nueva suspensión/i }))
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.click(screen.getByLabelText('Jugador'))
    await user.click(await screen.findByRole('option', { name: /Carlos Ruiz/ }))
    await user.type(screen.getByLabelText('Motivo'), 'agresión al árbitro')
    const matches = screen.getByLabelText('Jornadas a Suspender')
    await user.clear(matches)
    await user.type(matches, '3')
    await user.type(screen.getByLabelText('Notas'), 'ver video')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Suspensión creada correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /suspensions')).toEqual([
      {
        player_id: 'player-1',
        team_id: 'team-1',
        suspension_type: 'red_card',
        reason: 'AGRESIÓN AL ÁRBITRO',
        matches_to_serve: 3,
        notes: 'VER VIDEO',
      },
    ])
    expect(requestsTo(fetchMock, listRoute).length).toBeGreaterThanOrEqual(2)
  })

  it('requires team, player and reason before sending', async () => {
    const fetchMock = mockApi({ ...mineOne, ...roster, [listRoute]: list([]) })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nueva suspensión/i }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('El motivo es obligatorio')).toBeInTheDocument()
    expect(screen.getByLabelText('Equipo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Equipo')).toHaveAccessibleDescription('Selecciona un equipo')
    expect(screen.getByLabelText('Jugador')).toHaveAccessibleDescription('Selecciona un jugador')
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /suspensions')).toEqual([])
  })

  it('maps API field errors and keeps the typed reason', async () => {
    mockApi({
      ...mineOne,
      ...roster,
      [listRoute]: list([]),
      'POST /suspensions': apiError(422, 'validation_failed', 'Datos inválidos', { matches_to_serve: 'debe ser mayor a 0' }),
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nueva suspensión/i }))
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.click(screen.getByLabelText('Jugador'))
    await user.click(await screen.findByRole('option', { name: /Carlos Ruiz/ }))
    await user.type(screen.getByLabelText('Motivo'), 'x')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('debe ser mayor a 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Jornadas a Suspender')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Motivo')).toHaveValue('X')
  })

  it('edits matches and notes with PUT /suspensions/{id}', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([suspension()]),
      'PUT /suspensions/susp-1': { body: suspension({ matches_to_serve: 5 }) },
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const matches = screen.getByLabelText('Jornadas a Suspender')
    expect(matches).toHaveValue(3)
    await user.clear(matches)
    await user.type(matches, '5')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Suspensión actualizada correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PUT /suspensions/susp-1')).toEqual([{ matches_to_serve: 5, notes: 'Revisar video' }])
  })

  it('asks for confirmation before cancelling and then posts to /cancel', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([suspension()]),
      'POST /suspensions/susp-1/cancel': { body: suspension({ status: 'cancelled' }) },
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, 'POST /suspensions/susp-1/cancel')).toEqual([])
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Cancelar Suspensión')
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    expect(await screen.findByText('Suspensión cancelada correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /suspensions/susp-1/cancel')).toEqual([{}])
  })

  it('keeps the suspension when the cancel confirmation is dismissed', async () => {
    const fetchMock = mockApi({ ...mineOne, [listRoute]: list([suspension()]) })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'No, mantener' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  })

  it('completes a suspension after confirmation', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([suspension()]),
      'POST /suspensions/susp-1/complete': { body: suspension({ status: 'completed' }) },
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Completar' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Completar Suspensión')
    await user.click(screen.getByRole('button', { name: 'Sí, completar' }))

    expect(await screen.findByText('Suspensión completada correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /suspensions/susp-1/complete')).toEqual([{}])
  })

  it('shows the API error and keeps the dialog when cancelling fails', async () => {
    mockApi({
      ...mineOne,
      [listRoute]: list([suspension()]),
      'POST /suspensions/susp-1/cancel': apiError(403, 'forbidden', 'No tienes permiso'),
    })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
