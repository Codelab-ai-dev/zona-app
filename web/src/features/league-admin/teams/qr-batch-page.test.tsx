import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { QRBatchPage } from './qr-batch-page'
import { leaguesMine, page, team } from './test-fixtures'

const players = (prefix: string, count: number) =>
  page(Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i + 1}`, name: `Jugador ${i + 1}`, team_id: 't' })))

const twoTeams = {
  'GET /leagues/mine': leaguesMine,
  'GET /teams': page([team('team-1', 'Los Campeones'), team('team-2', 'Las Águilas')]),
}

describe('QRBatchPage', () => {
  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<QRBatchPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows the empty state when the league has no teams', async () => {
    mockApi({ 'GET /leagues/mine': leaguesMine, 'GET /teams': page([]) })
    renderWithProviders(<QRBatchPage />)
    expect(await screen.findByText('No hay equipos')).toBeInTheDocument()
  })

  it('selects and clears every team, keeping the button disabled with no selection', async () => {
    mockApi(twoTeams)
    const { user } = renderWithProviders(<QRBatchPage />)

    const run = await screen.findByRole('button', { name: /actualizar qr \(0 equipos\)/i })
    expect(run).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getByRole('button', { name: /actualizar qr \(2 equipos\)/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Deseleccionar todos' }))
    expect(screen.getByRole('button', { name: /actualizar qr \(0 equipos\)/i })).toBeDisabled()
  })

  it('posts the players of the selected teams and shows the updated count', async () => {
    const fetchMock = mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': players('a', 2),
      'POST /leagues/league-1/players/qr-batch': { body: { updated: 2 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar Los Campeones' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr \(1 equipos\)/i }))

    expect(await screen.findByText('Actualización completada exitosamente')).toBeInTheDocument()
    expect(screen.getByText('Se actualizaron 2 códigos QR')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/players/qr-batch')).toEqual([
      { players: [{ id: 'a-1' }, { id: 'a-2' }] },
    ])
    expect(requestsTo(fetchMock, 'GET /teams/team-2/players')).toEqual([])
  })

  it('splits more than 200 players into several POSTs and adds up the counts', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Uno'), team('team-2', 'Dos'), team('team-3', 'Tres')]),
      'GET /teams/team-1/players': players('a', 99),
      'GET /teams/team-2/players': players('b', 99),
      'GET /teams/team-3/players': players('c', 99),
      'POST /leagues/league-1/players/qr-batch': { body: { updated: 100 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Seleccionar todos' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr/i }))

    expect(await screen.findByText('Se actualizaron 200 códigos QR')).toBeInTheDocument()
    const bodies = requestsTo(fetchMock, 'POST /leagues/league-1/players/qr-batch') as Array<{ players: unknown[] }>
    expect(bodies.map((b) => b.players.length)).toEqual([200, 97])
  })

  it('lists the teams whose roster failed and still updates the others', async () => {
    const fetchMock = mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': players('a', 1),
      'GET /teams/team-2/players': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
      'POST /leagues/league-1/players/qr-batch': { body: { updated: 1 } },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('button', { name: 'Seleccionar todos' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr/i }))

    expect(await screen.findByText('Actualización parcial')).toBeInTheDocument()
    expect(screen.getByText('Las Águilas: Error del servidor')).toBeInTheDocument()
    expect(screen.getByText('Se actualizaron 1 códigos QR')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/players/qr-batch')).toEqual([{ players: [{ id: 'a-1' }] }])
  })

  it('shows the API error when the batch is rejected', async () => {
    mockApi({
      ...twoTeams,
      'GET /teams/team-1/players': players('a', 1),
      'POST /leagues/league-1/players/qr-batch': {
        status: 403,
        body: { error: { code: 'forbidden', message: 'No tienes permiso para esta liga' } },
      },
    })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar Los Campeones' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr/i }))

    expect(await screen.findByText('Lote 1: No tienes permiso para esta liga')).toBeInTheDocument()
    expect(screen.getByText('Se actualizaron 0 códigos QR')).toBeInTheDocument()
  })

  it('does not call the batch endpoint when the teams have no players', async () => {
    const fetchMock = mockApi({ ...twoTeams, 'GET /teams/team-1/players': page([]) })
    const { user } = renderWithProviders(<QRBatchPage />)

    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar Los Campeones' }))
    await user.click(screen.getByRole('button', { name: /actualizar qr/i }))

    expect(await screen.findByText('No hay jugadores para actualizar')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/players/qr-batch')).toEqual([])
  })
})
