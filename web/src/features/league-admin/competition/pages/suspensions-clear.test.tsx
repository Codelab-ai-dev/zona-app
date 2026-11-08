import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, suspension } from '../test-fixtures'
import { SuspensionsPageComponent } from './suspensions'

const listRoute = 'GET /leagues/league-1/suspensions'
const clearRoute = 'DELETE /leagues/league-1/suspensions'
const base = {
  ...mineOne,
  'GET /teams': list([]),
  [listRoute]: list([suspension(), suspension({ id: 's2', status: 'completed' }), suspension({ id: 's3', status: 'cancelled' })]),
}

describe('Clear suspensions', () => {
  it('lists what is lost, sends nothing on cancel and deletes after confirming', async () => {
    const fetchMock = mockApi({ ...base, [clearRoute]: { body: { deleted: 3 } } })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Limpiar Suspensiones' }))
    expect(screen.getByText('Suspensiones activas (1)')).toBeInTheDocument()
    expect(screen.getByText(/Total a eliminar: 3 suspensiones/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, clearRoute)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Limpiar Suspensiones' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Todas las suspensiones han sido eliminadas')).toBeInTheDocument()
    expect(requestsTo(fetchMock, clearRoute)).toHaveLength(1)
    expect(requestsTo(fetchMock, listRoute).length).toBeGreaterThanOrEqual(2)
  })

  it('hides the button when there is nothing to clear', async () => {
    mockApi({ ...mineOne, 'GET /teams': list([]), [listRoute]: list([]) })
    renderWithProviders(<SuspensionsPageComponent />)

    await screen.findByText('No hay suspensiones registradas')
    expect(screen.queryByRole('button', { name: 'Limpiar Suspensiones' })).not.toBeInTheDocument()
  })

  it('keeps the dialog open and shows the API error when clearing fails', async () => {
    mockApi({ ...base, [clearRoute]: apiError(403, 'forbidden', 'No tienes permiso') })
    const { user } = renderWithProviders(<SuspensionsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Limpiar Suspensiones' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })
})
