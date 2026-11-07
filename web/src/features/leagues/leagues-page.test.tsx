import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { LeaguesPage, initials } from './leagues-page'

const league = {
  id: 'l1', name: 'Liga Norte', slug: 'liga-norte', description: 'Fútbol 7 los domingos',
  admin_id: 'a1', is_active: true, product_mode: 'full', created_at: '', updated_at: '',
}

describe('LeaguesPage', () => {
  it('lists active leagues as links to their page', async () => {
    mockApi({ 'GET /leagues': { body: { data: [league], page: { limit: 100, offset: 0 } } } })
    renderWithProviders(<LeaguesPage />)

    const link = await screen.findByRole('link', { name: /liga norte/i })
    expect(link).toHaveAttribute('href', '/liga/liga-norte')
  })

  it('shows an empty state', async () => {
    mockApi({ 'GET /leagues': { body: { data: [], page: { limit: 100, offset: 0 } } } })
    renderWithProviders(<LeaguesPage />)

    expect(await screen.findByText('Aún no hay ligas activas')).toBeInTheDocument()
  })

  it('shows the API error message and a retry button', async () => {
    mockApi({ 'GET /leagues': { status: 500, body: { error: { code: 'internal_error', message: 'Error interno del servidor' } } } })
    renderWithProviders(<LeaguesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('initials', () => {
  it.each([
    ['Liga Norte', 'LN'],
    ['  Elite   Soccer League ', 'ES'],
    ['Zona', 'Z'],
  ])('%s → %s', (name, want) => {
    expect(initials(name)).toBe(want)
  })
})
