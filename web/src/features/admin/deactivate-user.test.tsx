import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { UsersManagement } from './components/users-management'
import { errorBody, juan, pageOf } from './test-fixtures'

function setup(patchResponse: { status?: number; body?: unknown } = { body: { ...juan, is_active: false } }) {
  const fetchMock = mockApi({
    'GET /users': { body: pageOf([juan]) },
    'PATCH /admin/users/user1': patchResponse,
  })
  return { fetchMock, ...renderWithProviders(<UsersManagement />) }
}

describe('Deactivate user', () => {
  it('asks for confirmation naming the user before sending anything', async () => {
    const { fetchMock, user } = setup()
    await screen.findByText('Juan Pérez')
    await user.click(screen.getByRole('button', { name: 'Desactivar usuario' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Desactivar usuario' })
    expect(dialog).toHaveTextContent('Juan Pérez')
    expect(requestsTo(fetchMock, 'PATCH /admin/users/user1')).toHaveLength(0)
  })

  it('patches is_active=false after confirming and refreshes the list', async () => {
    const { fetchMock, user } = setup()
    await screen.findByText('Juan Pérez')
    await user.click(screen.getByRole('button', { name: 'Desactivar usuario' }))
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Usuario desactivado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/user1')).toEqual([{ is_active: false }])
    expect(requestsTo(fetchMock, 'GET /users').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does nothing when cancelled', async () => {
    const { fetchMock, user } = setup()
    await screen.findByText('Juan Pérez')
    await user.click(screen.getByRole('button', { name: 'Desactivar usuario' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/user1')).toHaveLength(0)
  })

  it('shows an error toast when the API fails', async () => {
    const { user } = setup({ status: 500, body: errorBody('internal', 'Error del servidor') })
    await screen.findByText('Juan Pérez')
    await user.click(screen.getByRole('button', { name: 'Desactivar usuario' }))
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Error al desactivar el usuario')).toBeInTheDocument()
  })
})
