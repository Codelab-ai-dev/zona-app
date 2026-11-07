import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { QRBatchPage } from './qr-batch-page'

describe('QRBatchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays page title', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    expect(screen.getByText('Actualización Masiva de QR')).toBeInTheDocument()
  })

  it('shows teams for selection', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [
            {
              id: 'team-1',
              name: 'Los Campeones',
              slug: 'los-campeones',
              league_id: 'league-1',
              owner_id: 'owner-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 'team-2',
              name: 'Las Águilas',
              slug: 'las-aguilas',
              league_id: 'league-1',
              owner_id: 'owner-2',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
      expect(screen.getByText('Las Águilas')).toBeInTheDocument()
    })
  })

  it('shows select all and clear all buttons', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [
            {
              id: 'team-1',
              name: 'Los Campeones',
              slug: 'los-campeones',
              league_id: 'league-1',
              owner_id: 'owner-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('Seleccionar todos')).toBeInTheDocument()
      expect(screen.getByText('Deseleccionar todos')).toBeInTheDocument()
    })
  })

  it('allows team selection and shows batch update button', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [
            {
              id: 'team-1',
              name: 'Los Campeones',
              slug: 'los-campeones',
              league_id: 'league-1',
              owner_id: 'owner-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })

    // Get checkbox for team
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[0]
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    await waitFor(() => {
      expect(screen.getByText(/Actualizar QR \(1 equipos\)/)).toBeInTheDocument()
    })
  })

  it('shows success message after batch update', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [
            {
              id: 'team-1',
              name: 'Los Campeones',
              slug: 'los-campeones',
              league_id: 'league-1',
              owner_id: 'owner-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams/team-1/players': {
        body: {
          data: [
            {
              id: 'player-1',
              name: 'Juan Pérez',
              team_id: 'team-1',
              position: 'Portero',
              jersey_number: 1,
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'POST /leagues/league-1/players/qr-batch': {
        body: { updated: 1 },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })

    // Select team
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[0]
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // Click update button
    const updateButton = screen.getByText(/Actualizar QR/)
    fireEvent.click(updateButton)

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Actualización completada exitosamente/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no teams exist', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Mayor',
              slug: 'liga-mayor',
              admin_id: 'admin-1',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /teams': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay equipos')).toBeInTheDocument()
    })
  })

  it('shows error when no leagues found', async () => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })

    renderWithProviders(<QRBatchPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay ligas')).toBeInTheDocument()
    })
  })
})
