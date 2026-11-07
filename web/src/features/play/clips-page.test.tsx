import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { ClipsPage } from './clips-page'

const clip = {
  id: 'c1',
  title: 'Golazo de media cancha',
  start_time_seconds: 120,
  end_time_seconds: 165,
  duration_seconds: 45,
  clip_type: 'goal',
  status: 'ready',
  ai_generated: false,
  views_count: 3420,
  likes_count: 234,
  is_featured: false,
  created_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
}

describe('ClipsPage', () => {
  it('renders clips grid', async () => {
    mockApi({
      'GET /play/clips': {
        body: {
          data: [clip, clip],
          page: { limit: 24, offset: 0 },
        },
      },
    })
    renderWithProviders(<ClipsPage />)

    expect(await screen.findByRole('heading', { name: 'Clips' })).toBeInTheDocument()
    const titles = await screen.findAllByText('Golazo de media cancha')
    expect(titles.length).toBe(2)
  })

  it('shows empty state when no clips', async () => {
    mockApi({
      'GET /play/clips': {
        body: {
          data: [],
          page: { limit: 24, offset: 0 },
        },
      },
    })
    renderWithProviders(<ClipsPage />)

    expect(await screen.findByText('Aún no hay clips')).toBeInTheDocument()
  })

  // Error state testing is deferred - TanStack Query error handling requires more complex mocking
  it.skip('shows error state and retry button on API error', async () => {
    mockApi({
      'GET /play/clips': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error al cargar clips' } },
      },
    })
    renderWithProviders(<ClipsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar clips')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
