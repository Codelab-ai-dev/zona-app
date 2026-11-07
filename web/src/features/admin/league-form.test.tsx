import { screen } from '@testing-library/react'
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

describe('Create league', () => {
  it('posts name, generated slug and description (no product_mode: the API rejects unknown fields)', async () => {
    const { fetchMock, user } = setup({ 'POST /leagues': { status: 201, body: league } })
    await openCreate(user)
    await fillCreate(user)

    expect(screen.getByLabelText(/url personalizada/i)).toHaveValue('liga-nueva')
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    expect(await screen.findByText('Liga creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues')).toEqual([{ name: 'LIGA NUEVA', slug: 'liga-nueva', description: 'UNA LIGA' }])
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode')).toHaveLength(0)
    expect(screen.queryByRole('dialog', { name: 'Crear Nueva Liga' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /leagues/admin').length).toBeGreaterThanOrEqual(2)
  })

  it('applies a non-default product mode with PATCH product-mode after creating', async () => {
    const { fetchMock, user } = setup({
      'POST /leagues': { status: 201, body: league },
      'PATCH /leagues/league1/product-mode': { body: { ...league, product_mode: 'web_only' } },
    })
    await openCreate(user)
    await fillCreate(user)
    await user.click(screen.getByRole('combobox', { name: /tipo de producto/i }))
    await user.click(await screen.findByRole('option', { name: 'Web Only' }))
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    expect(await screen.findByText('Liga creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues')).toEqual([expect.not.objectContaining({ product_mode: expect.anything() })])
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode')).toEqual([{ product_mode: 'web_only' }])
  })

  it('sends the chosen league admin as admin_id', async () => {
    const { fetchMock, user } = setup({ 'POST /leagues': { status: 201, body: league } })
    await openCreate(user)
    await fillCreate(user)
    await user.click(await screen.findByRole('combobox', { name: /administrador/i }))
    expect(screen.queryByRole('option', { name: /maría garcía/i })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: /juan pérez/i }))
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    await screen.findByText('Liga creada exitosamente')
    expect(requestsTo(fetchMock, 'POST /leagues')).toEqual([expect.objectContaining({ admin_id: 'user1' })])
  })

  it('maps 422 field errors next to the fields and keeps what was typed', async () => {
    const { user } = setup({
      'POST /leagues': {
        status: 422,
        body: errorBody('validation_failed', 'Datos inválidos', { name: 'requerido', description: 'requerido' }),
      },
    })
    await openCreate(user)
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    expect(await screen.findAllByText('requerido')).toHaveLength(2)
    expect(screen.getByLabelText(/nombre de la liga/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/^descripción/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a 409 conflict on the slug field and keeps the value', async () => {
    const { user } = setup({ 'POST /leagues': { status: 409, body: errorBody('conflict', 'El recurso ya existe') } })
    await openCreate(user)
    await fillCreate(user)
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    expect(await screen.findByText('Esta URL ya está en uso')).toBeInTheDocument()
    const slug = screen.getByLabelText(/url personalizada/i)
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    expect(slug).toHaveValue('liga-nueva')
    expect(screen.getByRole('dialog', { name: 'Crear Nueva Liga' })).toBeInTheDocument()
  })

  it('shows other API errors as a toast', async () => {
    const { user } = setup({ 'POST /leagues': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    await openCreate(user)
    await fillCreate(user)
    await user.click(screen.getByRole('button', { name: 'Crear Liga' }))

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })
})

describe('Edit league', () => {
  async function openEdit(user: User, index: number) {
    await screen.findByText('Liga Premier')
    await user.click(screen.getAllByRole('button', { name: /^editar$/i })[index]!)
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
