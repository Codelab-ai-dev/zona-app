import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CalendarPage } from './calendar-page'
import { match1, match2, match3, page, teamA, teamB, teamC, teamD, tournament } from './test-fixtures'

const leagueTeams = [teamA, teamB, teamC, teamD].map((t) => ({ ...t, tournament_id: 'tour-1', is_active: true }))

const base = (matches: unknown[]) => ({
  'GET /leagues/league-1/tournaments': page([tournament]),
  'GET /tournaments/tour-1/matches': page(matches, 1000),
  'POST /knowledge/triggers': { status: 204 },
  'POST /notifications/leagues/league-1': { status: 204 },
})

type Mock = ReturnType<typeof mockApi>
const deleteUrls = (m: Mock) =>
  m.mock.calls.filter(([, init]) => init?.method === 'DELETE').map(([input]) => String(input).replace('/api/v1', ''))

describe('round publishing', () => {
  it('unpublishes a published round with is_published=false and skips the follow-ups', async () => {
    const fetchMock = mockApi({ ...base([match3]), 'POST /tournaments/tour-1/rounds/2/publish': { status: 204 } })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Despublicar' }))

    expect(await screen.findByText(/Jornada 2 despublicada/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/rounds/2/publish')).toEqual([{ is_published: false }])
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toHaveLength(0)
    expect(requestsTo(fetchMock, 'POST /notifications/leagues/league-1')).toHaveLength(0)
  })

  it('publishing runs the knowledge and WhatsApp follow-ups for that round', async () => {
    const fetchMock = mockApi({ ...base([match1]), 'POST /tournaments/tour-1/rounds/1/publish': { status: 204 } })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Publicar jornada' }))

    expect(await screen.findByText('Jornada 1 publicada exitosamente')).toBeInTheDocument()
    await waitFor(() => expect(requestsTo(fetchMock, 'POST /notifications/leagues/league-1')).toHaveLength(1))
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/rounds/1/publish')).toEqual([{ is_published: true }])
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toEqual([
      { trigger_type: 'jornada_update', league_id: 'league-1', tournament_id: 'tour-1', round: 1 },
    ])
    expect(requestsTo(fetchMock, 'POST /notifications/leagues/league-1')).toEqual([
      { league_id: 'league-1', tournament_id: 'tour-1', round: 1 },
    ])
  })

  it('warns, without undoing the publish, when a follow-up fails', async () => {
    mockApi({
      ...base([match1]),
      'POST /tournaments/tour-1/rounds/1/publish': { status: 204 },
      'POST /notifications/leagues/league-1': { status: 500, body: { error: { code: 'internal', message: 'WhatsApp caído' } } },
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Publicar jornada' }))

    expect(await screen.findByText('Jornada 1 publicada exitosamente')).toBeInTheDocument()
    expect(await screen.findByText(/se publicó, pero no se pudo notificar/)).toBeInTheDocument()
  })
})

describe('delete round', () => {
  const setup = (extra = {}) => {
    const fetchMock = mockApi({ ...base([match1, match2, match3]), 'DELETE /tournaments/tour-1/matches': { body: { deleted: 2 } }, ...extra })
    return { fetchMock, ...renderWithProviders(<CalendarPage leagueId="league-1" />) }
  }
  const openRound1 = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    const round1 = (await screen.findByRole('heading', { name: 'Jornada 1' })).parentElement!.parentElement!
    await user.click(within(round1).getByRole('button', { name: 'Eliminar jornada' }))
    return screen.findByRole('alertdialog')
  }

  it('says finished matches go too and sends nothing when cancelled', async () => {
    const { fetchMock, user } = setup()
    const dialog = await openRound1(user)
    expect(within(dialog).getByText(/incluidos los ya finalizados/)).toBeInTheDocument()
    expect(within(dialog).getByText(/tabla de posiciones se recalcula/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deleteUrls(fetchMock)).toEqual([])
  })

  it('deletes only that round with DELETE ?round=1 and reports how many matches went', async () => {
    const { fetchMock, user } = setup()
    const dialog = await openRound1(user)
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Jornada 1 eliminada (2 partidos)')).toBeInTheDocument()
    expect(deleteUrls(fetchMock)).toEqual(['/tournaments/tour-1/matches?round=1'])
  })

  it('keeps the dialog open and shows the API message when deleting fails', async () => {
    const { user } = setup({
      'DELETE /tournaments/tour-1/matches': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso' } } },
    })
    const dialog = await openRound1(user)
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('delete calendar', () => {
  it('confirms (irreversible) and deletes the regular phase only, then sends nothing on cancel', async () => {
    const fetchMock = mockApi({ ...base([match1, match2, match3]), 'DELETE /tournaments/tour-1/matches': { body: { deleted: 3 } } })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar Calendario' }))
    let dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/IRREVERSIBLE/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deleteUrls(fetchMock)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Eliminar Calendario' }))
    dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText(/Se eliminaron 3 partidos del torneo "Torneo Apertura"/)).toBeInTheDocument()
    expect(deleteUrls(fetchMock)).toEqual(['/tournaments/tour-1/matches?phase=regular'])
  })

  it('offers the playoffs separately and deletes them with phase=playoffs', async () => {
    const playoff = { ...match1, id: 'po-1', phase: 'playoffs', round: undefined }
    const fetchMock = mockApi({ ...base([match1, playoff]), 'DELETE /tournaments/tour-1/matches': { body: { deleted: 1 } } })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar Liguilla' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText(/Se eliminaron 1 partido del torneo/)).toBeInTheDocument()
    expect(deleteUrls(fetchMock)).toEqual(['/tournaments/tour-1/matches?phase=playoffs'])
  })
})

describe('adjust calendar', () => {
  const teamsHandler = { 'GET /teams': page(leagueTeams) }

  it('lists the missing pairings and creates them in new rounds with the detected schedule', async () => {
    const fetchMock = mockApi({
      ...base([match1, match2, match3]),
      ...teamsHandler,
      'POST /tournaments/tour-1/matches/bulk': { status: 201, body: [{}, {}, {}] },
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar Calendario' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/Faltan 3 partidos/)).toBeInTheDocument()
    expect(within(dialog).getByText('Tigres FC vs Águilas SC')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/matches/bulk')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Crear partidos faltantes' }))

    expect(await screen.findByText('Se crearon 3 partidos faltantes')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/matches/bulk')).toEqual([
      {
        tournament_id: 'tour-1',
        matches: [
          { home_team_id: 'team-1', away_team_id: 'team-3', match_date: '2024-06-29T15:00:00Z', match_time: '15:00', round: 3, field_number: 1 },
          { home_team_id: 'team-2', away_team_id: 'team-4', match_date: '2024-06-29T15:00:00Z', match_time: '15:00', round: 3, field_number: 2 },
          { home_team_id: 'team-1', away_team_id: 'team-4', match_date: '2024-07-06T15:00:00Z', match_time: '15:00', round: 4, field_number: 1 },
        ],
      },
    ])
  })

  it('reports a team without matches and keeps the dialog open with the API message on error', async () => {
    const lonely = { id: 'team-5', name: 'Halcones', slug: 'h', tournament_id: 'tour-1', is_active: true }
    mockApi({
      ...base([match1]),
      'GET /teams': page([teamA, teamB].map((t) => ({ ...t, tournament_id: 'tour-1', is_active: true })).concat(lonely)),
      'POST /tournaments/tour-1/matches/bulk': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso' } } },
    })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar Calendario' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Halcones')).toBeInTheDocument()
    expect(within(dialog).getByText('Sin partidos')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Crear partidos faltantes' }))
    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has nothing to create when every pairing already exists', async () => {
    mockApi({ ...base([match1]), 'GET /teams': page([teamA, teamB].map((t) => ({ ...t, tournament_id: 'tour-1', is_active: true }))) })
    const { user } = renderWithProviders(<CalendarPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar Calendario' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/No hay nada que ajustar/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Crear partidos faltantes' })).toBeDisabled()
  })
})
