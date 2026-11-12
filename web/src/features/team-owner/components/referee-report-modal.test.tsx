import { screen, within } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'
import { RefereeReportModal } from './referee-report-modal'

const mockMatchId = 'match-123'

const mockMatch = {
  id: mockMatchId,
  tournament_id: 'tournament-1',
  home_team_id: 'team-1',
  away_team_id: 'team-2',
  home_score: 3,
  away_score: 1,
  match_date: '2024-01-15T12:00:00Z',
  match_time: '18:00',
  status: 'finished',
  phase: 'regular',
  is_published: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T20:00:00Z',
  home_team: {
    id: 'team-1',
    name: 'Águilas FC',
    slug: 'aguilas-fc',
    logo: 'https://example.com/logo1.png',
  },
  away_team: {
    id: 'team-2',
    name: 'Tigres FC',
    slug: 'tigres-fc',
    logo: 'https://example.com/logo2.png',
  },
}

const mockRefereeReport = {
  id: 'report-1',
  match_id: mockMatchId,
  referee_name: 'Carlos García',
  assistant_referee_1: 'Juan López',
  assistant_referee_2: 'María Rodríguez',
  fourth_official: 'Pedro Sánchez',
  general_observations: 'Partido bien controlado. Dos tarjetas amarillas en el segundo tiempo.',
  weather_conditions: 'Despejado, 25°C',
  field_conditions: 'En buen estado',
  created_at: '2024-01-15T20:00:00Z',
  updated_at: '2024-01-15T20:00:00Z',
}

/** Text that follows the bold label inside the same row. */
function fieldValue(label: string): string | null {
  const row = screen.getByText(label).parentElement as HTMLElement
  return row.textContent?.replace(label, '').trim() ?? null
}

describe('RefereeReportModal', () => {
  beforeEach(() => {
    mockApi({
      'GET /matches/match-123': { body: mockMatch },
      'GET /matches/match-123/referee-report': { body: mockRefereeReport },
    })
  })

  it('renders dialog when open is true', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Cédula Arbitral')).toBeInTheDocument()
  })

  it('displays match header with teams and score', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Águilas FC')).toBeInTheDocument()
    expect(screen.getByText('Tigres FC')).toBeInTheDocument()
    expect(screen.getByText('Resultado Final')).toBeInTheDocument()
    expect(screen.getByText('3 - 1')).toBeInTheDocument()
  })

  it('displays referee information', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Información del Árbitro')).toBeInTheDocument()
    expect(fieldValue('Árbitro Principal:')).toBe('Carlos García')
    expect(fieldValue('Asistente 1:')).toBe('Juan López')
    expect(fieldValue('Asistente 2:')).toBe('María Rodríguez')
    expect(fieldValue('Cuarto Árbitro:')).toBe('Pedro Sánchez')
  })

  it('displays general observations', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Observaciones Generales:')).toBeInTheDocument()
    expect(
      screen.getByText('Partido bien controlado. Dos tarjetas amarillas en el segundo tiempo.'),
    ).toBeInTheDocument()
  })

  it('displays match conditions', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Condiciones del Partido')).toBeInTheDocument()
    expect(fieldValue('Clima:')).toBe('Despejado, 25°C')
    expect(fieldValue('Campo:')).toBe('En buen estado')
  })

  it('displays match status badge', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('Finalizado')).toBeInTheDocument()
  })

  it('shows empty state when no referee report available', async () => {
    mockApi({
      'GET /matches/match-123': { body: mockMatch },
      'GET /matches/match-123/referee-report': {
        status: 404,
        body: { error: { code: 'not_found', message: 'Reporte no encontrado' } },
      },
    })

    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByText('No hay cédula arbitral disponible')).toBeInTheDocument()
    expect(
      screen.getByText('Este partido no tiene información de cédula arbitral registrada.'),
    ).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    mockApi({
      'GET /matches/match-123': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
      },
      'GET /matches/match-123/referee-report': { body: mockRefereeReport },
    })

    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('retries both requests and shows the report once the API recovers', async () => {
    const failing = mockApi({
      'GET /matches/match-123': {
        status: 500,
        body: { error: { code: 'internal_error', message: 'Error interno del servidor' } },
      },
      'GET /matches/match-123/referee-report': { body: mockRefereeReport },
    })
    const { user } = renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)
    await screen.findByRole('alert')
    expect(requestsTo(failing, 'GET /matches/match-123')).toHaveLength(1)

    const recovered = mockApi({
      'GET /matches/match-123': { body: mockMatch },
      'GET /matches/match-123/referee-report': { body: mockRefereeReport },
    })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Información del Árbitro')).toBeInTheDocument()
    expect(requestsTo(recovered, 'GET /matches/match-123')).toHaveLength(1)
  })

  it('handles partial referee information gracefully', async () => {
    const partialReport = {
      ...mockRefereeReport,
      assistant_referee_2: null,
      fourth_official: null,
      field_conditions: null,
    }

    mockApi({
      'GET /matches/match-123': { body: mockMatch },
      'GET /matches/match-123/referee-report': { body: partialReport },
    })

    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    await screen.findByText('Información del Árbitro')
    expect(fieldValue('Árbitro Principal:')).toBe('Carlos García')
    expect(fieldValue('Asistente 1:')).toBe('Juan López')
    // Missing fields should not display
    expect(screen.queryByText('Asistente 2:')).not.toBeInTheDocument()
    expect(screen.queryByText('Cuarto Árbitro:')).not.toBeInTheDocument()
    expect(screen.queryByText('Campo:')).not.toBeInTheDocument()
    expect(fieldValue('Clima:')).toBe('Despejado, 25°C')
  })

  it('formats match date correctly', async () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    // Should display formatted date - checking for the date in a readable format
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/lunes, 15 de enero de 2024/)).toBeInTheDocument()
  })

  it('displays loading state while fetching', () => {
    renderWithProviders(<RefereeReportModal open={true} onOpenChange={() => {}} matchId={mockMatchId} />)

    // Loading indicator should appear momentarily
    expect(screen.getByText(/Cargando cédula arbitral/)).toBeInTheDocument()
  })

  it('lists goals, cards and incidents with player names, jerseys and assists', async () => {
    mockApi({
      'GET /matches/match-123': {
        body: {
          ...mockMatch,
          goals: [
            { id: 'g1', player_id: 'p1', team_id: 'team-1', minute: 12, goal_type: 'penalty', player_name: 'Luis Gómez', player_jersey: 9, assist_player_name: 'Ana Ruiz' },
          ],
          cards: [
            { id: 'c1', player_id: 'p2', team_id: 'team-2', card_type: 'red', minute: 80, reason: 'Juego brusco', player_name: 'Pedro Mora', player_jersey: 4 },
          ],
          incidents: [{ id: 'i1', incident_type: 'Lesión', description: 'Esguince de tobillo', minute: 33, player_name: 'Luis Gómez' }],
        },
      },
      'GET /matches/match-123/referee-report': { body: mockRefereeReport },
    })
    renderWithProviders(<RefereeReportModal open onOpenChange={() => {}} matchId={mockMatchId} />)

    const goals = await screen.findByText(/Goles \(1\)/)
    const goalCard = goals.closest('[data-slot="card"]') as HTMLElement
    expect(within(goalCard).getByText('Luis Gómez (#9)')).toBeInTheDocument()
    expect(within(goalCard).getByText('Águilas FC - Penal')).toBeInTheDocument()
    expect(within(goalCard).getByText('Asistencia: Ana Ruiz')).toBeInTheDocument()
    expect(within(goalCard).getByText("12'")).toBeInTheDocument()

    const cards = screen.getByText(/Tarjetas \(1\)/).closest('[data-slot="card"]') as HTMLElement
    expect(within(cards).getByText('Pedro Mora (#4)')).toBeInTheDocument()
    expect(within(cards).getByText('Tigres FC - Tarjeta Roja')).toBeInTheDocument()
    expect(within(cards).getByText('Juego brusco')).toBeInTheDocument()

    const incidents = screen.getByText(/Incidencias \(1\)/).closest('[data-slot="card"]') as HTMLElement
    expect(within(incidents).getByText('Esguince de tobillo')).toBeInTheDocument()
    expect(within(incidents).getByText('Lesión')).toBeInTheDocument()
  })

  it('omits the event sections when the match has none', async () => {
    renderWithProviders(<RefereeReportModal open onOpenChange={() => {}} matchId={mockMatchId} />)

    await screen.findByText('Cédula Arbitral')
    await screen.findByText('Carlos García')
    expect(screen.queryByText(/Goles \(/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Incidencias \(/)).not.toBeInTheDocument()
  })
})
