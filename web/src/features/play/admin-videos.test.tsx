import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AdminVideos } from './admin-videos'

const video = {
  id: 'v1',
  title: 'Jornada 3',
  description: 'Resumen',
  status: 'ready',
  visibility: 'public',
  source_type: 'manual',
  processing_progress: 100,
  is_premium: false,
  views_count: 5,
  likes_count: 0,
  uploaded_by: 'u1',
  home_score: 1,
  away_score: 0,
  created_at: '2024-12-20T10:00:00Z',
  updated_at: '2024-12-20T10:00:00Z',
}
const list = { body: { data: [video], page: { limit: 50, offset: 0 } } }

async function openEdit(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Editar video Jornada 3' }))
  return screen.findByRole('dialog', { name: 'Editar video' })
}

describe('AdminVideos edit', () => {
  it('saves title, description, scores and visibility with PATCH and confirms', async () => {
    const fetchMock = mockApi({
      'GET /play/videos': list,
      'PATCH /play/videos/v1': { body: { ...video, title: 'FINAL', visibility: 'unlisted', home_score: 3, away_score: 2 } },
    })
    const { user } = renderWithProviders(<AdminVideos />)
    const dialog = await openEdit(user)

    const title = within(dialog).getByLabelText('Título *')
    expect(title).toHaveValue('Jornada 3')
    await user.clear(title)
    await user.type(title, 'Final')
    await user.clear(within(dialog).getByLabelText('Goles local'))
    await user.type(within(dialog).getByLabelText('Goles local'), '3')
    await user.clear(within(dialog).getByLabelText('Goles visitante'))
    await user.type(within(dialog).getByLabelText('Goles visitante'), '2')
    await user.click(within(dialog).getByRole('combobox', { name: 'Visibilidad' }))
    await user.click(await screen.findByRole('option', { name: 'No listado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Video actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /play/videos/v1')).toEqual([
      { title: 'FINAL', description: 'Resumen', visibility: 'unlisted', home_score: 3, away_score: 2 },
    ])
    expect(screen.queryByRole('dialog', { name: 'Editar video' })).not.toBeInTheDocument()
  }, 20000)

  it('keeps the dialog and typed values and flags the field when the API rejects with 422', async () => {
    mockApi({
      'GET /play/videos': list,
      'PATCH /play/videos/v1': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { title: 'Title must be 1-255 characters' } } },
      },
    })
    const { user } = renderWithProviders(<AdminVideos />)
    const dialog = await openEdit(user)

    await user.type(within(dialog).getByLabelText('Título *'), ' x')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    const title = await within(dialog).findByLabelText('Título *')
    expect(await within(dialog).findByText('Title must be 1-255 characters')).toBeInTheDocument()
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveValue('JORNADA 3 X')
  }, 15000)

  it('sends nothing when the edit is cancelled', async () => {
    const fetchMock = mockApi({ 'GET /play/videos': list })
    const { user } = renderWithProviders(<AdminVideos />)
    const dialog = await openEdit(user)

    await user.type(within(dialog).getByLabelText('Título *'), 'zzz')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog', { name: 'Editar video' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /play/videos/v1')).toHaveLength(0)
  }, 10000)
})
