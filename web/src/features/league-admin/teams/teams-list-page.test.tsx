import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TeamsListPage } from './teams-list-page'
import { leaguesMine, page, team } from './test-fixtures'

const withTeams = (...teams: ReturnType<typeof team>[]) => ({ 'GET /leagues/mine': leaguesMine, 'GET /teams': page(teams) })

describe('TeamsListPage', () => {
  it('lists the teams of the first managed league', async () => {
    const fetchMock = mockApi(withTeams(team('team-1', 'Los Campeones')))
    renderWithProviders(<TeamsListPage />)

    expect(await screen.findByText('Los Campeones')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Equipos' })).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([input]) => String(input).includes('/teams?'))
    expect(String(call?.[0])).toContain('league_id=league-1')
  })

  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<TeamsListPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows the empty state when the league has no teams', async () => {
    mockApi(withTeams())
    renderWithProviders(<TeamsListPage />)
    expect(await screen.findByText('No hay equipos')).toBeInTheDocument()
  })

  it('shows the API error when teams cannot be loaded', async () => {
    mockApi({
      'GET /leagues/mine': leaguesMine,
      'GET /teams': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } },
    })
    renderWithProviders(<TeamsListPage />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('opens the create dialog from the button', async () => {
    mockApi(withTeams())
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: 'Crear equipo' }))
    expect(await screen.findByRole('dialog', { name: 'Crear equipo' })).toBeInTheDocument()
  })

  it('edits a team: dialog starts with its values and PATCHes the changes', async () => {
    const fetchMock = mockApi({
      ...withTeams(team('team-1', 'Los Campeones', { description: 'Del barrio' })),
      'PATCH /teams/team-1': { body: team('team-1', 'Los Campeones B') },
    })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /editar/i }))
    const name = await screen.findByLabelText('Nombre del equipo')
    expect(name).toHaveValue('Los Campeones')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Del barrio')

    await user.type(name, ' B')
    await user.type(screen.getByLabelText(/grupo/i), 'c')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Equipo actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([
      { name: 'LOS CAMPEONES B', description: 'Del barrio', group_name: 'C' },
    ])
  })

  it('keeps the edit dialog open and shows API field errors on 422', async () => {
    mockApi({
      ...withTeams(team('team-1', 'Los Campeones')),
      'PATCH /teams/team-1': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { name: 'El nombre ya existe' } } },
      },
    })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /editar/i }))
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('El nombre ya existe')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del equipo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nombre del equipo')).toHaveValue('Los Campeones')
  })

  it('does not PATCH when the name is cleared', async () => {
    const fetchMock = mockApi(withTeams(team('team-1', 'Los Campeones')))
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /editar/i }))
    await user.clear(await screen.findByLabelText('Nombre del equipo'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([])
  })

  it('deactivates a team after confirmation', async () => {
    const fetchMock = mockApi({
      ...withTeams(team('team-1', 'Los Campeones')),
      'POST /teams/team-1/deactivate': { body: team('team-1', 'Los Campeones', { is_active: false }) },
    })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /desactivar/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Equipo desactivado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams/team-1/deactivate')).toHaveLength(1)
  })

  it('activates an inactive team and shows the API error if it fails', async () => {
    mockApi({
      ...withTeams(team('team-1', 'Los Campeones', { is_active: false })),
      'POST /teams/team-1/activate': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso' } } },
    })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /^activar/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
  })

  it('does not call the API when the confirmation is cancelled', async () => {
    const fetchMock = mockApi(withTeams(team('team-1', 'Los Campeones')))
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: /desactivar/i }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(requestsTo(fetchMock, 'POST /teams/team-1/deactivate')).toEqual([])
  })
})
