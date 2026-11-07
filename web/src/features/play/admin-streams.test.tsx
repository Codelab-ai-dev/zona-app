import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AdminPage } from './admin-page'

const stream = {
  id: 's1',
  title: 'Jornada 15',
  status: 'idle',
  source_type: 'obs',
  is_pay_per_view: false,
  recording_ready: false,
  current_viewers: 0,
  broadcaster_id: 'u1',
  created_at: '2024-12-20T10:00:00Z',
  mux_stream_key: 'sk-secret-123',
}
const list = (data: unknown[]) => ({ body: { data, page: { limit: 50, offset: 0 } } })
const base = { 'GET /play/videos': list([]) }

async function openStreamsTab(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('tab', { name: 'Transmisiones' }))
}

describe('AdminPage streams', () => {
  it('lists streams and the empty state', async () => {
    mockApi({ ...base, 'GET /play/streams': list([]) })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    expect(await screen.findByText('No hay transmisiones aún.')).toBeInTheDocument()
  }, 10000)

  it('creates a stream with the exact body, closes the form and confirms', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /play/streams': list([]),
      'POST /play/streams': { status: 201, body: stream },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    await user.click(await screen.findByRole('button', { name: /crear transmisión/i }))
    await user.type(screen.getByLabelText('Título *'), 'Jornada 15')
    await user.type(screen.getByLabelText('Descripción (opcional)'), 'Final')
    await user.click(screen.getByRole('combobox', { name: 'Fuente' }))
    await user.click(await screen.findByRole('option', { name: 'xBotGo' }))
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Transmisión creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /play/streams')).toEqual([
      { title: 'JORNADA 15', description: 'FINAL', source_type: 'xbotgo' },
    ])
    expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument()
  }, 15000)

  it('keeps the form and shows the field error when the API rejects it', async () => {
    mockApi({
      ...base,
      'GET /play/streams': list([]),
      'POST /play/streams': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { title: 'Title is required' } } },
      },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    await user.click(await screen.findByRole('button', { name: /crear transmisión/i }))
    await user.type(screen.getByLabelText('Título *'), 'Algo')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    const title = screen.getByLabelText('Título *')
    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveValue('ALGO')
  }, 10000)

  it('does not post without a title', async () => {
    const fetchMock = mockApi({ ...base, 'GET /play/streams': list([]) })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    await user.click(await screen.findByRole('button', { name: /crear transmisión/i }))
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(screen.getByLabelText('Título *')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /play/streams')).toHaveLength(0)
  }, 10000)

  it('hides the stream key until revealed, copies it with the clipboard and hides it again', async () => {
    mockApi({ ...base, 'GET /play/streams': list([stream]) })
    const { user } = renderWithProviders(<AdminPage />)
    // userEvent.setup() installs its own clipboard stub; spy on it
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await openStreamsTab(user)

    expect(await screen.findByText('Jornada 15')).toBeInTheDocument()
    expect(screen.queryByText('sk-secret-123')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mostrar clave' }))
    expect(screen.getByText('sk-secret-123')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copiar clave' }))
    expect(writeText).toHaveBeenCalledWith('sk-secret-123')
    expect(await screen.findByText('Clave copiada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ocultar clave' }))
    expect(screen.queryByText('sk-secret-123')).not.toBeInTheDocument()
  }, 15000)

  it('does not offer the key button when the API does not return a key', async () => {
    mockApi({ ...base, 'GET /play/streams': list([{ ...stream, mux_stream_key: undefined }]) })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    expect(await screen.findByText('Jornada 15')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mostrar clave' })).not.toBeInTheDocument()
  }, 10000)

  it('deletes a stream after confirmation and shows API errors', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /play/streams': list([stream]),
      'DELETE /play/streams/s1': { status: 403, body: { error: { code: 'forbidden', message: 'Sin permiso' } } },
    })
    const { user } = renderWithProviders(<AdminPage />)
    await openStreamsTab(user)

    await user.click(await screen.findByRole('button', { name: 'Eliminar transmisión Jornada 15' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Sin permiso')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /play/streams/s1')).toHaveLength(1)
  }, 10000)
})
