import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { TeamPage } from './team-page'

const video = {
  id: 'v1',
  title: 'Jornada 3',
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

function renderTeam() {
  return renderWithProviders(
    <Routes>
      <Route path="/play/team/:teamId" element={<TeamPage />} />
    </Routes>,
    { route: '/play/team/t-7' },
  )
}

describe('TeamPage', () => {
  it('filters videos by the team in the URL and omits missing scores', async () => {
    const fetchMock = mockApi({ 'GET /play/videos': { body: { data: [video], page: { limit: 20, offset: 0 } } } })
    renderTeam()

    expect(await screen.findByText('Jornada 3')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.searchParams.get('team_id')).toBe('t-7')
  })

  it('shows the empty state with a link back', async () => {
    mockApi({ 'GET /play/videos': { body: { data: [], page: { limit: 20, offset: 0 } } } })
    renderTeam()

    expect(await screen.findByText('No hay videos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos los videos' })).toHaveAttribute('href', '/play')
  })

  it('shows the API error with retry', async () => {
    mockApi({ 'GET /play/videos': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } } })
    renderTeam()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
