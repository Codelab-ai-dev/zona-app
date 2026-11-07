import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders, mockApi } from '@/test/render'
import { CreateTeamDialog } from './create-team-dialog'

describe('CreateTeamDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates team and owner with generated password', async () => {
    const onOpenChange = vi.fn()

    mockApi({
      'POST /teams': {
        body: {
          id: 'team-1',
          name: 'Los Campeones',
          slug: 'los-campeones',
          league_id: 'league-1',
          owner_id: 'owner-1',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
      'POST /admin/users': {
        status: 201,
      },
    })

    renderWithProviders(
      <CreateTeamDialog open={true} onOpenChange={onOpenChange} leagueId="league-1" />
    )

    // Step 1: Fill team info
    const nameInput = screen.getByPlaceholderText('ej. Los Campeones')
    fireEvent.change(nameInput, { target: { value: 'Los Campeones' } })

    const continueBtn = screen.getByText('Continuar')
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText('Información del propietario')).toBeInTheDocument()
    })

    // Step 2: Fill owner info
    const ownerNameInput = screen.getByPlaceholderText('ej. Juan Pérez')
    fireEvent.change(ownerNameInput, { target: { value: 'Juan Pérez' } })

    const ownerEmailInput = screen.getByPlaceholderText('propietario@ejemplo.com')
    fireEvent.change(ownerEmailInput, { target: { value: 'juan@example.com' } })

    const createBtn = screen.getByText('Crear equipo y propietario')
    fireEvent.click(createBtn)

    // Step 3: Check credentials shown
    await waitFor(() => {
      expect(screen.getByText('Equipo creado exitosamente')).toBeInTheDocument()
      expect(screen.getByText('juan@example.com')).toBeInTheDocument()
    })
  })

  it('shows validation errors for required fields', async () => {
    mockApi({})

    renderWithProviders(
      <CreateTeamDialog open={true} onOpenChange={vi.fn()} leagueId="league-1" />
    )

    const continueBtn = screen.getByText('Continuar')
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    })
  })

  it('shows validation errors for email format', async () => {
    mockApi({})

    renderWithProviders(
      <CreateTeamDialog open={true} onOpenChange={vi.fn()} leagueId="league-1" />
    )

    // Go through to owner step
    const nameInput = screen.getByPlaceholderText('ej. Los Campeones')
    fireEvent.change(nameInput, { target: { value: 'Los Campeones' } })
    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ej. Juan Pérez')).toBeInTheDocument()
    })

    // Fill owner with invalid email and try to create
    fireEvent.change(screen.getByPlaceholderText('ej. Juan Pérez'), {
      target: { value: 'Juan Pérez' },
    })
    fireEvent.change(screen.getByPlaceholderText('propietario@ejemplo.com'), {
      target: { value: 'invalid-email' },
    })

    fireEvent.click(screen.getByText('Crear equipo y propietario'))

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('auto-generates slug from name', async () => {
    mockApi({})

    renderWithProviders(
      <CreateTeamDialog open={true} onOpenChange={vi.fn()} leagueId="league-1" />
    )

    const nameInput = screen.getByPlaceholderText('ej. Los Campeones')
    fireEvent.change(nameInput, { target: { value: 'Los Campeones FC' } })

    // The slug should be auto-generated
    const slugInput = screen.getByPlaceholderText('ej. los-campeones')
    expect((slugInput as HTMLInputElement).value).toBe('los-campeones-fc')
  })
})
