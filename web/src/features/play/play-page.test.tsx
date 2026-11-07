import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { PlayPage } from './play-page'

const recording = {
  id: 'r1',
  title: 'Tigres FC vs Leones United',
  description: 'Final de la Liga Premier',
  status: 'ready',
  visibility: 'public',
  source_type: 'manual',
  processing_progress: 100,
  is_premium: false,
  views_count: 1250,
  likes_count: 45,
  uploaded_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  updated_at: '2024-12-20T10:00:00Z',
  thumbnail_url: 'https://image.mux.com/thumb.jpg',
  duration_seconds: 5400,
  home_score: 3,
  away_score: 2,
  published_at: '2024-12-20T10:00:00Z',
}

const stream = {
  id: 's1',
  title: 'Liga Premier - Jornada 16',
  status: 'live',
  source_type: 'obs',
  is_pay_per_view: false,
  current_viewers: 156,
  recording_ready: false,
  broadcaster_id: 'u1',
  created_at: '2024-12-20T14:00:00Z',
}

describe('PlayPage', () => {
  it('renders featured video and recent videos', async () => {
    mockApi({
      'GET /play/videos': {
        body: {
          data: [recording, recording],
          page: { limit: 10, offset: 0 },
        },
      },
      'GET /play/streams': {
        body: {
          data: [],
          page: { limit: 5, offset: 0 },
        },
      },
    })
    renderWithProviders(<PlayPage />)

    expect(await screen.findByRole('heading', { name: 'Zona Play' })).toBeInTheDocument()
    const titles = await screen.findAllByText('Tigres FC vs Leones United')
    expect(titles.length).toBe(2)
  })

  it('renders live banner when stream is live', async () => {
    mockApi({
      'GET /play/videos': {
        body: {
          data: [recording],
          page: { limit: 10, offset: 0 },
        },
      },
      'GET /play/streams': {
        body: {
          data: [stream],
          page: { limit: 5, offset: 0 },
        },
      },
    })
    renderWithProviders(<PlayPage />)

    expect(await screen.findByText('En Vivo')).toBeInTheDocument()
    expect(screen.getByText('Liga Premier - Jornada 16')).toBeInTheDocument()
  })

  it('shows empty state when no videos', async () => {
    mockApi({
      'GET /play/videos': {
        body: {
          data: [],
          page: { limit: 10, offset: 0 },
        },
      },
      'GET /play/streams': {
        body: {
          data: [],
          page: { limit: 5, offset: 0 },
        },
      },
    })
    renderWithProviders(<PlayPage />)

    expect(await screen.findByText('Aún no hay videos')).toBeInTheDocument()
  })

  it('shows error state and retry button on API error', async () => {
    mockApi({
      'GET /play/videos': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
      },
      'GET /play/streams': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error' } },
      },
    })
    renderWithProviders(<PlayPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
