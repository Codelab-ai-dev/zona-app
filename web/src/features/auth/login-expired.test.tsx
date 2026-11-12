import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

const dismissExpired = vi.fn()
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ status: 'anonymous', profile: null, signIn: vi.fn(), signOut: vi.fn(), expired: true, expire: vi.fn(), dismissExpired }),
}))

import { LoginPage } from './login-page'

describe('LoginPage after an expired session', () => {
  it('explains that the session expired and lets the user dismiss it', async () => {
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByText('Tu sesión ha expirado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(dismissExpired).toHaveBeenCalled()
  })
})
