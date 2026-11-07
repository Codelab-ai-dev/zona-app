import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApi } from '@/test/render'
import { LeagueManagement } from './components/league-management'

const mockLeague = {
  id: '1',
  name: 'Liga Premier',
  slug: 'liga-premier',
  description: 'Liga premier mexicana',
  admin_id: 'admin1',
  is_active: true,
  product_mode: 'full' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('LeagueManagement', () => {
  it('renders loading state initially', () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
    })
    renderWithProviders(<LeagueManagement />)
    expect(screen.getByText('Cargando ligas…')).toBeInTheDocument()
  })

  it('renders empty state', async () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
    })
    renderWithProviders(<LeagueManagement />)

    await waitFor(() => {
      expect(screen.getByText('No hay información para mostrar')).toBeInTheDocument()
    })
  })

  it('renders list of leagues', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [mockLeague],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })
    renderWithProviders(<LeagueManagement />)

    await waitFor(() => {
      expect(screen.getByText('Liga Premier')).toBeInTheDocument()
    })
    expect(screen.getByText('/liga-premier')).toBeInTheDocument()
    expect(screen.getByText('Liga premier mexicana')).toBeInTheDocument()
  })

  it('opens form dialog on "Nueva Liga" button click', async () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
    })
    renderWithProviders(<LeagueManagement />)

    const newButton = screen.getByRole('button', { name: /Nueva Liga/i })
    fireEvent.click(newButton)

    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Liga')).toBeInTheDocument()
    })
  })

  it('toggles league status', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [mockLeague],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'PATCH /leagues/1/status': {
        status: 200,
        body: { ...mockLeague, is_active: false },
      },
    })
    renderWithProviders(<LeagueManagement />)

    await waitFor(() => {
      expect(screen.getByText('Liga Premier')).toBeInTheDocument()
    })

    const desactivarButton = screen.getByRole('button', { name: /Desactivar/i })
    fireEvent.click(desactivarButton)

    // Button text should change after toggle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Activar/i })).toBeInTheDocument()
    })
  })

  it('displays validation error on failed submit', async () => {
    mockApi({
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
      'POST /leagues': {
        status: 422,
        body: { error: { message: 'Validation error', fields: { name: 'requerido' } } },
      },
    })
    renderWithProviders(<LeagueManagement />)

    const newButton = screen.getByRole('button', { name: /Nueva Liga/i })
    fireEvent.click(newButton)

    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Liga')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /Crear Liga/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('requerido')).toBeInTheDocument()
    })
  })

  it('successfully creates a league', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: { data: [mockLeague], page: { limit: 100, offset: 0, total: 1 } },
      },
      'POST /leagues': { status: 200, body: mockLeague },
    })
    renderWithProviders(<LeagueManagement />)

    const newButton = screen.getByRole('button', { name: /Nueva Liga/i })
    fireEvent.click(newButton)

    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Liga')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Liga Premier Mexicana')
    await userEvent.type(nameInput, 'Liga Premier')

    const submitButton = screen.getByRole('button', { name: /Crear Liga/i })
    fireEvent.click(submitButton)

    // Dialog should close after successful creation
    await waitFor(() => {
      expect(screen.queryByText('Crear Nueva Liga')).not.toBeInTheDocument()
    })
  })

  it('edits league when dialog is opened', async () => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [mockLeague],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
    })
    renderWithProviders(<LeagueManagement />)

    await waitFor(() => {
      expect(screen.getByText('Liga Premier')).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /Editar/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByText('Editar Liga')).toBeInTheDocument()
    })
  })
})
