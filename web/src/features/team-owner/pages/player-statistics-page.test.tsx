import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, listBody, playerStat, serverError, teamStats } from '../test-fixtures'
import { PlayerStatisticsPage } from './player-statistics-page'

const STATS = `GET /teams/${TEAM_ID}/player-stats`
const TEAM_STATS = `GET /teams/${TEAM_ID}/stats`

const keeper = { ...playerStat, player_id: 'player-2', name: 'Carlos López', jersey_number: 1, position: 'Portero', goals: 0, assists: 0, yellow_cards: 0, matches_played: 3, minutes_played: 270 }
const winger = { ...playerStat, player_id: 'player-3', name: 'Ana Ruiz', jersey_number: 7, position: 'Extremo Derecho', goals: 6, assists: 1 }

function renderPage() {
  return renderWithProviders(<PlayerStatisticsPage teamId={TEAM_ID} />)
}

/** Value shown in the summary card labelled `label`. */
function cardValue(label: string): string | null {
  const caption = screen.getByText(label, { selector: 'p' })
  return within(caption.parentElement as HTMLElement).getAllByText(/^\d+$/)[0]?.textContent ?? null
}

describe('PlayerStatisticsPage', () => {
  it('renders the page title and description', async () => {
    mockApi({ [STATS]: { body: { data: [] } }, [TEAM_STATS]: listBody([teamStats]) })
    renderPage()

    expect(await screen.findByText('Estadísticas de Jugadores')).toBeInTheDocument()
    expect(screen.getByText('Rendimiento individual de cada jugador del equipo.')).toBeInTheDocument()
  })

  it('lists PJ, goals, assists, yellow, red and minutes per player, most goals first', async () => {
    mockApi({ [STATS]: { body: { data: [keeper, playerStat, winger] } }, [TEAM_STATS]: listBody([teamStats]) })
    renderPage()

    await screen.findByText('Juan Pérez')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.querySelector('p')?.textContent)).toEqual(['Ana Ruiz', 'Juan Pérez', 'Carlos López'])
    const cells = within(rows[1] as HTMLElement).getAllByRole('cell').map((c) => c.textContent)
    expect(cells.slice(1)).toEqual(['Delantero', '#10', '5', '4', '2', '1', '0', '410'])
    expect(screen.getByRole('columnheader', { name: 'Min.' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'TA' })).toBeInTheDocument()
    expect(screen.queryByText(/se mostrarán cuando el árbitro/)).not.toBeInTheDocument()
  })

  it('shows the player count and the team totals', async () => {
    mockApi({ [STATS]: { body: { data: [playerStat, keeper] } }, [TEAM_STATS]: listBody([teamStats]) })
    renderPage()

    await screen.findByText('Juan Pérez')
    expect(cardValue('Jugadores')).toBe('2')
    expect(cardValue('Goles Totales')).toBe('25')
    expect(cardValue('Tarjetas Amarillas')).toBe('12')
    expect(cardValue('Tarjetas Rojas')).toBe('1')
  })

  it('shows zero totals when the team has no stats row', async () => {
    mockApi({ [STATS]: { body: { data: [playerStat] } }, [TEAM_STATS]: listBody([]) })
    renderPage()

    await screen.findByText('Juan Pérez')
    expect(cardValue('Goles Totales')).toBe('0')
  })

  it('shows the empty state when there are no players', async () => {
    mockApi({ [STATS]: { body: { data: [] } }, [TEAM_STATS]: listBody([]) })
    renderPage()

    expect(await screen.findByText('Sin jugadores registrados')).toBeInTheDocument()
  })

  it('shows the API error and reloads on retry', async () => {
    mockApi({ [STATS]: serverError, [TEAM_STATS]: listBody([]) })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    const fetchMock = mockApi({ [STATS]: { body: { data: [playerStat] } }, [TEAM_STATS]: listBody([]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(requestsTo(fetchMock, STATS)).toHaveLength(1)
  })

  it('shows a retryable alert when only the team stats fail', async () => {
    mockApi({ [STATS]: { body: { data: [playerStat] } }, [TEAM_STATS]: serverError })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las estadísticas del equipo.')
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
  })
})
