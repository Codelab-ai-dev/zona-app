import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AdminPage } from './admin-page'

const recording = {
  id: 'r1',
  title: 'Final',
  status: 'ready',
  visibility: 'public',
  source_type: 'manual',
  processing_progress: 100,
  is_premium: false,
  views_count: 1,
  likes_count: 0,
  uploaded_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  updated_at: '2024-12-20T10:00:00Z',
}
const clip = {
  id: 'c1',
  title: 'Golazo',
  start_time_seconds: 10,
  end_time_seconds: 20,
  duration_seconds: 10,
  clip_type: 'goal',
  ai_generated: false,
  views_count: 0,
  likes_count: 0,
  is_featured: false,
  created_by: 'u1',
  created_at: '2024-12-20T10:00:00Z',
}
const list = (data: unknown[]) => ({ body: { data, page: { limit: 50, offset: 0 } } })

async function openClipsTab(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('tab', { name: 'Clips' }))
}

async function fillClip(user: ReturnType<typeof renderWithProviders>['user'], end: string) {
  await user.click(await screen.findByRole('button', { name: /crear clip/i }))
  await user.type(screen.getByLabelText('Título *'), 'Golazo lejano')
  await user.click(screen.getByRole('combobox', { name: 'Video *' }))
  await user.click(await screen.findByRole('option', { name: 'Final' }))
  await user.clear(screen.getByLabelText('Inicio (segundos)'))
  await user.type(screen.getByLabelText('Inicio (segundos)'), '30')
  await user.clear(screen.getByLabelText('Fin (segundos)'))
  await user.type(screen.getByLabelText('Fin (segundos)'), end)
  await user.click(screen.getByRole('button', { name: 'Crear' }))
}

describe('AdminPage clips', () => {
  it('lists clips with their type', async () => {
    mockApi({ 'GET /play/videos': list([]), 'GET /play/clips': list([clip]) })
    const { user } = renderWithProviders(<AdminPage />)
    await openClipsTab(user)
    expect(await screen.findByText('Golazo')).toBeInTheDocument()
    expect(screen.getByText('Gol')).toBeInTheDocument()
  }, 10000)

  it('creates a clip with the exact body and confirms', async () => {
    const fetchMock = mockApi({
      'GET /play/videos': list([recording]),
      'GET /play/clips': list([]),
      'POST /play/clips': { status: 201, body: { ...clip, id: 'c2' } },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openClipsTab(user)

    await fillClip(user, '45')

    expect(await screen.findByText('Clip creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /play/clips')).toEqual([
      { title: 'GOLAZO LEJANO', recording_id: 'r1', start_time_seconds: 30, end_time_seconds: 45, clip_type: 'highlight' },
    ])
    expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /play/clips').length).toBeGreaterThanOrEqual(2)
  }, 15000)

  it('maps 422 field errors next to the field and keeps the typed values', async () => {
    mockApi({
      'GET /play/videos': list([recording]),
      'GET /play/clips': list([]),
      'POST /play/clips': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { end_time_seconds: 'End time must be after start time' } } },
      },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openClipsTab(user)

    await fillClip(user, '5')

    const end = screen.getByLabelText('Fin (segundos)')
    expect(await screen.findByText('End time must be after start time')).toBeInTheDocument()
    expect(end).toHaveAttribute('aria-invalid', 'true')
    expect(end).toHaveValue(5)
    expect(screen.getByLabelText('Título *')).toHaveValue('GOLAZO LEJANO')
  }, 15000)

  it('requires a title and a video before posting', async () => {
    const fetchMock = mockApi({ 'GET /play/videos': list([recording]), 'GET /play/clips': list([]) })
    const { user } = renderWithProviders(<AdminPage />)
    await openClipsTab(user)

    await user.click(await screen.findByRole('button', { name: /crear clip/i }))
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(screen.getByLabelText('Título *')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Elige el video del clip')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /play/clips')).toHaveLength(0)
  }, 10000)

  it('deletes a clip after confirmation', async () => {
    const fetchMock = mockApi({
      'GET /play/videos': list([]),
      'GET /play/clips': list([clip]),
      'DELETE /play/clips/c1': { status: 204 },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openClipsTab(user)

    await user.click(await screen.findByRole('button', { name: 'Eliminar clip Golazo' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Clip eliminado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /play/clips/c1')).toHaveLength(1)
  }, 10000)
})
