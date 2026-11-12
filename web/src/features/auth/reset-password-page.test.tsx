import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { ResetPasswordPage } from './reset-password-page'

const page = (
  <Routes>
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/login" element={<h1>Pantalla login</h1>} />
  </Routes>
)
const GOOD = 'Nueva-clave-segura'

beforeEach(() => window.history.pushState({}, '', '/reset-password?token=tok123'))
afterEach(() => {
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

describe('ResetPasswordPage', () => {
  it('sends the token from the query, strips it from the URL and goes to login', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/reset': { status: 204 } })
    const { user } = renderWithProviders(page, { route: '/reset-password?token=tok123' })

    expect(window.location.search).toBe('')
    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')

    await user.type(screen.getByLabelText('Nueva contraseña'), GOOD)
    await user.type(screen.getByLabelText('Confirmar contraseña'), GOOD)
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('heading', { name: 'Pantalla login' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /auth/password/reset')).toEqual([{ token: 'tok123', password: GOOD }])
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument()
    expect(document.querySelector('meta[name="referrer"]')).toBeNull()
  })

  it('blocks the request when passwords do not match', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/reset': { status: 204 } })
    const { user } = renderWithProviders(page, { route: '/reset-password?token=tok123' })
    await user.type(screen.getByLabelText('Nueva contraseña'), GOOD)
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra-distinta-1')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /auth/password/reset')).toHaveLength(0)
  })

  it('blocks passwords shorter than 10 characters', async () => {
    const fetchMock = mockApi({})
    const { user } = renderWithProviders(page, { route: '/reset-password?token=tok123' })
    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'corta')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Mínimo 10 caracteres')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows an expired-link error with a link to request a new one', async () => {
    mockApi({ 'POST /auth/password/reset': { status: 422, body: { error: { code: 'validation_failed', message: 'x', fields: { token: 'enlace no válido' } } } } })
    const { user } = renderWithProviders(page, { route: '/reset-password?token=tok123' })
    await user.type(screen.getByLabelText('Nueva contraseña'), GOOD)
    await user.type(screen.getByLabelText('Confirmar contraseña'), GOOD)
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció'))
    expect(screen.getByRole('link', { name: 'Solicita uno nuevo' })).toHaveAttribute('href', '/recuperar-contrasena')
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue(GOOD)
  })
})
