import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { UsersManagement } from './components/users-management'
import { emptyPage, errorBody, juan, maria, pageOf } from './test-fixtures'

describe('UsersManagement list', () => {
  it('renders every user with email, role, phone and status', async () => {
    mockApi({ 'GET /users': { body: pageOf([juan, maria]) } })
    renderWithProviders(<UsersManagement />)

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
    expect(screen.getByText('juan@example.com')).toBeInTheDocument()
    expect(screen.getByText('league admin')).toBeInTheDocument()
    expect(screen.getByText('team owner')).toBeInTheDocument()
    expect(screen.getByText('+52 555 1234567')).toBeInTheDocument()
    expect(screen.getAllByText('Activo')).toHaveLength(2)
  })

  it('offers deactivation only for active users', async () => {
    mockApi({ 'GET /users': { body: pageOf([juan, { ...maria, is_active: false }]) } })
    renderWithProviders(<UsersManagement />)

    await screen.findByText('Juan Pérez')
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Desactivar usuario' })).toHaveLength(1)
  })

  it('renders the empty state when there are no users', async () => {
    mockApi({ 'GET /users': { body: emptyPage } })
    renderWithProviders(<UsersManagement />)

    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('renders the API error with a retry button', async () => {
    mockApi({ 'GET /users': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    renderWithProviders(<UsersManagement />)

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
