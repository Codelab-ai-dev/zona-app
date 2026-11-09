import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { QRBatchPage } from './qr-batch-page'
import { league, page, team } from './test-fixtures'

const players = (prefix: string, count: number, extra: object = {}) =>
  page(Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i + 1}`, name: `Jugador ${i + 1}`, team_id: 't', is_active: true, ...extra })))

const leagues = (extra: object = {}) => page([{ ...league, ...extra }])
const twoTeams = {
  'GET /leagues/mine': leagues(),
  'GET /teams': page([team('team-1', 'Los Campeones'), team('team-2', 'Las Águilas')]),
}
const qrBatch = 'POST /leagues/league-1/players/qr-batch'

describe('QRBatchPage', () => {
  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<QRBatchPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows the empty state when the league has no teams', async () => {
    mockApi({ 'GET /leagues/mine': leagues(), 'GET /teams': page([]) })
    renderWithProviders(<QRBatchPage />)
    expect(await screen.findByText('No hay equipos')).toBeInTheDocument()
  })

  it('shows the original title, warning and explanations', async () => {
    mockApi(twoTeams)
    renderWithProviders(<QRBatchPage />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Actualización Masiva de Códigos QR' })).toBeInTheDocument()
    expect(screen.getByText('Importante')).toBeInTheDocument()
    expect(screen.getByText('¿Qué hace esta función?')).toBeInTheDocument()
    expect(screen.getByText('Normalización de Caracteres Especiales')).toBeInTheDocument()
  })

  it('starts with every team selected and can clear and reselect them', async () => {
    mockApi(twoTeams)
    const { user } = renderWithProviders(<QRBatchPage />)

    expect(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Deseleccionar todos' }))
    expect(screen.getByRole('button', { name: /actualizar qr \(0 equipos\)/i })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Los Campeones' }))
    expect(screen.getByRole('button', { name: /actualizar qr \(1 equipos\)/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getByRole('button', { name: 'Actualizar Todos los QR Codes' })).toBeEnabled()
  })

  it('does not run on a league without the Completo mode', async () => {
    mockApi({ ...twoTeams, 'GET /leagues/mine': leagues({ product_mode: 'web_only' }) })
    renderWithProviders(<QRBatchPage />)

    expect(await screen.findByText('No hay ligas con modo Completo que soporten códigos QR')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' })).toBeDisabled()
  })

  it('posts the active players of the selected teams and shows the report', async () => {
    const fetchMock = mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': page([
        { id: 'a-1', name: 'Pedro', team_id: 't', is_active: true },
        { id: 'a-2', name: 'Sebastián Muñoz', team_id: 't', is_active: true },
        { id: 'a-3', name: 'Baja', team_id: 't', is_active: false },
      ]),
      [qrBatch]: { body: { updated: 2 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Deseleccionar todos' }))
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Los Campeones' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr \(1 equipos\)/i }))

    expect(await screen.findByText('Actualización Completada')).toBeInTheDocument()
    expect(screen.getByText('2 Exitosos')).toBeInTheDocument()
    expect(screen.getByText('Nombres Normalizados')).toBeInTheDocument()
    expect(screen.getByText('En QR: Sebastian Munoz')).toBeInTheDocument()
    expect(screen.getByText(/¡Todos los 2 códigos QR fueron regenerados exitosamente!/)).toBeInTheDocument()
    expect(screen.getByText('¡Todos los 2 códigos QR fueron actualizados exitosamente!')).toBeInTheDocument()
    expect(requestsTo(fetchMock, qrBatch)).toEqual([{ players: [{ id: 'a-1' }, { id: 'a-2' }] }])
    expect(requestsTo(fetchMock, 'GET /teams/team-2/players')).toEqual([])
  })

  it('splits more than 200 players into several POSTs and adds up the counts', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leagues(),
      'GET /teams': page([team('team-1', 'Uno'), team('team-2', 'Dos'), team('team-3', 'Tres')]),
      'GET /teams/team-1/players': players('a', 99),
      'GET /teams/team-2/players': players('b', 99),
      'GET /teams/team-3/players': players('c', 99),
      [qrBatch]: { body: { updated: 100 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' }))

    expect(await screen.findByText('200 Exitosos')).toBeInTheDocument()
    const bodies = requestsTo(fetchMock, qrBatch) as Array<{ players: unknown[] }>
    expect(bodies.map((b) => b.players.length)).toEqual([200, 97])
  })

  it('lists the teams whose roster failed and still updates the others', async () => {
    const fetchMock = mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': players('a', 1),
      'GET /teams/team-2/players': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
      [qrBatch]: { body: { updated: 1 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' }))

    expect(await screen.findByText('1 Fallidos')).toBeInTheDocument()
    expect(screen.getByText('Jugadores con errores:')).toBeInTheDocument()
    expect(screen.getAllByText('Las Águilas')).toHaveLength(2) // team row + failure entry
    expect(screen.getByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByText('1 Exitosos')).toBeInTheDocument()
    expect(requestsTo(fetchMock, qrBatch)).toEqual([{ players: [{ id: 'a-1' }] }])
  })

  it('marks every player of a rejected batch as failed with the API message', async () => {
    mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': players('a', 2),
      'GET /teams/team-2/players': page([]),
      [qrBatch]: { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso para esta liga' } } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' }))

    expect(await screen.findByText('2 Fallidos')).toBeInTheDocument()
    expect(screen.getAllByText('No tienes permiso para esta liga')).toHaveLength(2)
    expect(screen.getByText('0 Exitosos')).toBeInTheDocument()
    expect(screen.getByText(/2 jugadores requieren atención manual/)).toBeInTheDocument()
  })

  it('does not call the batch endpoint when the teams have no players', async () => {
    const fetchMock = mockApi({ ...twoTeams, 'GET /teams/team-1/players': page([]), 'GET /teams/team-2/players': page([]) })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Actualizar Todos los QR Codes' }))

    expect(await screen.findByText('No hay jugadores activos para actualizar en los equipos seleccionados.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, qrBatch)).toEqual([])
  })
})
