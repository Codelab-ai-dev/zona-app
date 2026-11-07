import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AdminPage } from './admin-page'

const recording = {
  id: 'r1',
  title: 'Video 1',
  status: 'ready',
  visibility: 'public',
  source_type: 'manual',
  processing_progress: 100,
  is_premium: false,
  views_count: 100,
  likes_count: 10,
  uploaded_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  updated_at: '2024-12-20T10:00:00Z',
  duration_seconds: 3600,
}
const list = (data: unknown[]) => ({ body: { data, page: { limit: 50, offset: 0 } } })

async function confirmDelete(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Eliminar video Video 1' }))
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('¿Eliminar video?')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

describe('AdminPage videos', () => {
  it('renders the videos list with status and link', async () => {
    mockApi({ 'GET /play/videos': list([recording]) })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByRole('heading', { name: 'Zona Play Admin' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Video 1' })).toHaveAttribute('href', '/play/watch/r1')
    expect(screen.getByText('Listo')).toBeInTheDocument()
  })

  it('shows empty state when there are no videos', async () => {
    mockApi({ 'GET /play/videos': list([]) })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByText(/No hay videos aún/i)).toBeInTheDocument()
  })

  it('deletes the video only after confirming, then reports and refetches', async () => {
    const fetchMock = mockApi({
      'GET /play/videos': list([recording]),
      'DELETE /play/videos/r1': { status: 204 },
    })
    const { user } = renderWithProviders(<AdminPage />)

    await confirmDelete(user)

    expect(await screen.findByText('Video eliminado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /play/videos/r1')).toHaveLength(1)
    expect(requestsTo(fetchMock, 'GET /play/videos').length).toBeGreaterThanOrEqual(2)
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const fetchMock = mockApi({ 'GET /play/videos': list([recording]) })
    const { user } = renderWithProviders(<AdminPage />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar video Video 1' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(requestsTo(fetchMock, 'DELETE /play/videos/r1')).toHaveLength(0)
  })

  it('shows the API message when deleting is forbidden', async () => {
    mockApi({
      'GET /play/videos': list([recording]),
      'DELETE /play/videos/r1': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso para eliminar' } } },
    })
    const { user } = renderWithProviders(<AdminPage />)

    await confirmDelete(user)

    expect(await screen.findByText('No tienes permiso para eliminar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Video 1' })).toBeInTheDocument()
  })

  it('refreshes a processing video via POST refresh', async () => {
    const fetchMock = mockApi({
      'GET /play/videos': list([{ ...recording, status: 'processing' }]),
      'POST /play/videos/r1/refresh': { body: { ...recording, status: 'ready' } },
    })
    const { user } = renderWithProviders(<AdminPage />)

    await user.click(await screen.findByRole('button', { name: 'Actualizar estado de Video 1' }))

    expect(await screen.findByText('Video actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /play/videos/r1/refresh')).toHaveLength(1)
  })

  it('shows error state with retry on API error', async () => {
    mockApi({ 'GET /play/videos': { status: 500, body: { error: { code: 'internal_error', message: 'Error del servidor' } } } })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
