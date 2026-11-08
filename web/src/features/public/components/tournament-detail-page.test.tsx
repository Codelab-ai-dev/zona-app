import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import {
  apiError, carded, league, team, team2, matchFinished, matchScheduled, page, scorer, standingA, standingB, tournament,
} from './fixtures'
import { TournamentDetailPage } from './tournament-detail-page'

function rowAt(rows: HTMLElement[], i: number): HTMLElement {
  const row = rows[i]
  if (!row) throw new Error(`row ${i} missing`)
  return row
}

const handlers = {
  'GET /leagues/slug/liga-norte': { body: league },
  'GET /tournaments/t1': { body: tournament },
  'GET /teams': { body: { data: [team, team2], page } },
  'GET /tournaments/t1/standings': { body: { data: [standingA, standingB], page } },
  'GET /tournaments/t1/matches': { body: { data: [matchFinished, matchScheduled], page } },
  'GET /tournaments/t1/top-scorers': { body: { data: [scorer], page } },
  'GET /tournaments/t1/discipline': { body: { data: [carded], page } },
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="liga/:slug/torneo/:tournamentId" element={<TournamentDetailPage />} />
    </Routes>,
    { route: '/liga/liga-norte/torneo/t1' },
  )
}

describe('TournamentDetailPage', () => {
  it('renders the tournament header with one h1 and a link back to the league', async () => {
    mockApi(handlers)
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Torneo Apertura' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('1/1/2024 - 31/12/2099')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Liga Norte' })).toHaveAttribute('href', '/liga/liga-norte')
  })

  it('maps standings from the real shape: positions, record, goals and adjusted points', async () => {
    mockApi(handlers)
    renderPage()

    const table = await screen.findByRole('table', { name: 'Tabla de posiciones' })
    for (const h of within(table).getAllByRole('columnheader')) expect(h).toHaveAttribute('scope', 'col')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)

    const first = within(rowAt(rows, 0)).getAllByRole('cell').map((c) => c.textContent)
    expect(first.filter((_, i) => i !== 1)).toEqual(['1', '5', '4', '1', '0', '15', '5', '+10', '13'])
    expect(first[1]).toContain('Tigres FC')
    expect(within(rowAt(rows, 0)).getByRole('link', { name: 'Tigres FC' })).toHaveAttribute('href', '/equipos/team1')

    // 10 on the pitch + (-3) adjustment = 7 shown, adjustment visible with its reason.
    const second = within(rowAt(rows, 1)).getAllByRole('cell')
    expect(second[1]).toHaveTextContent('Leones United')
    expect(second[8]).toHaveTextContent('+3')
    expect(second[9]).toHaveTextContent('7')
    expect(second[9]).toHaveTextContent('Ajuste -3')
    expect(second[9]).toHaveTextContent('Alineación indebida')
  })

  it('switches tabs with the keyboard/mouse and shows matches with team names and scores', async () => {
    mockApi(handlers)
    const { user } = renderPage()
    await screen.findByRole('table', { name: 'Tabla de posiciones' })

    await user.click(screen.getByRole('tab', { name: 'Partidos' }))
    // Names come from standings because match payloads carry only team ids.
    expect((await screen.findAllByText('Tigres FC 3, Leones United 1. Finalizado. 1/2/2024')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Leones United contra Tigres FC. Programado. 8/2/2024').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Jornada 5').length).toBeGreaterThan(0)
    expect(screen.getAllByText('20:30').length).toBeGreaterThan(0)
    // Próximos (1) + Resultados Recientes (1) + Todos los partidos (2).
    expect(screen.getByRole('region', { name: 'Próximos Partidos' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resultados Recientes' })).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Todos los partidos' })).getAllByRole('listitem')).toHaveLength(2)

    await user.click(screen.getByRole('tab', { name: 'Goleadores' }))
    const scorers = await screen.findByRole('table', { name: 'Tabla de goleadores' })
    expect(within(rowAt(within(scorers).getAllByRole('row'), 1)).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '1', 'Juan Pérez', 'Tigres FC', '7', '2', '5',
    ])

    await user.click(screen.getByRole('tab', { name: 'Disciplina' }))
    const discipline = await screen.findByRole('table', { name: 'Tabla de disciplina' })
    expect(within(rowAt(within(discipline).getAllByRole('row'), 1)).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Luis Gómez', 'Leones United', '3', '1', '5',
    ])

    await user.click(screen.getByRole('tab', { name: 'Posiciones' }))
    expect(await screen.findByRole('table', { name: 'Tabla de posiciones' })).toBeInTheDocument()
  })

  it('moves between tabs with arrow keys', async () => {
    mockApi(handlers)
    const { user } = renderPage()
    await screen.findByRole('table', { name: 'Tabla de posiciones' })

    screen.getByRole('tab', { name: 'Posiciones' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Partidos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows empty states per tab', async () => {
    mockApi({
      ...handlers,
      'GET /tournaments/t1/standings': { body: { data: [], page } },
      'GET /tournaments/t1/matches': { body: { data: [], page } },
    })
    const { user } = renderPage()

    expect(await screen.findByText('Aún no hay tabla de posiciones')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Partidos' }))
    expect(await screen.findByText('No hay partidos')).toBeInTheDocument()
  })

  it('retries a failed standings request (2 GETs)', async () => {
    const fetchMock = mockApi({ ...handlers, 'GET /tournaments/t1/standings': { status: 500, body: apiError('Error de tabla') } })
    const { user } = renderPage()

    expect(await screen.findByText('Error de tabla')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /tournaments/t1/standings')).toHaveLength(2))
  })

  it('keeps a single h1 when the tournament cannot be loaded', async () => {
    mockApi({ ...handlers, 'GET /tournaments/t1': { status: 404, body: { error: { code: 'not_found', message: 'No existe' } } } })
    renderPage()

    expect(await screen.findByText('No se pudo cargar el torneo.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
