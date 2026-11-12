import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/auth-context'
import { clearSession } from '@/lib/auth/session'
import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LoginPage } from './login-page'

const unauth = { error: { code: 'unauthorized', message: 'x' } }
afterEach(() => {
  clearSession()
  vi.unstubAllGlobals()
})

const renderLogin = () => renderWithProviders(<AuthProvider><LoginPage /></AuthProvider>, { route: '/login' })

describe('LoginPage', () => {
  it('signs in with the exact credentials and shows the profile gate', async () => {
    const fetchMock = mockApi({
      'POST /auth/refresh': { status: 401, body: unauth },
      'POST /auth/login': { body: { access_token: 't', expires_at: new Date(Date.now() + 900_000).toISOString() } },
      'GET /me': { body: { id: 'u1', name: 'Ana', email: 'a@b.mx', role: 'league_admin', is_active: true, created_at: '' } },
    })
    const { user } = renderLogin()
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email')
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@liga.mx')
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(requestsTo(fetchMock, 'POST /auth/login')).toEqual([{ email: 'ana@liga.mx', password: 'Secreta-123' }]))
  })

  it('shows the invalid credentials message and keeps the typed email', async () => {
    mockApi({ 'POST /auth/refresh': { status: 401, body: unauth }, 'POST /auth/login': { status: 401, body: unauth } })
    const { user } = renderLogin()
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@liga.mx')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ana@liga.mx')
  })

  it('links to password recovery', () => {
    mockApi({ 'POST /auth/refresh': { status: 401, body: unauth } })
    renderLogin()
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar-contrasena')
  })
})
