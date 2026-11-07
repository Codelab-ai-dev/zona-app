import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, matchFinished, matchScheduled, page, player, staff, team, team2, teamStats } from './fixtures'
import { TeamDetailPage } from './team-detail-page'
import { latestMatches, outcomeFor } from './team-matches'
import type { Match } from '../types'

const handlers = {
  'GET /teams/team1': { body: team },
  'GET /teams/team1/players': { body: { data: [player], page } },
  'GET /teams/team1/coaching-staff': { body: { data: [staff], page } },
  'GET /teams/team1/stats': { body: teamStats },
  'GET /teams/team1/matches': { body: { data: [matchScheduled, matchFinished], page } },
  'GET /teams': { body: { data: [team, team2], page } },
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="equipos/:teamId" element={<TeamDetailPage />} />
    </Routes>,
    { route: '/equipos/team1' },
  )
}

describe('TeamDetailPage', () => {
  it('shows the team, stats, roster (public fields only), staff role and matches with opponent names', async () => {
    const fetchMock = mockApi(handlers)
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Tigres FC' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Campeones 2023')).toBeInTheDocument()

    // stats use matches_won/drawn/lost; points include the adjustment (13 - 1)
    const stats = await screen.findByRole('heading', { name: 'Estadísticas' })
    const dl = stats.parentElement!.querySelector('dl')!
    const read = (label: string) => within(dl).getByText(label).nextElementSibling?.textContent
    expect(read('Partidos')).toBe('5')
    expect(read('Victorias')).toBe('4')
    expect(read('Empates')).toBe('1')
    expect(read('Derrotas')).toBe('0')
    expect(read('Goles a favor')).toBe('15')
    expect(read('Puntos')).toBe('12')

    const roster = await screen.findByRole('table', { name: 'Plantilla de jugadores' })
    expect(within(roster).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['#', 'Jugador', 'Posición'])
    expect(within(within(roster).getAllByRole('row').at(1) ?? roster).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '10', 'Carlos Ruiz', 'Delantero',
    ])
    expect(screen.queryByText(/curp|nacimiento|edad/i)).not.toBeInTheDocument()

    expect(await screen.findByText('Mario López')).toBeInTheDocument()
    expect(screen.getByText('Director técnico')).toBeInTheDocument()

    // Most recent first; the opponent name is resolved from the league team list.
    const items = await screen.findAllByRole('listitem')
    const matchItems = items.filter((li) => li.textContent?.includes('Leones United'))
    expect(matchItems).toHaveLength(2)
    expect(matchItems[0]).toHaveTextContent('Leones United vs Tigres FC')
    expect(matchItems[1]).toHaveTextContent('Tigres FC 3 - 1 Leones United')
    expect(matchItems[1]).toHaveTextContent('Victoria')
    expect(matchItems[0]).toHaveTextContent('Programado')
    expect(requestsTo(fetchMock, 'GET /teams')).toHaveLength(1)
    expect(fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes('/api/v1/teams?'))).toContain('league_id=l1')
  })

  it('shows empty roster and staff messages', async () => {
    mockApi({
      ...handlers,
      'GET /teams/team1/players': { body: { data: [], page } },
      'GET /teams/team1/coaching-staff': { body: { data: [], page } },
      'GET /teams/team1/matches': { body: { data: [], page } },
    })
    renderPage()

    expect(await screen.findByText('Aún no hay jugadores registrados.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay cuerpo técnico registrado.')).toBeInTheDocument()
    expect(await screen.findByText('Aún no hay partidos publicados.')).toBeInTheDocument()
  })

  it('shows a friendly message when the team has no stats row (404)', async () => {
    mockApi({ ...handlers, 'GET /teams/team1/stats': { status: 404, body: { error: { code: 'not_found', message: 'no encontrado' } } } })
    renderPage()

    expect(await screen.findByText('Aún no hay estadísticas para este equipo.')).toBeInTheDocument()
  })

  it('shows an error with retry (2 GETs) and keeps one h1', async () => {
    const fetchMock = mockApi({ ...handlers, 'GET /teams/team1': { status: 500, body: apiError('Error de equipo') } })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de equipo')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /teams/team1')).toHaveLength(2))
  })
})

describe('team match helpers', () => {
  const m = (over: Partial<Match>): Match => ({ ...(matchFinished as Match), ...over })

  it.each([
    [{ home_team_id: 'x', away_team_id: 'y', home_score: 2, away_score: 0 }, 'x', 'Victoria'],
    [{ home_team_id: 'x', away_team_id: 'y', home_score: 0, away_score: 2 }, 'x', 'Derrota'],
    [{ home_team_id: 'x', away_team_id: 'y', home_score: 0, away_score: 2 }, 'y', 'Victoria'],
    [{ home_team_id: 'x', away_team_id: 'y', home_score: 1, away_score: 1 }, 'y', 'Empate'],
  ])('outcomeFor %j as %s is %s', (over, teamId, label) => {
    expect(outcomeFor(m(over as Partial<Match>), teamId)?.label).toBe(label)
  })

  it('has no outcome for unfinished matches and sorts latest first without cancelled', () => {
    expect(outcomeFor(m({ status: 'scheduled' }), 'team1')).toBeNull()
    const list = [
      m({ id: 'a', match_date: '2024-01-01T00:00:00Z' }),
      m({ id: 'b', match_date: '2024-03-01T00:00:00Z' }),
      m({ id: 'c', match_date: '2024-04-01T00:00:00Z', status: 'cancelled' }),
    ]
    expect(latestMatches(list, 5).map((x) => x.id)).toEqual(['b', 'a'])
  })
})
