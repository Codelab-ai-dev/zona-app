import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LeagueManagement } from './components/league-management'
import { errorBody, inactiveLeague, juan, league, maria, pageOf } from './test-fixtures'
import type { User } from './types'

type Tester = ReturnType<typeof renderWithProviders>['user']

const pedro: User = { ...juan, id: 'user3', name: 'Pedro Ruiz', email: 'pedro@example.com', phone: undefined, league_id: undefined }

function setup(extra: Record<string, { status?: number; body?: unknown }> = {}) {
  const fetchMock = mockApi({
    'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    'GET /users': { body: pageOf([juan, maria, pedro]) },
    'GET /admin/users/admin1': { body: { ...juan, id: 'admin1' } },
    'GET /admin/users/user3': { body: pedro },
    ...extra,
  })
  return { fetchMock, ...renderWithProviders(<LeagueManagement />) }
}

async function openEdit(user: Tester) {
  await screen.findByText('Liga Premier')
  await user.click(screen.getAllByRole('button', { name: /^editar /i })[0]!)
  return screen.findByRole('dialog', { name: 'Editar Liga' })
}

describe('Delete league', () => {
  it('lists what is lost, suggests deactivating and sends nothing until confirmed', async () => {
    const { fetchMock, user } = setup({ 'DELETE /leagues/league1': { status: 204 } })
    await screen.findByText('Liga Premier')
    await user.click(screen.getByRole('button', { name: 'Eliminar Liga Premier' }))

    const dialog = await screen.findByRole('alertdialog', { name: /confirmar eliminación/i })
    expect(dialog).toHaveTextContent('¿Eliminar "Liga Premier"?')
    for (const lost of ['torneos', 'equipos y jugadores', 'partidos', 'finanzas', 'WhatsApp', 'usuarios y los videos se conservan']) {
      expect(dialog).toHaveTextContent(lost)
    }
    expect(dialog).toHaveTextContent('usa Desactivar')
    expect(requestsTo(fetchMock, 'DELETE /leagues/league1')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Liga "Liga Premier" eliminada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /leagues/league1')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /leagues/admin').length).toBeGreaterThanOrEqual(2)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const { fetchMock, user } = setup()
    await screen.findByText('Liga Premier')
    await user.click(screen.getByRole('button', { name: 'Eliminar Liga Premier' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /leagues/league1')).toHaveLength(0)
  })

  it('keeps the dialog open and shows the API message when deleting fails', async () => {
    const { user } = setup({ 'DELETE /leagues/league1': { status: 403, body: errorBody('forbidden', 'No tienes permiso') } })
    await screen.findByText('Liga Premier')
    await user.click(screen.getByRole('button', { name: 'Eliminar Liga Premier' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('Activate all', () => {
  it('activates every inactive league with PATCH status and reports the result', async () => {
    const second = { ...inactiveLeague, id: 'league3', name: 'Liga Tercera', slug: 'liga-tercera' }
    const { fetchMock, user } = setup({
      'GET /leagues/admin': { body: pageOf([league, inactiveLeague, second]) },
      'PATCH /leagues/league2/status': { body: { ...inactiveLeague, is_active: true } },
      'PATCH /leagues/league3/status': { body: { ...second, is_active: true } },
    })
    await user.click(await screen.findByRole('button', { name: 'Activar todas (2)' }))

    expect(await screen.findByText('2 ligas activadas exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league2/status')).toEqual([{ is_active: true }])
    expect(requestsTo(fetchMock, 'PATCH /leagues/league3/status')).toEqual([{ is_active: true }])
  })

  it('reports which leagues failed and still activates the others', async () => {
    const second = { ...inactiveLeague, id: 'league3', name: 'Liga Tercera', slug: 'liga-tercera' }
    const { fetchMock, user } = setup({
      'GET /leagues/admin': { body: pageOf([league, inactiveLeague, second]) },
      'PATCH /leagues/league2/status': { status: 500, body: errorBody('internal', 'Error del servidor') },
      'PATCH /leagues/league3/status': { body: { ...second, is_active: true } },
    })
    await user.click(await screen.findByRole('button', { name: 'Activar todas (2)' }))

    expect(await screen.findByText('Se activaron 1 de 2 ligas. No se pudo activar: Liga Ascenso')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league3/status')).toHaveLength(1)
  })

  it('is hidden when every league is active', async () => {
    setup({ 'GET /leagues/admin': { body: pageOf([league]) } })
    await screen.findByText('Liga Premier')
    expect(screen.queryByRole('button', { name: /activar todas/i })).not.toBeInTheDocument()
  })
})

describe('Change the admin of a league', () => {
  it('prefills the current admin from GET /admin/users/{id}', async () => {
    const { user } = setup()
    const dialog = await openEdit(user)
    expect(await within(dialog).findByLabelText('Email')).toHaveValue('juan@example.com')
    expect(within(dialog).getByRole('button', { name: 'Guardar administrador' })).toBeDisabled()
  })

  it('assigns another league admin with PUT /leagues/league1/admin', async () => {
    const { fetchMock, user } = setup({ 'PUT /leagues/league1/admin': { status: 204 } })
    const dialog = await openEdit(user)
    await within(dialog).findByLabelText('Email')
    await user.click(within(dialog).getByRole('combobox', { name: 'Administrador' }))
    await user.click(await screen.findByRole('option', { name: /pedro ruiz/i }))
    await waitFor(() => expect(within(dialog).getByLabelText('Email')).toHaveValue('pedro@example.com'))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar administrador' }))

    expect(await screen.findByText('Administrador actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PUT /leagues/league1/admin')).toEqual([{ admin_id: 'user3' }])
    expect(requestsTo(fetchMock, 'PATCH /admin/users/user3')).toHaveLength(0)
  })

  it('edits the name, email and phone of the admin with PATCH /admin/users/{id}', async () => {
    const { fetchMock, user } = setup({ 'PATCH /admin/users/admin1': { body: juan } })
    const dialog = await openEdit(user)
    const phone = await within(dialog).findByLabelText('Teléfono')
    await user.clear(phone)
    await user.type(phone, '5551112222')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar administrador' }))

    expect(await screen.findByText('Administrador actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/admin1')).toEqual([{ phone: '5551112222' }])
    expect(requestsTo(fetchMock, 'PUT /leagues/league1/admin')).toHaveLength(0)
  })

  it('shows the 422 of a non league admin next to the select and keeps the selection', async () => {
    const { user } = setup({
      'PUT /leagues/league1/admin': { status: 422, body: errorBody('validation_failed', 'Datos inválidos', { admin_id: 'debe ser un administrador de liga activo' }) },
    })
    const dialog = await openEdit(user)
    await within(dialog).findByLabelText('Email')
    await user.click(within(dialog).getByRole('combobox', { name: 'Administrador' }))
    await user.click(await screen.findByRole('option', { name: /pedro ruiz/i }))
    await waitFor(() => expect(within(dialog).getByLabelText('Email')).toHaveValue('pedro@example.com'))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar administrador' }))

    expect(await within(dialog).findByText('debe ser un administrador de liga activo')).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Administrador' })).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('combobox', { name: 'Administrador' })).toHaveTextContent('Pedro Ruiz')
  })

  it('shows the 409 of a duplicate email on the email field', async () => {
    const { user } = setup({ 'PATCH /admin/users/admin1': { status: 409, body: errorBody('conflict', 'El recurso ya existe') } })
    const dialog = await openEdit(user)
    const email = await within(dialog).findByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'otro@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar administrador' }))

    expect(await within(dialog).findByText('Este correo ya está registrado')).toBeInTheDocument()
    expect(email).toHaveValue('otro@example.com')
  })
})

describe('Change the product mode of a league', () => {
  it('sends PATCH product-mode with the features of the chosen plan', async () => {
    const { fetchMock, user } = setup({ 'PATCH /leagues/league1/product-mode': { body: { ...league, product_mode: 'web_only' } } })
    const dialog = await openEdit(user)
    const save = within(dialog).getByRole('button', { name: 'Cambiar tipo de producto' })
    expect(save).toBeDisabled()
    await user.click(within(dialog).getByRole('radio', { name: 'Zona-G Web' }))
    await user.click(save)

    expect(await screen.findByText('Tipo de producto actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode')).toEqual([
      { product_mode: 'web_only', features: expect.objectContaining({ qr_codes: false, manual_entry: true, finance_payments: false }) },
    ])
  })

  it('shows the API message when the change fails and keeps the selection', async () => {
    const { user } = setup({ 'PATCH /leagues/league1/product-mode': { status: 403, body: errorBody('forbidden', 'No tienes permiso') } })
    const dialog = await openEdit(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Zona-G Web' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cambiar tipo de producto' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: 'Zona-G Web' })).toBeChecked()
  })
})
