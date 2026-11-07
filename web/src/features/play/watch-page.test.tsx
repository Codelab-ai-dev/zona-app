import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { WatchPage } from './watch-page'

// The Mux web component needs real media APIs JSDOM lacks: stub it and expose its props.
vi.mock('@mux/mux-player-react', () => ({
  default: ({ playbackId, streamType }: { playbackId: string; streamType: string }) => (
    <div data-testid="mux-player" data-playback-id={playbackId} data-stream-type={streamType} />
  ),
}))

function renderWatch() {
  return renderWithProviders(
    <Routes>
      <Route path="/play/watch/:videoId" element={<WatchPage />} />
    </Routes>,
    { route: '/play/watch/r1' },
  )
}

const recording = {
  id: 'r1',
  title: 'Tigres FC vs Leones United - Final',
  description: 'Final de la Liga Premier 2024',
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
  mux_playback_id: 'playback-id-123',
}

describe('WatchPage', () => {
  it('renders video player and metadata', async () => {
    const fetchMock = mockApi({
      'GET /play/videos/r1': {
        body: recording,
      },
    })
    renderWatch()

    expect(await screen.findByText('Tigres FC vs Leones United - Final')).toBeInTheDocument()
    expect(screen.getByText('Final de la Liga Premier 2024')).toBeInTheDocument()
    expect(screen.getByText('3 - 2')).toBeInTheDocument()
    expect(screen.getByTestId('mux-player')).toHaveAttribute('data-playback-id', 'playback-id-123')
    expect(screen.getByTestId('mux-player')).toHaveAttribute('data-stream-type', 'on-demand')
    expect(requestsTo(fetchMock, 'GET /play/videos/r1')).toHaveLength(1)
  })

  it('omits the score box when the API leaves the scores out', async () => {
    const noScore: Record<string, unknown> = { ...recording }
    delete noScore.home_score
    delete noScore.away_score
    mockApi({ 'GET /play/videos/r1': { body: noScore } })
    renderWatch()

    expect(await screen.findByText('Tigres FC vs Leones United - Final')).toBeInTheDocument()
    expect(screen.queryByText('Marcador')).not.toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('shows error message when video has no playback ID', async () => {
    const recordingNoPlayback = { ...recording, mux_playback_id: undefined }
    mockApi({
      'GET /play/videos/r1': {
        body: recordingNoPlayback,
      },
    })
    renderWatch()

    expect(await screen.findByText(/aún no está disponible/i)).toBeInTheDocument()
  })

  it('shows error state and retry button on API error', async () => {
    mockApi({
      'GET /play/videos/r1': {
        status: 404,
        body: { error: { code: 'not_found', message: 'Video no encontrado' } },
      },
    })
    renderWatch()

    expect(await screen.findByRole('alert')).toHaveTextContent('Video no encontrado')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
