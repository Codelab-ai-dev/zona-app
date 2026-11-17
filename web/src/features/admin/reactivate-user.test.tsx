import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import type { User } from './types'
import { UsersManagement } from './components/users-management'

const active: User = { id: 'u-act', name: 'Ana Activa', email: 'ana@test.local', role: 'team_owner', is_active: true, created_at: '2026-01-01T00:00:00Z' }
const inactive: User = { id: 'u-ina', name: 'Iván Inactivo', email: 'ivan@test.local', role: 'league_admin', is_active: false, created_at: '2026-01-01T00:00:00Z' }

const setup = (patch: { status?: number; body?: unknown } = { body: {} }) => {
  const fetchMock = mockApi({
    'GET /users': { body: { data: [active, inactive], page: { limit: 50, offset: 0 } } },
    'PATCH /admin/users/u-act': patch,
    'PATCH /admin/users/u-ina': patch,
  })
  return { fetchMock, ...renderWithProviders(<UsersManagement />) }
}

const row = async (name: string) => (await screen.findByRole('cell', { name })).closest('tr')!

describe('user activation (#52)', () => {
  it('reactivates an inactive account', async () => {
    const { fetchMock, user } = setup()
    const r = await row('Iván Inactivo')
    expect(within(r).queryByRole('button', { name: 'Desactivar usuario' })).not.toBeInTheDocument()
    await user.click(within(r).getByRole('button', { name: 'Reactivar usuario' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/podrá volver a iniciar sesión/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Reactivar' }))

    expect(await screen.findByText(/Usuario reactivado/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/u-ina')).toEqual([{ is_active: true }])
  })

  it('still deactivates an active account', async () => {
    const { fetchMock, user } = setup()
    const r = await row('Ana Activa')
    expect(within(r).queryByRole('button', { name: 'Reactivar usuario' })).not.toBeInTheDocument()
    await user.click(within(r).getByRole('button', { name: 'Desactivar usuario' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Usuario desactivado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/u-act')).toEqual([{ is_active: false }])
  })

  it("shows the API's message when it fails", async () => {
    const { user } = setup({ status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso para esta acción' } } })
    await user.click(within(await row('Iván Inactivo')).getByRole('button', { name: 'Reactivar usuario' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reactivar' }))

    expect(await screen.findByText('No tienes permiso para esta acción')).toBeInTheDocument()
  })
})
