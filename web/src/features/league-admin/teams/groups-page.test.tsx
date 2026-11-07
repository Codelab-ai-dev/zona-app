import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { GroupsPage } from './groups-page'

describe('GroupsPage', () => {
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

    renderWithProviders(<GroupsPage />)

    expect(screen.getByText('Gestión de Grupos')).toBeInTheDocument()
  })

  it('shows teams and allows group assignment', async () => {
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
              group_name: 'A',
            },
          ],
          page: { limit: 100, offset: 0, total: 2 },
        },
      },
      'PATCH /teams/team-1': {
        body: {
          id: 'team-1',
          name: 'Los Campeones',
          slug: 'los-campeones',
          league_id: 'league-1',
          owner_id: 'owner-1',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          group_name: 'A',
        },
      },
    })

    renderWithProviders(<GroupsPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })

    expect(screen.getByText('Equipos sin grupo (1)')).toBeInTheDocument()
    expect(screen.getByText('Grupo A (1)')).toBeInTheDocument()
  })

  it('shows success when assigning team to group', async () => {
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
      'PATCH /teams/team-1': {
        body: {
          id: 'team-1',
          name: 'Los Campeones',
          slug: 'los-campeones',
          league_id: 'league-1',
          owner_id: 'owner-1',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          group_name: 'A',
        },
      },
    })

    renderWithProviders(<GroupsPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })

    // Find and click the select dropdown
    const selects = screen.getAllByText('Grupo')
    const selectElement = selects[0]
    if (selectElement) {
      const selectTrigger = selectElement.closest('button')
      if (selectTrigger) {
        fireEvent.click(selectTrigger)
      }
    }

    await waitFor(() => {
      expect(screen.getByText('Grupo A')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Grupo A'))

    // Check that mutation was called
    await waitFor(() => {
      expect(screen.getByText('Grupo A (1)')).toBeInTheDocument()
    })
  })

  it('shows error on failed assignment', async () => {
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
      'PATCH /teams/team-1': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Grupo inválido' } },
      },
    })

    renderWithProviders(<GroupsPage />)

    await waitFor(() => {
      expect(screen.getByText('Los Campeones')).toBeInTheDocument()
    })

    // Try to select a group
    const selects = screen.getAllByText('Grupo')
    const selectElement = selects[0]
    if (selectElement) {
      const selectTrigger = selectElement.closest('button')
      if (selectTrigger) {
        fireEvent.click(selectTrigger)
      }
    }

    await waitFor(() => {
      expect(screen.getByText('Grupo A')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Grupo A'))

    // Error should be shown
    await waitFor(() => {
      expect(screen.getByText(/Error: /)).toBeInTheDocument()
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

    renderWithProviders(<GroupsPage />)

    await waitFor(() => {
      expect(screen.getByText('No hay equipos')).toBeInTheDocument()
    })
  })
})
