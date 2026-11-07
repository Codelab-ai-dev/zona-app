import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { WhatsAppPageComponent } from './whatsapp'

describe('WhatsAppPage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
  }

  const mockLink = {
    id: 'link-1',
    phone_number: '525551234567',
    league_id: 'league-1',
    role: 'league_admin',
    is_active: true,
    linked_at: '2024-01-01',
    preferred_language: 'es',
    display_name: 'Tesorería',
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
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders WhatsApp links list', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [mockLink], page: { total: 1 } }, status: 200 },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Tesorería')).toBeInTheDocument()
    })
  })

  it('shows empty state when no links', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin enlaces/i)).toBeInTheDocument()
    })
  })

  it('creates WhatsApp link with success', async () => {
    const newLink = {
      ...mockLink,
      id: 'link-2',
      phone_number: '525559876543',
    }

    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [mockLink], page: { total: 1 } }, status: 200 },
      'POST /leagues/{leagueId}/whatsapp-links': { body: newLink, status: 201 },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Tesorería')).toBeInTheDocument()
    })
  })

  it('handles duplicate phone number (409 conflict)', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [mockLink], page: { total: 1 } }, status: 200 },
      'POST /leagues/{leagueId}/whatsapp-links': {
        status: 409,
        body: { error: 'Este número ya está registrado' },
      },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Tesorería')).toBeInTheDocument()
    })
  })

  it('handles WhatsApp link creation validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [], page: { total: 0 } }, status: 200 },
      'POST /leagues/{leagueId}/whatsapp-links': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: { phone_number: 'Formato de teléfono inválido' },
        },
      },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin enlaces/i)).toBeInTheDocument()
    })
  })

  it('deletes WhatsApp link with confirmation', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [mockLink], page: { total: 1 } }, status: 200 },
      'DELETE /whatsapp-links/link-1': { status: 204 },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Tesorería')).toBeInTheDocument()
    })
  })

  it('broadcasts message to link', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/whatsapp-links': { body: { data: [mockLink], page: { total: 1 } }, status: 200 },
      'POST /whatsapp-links/link-1/broadcast': { status: 204 },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Tesorería')).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<WhatsAppPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
