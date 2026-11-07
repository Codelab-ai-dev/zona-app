import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { SettingsPageComponent } from './settings'

describe('SettingsPage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
  }

  const mockLeagueSettings = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba completa',
    logo: 'https://example.com/logo.png',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
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
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders league settings form', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/configuración de la liga/i)).toBeInTheDocument()
    })
  })

  it('updates league settings with success', async () => {
    const updatedLeague = {
      ...mockLeagueSettings,
      name: 'Mi Liga Actualizada',
    }

    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
      'PATCH /leagues/league-1': { body: updatedLeague, status: 200 },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/configuración de la liga/i)).toBeInTheDocument()
    })
  })

  it('handles settings update validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
      'PATCH /leagues/league-1': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: {
            name: 'El nombre es requerido',
            slug: 'El slug debe ser único',
          },
        },
      },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/configuración de la liga/i)).toBeInTheDocument()
    })
  })

  it('uploads league logo', async () => {
    const logoUrl = 'https://example.com/new-logo.png'
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
      'POST /storage/objects': { body: { url: logoUrl }, status: 201 },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/logo de la liga/i)).toBeInTheDocument()
    })
  })

  it('handles logo upload validation', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
      'POST /storage/objects': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: { file: 'El archivo debe ser una imagen válida' },
        },
      },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/logo de la liga/i)).toBeInTheDocument()
    })
  })

  it('handles logo upload with multipart form data', async () => {
    const logoUrl = 'https://example.com/new-logo.png'
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1': { body: mockLeagueSettings, status: 200 },
      'POST /storage/objects': { body: { url: logoUrl }, status: 201 },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/cargar logo/i)).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<SettingsPageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
