import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, page } from '../test-fixtures'
import { AttendanceMonitor } from './attendance-monitor'

const record = (player_id: string, source: 'qr' | 'facial' = 'qr') => ({
  player_id,
  player_name: `Jugador ${player_id}`,
  recognition_mode: 'quick',
  confidence_score: 0.95,
  similarity_score: 0.9,
  timestamp: '2024-06-15T15:00:00Z',
  source,
})

const rosters = {
  'GET /teams/team-1/players': page([{ id: 'h1', name: 'Ana' }, { id: 'h2', name: 'Beto' }]),
  'GET /teams/team-2/players': page([{ id: 'a1', name: 'Carlos' }]),
}

afterEach(() => vi.useRealTimers())

describe('AttendanceMonitor', () => {
  it('counts present players per team using the rosters', async () => {
    mockApi({ ...rosters, 'GET /matches/match-1/attendance': page([record('h1'), record('a1', 'facial')], 1000) })
    renderWithProviders(<AttendanceMonitor match={match1} />)

    const region = screen.getByRole('status')
    await waitFor(() => expect(region).toHaveAttribute('aria-label', 'Asistencia: 1 del equipo local, 1 del equipo visitante'))
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Tigres FC')).toBeInTheDocument()
    expect(screen.getByText('Leones United')).toBeInTheDocument()
    expect(screen.getByText('Total de jugadores presentes').nextElementSibling).toHaveTextContent('2')
  })

  it('counts both attendees for the same team and ignores players outside both rosters', async () => {
    mockApi({
      ...rosters,
      'GET /matches/match-1/attendance': page([record('h1'), record('h2'), record('stranger')], 1000),
    })
    renderWithProviders(<AttendanceMonitor match={match1} />)

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Asistencia: 2 del equipo local, 0 del equipo visitante'),
    )
    expect(screen.getByText('Total de jugadores presentes').nextElementSibling).toHaveTextContent('2')
  })

  it('polls every 5 seconds and shows new check-ins', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const handlers = { ...rosters, 'GET /matches/match-1/attendance': page([record('h1')], 1000) }
    const fetchMock = mockApi(handlers)
    renderWithProviders(<AttendanceMonitor match={match1} />)

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Asistencia: 1 del equipo local, 0 del equipo visitante'),
    )
    const gets = () => fetchMock.mock.calls.filter(([u, i]) => String(u).includes('/matches/match-1/attendance') && (i?.method ?? 'GET') === 'GET').length
    expect(gets()).toBe(1)

    handlers['GET /matches/match-1/attendance'] = page([record('h1'), record('a1')], 1000)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => expect(gets()).toBe(2))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Asistencia: 1 del equipo local, 1 del equipo visitante'),
    )
    expect(requestsTo(fetchMock, 'GET /matches/match-1/attendance')).toHaveLength(2)
  })

  it('lists who is present with time and method (QR or facial)', async () => {
    mockApi({
      ...rosters,
      'GET /matches/match-1/attendance': page(
        [
          { ...record('a1', 'facial'), player_name: 'Carlos', jersey_number: 7, timestamp: '2024-06-15T15:10:00Z' },
          { ...record('h1', 'qr'), player_name: 'Ana', jersey_number: 9, timestamp: '2024-06-15T15:05:00Z' },
        ],
        1000,
      ),
    })
    renderWithProviders(<AttendanceMonitor match={match1} />)

    const list = await screen.findByRole('list')
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    // Earliest check-in first, with team, jersey and method.
    expect(rows[0]).toHaveTextContent('#9')
    expect(rows[0]).toHaveTextContent('Ana (Tigres FC)')
    expect(rows[0]).toHaveTextContent('QR')
    expect(rows[1]).toHaveTextContent('Carlos (Leones United)')
    expect(rows[1]).toHaveTextContent('Facial')
    expect(within(rows[0] as HTMLElement).getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  })

  it('says nobody has checked in yet', async () => {
    mockApi({ ...rosters, 'GET /matches/match-1/attendance': page([], 1000) })
    renderWithProviders(<AttendanceMonitor match={match1} />)
    expect(await screen.findByText('Aún no hay jugadores registrados.')).toBeInTheDocument()
  })
})
