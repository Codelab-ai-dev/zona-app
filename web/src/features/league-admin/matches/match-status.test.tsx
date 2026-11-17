import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CalendarPage } from './calendar-page'
import { match1, page, tournament } from './test-fixtures'
import type { MatchWithRelations } from './types'

const scheduled: MatchWithRelations = { ...match1, id: 'm-sched', status: 'scheduled' }
const cancelled: MatchWithRelations = { ...match1, id: 'm-canc', status: 'cancelled' }
const finished: MatchWithRelations = { ...match1, id: 'm-fin', status: 'finished', home_score: 2, away_score: 1 }

const setup = (match: MatchWithRelations, statusResponse: { status?: number; body?: unknown } = { status: 204 }) => {
  const fetchMock = mockApi({
    'GET /leagues/league-1/tournaments': page([tournament]),
    'GET /tournaments/tour-1/matches': page([match], 1000),
    [`PATCH /matches/${match.id}/status`]: statusResponse,
  })
  return { fetchMock, ...renderWithProviders(<CalendarPage leagueId="league-1" />) }
}

const openMenu = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
  return screen.findByRole('menu')
}

describe('cancel and reactivate a match (#52)', () => {
  it('cancels a scheduled match after confirming', async () => {
    const { fetchMock, user } = setup(scheduled)
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Cancelar partido' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/queda cancelado/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar partido' }))

    expect(await screen.findByText('Partido cancelado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /matches/m-sched/status')).toEqual([{ status: 'cancelled' }])
  })

  it('reactivates a cancelled match back to scheduled', async () => {
    const { fetchMock, user } = setup(cancelled)
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Reactivar partido' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reactivar' }))

    expect(await screen.findByText('Partido reactivado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /matches/m-canc/status')).toEqual([{ status: 'scheduled' }])
  })

  it('sends nothing when the admin backs out', async () => {
    const { fetchMock, user } = setup(scheduled)
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Cancelar partido' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Volver' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(requestsTo(fetchMock, 'PATCH /matches/m-sched/status')).toHaveLength(0)
  })

  it('offers neither action on a finished match', async () => {
    const { user } = setup(finished)
    const menu = await openMenu(user)
    expect(within(menu).queryByRole('menuitem', { name: /Cancelar partido|Reactivar partido/ })).not.toBeInTheDocument()
  })

  it("shows the API's 409 message when the match finished meanwhile", async () => {
    const message = 'El partido ya finalizó: no se puede cancelar ni reactivar. Para corregirlo, edita su resultado.'
    const { user } = setup(scheduled, { status: 409, body: { error: { code: 'conflict', message } } })
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Cancelar partido' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar partido' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument() // stays open
  })
})
