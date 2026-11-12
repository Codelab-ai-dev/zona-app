import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

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

describe('LeaguesPage details', () => {
  it('renders every league name, a single h1 and retries the endpoint on error', async () => {
    const other = { ...league, id: 'l2', name: 'Liga Sur', slug: 'liga-sur' }
    mockApi({ 'GET /leagues': { body: { data: [league, other], page: { limit: 100, offset: 0 } } } })
    renderWithProviders(<LeaguesPage />)

    expect(await screen.findByRole('link', { name: /liga sur/i })).toHaveAttribute('href', '/liga/liga-sur')
    expect(screen.getAllByText('Fútbol 7 los domingos')).toHaveLength(2)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('calls GET /leagues again when retrying', async () => {
    const fetchMock = mockApi({ 'GET /leagues': { status: 500, body: { error: { code: 'internal_error', message: 'Error interno' } } } })
    const { user } = renderWithProviders(<LeaguesPage />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'GET /leagues')).toHaveLength(2))
  })
})
