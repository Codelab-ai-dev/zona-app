import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'
import { PlayerRegistrationPage } from './player-registration-page'

const mockTeamId = 'team-123'
const mockTournamentId = 'tournament-1'

const mockRequest = {
  id: 'req-1',
  team_id: mockTeamId,
  tournament_id: mockTournamentId,
  player_name: 'Juan Pérez',
  player_position: 'Delantero',
  jersey_number: 10,
  birth_date: '2000-05-15',
  reason: 'Transferencia de otra liga',
  status: 'pending',
  requested_by: 'owner-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockTournament = {
  id: mockTournamentId,
  name: 'Torneo 2024',
  league_id: 'league-1',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  is_active: true,
  registration_open: true,
  tournament_format: 'liga',
  rounds_per_season: 30,
  has_third_place_match: false,
  age_validation_enabled: true,
  min_age: 16,
  max_age: 35,
  age_reference_date: '2024-01-01',
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('PlayerRegistrationPage', () => {
  beforeEach(() => {
    mockApi({
      'GET /teams/team-123/player-registration-requests': {
        body: { data: [mockRequest], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tournament-1': { body: mockTournament },
    })
  })

  it('renders the page title and description', async () => {
    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    expect(await screen.findByText('Solicitudes de Registro de Jugadores')).toBeInTheDocument()
    expect(
      screen.getByText('Gestiona las solicitudes de registro de nuevos jugadores.'),
    ).toBeInTheDocument()
  })

  it('displays registration requests with status', async () => {
    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Delantero')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('shows empty state when no requests available', async () => {
    mockApi({
      'GET /teams/team-123/player-registration-requests': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tournament-1': { body: mockTournament },
    })

    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    expect(await screen.findByText('Sin solicitudes')).toBeInTheDocument()
  })

  it('shows alert when no tournament is selected', async () => {
    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} />,
    )

    expect(await screen.findByText('No hay torneo seleccionado')).toBeInTheDocument()
    expect(
      screen.getByText('Selecciona un torneo para crear nuevas solicitudes de registro.'),
    ).toBeInTheDocument()
  })

  it('can create a new registration request', async () => {
    mockApi({
      'GET /teams/team-123/player-registration-requests': {
        body: { data: [mockRequest], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tournament-1': { body: mockTournament },
      'POST /teams/team-123/tournaments/tournament-1/player-registration-requests': {
        body: {
          ...mockRequest,
          id: 'req-2',
          player_name: 'Carlos López',
          status: 'pending',
        },
      },
    })

    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    const newButton = await screen.findByRole('button', { name: /Nueva Solicitud/i })
    fireEvent.click(newButton)

    const nameInput = await screen.findByPlaceholderText('Juan Pérez')
    fireEvent.change(nameInput, { target: { value: 'Carlos López' } })

    const submitButton = screen.getByRole('button', { name: /Enviar Solicitud/i })
    fireEvent.click(submitButton)

    // Form should close on success
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Juan Pérez')).not.toBeInTheDocument()
    })
  })

  it('displays validation errors for 422 responses', async () => {
    mockApi({
      'GET /teams/team-123/player-registration-requests': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
      'GET /tournaments/tournament-1': { body: mockTournament },
      'POST /teams/team-123/tournaments/tournament-1/player-registration-requests': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'El jugador es demasiado joven para esta categoría',
            fields: {
              birth_date: 'El jugador debe tener al menos 16 años',
              jersey_number: 'El número ya está registrado',
            },
          },
        },
      },
    })

    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    const newButton = await screen.findByRole('button', { name: /Nueva Solicitud/i })
    fireEvent.click(newButton)

    const nameInput = await screen.findByPlaceholderText('Juan Pérez')
    fireEvent.change(nameInput, { target: { value: 'Young Player' } })

    const submitButton = screen.getByRole('button', { name: /Enviar Solicitud/i })
    fireEvent.click(submitButton)

    // Field errors should display
    await waitFor(() => {
      expect(screen.getByText('El jugador debe tener al menos 16 años')).toBeInTheDocument()
      expect(screen.getByText('El número ya está registrado')).toBeInTheDocument()
    })
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /teams/team-123/player-registration-requests': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
      },
      'GET /tournaments/tournament-1': { body: mockTournament },
    })

    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('displays request details including birth_date and reason', async () => {
    renderWithProviders(
      <PlayerRegistrationPage teamId={mockTeamId} tournamentId={mockTournamentId} />,
    )

    expect(await screen.findByText(/15 de mayo de 2000/i)).toBeInTheDocument()
    expect(screen.getByText('Transferencia de otra liga')).toBeInTheDocument()
  })
})
