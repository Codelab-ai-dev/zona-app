import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CalendarPage } from './calendar-page'
import { AttendanceMonitor } from './components/attendance-monitor'
import { match1, page, tournament } from './test-fixtures'
import type { MatchWithRelations } from './types'

type User = ReturnType<typeof renderWithProviders>['user']

const finished: MatchWithRelations = { ...match1, id: 'm-fin', status: 'finished', home_score: 2, away_score: 1 }
const reopened = { goals_removed: 3, cards_removed: 1, incidents_removed: 0, suspensions_removed: 1, suspensions_kept: 0, fines_cancelled: 1, fines_kept: 0 }

const calendar = (match: MatchWithRelations, reopen: { status?: number; body?: unknown } = { body: reopened }) => {
  const fetchMock = mockApi({
    'GET /leagues/league-1/tournaments': page([tournament]),
    'GET /tournaments/tour-1/matches': page([match], 1000),
    [`POST /matches/${match.id}/reopen`]: reopen,
  })
  return { fetchMock, ...renderWithProviders(<CalendarPage leagueId="league-1" />) }
}

const openReopen = async (user: User) => {
  await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
  await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Reabrir partido' }))
  return screen.findByRole('alertdialog')
}

const fillAndConfirm = async (user: User, dialog: HTMLElement, button: string) => {
  const confirm = within(dialog).getByRole('button', { name: button })
  expect(confirm).toBeDisabled()
  await user.type(within(dialog).getByLabelText(/Motivo/), 'Capturado en el partido equivocado')
  expect(confirm).toBeDisabled() // the second confirmation is still missing
  await user.click(within(dialog).getByRole('checkbox'))
  expect(confirm).toBeEnabled()
  await user.click(confirm)
}

describe('reopen a finished match (#53)', () => {
  it('needs a reason and the acknowledgement, then reports what was undone', async () => {
    const { fetchMock, user } = calendar(finished)
    const dialog = await openReopen(user)
    expect(within(dialog).getByText(/Programado 0-0/)).toBeInTheDocument()

    await fillAndConfirm(user, dialog, 'Reabrir partido')

    expect(await screen.findByText(/Partido reabierto: se quitaron 3 goles, 1 tarjetas/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/m-fin/reopen')).toEqual([{ reason: 'CAPTURADO EN EL PARTIDO EQUIVOCADO' }]) // textareas are uppercase app-wide
  })

  it('warns about paid fines and served suspensions it kept', async () => {
    const { user } = calendar(finished, { body: { ...reopened, fines_kept: 2, suspensions_kept: 1 } })
    await fillAndConfirm(user, await openReopen(user), 'Reabrir partido')

    expect(await screen.findByText(/2 multa\(s\) ya pagada\(s\)/)).toBeInTheDocument()
    expect(screen.getByText(/1 suspensión\(es\) ya en cumplimiento/)).toBeInTheDocument()
  })

  it("shows the API's message and keeps the dialog open on failure", async () => {
    const message = 'Solo se puede reabrir un partido finalizado.'
    const { user } = calendar(finished, { status: 409, body: { error: { code: 'conflict', message } } })
    await fillAndConfirm(user, await openReopen(user), 'Reabrir partido')

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('is only offered on finished matches', async () => {
    const { user } = calendar({ ...match1, id: 'm-sched', status: 'scheduled' })
    await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
    expect(within(await screen.findByRole('menu')).queryByRole('menuitem', { name: 'Reabrir partido' })).not.toBeInTheDocument()
  })
})

const record = { player_id: 'h1', player_name: 'Ana', recognition_mode: 'quick', confidence_score: 1, similarity_score: 1, timestamp: '2024-06-15T15:00:00Z', source: 'qr' }
const monitor = (match: MatchWithRelations) => {
  const fetchMock = mockApi({
    'GET /teams/team-1/players': page([{ id: 'h1', name: 'Ana' }]),
    'GET /teams/team-2/players': page([]),
    [`GET /matches/${match.id}/attendance`]: page([record], 1000),
    [`DELETE /matches/${match.id}/attendance/h1`]: { body: { qr_removed: 1, facial_removed: 0 } },
  })
  return { fetchMock, ...renderWithProviders(<AttendanceMonitor match={match} />) }
}

describe('delete a wrong attendance (#53)', () => {
  it('removes a player with a reason and the acknowledgement', async () => {
    const { fetchMock, user } = monitor(match1)
    await user.click(await screen.findByRole('button', { name: 'Eliminar asistencia de Ana' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/QR y facial/)).toBeInTheDocument()

    await fillAndConfirm(user, dialog, 'Eliminar asistencia')

    expect(await screen.findByText('Asistencia de Ana eliminada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /matches/match-1/attendance/h1')).toEqual([{ reason: 'CAPTURADO EN EL PARTIDO EQUIVOCADO' }]) // textareas are uppercase app-wide
  })

  it('offers no delete on a finished match', async () => {
    monitor({ ...match1, status: 'finished' })
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar asistencia/ })).not.toBeInTheDocument()
  })
})
