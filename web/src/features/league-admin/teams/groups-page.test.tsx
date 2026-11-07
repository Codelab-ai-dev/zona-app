import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { GroupsPage } from './groups-page'
import { leaguesMine, page, team } from './test-fixtures'

type User = ReturnType<typeof renderWithProviders>['user']

async function pickGroup(user: User, teamName: string, letter: string) {
  await user.click(await screen.findByRole('combobox', { name: `Grupo de ${teamName}` }))
  await user.click(await screen.findByRole('option', { name: `Grupo ${letter}` }))
}

describe('GroupsPage', () => {
  it('shows the empty state when the league has no teams', async () => {
    mockApi({ 'GET /leagues/mine': leaguesMine, 'GET /teams': page([]) })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('No hay equipos')).toBeInTheDocument()
  })

  it('shows an error when teams cannot be loaded', async () => {
    mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('splits teams into unassigned and per-group sections', async () => {
    mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Los Campeones'), team('team-2', 'Las Águilas', { group_name: 'A' })]),
    })
    renderWithProviders(<GroupsPage />)
    expect(await screen.findByText('Equipos sin grupo (1)')).toBeInTheDocument()
    expect(screen.getByText('Grupo A (1)')).toBeInTheDocument()
  })

  it('assigns a team to a group with one PATCH and confirms', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Los Campeones')]),
      'PATCH /teams/team-1': { body: team('team-1', 'Los Campeones', { group_name: 'B' }) },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await pickGroup(user, 'Los Campeones', 'B')

    expect(await screen.findByText('Los Campeones asignado al grupo B')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ group_name: 'B' }])
  })

  it('lists the team and the API message when the assignment fails', async () => {
    mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Los Campeones')]),
      'PATCH /teams/team-1': { status: 422, body: { error: { code: 'validation_error', message: 'Grupo inválido' } } },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await pickGroup(user, 'Los Campeones', 'A')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Los Campeones: Grupo inválido')).toBeInTheDocument()
  })

  it('auto-distributes unassigned teams: one PATCH per team, balanced, deterministic', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([
        team('team-1', 'Uno', { group_name: 'A' }),
        team('team-2', 'Dos'),
        team('team-3', 'Tres'),
        team('team-4', 'Cuatro'),
      ]),
      'PATCH /teams/team-2': { body: {} },
      'PATCH /teams/team-3': { body: {} },
      'PATCH /teams/team-4': { body: {} },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await user.click(await screen.findByRole('button', { name: /distribuir automáticamente/i }))

    expect(await screen.findByText('3 equipos distribuidos automáticamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-2')).toEqual([{ group_name: 'B' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-3')).toEqual([{ group_name: 'A' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-4')).toEqual([{ group_name: 'B' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([])
  })

  it('uses the requested number of groups', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Uno'), team('team-2', 'Dos'), team('team-3', 'Tres')]),
      'PATCH /teams/team-1': { body: {} },
      'PATCH /teams/team-2': { body: {} },
      'PATCH /teams/team-3': { body: {} },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    const count = await screen.findByLabelText('Número de grupos')
    await user.clear(count)
    await user.type(count, '3')
    await user.click(screen.getByRole('button', { name: /distribuir automáticamente/i }))

    await screen.findByText('3 equipos distribuidos automáticamente')
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ group_name: 'A' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-2')).toEqual([{ group_name: 'B' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-3')).toEqual([{ group_name: 'C' }])
  })

  it('reports a partial failure per team during auto-distribution', async () => {
    const fetchMock = mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': page([team('team-1', 'Uno'), team('team-2', 'Dos')]),
      'PATCH /teams/team-1': { body: {} },
      'PATCH /teams/team-2': { status: 422, body: { error: { code: 'validation_error', message: 'Grupo inválido' } } },
    })
    const { user } = renderWithProviders(<GroupsPage />)

    await user.click(await screen.findByRole('button', { name: /distribuir automáticamente/i }))

    expect(await screen.findByText('1 equipos distribuidos, 1 fallaron')).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Dos: Grupo inválido')).toBeInTheDocument()
    expect(within(alert).queryByText(/Uno/)).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toHaveLength(1)
  })
})
