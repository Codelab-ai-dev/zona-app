import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LeagueManagement } from './components/league-management'
import { errorBody, inactiveLeague, juan, league, maria, pageOf } from './test-fixtures'

type User = ReturnType<typeof renderWithProviders>['user']

function setup(extra: Record<string, { status?: number; body?: unknown }> = {}) {
  const fetchMock = mockApi({
    'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    'GET /users': { body: pageOf([juan, maria]) },
    ...extra,
  })
  return { fetchMock, ...renderWithProviders(<LeagueManagement />) }
}

async function openCreate(user: User) {
  await user.click(await screen.findByRole('button', { name: /nueva liga/i }))
  return screen.findByRole('dialog', { name: 'Crear Nueva Liga' })
}

async function fillCreate(user: User) {
  await user.type(screen.getByLabelText(/nombre de la liga/i), 'Liga Nueva')
  await user.type(screen.getByLabelText(/^descripción/i), 'Una liga')
}

async function fillNewAdmin(user: User, password = 'securepass123', confirm = password) {
  await user.type(screen.getByLabelText(/nombre del administrador/i), 'Ana López')
  await user.type(screen.getByLabelText(/^email del administrador/i), 'ana@example.com')
  await user.type(screen.getByLabelText(/^contraseña \(mín/i), password)
  await user.type(screen.getByLabelText(/confirmar contraseña/i), confirm)
}

const newAdmin = { ...juan, id: 'newadmin', name: 'ANA LÓPEZ', email: 'ana@example.com' }
const created = { ...league, id: 'league1', admin_id: 'newadmin' }
const submit = (user: User) => user.click(screen.getByRole('button', { name: /^crear liga/i }))

describe('Create league with its admin', () => {
  const flow = {
    'POST /admin/users': { status: 201, body: newAdmin },
    'POST /leagues': { status: 201, body: created },
    'PUT /leagues/league1/admin': { status: 204 },
  }

  it('creates the new admin, then the league, links them and shows the one-time credentials', async () => {
    const { fetchMock, user } = setup(flow)
    await openCreate(user)
    await fillCreate(user)
    expect(screen.getByLabelText(/url personalizada/i)).toHaveValue('liga-nueva')
    await fillNewAdmin(user)
    await submit(user)

    const credentials = await screen.findByRole('dialog', { name: /liga creada/i })
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([
      { name: 'ANA LÓPEZ', email: 'ana@example.com', password: 'securepass123', role: 'league_admin' },
    ])
    expect(requestsTo(fetchMock, 'POST /leagues')).toEqual([
      { name: 'LIGA NUEVA', slug: 'liga-nueva', description: 'UNA LIGA', admin_id: 'newadmin' },
    ])
    expect(requestsTo(fetchMock, 'PUT /leagues/league1/admin')).toEqual([{ admin_id: 'newadmin' }])
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode')).toHaveLength(0)

    expect(within(credentials).getByText('ana@example.com')).toBeInTheDocument()
    expect(within(credentials).queryByText('securepass123')).not.toBeInTheDocument()
    await user.click(within(credentials).getByRole('button', { name: 'Mostrar contraseña' }))
    expect(within(credentials).getByText('securepass123')).toBeInTheDocument()
    await user.click(within(credentials).getByRole('button', { name: 'Copiar contraseña' }))
    expect(await screen.findByText('Contraseña copiada')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe('securepass123')
  })

  it('uses an existing league admin without creating a user', async () => {
    const { fetchMock, user } = setup({
      'POST /leagues': { status: 201, body: { ...league, admin_id: 'user1' } },
      'PUT /leagues/league1/admin': { status: 204 },
    })
    await openCreate(user)
    await fillCreate(user)
    await user.click(screen.getByRole('radio', { name: 'Administrador existente' }))
    await user.click(screen.getByRole('combobox', { name: /^administrador/i }))
    expect(screen.queryByRole('option', { name: /maría garcía/i })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: /juan pérez/i }))
    await submit(user)

    expect(await screen.findByText('Liga creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
    expect(requestsTo(fetchMock, 'POST /leagues')).toEqual([
      { name: 'LIGA NUEVA', slug: 'liga-nueva', description: 'UNA LIGA', admin_id: 'user1' },
    ])
    expect(requestsTo(fetchMock, 'PUT /leagues/league1/admin')).toEqual([{ admin_id: 'user1' }])
    expect(screen.queryByRole('dialog', { name: /liga creada/i })).not.toBeInTheDocument()
  })

  it('applies the chosen product mode with its features after creating', async () => {
    const { fetchMock, user } = setup({
      ...flow,
      'PATCH /leagues/league1/product-mode': { body: { ...created, product_mode: 'web_only' } },
    })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await user.click(screen.getByRole('radio', { name: 'Zona-G Web' }))
    await submit(user)

    await screen.findByRole('dialog', { name: /liga creada/i })
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode')).toEqual([
      {
        product_mode: 'web_only',
        features: expect.objectContaining({ qr_codes: false, mobile_app: false, manual_entry: true, finance: true, finance_payments: false }),
      },
    ])
  })

  it('shows the Incluye / Función comparison of both plans', async () => {
    const { user } = setup()
    await openCreate(user)
    expect(screen.getAllByText('Incluye:')).toHaveLength(2)
    expect(screen.getByText('$999 MXN/mes')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Función' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Reconocimiento Facial' })).toBeInTheDocument()
  })

  it('rejects a short password without calling the API', async () => {
    const { fetchMock, user } = setup()
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user, 'corta')
    await submit(user)

    expect(await screen.findByText('La contraseña debe tener al menos 10 caracteres')).toBeInTheDocument()
    expect(screen.getByLabelText(/^contraseña \(mín/i)).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
    expect(requestsTo(fetchMock, 'POST /leagues')).toHaveLength(0)
  })

  it('shows the password confirmation mismatch without calling the API', async () => {
    const { fetchMock, user } = setup()
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user, 'securepass123', 'securepass999')
    await submit(user)

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(0)
  })

  it('requires picking an existing admin before sending', async () => {
    const { fetchMock, user } = setup()
    await openCreate(user)
    await fillCreate(user)
    await user.click(screen.getByRole('radio', { name: 'Administrador existente' }))
    await submit(user)

    expect(await screen.findByText('El administrador es requerido')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues')).toHaveLength(0)
  })

  it('maps 422 admin field errors next to the admin fields and keeps what was typed', async () => {
    const { fetchMock, user } = setup({
      'POST /admin/users': { status: 422, body: errorBody('validation_failed', 'Datos inválidos', { email: 'El formato del email no es válido' }) },
    })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await submit(user)

    expect(await screen.findByText('El formato del email no es válido')).toBeInTheDocument()
    const email = screen.getByLabelText(/^email del administrador/i)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveValue('ana@example.com')
    expect(requestsTo(fetchMock, 'POST /leagues')).toHaveLength(0)
  })

  it('shows a duplicate admin email on the email field', async () => {
    const { user } = setup({ 'POST /admin/users': { status: 409, body: errorBody('conflict', 'El recurso ya existe') } })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await submit(user)

    expect(await screen.findByText('Este correo ya está registrado')).toBeInTheDocument()
    expect(screen.getByLabelText(/^email del administrador/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('maps 422 league field errors next to the fields and keeps what was typed', async () => {
    const { user } = setup({
      ...flow,
      'POST /leagues': { status: 422, body: errorBody('validation_failed', 'Datos inválidos', { name: 'requerido' }) },
    })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await submit(user)

    expect(await screen.findByText('requerido')).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre de la liga/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/nombre de la liga/i)).toHaveValue('LIGA NUEVA')
  })

  it('tells the user when the admin was created but the league failed, and retries without duplicating the user', async () => {
    const { fetchMock, user } = setup({
      ...flow,
      'POST /leagues': { status: 409, body: errorBody('conflict', 'El recurso ya existe') },
    })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await submit(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El administrador ana@example.com ya se creó, pero la liga no')
    expect(await screen.findByText('Esta URL ya está en uso')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(1)
    expect(screen.getByLabelText(/nombre del administrador/i)).toBeDisabled()

    const retry = mockApi({
      'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
      'GET /users': { body: pageOf([juan, maria]) },
      'POST /leagues': { status: 201, body: created },
      'PUT /leagues/league1/admin': { status: 204 },
    })
    const slug = screen.getByLabelText(/url personalizada/i)
    await user.clear(slug)
    await user.type(slug, 'liga-nueva-2')
    await submit(user)

    const credentials = await screen.findByRole('dialog', { name: /liga creada/i })
    expect(within(credentials).getByText('ana@example.com')).toBeInTheDocument()
    expect(requestsTo(retry, 'POST /admin/users')).toHaveLength(0)
    expect(requestsTo(retry, 'POST /leagues')).toEqual([
      { name: 'LIGA NUEVA', slug: 'liga-nueva-2', description: 'UNA LIGA', admin_id: 'newadmin' },
    ])
  })

  it('shows other API errors as a toast', async () => {
    const { user } = setup({ ...flow, 'POST /leagues': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    await openCreate(user)
    await fillCreate(user)
    await fillNewAdmin(user)
    await submit(user)

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })
})

describe('Edit league', () => {
  async function openEdit(user: User, index: number) {
    await screen.findByText('Liga Premier')
    await user.click(screen.getAllByRole('button', { name: /^editar /i })[index]!)
    return screen.findByRole('dialog', { name: 'Editar Liga' })
  }

  it('opens prefilled with the selected league, not a stale one', async () => {
    const { user } = setup()
    await openEdit(user, 0)
    expect(screen.getByLabelText(/nombre de la liga/i)).toHaveValue('Liga Premier')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await openEdit(user, 1)
    expect(screen.getByLabelText(/nombre de la liga/i)).toHaveValue('Liga Ascenso')
    expect(screen.getByLabelText(/url personalizada/i)).toHaveValue('liga-ascenso')
  })

  it('patches /leagues/league1 and keeps the slug when renaming', async () => {
    const { fetchMock, user } = setup({ 'PATCH /leagues/league1': { body: league } })
    await openEdit(user, 0)

    const name = screen.getByLabelText(/nombre de la liga/i)
    await user.clear(name)
    await user.type(name, 'Liga Mayor')
    await user.click(screen.getByRole('button', { name: 'Actualizar Liga' }))

    expect(await screen.findByText('Liga actualizada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1')).toEqual([
      { name: 'LIGA MAYOR', slug: 'liga-premier', description: 'Liga premier mexicana' },
    ])
  })

  it('shows 422 errors on the field and keeps the value', async () => {
    const { user } = setup({
      'PATCH /leagues/league1': { status: 422, body: errorBody('validation_failed', 'Datos inválidos', { slug: 'no puede estar vacío' }) },
    })
    await openEdit(user, 0)
    const slug = screen.getByLabelText(/url personalizada/i)
    await user.clear(slug)
    await user.click(screen.getByRole('button', { name: 'Actualizar Liga' }))

    expect(await screen.findByText('no puede estar vacío')).toBeInTheDocument()
    expect(slug).toHaveAttribute('aria-invalid', 'true')
  })
})
