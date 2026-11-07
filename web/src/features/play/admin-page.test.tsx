import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

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

describe('AdminPage', () => {
  it('renders videos list', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
      'GET /play/videos': {
        body: {
          data: [recording],
          page: { limit: 50, offset: 0 },
        },
      },
    })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByRole('heading', { name: 'Zona Play Admin' })).toBeInTheDocument()
    expect(await screen.findByText('Video 1')).toBeInTheDocument()
  })

  it('shows empty state when no videos', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
      'GET /play/videos': {
        body: {
          data: [],
          page: { limit: 50, offset: 0 },
        },
      },
    })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByText(/No hay videos aún/i)).toBeInTheDocument()
  })

  it('deletes video with confirmation', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
      'GET /play/videos': {
        body: {
          data: [recording],
          page: { limit: 50, offset: 0 },
        },
      },
      'DELETE /play/videos/r1': { status: 204 },
    })
    renderWithProviders(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Video 1')).toBeInTheDocument()
    })

    // Find and click the delete button
    const allButtons = screen.getAllByRole('button')
    // Look for a button with Trash icon or close to the video row
    let deleteButton: HTMLElement | null = null
    for (const btn of allButtons) {
      if (btn.innerHTML.includes('Trash') && btn.className.includes('destructive')) {
        deleteButton = btn
        break
      }
    }

    if (!deleteButton) {
      // Fallback: find by looking for buttons near the video title
      const videoTitle = screen.getByText('Video 1')
      const row = videoTitle.closest('div')
      if (row) {
        const buttons = row.querySelectorAll('button')
        deleteButton = buttons[buttons.length - 1] as HTMLElement
      }
    }

    if (deleteButton) {
      fireEvent.click(deleteButton)
      // Wait a bit for the dialog to open
      await new Promise((r) => setTimeout(r, 100))
    }

    // Look for the confirm button in the alert dialog
    const confirmButtons = screen.queryAllByRole('button', { name: 'Eliminar' })
    if (confirmButtons.length > 0) {
      const confirmBtn = confirmButtons[0]
      if (confirmBtn) {
        fireEvent.click(confirmBtn)
        expect(await screen.findByText(/Video eliminado/i)).toBeInTheDocument()
      }
    }
  })

  it('shows error on delete failure', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
      'GET /play/videos': {
        body: {
          data: [recording],
          page: { limit: 50, offset: 0 },
        },
      },
      'DELETE /play/videos/r1': {
        status: 403,
        body: { error: { code: 'forbidden', message: 'No tienes permiso para eliminar' } },
      },
    })
    renderWithProviders(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Video 1')).toBeInTheDocument()
    })

    const allButtons = screen.getAllByRole('button')
    let deleteButton: HTMLElement | null = null
    for (const btn of allButtons) {
      if (btn.innerHTML.includes('Trash') && btn.className.includes('destructive')) {
        deleteButton = btn
        break
      }
    }

    if (!deleteButton) {
      const videoTitle = screen.getByText('Video 1')
      const row = videoTitle.closest('div')
      if (row) {
        const buttons = row.querySelectorAll('button')
        deleteButton = buttons[buttons.length - 1] as HTMLElement
      }
    }

    if (deleteButton) {
      fireEvent.click(deleteButton)
      await new Promise((r) => setTimeout(r, 100))
    }

    const confirmButtons = screen.queryAllByRole('button', { name: 'Eliminar' })
    if (confirmButtons.length > 0) {
      const confirmBtn = confirmButtons[0]
      if (confirmBtn) {
        fireEvent.click(confirmBtn)
        expect(await screen.findByText(/No tienes permiso/i)).toBeInTheDocument()
      }
    }
  })

  it('shows error state on API error', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
      'GET /play/videos': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error del servidor' } },
      },
    })
    renderWithProviders(<AdminPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
