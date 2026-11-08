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

    expect(await screen.findByText('Video no disponible')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/play')
  })

  it('shows the error state with retry on a server error', async () => {
    mockApi({ 'GET /play/videos/r1': { status: 500, body: { error: { code: 'internal', message: 'Falla del servidor' } } } })
    renderWatch()

    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent('Falla del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  }, 10000)

  it('shows the processing state with progress and no player', async () => {
    mockApi({
      'GET /play/videos/r1': { body: { ...recording, status: 'processing', processing_progress: 40, mux_playback_id: undefined } },
    })
    renderWatch()

    expect(await screen.findByText('Procesando video')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.queryByTestId('mux-player')).not.toBeInTheDocument()
  })

  it('shows the failure reason when processing failed', async () => {
    mockApi({
      'GET /play/videos/r1': { body: { ...recording, status: 'failed', error_message: 'Formato no soportado', mux_playback_id: undefined } },
    })
    renderWatch()

    expect(await screen.findByText('Error al procesar')).toBeInTheDocument()
    expect(screen.getByText('Formato no soportado')).toBeInTheDocument()
  })

  it('shows teams linking to their page, the league and the 5 newest related videos of the league', async () => {
    const withContext = {
      ...recording,
      league_id: 'lg1',
      league: { id: 'lg1', name: 'Liga Premier', slug: 'premier' },
      home_team: { id: 't1', name: 'Tigres FC' },
      away_team: { id: 't2', name: 'Leones United' },
    }
    const related = Array.from({ length: 6 }, (_, i) => ({
      ...recording,
      id: i === 0 ? 'r1' : `rel${i}`,
      title: `Relacionado ${i}`,
      home_team: undefined,
    }))
    const fetchMock = mockApi({
      'GET /play/videos/r1': { body: withContext },
      'GET /play/videos': { body: { data: related, page: { limit: 6, offset: 0 } } },
    })
    renderWatch()

    expect(await screen.findByRole('heading', { level: 1, name: 'Tigres FC vs Leones United' })).toBeInTheDocument()
    expect(screen.getAllByText('Liga Premier').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Tigres FC/ })).toHaveAttribute('href', '/play/team/t1')
    expect(screen.getByRole('link', { name: /Leones United/ })).toHaveAttribute('href', '/play/team/t2')
    expect(await screen.findByText('Relacionado 5')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Relacionado/ })).toHaveLength(5)
    expect(requestsTo(fetchMock, 'GET /play/videos').length).toBe(1)
  })
})
