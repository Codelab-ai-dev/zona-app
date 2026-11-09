import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { GroupsPage } from './groups-page'
import { leaguesMine, page, team } from './test-fixtures'

type User = ReturnType<typeof renderWithProviders>['user']

const stamp = { created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
const tournament = {
  id: 'tour-1',
  name: 'Apertura',
  league_id: 'league-1',
  is_active: true,
  tournament_format: 'group_knockout',
  number_of_groups: 2,
  teams_advancing_per_group: 3,
  ...stamp,
}
const inTour = (id: string, name: string, extra = {}) => team(id, name, { tournament_id: 'tour-1', ...extra })
const base = { 'GET /leagues/mine': leaguesMine, 'GET /leagues/league-1/tournaments': page([tournament]) }

async function pickGroup(user: User, teamName: string, letter: string) {
  await user.click(await screen.findByRole('combobox', { name: `Grupo de ${teamName}` }))
  await user.click(await screen.findByRole('option', { name: `Grupo ${letter}` }))
}

describe('GroupsPage', () => {
  it('says groups are unavailable when there is no active tournament', async () => {
    mockApi({ ...base, 'GET /leagues/league-1/tournaments': page([{ ...tournament, is_active: false }]) })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('No disponible')).toBeInTheDocument()
  })

  it('says groups are unavailable when the active tournament is not Grupos + Eliminación', async () => {
    mockApi({ ...base, 'GET /leagues/league-1/tournaments': page([{ ...tournament, tournament_format: 'round_robin' }]) })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    expect(screen.getByText(/solo está disponible para torneos de formato/)).toBeInTheDocument()
  })

  it('shows an error when teams cannot be loaded', async () => {
    mockApi({
      ...base,
      'GET /teams': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('shows the tournament, every group (empty ones too), unassigned teams and the advancing note', async () => {
    mockApi({
      ...base,
      'GET /teams': page([
        inTour('team-1', 'Los Campeones'),
        inTour('team-2', 'Las Águilas', { group_name: 'A' }),
        inTour('team-3', 'Inactivo', { is_active: false }),
        team('team-4', 'Otro torneo', { tournament_id: 'tour-2' }),
      ]),
    })
    renderWithProviders(<GroupsPage />)

    expect(await screen.findByText('Apertura - 2 grupos')).toBeInTheDocument()
    expect(screen.getByText('Equipos sin Grupo (1)')).toBeInTheDocument()
    expect(screen.getAllByText('Grupo A').length).toBeGreaterThan(0)
    expect(screen.getByText('1 equipos asignados')).toBeInTheDocument()
    expect(screen.getByText('Grupo B')).toBeInTheDocument()
    expect(screen.getByText('No hay equipos asignados')).toBeInTheDocument()
    expect(screen.getByText(/Los mejores 3 equipos de cada grupo/)).toBeInTheDocument()
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument()
    expect(screen.queryByText('Otro torneo')).not.toBeInTheDocument()
  })

  it('assigns a team to a group with one PATCH and confirms', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': page([inTour('team-1', 'Los Campeones')]),
      'PATCH /teams/team-1': { body: inTour('team-1', 'Los Campeones', { group_name: 'B' }) },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await pickGroup(user, 'Los Campeones', 'B')

    expect(await screen.findByText('Los Campeones asignado al grupo B')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ group_name: 'B' }])
  })

  it('lists the team and the API message when the assignment fails', async () => {
    mockApi({
      ...base,
      'GET /teams': page([inTour('team-1', 'Los Campeones')]),
      'PATCH /teams/team-1': { status: 422, body: { error: { code: 'validation_error', message: 'Grupo inválido' } } },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await pickGroup(user, 'Los Campeones', 'A')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Los Campeones: Grupo inválido')).toBeInTheDocument()
  })

  it('auto-distributes every team across the tournament groups, one PATCH per team', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': page([inTour('team-1', 'Uno'), inTour('team-2', 'Dos'), inTour('team-3', 'Tres'), inTour('team-4', 'Cuatro')]),
      'PATCH /teams/team-1': { body: {} },
      'PATCH /teams/team-2': { body: {} },
      'PATCH /teams/team-3': { body: {} },
      'PATCH /teams/team-4': { body: {} },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await user.click(await screen.findByRole('button', { name: 'Distribuir Automáticamente' }))

    expect(await screen.findByText('4 equipos distribuidos automáticamente')).toBeInTheDocument()
    const sent = ['team-1', 'team-2', 'team-3', 'team-4'].map((id) => (requestsTo(fetchMock, `PATCH /teams/${id}`)[0] as { group_name: string }).group_name)
    expect(sent.filter((g) => g === 'A')).toHaveLength(2)
    expect(sent.filter((g) => g === 'B')).toHaveLength(2)
  })

  it('asks before reshuffling teams that already have a group, and sends nothing if cancelled', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': page([inTour('team-1', 'Uno', { group_name: 'A' }), inTour('team-2', 'Dos')]),
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await user.click(await screen.findByRole('button', { name: 'Distribuir Automáticamente' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Distribuir automáticamente' })
    expect(within(dialog).getByText(/incluidos los que ya tienen grupo/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-2')).toEqual([])
  })

  it('reports a partial failure per team during auto-distribution', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': page([inTour('team-1', 'Uno'), inTour('team-2', 'Dos')]),
      'PATCH /teams/team-1': { body: {} },
      'PATCH /teams/team-2': { status: 422, body: { error: { code: 'validation_error', message: 'Grupo inválido' } } },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await user.click(await screen.findByRole('button', { name: 'Distribuir Automáticamente' }))

    expect(await screen.findByText('1 equipos distribuidos, 1 fallaron')).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Dos: Grupo inválido')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toHaveLength(1)
  })

  it('reloads the teams with Actualizar', async () => {
    const fetchMock = mockApi({ ...base, 'GET /teams': page([inTour('team-1', 'Uno')]) })
    const { user } = renderWithProviders(<GroupsPage />)

    await screen.findByText('Uno')
    const before = fetchMock.mock.calls.filter(([u]) => String(u).includes('/teams?')).length
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    await screen.findByText('Uno')
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/teams?')).length).toBe(before + 1)
  })
})
