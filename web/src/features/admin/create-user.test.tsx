import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { UsersManagement } from './components/users-management'
import { errorBody, inactiveLeague, juan, league, pageOf } from './test-fixtures'

type User = ReturnType<typeof renderWithProviders>['user']

function setup(postResponse: { status?: number; body?: unknown } = { status: 201, body: juan }) {
  const fetchMock = mockApi({
    'GET /users': { body: pageOf([juan]) },
    'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    'POST /admin/users': postResponse,
  })
  return { fetchMock, ...renderWithProviders(<UsersManagement />) }
}

async function openDialog(user: User) {
  await user.click(await screen.findByRole('button', { name: /nuevo usuario/i }))
  return screen.findByRole('dialog', { name: 'Crear Usuario' })
}

async function chooseOwnerRole(user: User) {
  await user.click(screen.getByRole('combobox', { name: /^rol/i }))
  await user.click(await screen.findByRole('option', { name: 'Propietario de Equipo' }))
}

async function pickLeague(user: User) {
  await user.click(screen.getByRole('combobox', { name: /^liga/i }))
  await user.click(await screen.findByRole('option', { name: 'Liga Premier' }))
}

async function fillValid(user: User, password = 'securepass123', confirm = password) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana López')
  await user.type(screen.getByLabelText(/^email/i), 'ana@example.com')
  await user.type(screen.getByLabelText(/^contraseña/i), password)
  await user.type(screen.getByLabelText(/confirmar contraseña/i), confirm)
}

describe('Create user', () => {
  it('creates a league admin without a league: POST /admin/users has no league_id', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Usuario creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([
      {
        email: 'ana@example.com',
        password: 'securepass123',
        name: 'ANA LÓPEZ',
        role: 'league_admin',
      },
    ])
    expect(screen.queryByRole('dialog', { name: 'Crear Usuario' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /users').length).toBeGreaterThanOrEqual(2)
  })

  it('does not ask for a league when creating a league admin', async () => {
    const { user } = setup()
    await openDialog(user)
    expect(screen.queryByRole('combobox', { name: /^liga/i })).not.toBeInTheDocument()
  })

  it('creates a team owner with the chosen league: POST /admin/users sends league_id', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await fillValid(user)
    await chooseOwnerRole(user)
    await pickLeague(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Usuario creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([
      { email: 'ana@example.com', password: 'securepass123', name: 'ANA LÓPEZ', role: 'team_owner', league_id: 'league1' },
    ])
  })

  it('lets super admins pick inactive leagues too (GET /leagues/admin)', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await chooseOwnerRole(user)
    await user.click(screen.getByRole('combobox', { name: /^liga/i }))

    expect(await screen.findByRole('option', { name: 'Liga Premier' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Liga Ascenso' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /leagues/admin').length).toBeGreaterThan(0)
  })

  it('sends the chosen role', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await fillValid(user)
    await chooseOwnerRole(user)
    await pickLeague(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    await screen.findByText('Usuario creado exitosamente')
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([expect.objectContaining({ role: 'team_owner' })])
  })

  it('never generates the password: the fields are typed, masked and empty', async () => {
    const { user } = setup()
    await openDialog(user)

    const password = screen.getByLabelText(/^contraseña/i)
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('')
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveValue('')
    expect(screen.queryByRole('button', { name: /generar/i })).not.toBeInTheDocument()
  })

  it('rejects a short password without calling the API', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await fillValid(user, 'corta')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('mínimo 10 caracteres')).toBeInTheDocument()
    expect(screen.getByLabelText(/^contraseña/i)).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
  })

  it('shows the password/confirmation mismatch next to the field without calling the API', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await fillValid(user, 'securepass123', 'securepass999')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('no coincide')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
  })

  it('requires a league for team owners before sending', async () => {
    const { fetchMock, user } = setup()
    await openDialog(user)
    await chooseOwnerRole(user)
    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana López')
    await user.type(screen.getByLabelText(/^email/i), 'ana@example.com')
    await user.type(screen.getByLabelText(/^contraseña/i), 'securepass123')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'securepass123')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('requerido')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
  })

  it('maps 422 field errors to the fields and keeps what was typed', async () => {
    const { user } = setup({
      status: 422,
      body: errorBody('validation_failed', 'Datos inválidos', { email: 'El formato del email no es válido' }),
    })
    const dialog = await openDialog(user)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await within(dialog).findByText('El formato del email no es válido')).toBeInTheDocument()
    const email = screen.getByLabelText(/^email/i)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveValue('ana@example.com')
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('ANA LÓPEZ')
  })

  it('shows the 409 duplicate email on the email field and keeps the value', async () => {
    const { user } = setup({ status: 409, body: errorBody('conflict', 'El recurso ya existe') })
    await openDialog(user)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Este correo ya está registrado')).toBeInTheDocument()
    const email = screen.getByLabelText(/^email/i)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveValue('ana@example.com')
    expect(screen.getByRole('dialog', { name: 'Crear Usuario' })).toBeInTheDocument()
  })

  it('shows other API errors as a toast', async () => {
    const { user } = setup({ status: 500, body: errorBody('internal', 'Error del servidor') })
    await openDialog(user)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })
})
