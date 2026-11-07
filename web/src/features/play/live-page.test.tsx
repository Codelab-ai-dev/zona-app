import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LivePage } from './live-page'

const stream = {
  id: 's1',
  title: 'Jornada 15 en vivo',
  status: 'live',
  source_type: 'obs',
  is_pay_per_view: false,
  recording_ready: false,
  current_viewers: 42,
  broadcaster_id: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  mux_playback_id: 'pb-1',
}

// The Mux web component needs real media APIs JSDOM lacks: stub it and expose its props.
vi.mock('@mux/mux-player-react', () => ({
  default: ({ playbackId, streamType }: { playbackId: string; streamType: string }) => (
    <div data-testid="mux-player" data-playback-id={playbackId} data-stream-type={streamType} />
  ),
}))

function renderLive() {
  return renderWithProviders(
    <Routes>
      <Route path="/play/live/:streamId" element={<LivePage />} />
    </Routes>,
    { route: '/play/live/s1' },
  )
}

describe('LivePage', () => {
  it('renders the live badge, title and viewers', async () => {
    const fetchMock = mockApi({ 'GET /play/streams/s1': { body: stream } })
    renderLive()

    expect(await screen.findByRole('heading', { name: 'Jornada 15 en vivo' })).toBeInTheDocument()
    expect(screen.getByText('En Vivo')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByTestId('mux-player')).toHaveAttribute('data-playback-id', 'pb-1')
    expect(screen.getByTestId('mux-player')).toHaveAttribute('data-stream-type', 'live')
    expect(requestsTo(fetchMock, 'GET /play/streams/s1')).toHaveLength(1)
  })

  it('shows unavailable while the stream has not started', async () => {
    mockApi({ 'GET /play/streams/s1': { body: { ...stream, status: 'idle' } } })
    renderLive()

    expect(await screen.findByText('Transmisión no disponible')).toBeInTheDocument()
    expect(screen.getByText('Estado: Pendiente')).toBeInTheDocument()
  })

  it('shows the API error with retry', async () => {
    mockApi({ 'GET /play/streams/s1': { status: 404, body: { error: { code: 'not_found', message: 'Transmisión no encontrada' } } } })
    renderLive()

    expect(await screen.findByRole('alert')).toHaveTextContent('Transmisión no encontrada')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
