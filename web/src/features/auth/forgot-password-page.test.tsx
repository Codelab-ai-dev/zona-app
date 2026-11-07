import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { ForgotPasswordPage } from './forgot-password-page'

afterEach(() => vi.unstubAllGlobals())

describe('ForgotPasswordPage', () => {
  it('sends the email and shows the neutral message', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/forgot': { status: 204 } })
    const { user } = renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Correo electrónico'), 'nadie@ejemplo.mx')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Si el correo está registrado, te enviamos un enlace')
    expect(requestsTo(fetchMock, 'POST /auth/password/forgot')).toEqual([{ email: 'nadie@ejemplo.mx' }])
  })

  it('shows the rate limit message', async () => {
    mockApi({ 'POST /auth/password/forgot': { status: 429, body: { error: { code: 'rate_limited', message: 'x' } } } })
    const { user } = renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Correo electrónico'), 'a@b.mx')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos')
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('a@b.mx')
  })
})
