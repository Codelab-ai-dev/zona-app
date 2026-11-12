import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { PasswordForm } from '../components/password-form'
import { apiError } from '../test-fixtures'

const signOut = vi.fn()
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ signOut }) }))

const strong = 'Nueva#Clave2026'

describe('Change password (Configuración)', () => {
  it('lists the requirements while typing and keeps the button disabled until they pass', async () => {
    mockApi({})
    const { user } = renderWithProviders(<PasswordForm />)

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'abc')
    expect(screen.getByText('Requisitos de contraseña:')).toBeInTheDocument()
    expect(screen.getByText('Al menos 10 caracteres')).toHaveClass('text-red-300')
    expect(screen.getByText('Al menos una letra minúscula')).toHaveClass('text-green-300')
    await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), 'abd')
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar Contraseña' })).toBeDisabled()
  })

  it('changes the password with POST /auth/password/change and signs out', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/change': { status: 204 } })
    const { user } = renderWithProviders(<PasswordForm />)

    await user.type(screen.getByLabelText('Contraseña Actual'), 'Vieja#Clave2025')
    await user.type(screen.getByLabelText('Nueva Contraseña'), strong)
    await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), strong)
    await user.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }))

    expect(await screen.findByText('Contraseña cambiada exitosamente. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /auth/password/change')).toEqual([
      { current_password: 'Vieja#Clave2025', new_password: strong },
    ])
    expect(signOut).toHaveBeenCalled()
  })

  it('shows "La contraseña actual es incorrecta" and keeps the typed values on a 422', async () => {
    mockApi({
      'POST /auth/password/change': apiError(422, 'validation_failed', 'Datos inválidos', { current_password: 'incorrecta' }),
    })
    const { user } = renderWithProviders(<PasswordForm />)

    await user.type(screen.getByLabelText('Contraseña Actual'), 'Mala#Clave2025')
    await user.type(screen.getByLabelText('Nueva Contraseña'), strong)
    await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), strong)
    await user.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }))

    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña Actual')).toHaveValue('Mala#Clave2025')
  })

  it('rejects a new password equal to the current one without calling the API', async () => {
    const fetchMock = mockApi({ 'POST /auth/password/change': { status: 204 } })
    const { user } = renderWithProviders(<PasswordForm />)

    await user.type(screen.getByLabelText('Contraseña Actual'), strong)
    await user.type(screen.getByLabelText('Nueva Contraseña'), strong)
    await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), strong)
    await user.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }))

    expect(await screen.findByText('La nueva contraseña debe ser diferente a la actual')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /auth/password/change')).toHaveLength(0)
  })
})
