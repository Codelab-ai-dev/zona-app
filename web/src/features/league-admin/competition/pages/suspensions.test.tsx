import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { SuspensionsPageComponent } from './suspensions'

describe('SuspensionsPage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
  }

  const mockSuspension = {
    id: 'suspension-1',
    player_id: 'player-1',
    team_id: 'team-1',
    league_id: 'league-1',
    suspension_type: 'red_card' as const,
    reason: 'Agresión',
    matches_to_serve: 3,
    matches_served: 1,
    status: 'active' as const,
    notes: 'Nota de prueba',
    start_date: '2024-01-01',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders suspensions list', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/suspensions': { body: { data: [mockSuspension], page: { total: 1 } }, status: 200 },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/agresión/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no suspensions', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/suspensions': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin suspensiones/i)).toBeInTheDocument()
    })
  })

  it('creates suspension with success', async () => {
    const newSuspension = {
      ...mockSuspension,
      id: 'suspension-2',
      matches_served: 0,
    }

    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/suspensions': { body: { data: [mockSuspension], page: { total: 1 } }, status: 200 },
      'POST /suspensions': { body: newSuspension, status: 201 },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/agresión/i)).toBeInTheDocument()
    })
  })

  it('handles suspension creation validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/suspensions': { body: { data: [], page: { total: 0 } }, status: 200 },
      'POST /suspensions': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: {
            player_id: 'El jugador es requerido',
            matches_to_serve: 'Debe ser mayor a 0',
          },
        },
      },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin suspensiones/i)).toBeInTheDocument()
    })
  })

  it('cancels suspension with confirmation', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/suspensions': { body: { data: [mockSuspension], page: { total: 1 } }, status: 200 },
      'POST /suspensions/suspension-1/cancel': {
        body: { ...mockSuspension, status: 'cancelled' as const },
        status: 200,
      },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/agresión/i)).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<SuspensionsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
