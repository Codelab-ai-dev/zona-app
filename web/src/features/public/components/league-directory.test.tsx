import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LeagueDirectory } from './league-directory'
import { apiError, league, league2, page, team, team2, tournament } from './fixtures'

const auth = vi.hoisted(() => ({ value: { status: 'anonymous', profile: null } as { status: string; profile: { role: string } | null } }))
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => auth.value }))

const baseHandlers = {
  'GET /leagues': { body: { data: [league, league2], page } },
  'GET /teams': { body: { data: [team, team2], page } },
  'GET /leagues/l1/tournaments': { body: { data: [tournament], page } },
  'GET /leagues/l2/tournaments': { body: { data: [], page } },
}

describe('LeagueDirectory', () => {
  it('redirects authenticated visitors of / to the dashboard, but not while loading', async () => {
    mockApi(baseHandlers)
    auth.value = { status: 'loading', profile: null }
    const { unmount } = renderWithProviders(<LeagueDirectory />, { route: '/' })
    expect(await screen.findByRole('heading', { name: 'Liga Norte', level: 3 })).toBeInTheDocument()
    unmount()

    auth.value = { status: 'authenticated', profile: { role: 'team_owner' } }
    renderWithProviders(
      <Routes>
        <Route path="/" element={<LeagueDirectory />} />
        <Route path="/dashboard" element={<p>Panel</p>} />
      </Routes>,
      { route: '/' },
    )
    expect(await screen.findByText('Panel')).toBeInTheDocument()
    auth.value = { status: 'anonymous', profile: null }
  })

  it('has one h1 and links each league to its page', async () => {
    mockApi(baseHandlers)
    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByRole('heading', { name: 'Liga Norte', level: 3 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const link = screen.getByRole('link', { name: /ver liga.*liga norte/i })
    expect(link).toHaveAttribute('href', '/liga/liga-norte')
  })

  it('shows team count and running tournament for the current league only', async () => {
    const fetchMock = mockApi(baseHandlers)
    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByText('Torneo Apertura')).toBeInTheDocument()
    expect(screen.getByText('Equipos').previousElementSibling).toHaveTextContent('2')
    // N+1 guard: 2 leagues, but stats requested only for the visible slide.
    expect(requestsTo(fetchMock, 'GET /teams')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /leagues/l1/tournaments')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /leagues/l2/tournaments')).toHaveLength(0)
    const teamCall = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes('/teams'))
    expect(teamCall).toContain('league_id=l1')
  })

  it('carousel buttons are keyboard operable and load stats lazily', async () => {
    const fetchMock = mockApi(baseHandlers)
    const { user } = renderWithProviders(<LeagueDirectory />)
    await screen.findByText('Torneo Apertura')

    const next = screen.getByRole('button', { name: 'Siguiente liga' })
    next.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(requestsTo(fetchMock, 'GET /leagues/l2/tournaments')).toHaveLength(1))
    expect(requestsTo(fetchMock, 'GET /teams')).toHaveLength(2)
    // Only the visible slide is reachable (hidden ones are inert).
    const slides = screen.getAllByRole('group', { hidden: true })
    expect(slides[0]).toHaveAttribute('inert')
    expect(slides[1]).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Ir a Liga Sur' })).toHaveAttribute('aria-current', 'true')

    await user.keyboard('{Enter}') // focus is still on "next": wraps to first league
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ir a Liga Norte' })).toHaveAttribute('aria-current', 'true'))

    screen.getByRole('button', { name: 'Liga anterior' }).focus()
    await user.keyboard(' ')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ir a Liga Sur' })).toHaveAttribute('aria-current', 'true'))
  })

  it('does not show a team count when the stats request fails', async () => {
    mockApi({ ...baseHandlers, 'GET /teams': { status: 500, body: apiError('boom') } })
    renderWithProviders(<LeagueDirectory />)

    await screen.findByRole('heading', { name: 'Liga Norte', level: 3 })
    await screen.findByText('Torneo Apertura')
    expect(screen.queryByText('Equipos')).not.toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockApi({ 'GET /leagues': { body: { data: [], page } } })
    renderWithProviders(<LeagueDirectory />)

    expect(await screen.findByText('No hay ligas disponibles')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Siguiente liga' })).not.toBeInTheDocument()
  })

  it('retries GET /leagues from the error state', async () => {
    const fetchMock = mockApi({ 'GET /leagues': { status: 500, body: apiError('Error interno del servidor') } })
    const { user } = renderWithProviders(<LeagueDirectory />)

    expect(await within(await screen.findByRole('alert')).findByText('Error interno del servidor')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /leagues')).toHaveLength(2))
  })
})
