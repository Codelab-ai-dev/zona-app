import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CalendarPage } from './calendar-page'
import { match1, match2, match3, page, tournament } from './test-fixtures'

const baseHandlers = (matches: unknown[]) => ({
  'GET /leagues/league-1/tournaments': page([tournament]),
  'GET /tournaments/tour-1/matches': page(matches, 1000),
})

describe('CalendarPage', () => {
  it('groups matches by round and shows the real team names', async () => {
    mockApi(baseHandlers([match1, match2, match3]))
    renderWithProviders(<CalendarPage leagueId="league-1" />)

    const round1 = (await screen.findByRole('heading', { name: 'Jornada 1' })).parentElement!.parentElement!
    const round2 = screen.getByRole('heading', { name: 'Jornada 2' }).parentElement!.parentElement!

    for (const name of ['Tigres FC', 'Leones United', 'Águilas SC', 'Pumas CD']) {
      expect(within(round1).getByText(name)).toBeInTheDocument()
    }
    expect(within(round1).getAllByRole('listitem')).toHaveLength(2)
    expect(within(round2).getAllByRole('listitem')).toHaveLength(1)
    expect(within(round2).getByText('Leones United')).toBeInTheDocument()
    expect(within(round2).getByText('Águilas SC')).toBeInTheDocument()
  })

  it('shows the empty state when the tournament has no matches', async () => {
    mockApi(baseHandlers([]))
    renderWithProviders(<CalendarPage leagueId="league-1" />)
    expect(await screen.findByText(/no hay partidos para este torneo/i)).toBeInTheDocument()
  })

  it('shows an error with retry when matches fail to load', async () => {
    mockApi({
      'GET /leagues/league-1/tournaments': page([tournament]),
      'GET /tournaments/tour-1/matches': { status: 500, body: { error: { code: 'internal', message: 'Falla del servidor' } } },
    })
    renderWithProviders(<CalendarPage leagueId="league-1" />)
    expect(await screen.findByText('Falla del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('publishes a round with is_published=true and the badges change after the refetch', async () => {
    const handlers = {
      ...baseHandlers([match1, match2, match3]),
      'POST /tournaments/tour-1/rounds/1/publish': { status: 204 },
    }
    const fetchMock = mockApi(handlers)
    const real = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (init?.method === 'POST') {
        // The server now reports round 1 as published.
        handlers['GET /tournaments/tour-1/matches'] = page(
          [{ ...match1, is_published: true }, { ...match2, is_published: true }, match3],
          1000,
        )
      }
      return real(input, init)
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    expect(await screen.findAllByText('Borrador')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Publicar jornada' }))

    expect(await screen.findByText('Jornada 1 publicada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/rounds/1/publish')).toEqual([{ is_published: true }])
    await waitFor(() => expect(screen.queryByText('Borrador')).not.toBeInTheDocument())
    expect(screen.getAllByText('Publicado')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Publicar jornada' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting a scheduled match, then DELETEs it and refreshes', async () => {
    const handlers = { ...baseHandlers([match1, match2]), 'DELETE /matches/match-1': { status: 204 } }
    const fetchMock = mockApi(handlers)
    const real = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (init?.method === 'DELETE') handlers['GET /tournaments/tour-1/matches'] = page([match2], 1000)
      return real(input, init)
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    const card = (await screen.findByText('Tigres FC')).closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Eliminar' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/no se puede deshacer/i)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /matches/match-1')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Partido eliminado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /matches/match-1')).toHaveLength(1)
    await waitFor(() => expect(screen.queryByText('Tigres FC')).not.toBeInTheDocument())
    expect(screen.getByText('Pumas CD')).toBeInTheDocument()
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const fetchMock = mockApi({ ...baseHandlers([match1]), 'DELETE /matches/match-1': { status: 204 } })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    const card = (await screen.findByText('Tigres FC')).closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Eliminar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(requestsTo(fetchMock, 'DELETE /matches/match-1')).toHaveLength(0)
  })

  it('shows the API message when publishing a round fails', async () => {
    mockApi({
      ...baseHandlers([match1]),
      'POST /tournaments/tour-1/rounds/1/publish': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso' } } },
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Publicar jornada' }))
    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })

  describe('per-match and per-round entry points', () => {
    const rosters = {
      'GET /teams/team-1/players': page([]),
      'GET /teams/team-2/players': page([]),
      'GET /teams/team-3/players': page([]),
      'GET /teams/team-4/players': page([]),
    }
    const openMenuItem = async (user: ReturnType<typeof renderWithProviders>['user'], teamName: string, item: string) => {
      const card = (await screen.findByText(teamName)).closest('li')!
      await user.click(within(card).getByRole('button', { name: 'Más acciones' }))
      await user.click(await screen.findByRole('menuitem', { name: item }))
    }

    it('opens the QR dialog for that match with tournament and league slug', async () => {
      mockApi({ ...baseHandlers([match1, match2]), 'GET /matches/match-2': { body: match2 } })
      const { user } = renderWithProviders(<CalendarPage leagueId="league-1" leagueSlug="liga-principal" />)

      await openMenuItem(user, 'Águilas SC', 'Código QR')

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: /código qr/i })).toBeInTheDocument()
      expect(within(dialog).getAllByText('Águilas SC vs Pumas CD').length).toBeGreaterThan(0)
      const svg = dialog.querySelector('svg')
      expect(svg).not.toBeNull()
    })

    it('opens the attendance monitor for that match', async () => {
      mockApi({ ...baseHandlers([match1, match2]), ...rosters, 'GET /matches/match-1/attendance': page([], 1000) })
      const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

      await openMenuItem(user, 'Tigres FC', 'Asistencia')

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Tigres FC vs Leones United')).toBeInTheDocument()
      expect(within(dialog).getByText('Monitoreo de Asistencias')).toBeInTheDocument()
    })

    it('opens the referee report for that match', async () => {
      mockApi({
        ...baseHandlers([match1, match2]),
        'GET /matches/match-2/referee-report': { status: 404, body: { error: { code: 'not_found', message: 'Sin informe' } } },
      })
      const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

      await openMenuItem(user, 'Águilas SC', 'Acta arbitral')

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: 'Informe del Árbitro' })).toBeInTheDocument()
      expect(within(dialog).getByText('Águilas SC vs Pumas CD')).toBeInTheDocument()
    })

    it('opens the poster generator preselected on that round with only its matches', async () => {
      mockApi(baseHandlers([match1, match2, match3]))
      const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

      const round1 = (await screen.findByRole('heading', { name: 'Jornada 1' })).parentElement!.parentElement!
      await user.click(within(round1).getByRole('button', { name: 'Póster de la jornada' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Generar Imagen de Partidos')).toBeInTheDocument()
      expect(within(dialog).getByText('JORNADA 1')).toBeInTheDocument()
      expect(within(dialog).getAllByText('Pumas CD').length).toBeGreaterThan(0)
      expect(within(dialog).queryByText('Leones United vs Águilas SC')).not.toBeInTheDocument()
    })
  })
})
