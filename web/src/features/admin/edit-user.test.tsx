import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { UsersManagement } from './components/users-management'
import { errorBody, juan, maria, pageOf } from './test-fixtures'

function setup(patchResponse: { status?: number; body?: unknown } = { body: juan }) {
  const fetchMock = mockApi({
    'GET /users': { body: pageOf([juan, maria]) },
    'PATCH /admin/users/user1': patchResponse,
    'PATCH /admin/users/user2': { body: maria },
  })
  return { fetchMock, ...renderWithProviders(<UsersManagement />) }
}

async function openEdit(user: ReturnType<typeof renderWithProviders>['user'], index = 0) {
  await screen.findByText('Juan Pérez')
  await user.click(screen.getAllByRole('button', { name: 'Editar usuario' })[index]!)
  return screen.findByRole('dialog', { name: 'Editar Usuario' })
}

describe('Edit user', () => {
  it('opens prefilled with the selected user', async () => {
    const { user } = setup()
    await openEdit(user)

    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Juan Pérez')
    expect(screen.getByLabelText('Email')).toHaveValue('juan@example.com')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('+52 555 1234567')
  })

  it('is prefilled with the second user after editing the first (no stale form)', async () => {
    const { user } = setup()
    await openEdit(user, 0)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await openEdit(user, 1)

    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('María García')
    expect(screen.getByLabelText('Email')).toHaveValue('maria@example.com')
  })

  it('patches /admin/users/user1 with the edited fields and confirms', async () => {
    const { fetchMock, user } = setup()
    await openEdit(user)

    const name = screen.getByLabelText('Nombre Completo')
    await user.clear(name)
    await user.type(name, 'Juan Actualizado')
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Usuario actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/user1')).toEqual([
      { name: 'JUAN ACTUALIZADO', email: 'juan@example.com', phone: '+52 555 1234567' },
    ])
    expect(screen.queryByRole('dialog', { name: 'Editar Usuario' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /users').length).toBeGreaterThanOrEqual(2)
  })

  it('maps 422 field errors next to the field and keeps the typed value', async () => {
    const { user } = setup({
      status: 422,
      body: errorBody('validation_failed', 'Datos inválidos', { name: 'El nombre debe tener entre 2 y 100 caracteres' }),
    })
    await openEdit(user)

    const name = screen.getByLabelText('Nombre Completo')
    await user.clear(name)
    await user.type(name, 'x')
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('El nombre debe tener entre 2 y 100 caracteres')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('X')
  })

  it('shows the 409 duplicate email on the email field and keeps the value', async () => {
    const { user } = setup({ status: 409, body: errorBody('conflict', 'El recurso ya existe') })
    await openEdit(user)

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'maria@example.com')
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Este correo ya está registrado')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveValue('maria@example.com')
  })
})
