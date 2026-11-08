import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TeamsListPage } from './teams-list-page'
import { leaguesMine, page, team } from './test-fixtures'

const routes = { 'GET /leagues/mine': leaguesMine, 'GET /teams': page([team('team-1', 'Los Campeones')]) }

describe('Delete team', () => {
  it('lists what will be lost and sends nothing when cancelled', async () => {
    const fetchMock = mockApi({ ...routes, 'DELETE /teams/team-1': { status: 204 } })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar Equipo' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('¿Eliminar "Los Campeones"?')).toBeInTheDocument()
    expect(within(dialog).getByText('Todos los jugadores del equipo')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, 'DELETE /teams/team-1')).toHaveLength(0)
  })

  it('deletes after confirming and reports it', async () => {
    const fetchMock = mockApi({ ...routes, 'DELETE /teams/team-1': { status: 204 } })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar Equipo' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Equipo eliminado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /teams/team-1')).toHaveLength(1)
  })

  it('keeps the dialog open when the API refuses', async () => {
    mockApi({
      ...routes,
      'DELETE /teams/team-1': { status: 403, body: { error: { code: 'forbidden', message: 'Solo el administrador de la liga' } } },
    })
    const { user } = renderWithProviders(<TeamsListPage />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar Equipo' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Solo el administrador de la liga')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
