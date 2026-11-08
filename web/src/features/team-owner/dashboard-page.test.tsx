import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { DashboardPage } from './dashboard-page'
import { listBody, myTeam, serverError, team, teamStats } from './test-fixtures'

function teamHandlers(id: string, name: string) {
  return {
    [`GET /teams/${id}`]: { body: { ...team, id, name, tournament_id: undefined } },
    [`GET /teams/${id}/stats`]: listBody([{ ...teamStats, team_id: id }]),
  }
}

describe('team owner DashboardPage', () => {
  it('loads the team from GET /my-teams (not from the profile) and renders its overview', async () => {
    const fetchMock = mockApi({
      'GET /my-teams': listBody([myTeam('team-a', 'Águilas FC')]),
      ...teamHandlers('team-a', 'Águilas FC'),
    })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi Equipo' })).toBeInTheDocument()
    expect(await screen.findByText('Estadísticas del Equipo')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /teams/team-a')).toHaveLength(1)
    // a single team needs no selector
    expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument()
  })

  it('lets an owner with several teams switch between them', async () => {
    const fetchMock = mockApi({
      'GET /my-teams': listBody([myTeam('team-a', 'Águilas FC'), myTeam('team-b', 'Tigres FC')]),
      ...teamHandlers('team-a', 'Águilas FC'),
      ...teamHandlers('team-b', 'Tigres FC'),
    })
    const { user } = renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Estadísticas del Equipo')).toBeInTheDocument()
    expect(await screen.findByText('Águilas FC - Resumen de rendimiento')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /teams/team-a')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /teams/team-b')).toHaveLength(0)

    await user.click(screen.getByRole('combobox', { name: 'Equipo' }))
    await user.click(await screen.findByRole('option', { name: 'Tigres FC' }))

    expect(await screen.findByText('Tigres FC - Resumen de rendimiento')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /teams/team-b')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /teams/team-b/stats')).toHaveLength(1)
  })

  it('shows the not-assigned state when the owner has no teams', async () => {
    mockApi({ 'GET /my-teams': listBody([]) })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Equipo No Asignado')).toBeInTheDocument()
  })

  it('shows the error with retry when the teams cannot be loaded', async () => {
    mockApi({ 'GET /my-teams': serverError })
    const { user } = renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({
      'GET /my-teams': listBody([myTeam('team-a', 'Águilas FC')]),
      ...teamHandlers('team-a', 'Águilas FC'),
    })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Estadísticas del Equipo')).toBeInTheDocument()
  })

  it('opens the registration requests tab with the tournament of the team', async () => {
    const fetchMock = mockApi({
      'GET /my-teams': listBody([myTeam('team-a', 'Águilas FC')]),
      ...teamHandlers('team-a', 'Águilas FC'),
      'GET /teams/team-a': { body: { ...team, id: 'team-a', tournament_id: 't-9' } },
      'GET /teams/team-a/player-registration-requests': listBody([]),
    })
    const { user } = renderWithProviders(<DashboardPage />)

    await user.click(await screen.findByRole('tab', { name: 'Solicitudes' }))

    expect(await screen.findByText('Sin solicitudes')).toBeInTheDocument()
    expect(within(await screen.findByRole('tabpanel')).getByRole('button', { name: /Nueva Solicitud/i })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /teams/team-a/player-registration-requests')).toHaveLength(1)
  })
})
