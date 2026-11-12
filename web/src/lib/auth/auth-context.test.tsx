import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AuthProvider, useAuth } from './auth-context'
import * as session from './session'

const future = () => new Date(Date.now() + 900_000).toISOString()
const tokens = { access_token: 'tok', expires_at: future() }
const profile = { id: 'u1', name: 'Ana', email: 'a@b.mx', role: 'league_admin', is_active: true, created_at: '2026-01-01T00:00:00Z' }

function Probe() {
  const { status, profile, signIn, signOut } = useAuth()
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p>{profile?.name}</p>
      <button onClick={() => void signIn('a@b.mx', 'secreto-largo').catch((e: Error) => screen.getByTestId('err').replaceChildren(e.message))}>entrar</button>
      <button onClick={() => void signOut()}>salir</button>
      <p data-testid="err" />
    </div>
  )
}

const renderProbe = () => renderWithProviders(<AuthProvider><Probe /></AuthProvider>)

afterEach(() => {
  session.clearSession()
  vi.unstubAllGlobals()
})

describe('AuthProvider', () => {
  it('bootstraps authenticated when refresh succeeds', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { body: tokens }, 'GET /me': { body: profile } })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /auth/refresh')).toHaveLength(1)
  })

  it('is anonymous when refresh answers 401', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { status: 401, body: { error: { code: 'unauthorized', message: 'x' } } } })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    expect(requestsTo(fetchMock, 'GET /me')).toHaveLength(0)
  })

  it.each([
    [401, 'Correo o contraseña incorrectos'],
    [403, 'Tu cuenta está desactivada'],
    [429, 'Demasiados intentos. Espera un minuto.'],
  ])('maps login status %i to a Spanish message', async (status, message) => {
    const fetchMock = mockApi({
      'POST /auth/refresh': { status: 401, body: { error: { code: 'unauthorized', message: 'x' } } },
      'POST /auth/login': { status, body: { error: { code: 'x', message: 'raw' } } },
    })
    const { user } = renderProbe()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    await user.click(screen.getByRole('button', { name: 'entrar' }))
    await waitFor(() => expect(screen.getByTestId('err')).toHaveTextContent(message))
    expect(requestsTo(fetchMock, 'POST /auth/login')).toEqual([{ email: 'a@b.mx', password: 'secreto-largo' }])
  })

  it('signs in and loads the profile', async () => {
    mockApi({
      'POST /auth/refresh': { status: 401, body: { error: { code: 'unauthorized', message: 'x' } } },
      'POST /auth/login': { body: tokens },
      'GET /me': { body: profile },
    })
    const { user } = renderProbe()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    await user.click(screen.getByRole('button', { name: 'entrar' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
  })

  it('signOut posts /auth/logout, drops the token and clears the query cache', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { body: tokens }, 'GET /me': { body: profile }, 'POST /auth/logout': { status: 204 } })
    const { user, client } = renderProbe()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    client.setQueryData(['teams'], [{ id: 't1' }])

    await user.click(screen.getByRole('button', { name: 'salir' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    expect(requestsTo(fetchMock, 'POST /auth/logout')).toHaveLength(1)
    expect(client.getQueryData(['teams'])).toBeUndefined()
    expect(session.hasToken()).toBe(false)
  })
})
