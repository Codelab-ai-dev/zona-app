import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { VideoUploadDialog } from './video-upload-dialog'

/** Minimal XMLHttpRequest fake: the test drives progress / load / error by hand. */
class FakeXHR {
  static instances: FakeXHR[] = []
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 0
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  abort = vi.fn(() => {
    this.onabort?.()
  })
  constructor() {
    FakeXHR.instances.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  send(body: unknown) {
    this.body = body
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total })
  }
  finish(status: number) {
    this.status = status
    this.onload?.()
  }
}

const league = { id: 'lg-1', name: 'Liga Premier', slug: 'premier', description: '', admin_id: 'u', is_active: true, product_mode: 'full', created_at: '', updated_at: '' }
const recording = {
  id: 'rec-1', title: 'PARTIDO', status: 'pending', visibility: 'public', source_type: 'manual', processing_progress: 0,
  is_premium: false, views_count: 0, likes_count: 0, uploaded_by: 'u', created_at: '', updated_at: '',
}
const upload = { id: 'up-1', url: 'https://storage.mux.test/upload/abc' }

function handlers(extra: Parameters<typeof mockApi>[0] = {}) {
  return {
    'GET /leagues/mine': { body: { data: [league], page: { limit: 100, offset: 0 } } },
    'POST /play/upload': { status: 201, body: { recording, upload } },
    'POST /play/videos/rec-1/refresh': { body: recording },
    ...extra,
  }
}

function renderDialog() {
  const onOpenChange = vi.fn()
  const view = renderWithProviders(<VideoUploadDialog open onOpenChange={onOpenChange} />)
  return { ...view, onOpenChange }
}

async function fillAndSubmit(user: ReturnType<typeof renderWithProviders>['user'], file: File) {
  await user.upload(screen.getByLabelText('Video *'), file)
  await user.click(screen.getByRole('combobox', { name: 'Liga *' }))
  await user.click(await screen.findByRole('option', { name: 'Liga Premier' }))
  await user.type(screen.getByLabelText('Descripción (opcional)'), 'final')
  await user.click(screen.getByRole('button', { name: 'Subir Video' }))
}

const videoFile = () => new File(['x'], 'partido.mp4', { type: 'video/mp4' })

beforeEach(() => {
  FakeXHR.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
})
afterEach(() => {
  FakeXHR.instances = []
})

describe('VideoUploadDialog', () => {
  it('posts /play/upload, PUTs the file to upload.url with progress, then refreshes', async () => {
    const fetchMock = mockApi(handlers())
    const { user } = renderDialog()
    const file = videoFile()

    await fillAndSubmit(user, file)

    await waitFor(() => expect(FakeXHR.instances).toHaveLength(1))
    expect(requestsTo(fetchMock, 'POST /play/upload')).toEqual([
      { title: 'partido', description: 'FINAL', league_id: 'lg-1', source_type: 'manual' },
    ])
    const xhr = FakeXHR.instances[0]!
    expect(xhr.method).toBe('PUT')
    expect(xhr.url).toBe(upload.url)
    expect(xhr.headers['Content-Type']).toBe('video/mp4')
    expect(xhr.body).toBe(file)

    expect(await screen.findByText('Subiendo video...')).toBeInTheDocument()
    act(() => xhr.progress(50, 100))
    expect(await screen.findByText('50% completado')).toBeInTheDocument()
    // the shared Progress does not forward `value` to the root, so assert the bar fill
    const bar = screen.getByRole('progressbar', { name: 'Progreso de la subida' })
    expect(bar.querySelector('[data-slot="progress-indicator"]')).toHaveStyle({ transform: 'translateX(-50%)' })

    act(() => xhr.finish(200))
    expect(await screen.findByText('Procesando video')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver video' })).toHaveAttribute('href', '/play/watch/rec-1')
    await waitFor(() => expect(requestsTo(fetchMock, 'POST /play/videos/rec-1/refresh')).toHaveLength(1))
  })

  it('aborts the XHR on cancel and returns to the form with the values kept', async () => {
    mockApi(handlers())
    const { user } = renderDialog()
    await fillAndSubmit(user, videoFile())
    await waitFor(() => expect(FakeXHR.instances).toHaveLength(1))

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(FakeXHR.instances[0]!.abort).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Upload cancelado')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('FINAL')
    expect(screen.getByLabelText('Título *')).toHaveValue('partido')
  })

  it('keeps the form values when the storage upload fails', async () => {
    mockApi(handlers())
    const { user } = renderDialog()
    await fillAndSubmit(user, videoFile())
    await waitFor(() => expect(FakeXHR.instances).toHaveLength(1))

    act(() => FakeXHR.instances[0]!.finish(500))

    expect(await screen.findByText('Error al subir video')).toBeInTheDocument()
    expect(screen.getByLabelText('Título *')).toHaveValue('partido')
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('FINAL')
    expect(screen.getByText('partido.mp4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir Video' })).toBeEnabled()
  })

  it('keeps the form values when POST /play/upload fails and never starts the PUT', async () => {
    mockApi(
      handlers({ 'POST /play/upload': { status: 403, body: { error: { code: 'forbidden', message: 'No puedes subir videos a esta liga' } } } }),
    )
    const { user } = renderDialog()
    await fillAndSubmit(user, videoFile())

    expect(await screen.findAllByText('No puedes subir videos a esta liga')).not.toHaveLength(0)
    expect(FakeXHR.instances).toHaveLength(0)
    expect(screen.getByLabelText('Título *')).toHaveValue('partido')
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('FINAL')
  })

  it('rejects non-video files and keeps the submit disabled', async () => {
    mockApi(handlers())
    renderDialog()
    // accept="video/*" filters in the picker; a drag and drop would bypass it
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(screen.getByLabelText('Video *'), new File(['x'], 'notas.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('Por favor selecciona un archivo de video')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir Video' })).toBeDisabled()
  })
})
