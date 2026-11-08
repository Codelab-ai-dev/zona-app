import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, tournament } from '../test-fixtures'
import { TournamentsPage } from './tournaments'

const routes = { ...mineOne, 'GET /leagues/league-1/tournaments': list([tournament()]) }

describe('Delete tournament', () => {
  it('asks for confirmation and sends nothing when cancelled', async () => {
    const fetchMock = mockApi({ ...routes, 'DELETE /tournaments/tour-1': { status: 204 } })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: 'Borrar Torneo' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('¿Eliminar "Apertura 2026"?')).toBeInTheDocument()
    expect(within(dialog).getByText('Todos los partidos del torneo')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /tournaments/tour-1')).toHaveLength(0)
  })

  it('deletes after confirming and reports it', async () => {
    const fetchMock = mockApi({ ...routes, 'DELETE /tournaments/tour-1': { status: 204 } })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: 'Borrar Torneo' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Torneo eliminado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /tournaments/tour-1')).toHaveLength(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('keeps the dialog open and shows the API error', async () => {
    mockApi({ ...routes, 'DELETE /tournaments/tour-1': apiError(403, 'forbidden', 'No tienes permiso') })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: 'Borrar Torneo' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
