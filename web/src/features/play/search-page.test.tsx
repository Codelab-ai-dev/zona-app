import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { SearchPage } from './search-page'

const video = {
  id: 'v1',
  title: 'Final de copa',
  status: 'ready',
  visibility: 'public',
  source_type: 'manual',
  processing_progress: 100,
  is_premium: false,
  views_count: 5,
  likes_count: 0,
  uploaded_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  updated_at: '2024-12-20T10:00:00Z',
}

function queriesSent(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost').searchParams.get('q'))
}

describe('SearchPage', () => {
  it('does not query until the user types, then sends q and lists the results', async () => {
    const fetchMock = mockApi({ 'GET /play/videos': { body: { data: [video], page: { limit: 20, offset: 0 } } } })
    const { user } = renderWithProviders(<SearchPage />)

    expect(screen.getByText('No hay búsqueda activa')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Buscar videos' }), 'copa')

    expect(await screen.findByRole('link', { name: /final de copa/i })).toHaveAttribute('href', '/play/watch/v1')
    expect(queriesSent(fetchMock)).toContain('COPA')
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
  })

  it('shows the empty result and clears the search', async () => {
    mockApi({ 'GET /play/videos': { body: { data: [], page: { limit: 20, offset: 0 } } } })
    const { user } = renderWithProviders(<SearchPage />)

    await user.type(screen.getByRole('textbox', { name: 'Buscar videos' }), 'zzz')
    expect(await screen.findByText('No hay resultados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(screen.getByRole('textbox', { name: 'Buscar videos' })).toHaveValue('')
    expect(screen.getByText('No hay búsqueda activa')).toBeInTheDocument()
  })

  it('shows the API error with retry', async () => {
    mockApi({ 'GET /play/videos': { status: 500, body: { error: { code: 'internal_error', message: 'Falló la búsqueda' } } } })
    const { user } = renderWithProviders(<SearchPage />)

    await user.type(screen.getByRole('textbox', { name: 'Buscar videos' }), 'a')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falló la búsqueda')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
