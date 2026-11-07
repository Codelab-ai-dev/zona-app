import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { ChangePasswordDialog } from './change-password-dialog'

const signOut = vi.fn(async () => {})
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ status: 'authenticated', profile: null, signIn: vi.fn(), signOut }) }))

afterEach(() => {
  vi.unstubAllGlobals()
  signOut.mockClear()
})

const ui = (
  <Routes>
    <Route path="/" element={<ChangePasswordDialog />} />
    <Route path="/login" element={<h1>Pantalla login</h1>} />
  </Routes>
)

async function fill(user: ReturnType<typeof renderWithProviders>['user'], current = 'Actual-1234', next = 'Nueva-clave-segura') {
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
  await user.type(await screen.findByLabelText('Contraseña actual'), current)
  await user.type(screen.getByLabelText('Nueva contraseña'), next)
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), next)
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('ChangePasswordDialog', () => {
  it('sends the exact body, then signs out and goes to login', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/change': { status: 204 } })
    const { user } = renderWithProviders(ui)
    await fill(user)

    expect(await screen.findByRole('heading', { name: 'Pantalla login' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /auth/password/change')).toEqual([{ current_password: 'Actual-1234', new_password: 'Nueva-clave-segura' }])
    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument()
  })

  it('shows a 422 current_password error on the field and keeps the dialog open', async () => {
    mockApi({ 'POST /auth/password/change': { status: 422, body: { error: { code: 'validation_failed', message: 'x', fields: { current_password: 'la contraseña actual no es correcta' } } } } })
    const { user } = renderWithProviders(ui)
    await fill(user, 'Equivocada-1')

    await waitFor(() => expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('la contraseña actual no es correcta')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('Equivocada-1')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('does not send a mismatching confirmation', async () => {
    const fetchMock = mockApi({})
    const { user } = renderWithProviders(ui)
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    await user.type(await screen.findByLabelText('Contraseña actual'), 'Actual-1234')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Nueva-clave-segura')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Distinta-clave-1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
