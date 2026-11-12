import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, league, matchFinished, matchScheduled, page, standingA, standingB, tournament } from './fixtures'
import { LeagueDetailPage } from './league-detail-page'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="liga/:slug" element={<LeagueDetailPage />} />
    </Routes>,
    { route: '/liga/liga-norte' },
  )
}

describe('LeagueDetailPage', () => {
  it('shows the league as the only h1 and tournament cards linking to the tournament', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': {
        body: {
          data: [
            tournament,
            { ...tournament, id: 't0', name: 'Torneo Viejo', start_date: '2020-01-01', end_date: '2020-06-30' },
            { ...tournament, id: 'tf', name: 'Torneo Futuro', start_date: '2090-01-01', end_date: '2090-06-30' },
          ],
          page,
        },
      },
    })
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Liga Norte' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Fútbol 7 los domingos')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Torneos' })).toBeInTheDocument()

    const current = screen.getByRole('link', { name: /Torneo Apertura/ })
    expect(current).toHaveAttribute('href', '/liga/liga-norte/torneo/t1')
    expect(current).toHaveTextContent('En Curso')
    expect(current).toHaveTextContent('1/1/2024')
    expect(screen.getByRole('link', { name: /Torneo Viejo/ })).toHaveTextContent('Finalizado')
    expect(screen.getByRole('link', { name: /Torneo Futuro/ })).toHaveTextContent('Próximamente')
  })

  it('shows the team and match counts of each tournament card from the public endpoints', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [tournament], page } },
      'GET /tournaments/t1/standings': { body: { data: [standingA, standingB], page } },
      'GET /tournaments/t1/matches': { body: { data: [matchFinished, matchScheduled, { ...matchScheduled, id: 'm3' }], page } },
    })
    renderPage()

    const card = await screen.findByRole('link', { name: /Torneo Apertura/ })
    await waitFor(() => expect(card).toHaveTextContent('2 equipos'))
    expect(card).toHaveTextContent('3 partidos')
  })

  it('shows an empty state when the league has no tournaments', async () => {
    mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { body: { data: [], page } },
    })
    renderPage()

    expect(await screen.findByText('Esta liga aún no tiene torneos')).toBeInTheDocument()
  })

  it('shows a not-found error with a single h1 and retries the league request', async () => {
    const fetchMock = mockApi({
      'GET /leagues/slug/liga-norte': { status: 404, body: { error: { code: 'not_found', message: 'Liga no encontrada' } } },
    })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Liga no encontrada')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /leagues/slug/liga-norte')).toHaveLength(2))
  })

  it('shows the tournaments error with retry', async () => {
    const fetchMock = mockApi({
      'GET /leagues/slug/liga-norte': { body: league },
      'GET /leagues/l1/tournaments': { status: 500, body: apiError('Error de torneos') },
    })
    const { user } = renderPage()

    expect(await screen.findByText('Error de torneos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /leagues/l1/tournaments')).toHaveLength(2))
  })
})
