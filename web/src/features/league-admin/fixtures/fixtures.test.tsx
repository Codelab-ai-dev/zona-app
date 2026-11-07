import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { FixturesPage } from './fixtures-page'
import { FixtureWizard } from './fixture-wizard'
import { PlayoffsPage } from './playoffs-page'
import { PlayoffBracket } from './playoff-bracket'

import type { Match } from './types'
import type { Tournament } from '@/features/leagues/types'

describe('FixturesPage', () => {
  beforeEach(() => {
    mockApi({
      'GET /leagues/mine': {
        body: {
          data: [
            {
              id: 'league-1',
              name: 'Liga Principal',
              slug: 'liga-principal',
              description: 'Torneo principal',
              admin_id: 'user-1',
              is_active: true,
              product_mode: 'full',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [
            {
              id: 'tour-1',
              name: 'Torneo A',
              league_id: 'league-1',
              is_active: true,
              start_date: '2024-01-01',
              end_date: '2024-03-01',
              registration_open: false,
              tournament_format: 'round_robin',
              rounds_per_season: 10,
              has_third_place_match: false,
              age_validation_enabled: false,
              id_document_required: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: {
          data: [
            {
              id: 'team-1',
              name: 'Equipo 1',
              slug: 'equipo-1',
              league_id: 'league-1',
              tournament_id: 'tour-1',
              is_active: true,
            },
            {
              id: 'team-2',
              name: 'Equipo 2',
              slug: 'equipo-2',
              league_id: 'league-1',
              tournament_id: 'tour-1',
              is_active: true,
            },
            {
              id: 'team-3',
              name: 'Equipo 3',
              slug: 'equipo-3',
              league_id: 'league-1',
              is_active: false,
            },
          ],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
      'GET /tournaments/tour-1/duplicates': {
        body: [],
      },
    })
  })

  it('renders fixtures page with title and button', () => {
    renderWithProviders(<FixturesPage leagueId="league-1" />)

    expect(screen.getByText('Generador de Fixtures')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generar fixtures/i })).toBeInTheDocument()
  })

  it('shows empty state when no tournaments', () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
      'GET /teams': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<FixturesPage leagueId="league-1" />)

    const button = screen.getByRole('button', { name: /generar fixtures/i })
    userEvent.click(button)

    expect(screen.getByText('Sin torneos')).toBeInTheDocument()
  })

  it('shows empty state when no teams', () => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [
            {
              id: 'tour-1',
              name: 'Torneo A',
              league_id: 'league-1',
              is_active: true,
              start_date: '2024-01-01',
              end_date: '2024-03-01',
              registration_open: false,
              tournament_format: 'round_robin',
              rounds_per_season: 10,
              has_third_place_match: false,
              age_validation_enabled: false,
              id_document_required: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /teams': {
        body: { data: [], page: { limit: 100, offset: 0 } },
      },
    })

    renderWithProviders(<FixturesPage leagueId="league-1" />)

    const button = screen.getByRole('button', { name: /generar fixtures/i })
    userEvent.click(button)

    expect(screen.getByText('Sin equipos')).toBeInTheDocument()
  })
})

describe('FixtureWizard', () => {
  const mockTournaments: Tournament[] = [
    {
      id: 'tour-1',
      name: 'Torneo A',
      league_id: 'league-1',
      is_active: true,
      start_date: '2024-01-01',
      end_date: '2024-03-01',
      registration_open: false,
      tournament_format: 'round_robin',
      rounds_per_season: 10,
      has_third_place_match: false,
      age_validation_enabled: false,
      id_document_required: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockTeams = [
    { id: 'team-1', name: 'Equipo 1', slug: 'equipo-1', league_id: 'league-1', tournament_id: 'tour-1', is_active: true },
    { id: 'team-2', name: 'Equipo 2', slug: 'equipo-2', league_id: 'league-1', tournament_id: 'tour-1', is_active: true },
    { id: 'team-3', name: 'Equipo 3', slug: 'equipo-3', league_id: 'league-1', is_active: false },
  ]

  const getActiveTeams = () => mockTeams.filter((t) => t.is_active)

  beforeEach(() => {
    mockApi({
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
      'GET /tournaments/tour-1/duplicates': {
        body: [],
      },
    })
  })

  it('renders wizard with tournament selection', () => {
    renderWithProviders(
      <FixtureWizard tournaments={mockTournaments} getActiveTeams={getActiveTeams} />,
    )

    expect(screen.getByText('Selecciona el torneo')).toBeInTheDocument()
  })

  it('auto-selects active teams when tournament is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <FixtureWizard tournaments={mockTournaments} getActiveTeams={getActiveTeams} />,
    )

    const select = screen.getByRole('combobox')
    await user.click(select)
    await user.click(screen.getByText('Torneo A'))

    // Should move to teams step, but auto-select active teams
    await waitFor(() => {
      expect(screen.getByText(/Equipos \(2\/2\)/)).toBeInTheDocument()
    })
  })

  it('shows schedule step with defaults', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <FixtureWizard tournaments={mockTournaments} getActiveTeams={getActiveTeams} />,
    )

    const select = screen.getByRole('combobox')
    await user.click(select)
    await user.click(screen.getByText('Torneo A'))

    await waitFor(() => {
      expect(screen.getByText(/Equipos \(2\/2\)/)).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    expect(screen.getByText('Fecha de inicio')).toBeInTheDocument()
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15')).toBeInTheDocument()
  })

  it('shows schedule validation errors on 422', async () => {
    const user = userEvent.setup()
    mockApi({
      'POST /tournaments/tour-1/fixtures/generate': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: {
              'schedule.start_date': 'La fecha debe ser en el futuro',
            },
          },
        },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
      'GET /tournaments/tour-1/duplicates': {
        body: [],
      },
    })

    renderWithProviders(
      <FixtureWizard tournaments={mockTournaments} getActiveTeams={getActiveTeams} />,
    )

    const select = screen.getByRole('combobox')
    await user.click(select)
    await user.click(screen.getByText('Torneo A'))

    await waitFor(() => {
      expect(screen.getByText(/Equipos \(2\/2\)/)).toBeInTheDocument()
    })

    let nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Move to options
    nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Move to confirm
    const generateButton = screen.getByRole('button', { name: /generar fixtures/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('La fecha debe ser en el futuro')).toBeInTheDocument()
    })
  })

  it('shows success state after successful generation', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()
    mockApi({
      'POST /tournaments/tour-1/fixtures/generate': {
        body: {
          matches: Array(10).fill(null).map((_, i) => ({
            id: `match-${i}`,
            tournament_id: 'tour-1',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 0,
            away_score: 0,
            match_date: '2024-02-01T10:00:00Z',
            match_time: '10:00',
            status: 'scheduled',
            round: 1,
            phase: 'regular',
            is_published: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          })),
          rounds: 1,
        },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
      'GET /tournaments/tour-1/duplicates': {
        body: [],
      },
    })

    renderWithProviders(
      <FixtureWizard
        tournaments={mockTournaments}
        getActiveTeams={getActiveTeams}
        onSuccess={mockOnSuccess}
      />,
    )

    const select = screen.getByRole('combobox')
    await user.click(select)
    await user.click(screen.getByText('Torneo A'))

    await waitFor(() => {
      expect(screen.getByText(/Equipos \(2\/2\)/)).toBeInTheDocument()
    })

    let nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Fill start date
    const startDateInput = screen.getByDisplayValue('')
    await user.click(startDateInput)
    await user.type(startDateInput, '2024-02-01')

    // Move to options
    nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Move to confirm
    nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Generate
    const generateButton = screen.getByRole('button', { name: /generar fixtures/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText(/Fixtures generados correctamente/)).toBeInTheDocument()
    })

    const listaButton = screen.getByRole('button', { name: /listo/i })
    await user.click(listaButton)

    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('shows playoffs generation 422 error', async () => {
    const user = userEvent.setup()
    mockApi({
      'POST /tournaments/tour-1/fixtures/generate': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'No caben todos los partidos',
            fields: {
              schedule: 'Los partidos no caben entre las fechas especificadas',
            },
          },
        },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
      'GET /tournaments/tour-1/duplicates': {
        body: [],
      },
    })

    renderWithProviders(
      <FixtureWizard tournaments={mockTournaments} getActiveTeams={getActiveTeams} />,
    )

    const select = screen.getByRole('combobox')
    await user.click(select)
    await user.click(screen.getByText('Torneo A'))

    await waitFor(() => {
      expect(screen.getByText(/Equipos \(2\/2\)/)).toBeInTheDocument()
    })

    let nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Fill start date
    const startDateInput = screen.getByRole('textbox', { name: /fecha de inicio/i })
    await user.click(startDateInput)
    await user.type(startDateInput, '2024-02-01')

    // Move to options
    nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Move to confirm
    nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)

    // Generate
    const generateButton = screen.getByRole('button', { name: /generar fixtures/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Los partidos no caben entre las fechas especificadas')).toBeInTheDocument()
    })
  })
})

describe('PlayoffsPage', () => {
  beforeEach(() => {
    mockApi({
      'GET /leagues/league-1/tournaments': {
        body: {
          data: [
            {
              id: 'tour-1',
              name: 'Torneo A',
              league_id: 'league-1',
              is_active: true,
              start_date: '2024-01-01',
              end_date: '2024-03-01',
              registration_open: false,
              tournament_format: 'round_robin',
              rounds_per_season: 10,
              has_third_place_match: false,
              age_validation_enabled: false,
              id_document_required: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          page: { limit: 100, offset: 0 },
        },
      },
      'GET /tournaments/tour-1/matches': {
        body: { data: [], page: { limit: 1000, offset: 0 } },
      },
    })
  })

  it('renders playoffs page with title and button', () => {
    renderWithProviders(<PlayoffsPage leagueId="league-1" />)

    expect(screen.getByText('Llave de Playoffs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generar llave/i })).toBeInTheDocument()
  })

  it('shows empty state when no playoff matches', () => {
    renderWithProviders(<PlayoffsPage leagueId="league-1" />)

    expect(screen.getByText('Selecciona un torneo arriba para ver su llave')).toBeInTheDocument()
  })
})

describe('PlayoffBracket', () => {
  const mockPlayoffMatches: Match[] = [
    {
      id: 'match-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T10:00:00Z',
      match_time: '10:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 1,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-2',
      tournament_id: 'tour-1',
      home_team_id: 'team-3',
      away_team_id: 'team-4',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T12:00:00Z',
      match_time: '12:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 2,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-3',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-3',
      home_score: 2,
      away_score: 1,
      match_date: '2024-02-08T10:00:00Z',
      match_time: '10:00',
      status: 'finished',
      phase: 'playoffs',
      playoff_round: 'final',
      playoff_position: 1,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-08T00:00:00Z',
    },
  ]

  it('renders playoff bracket with matches grouped by round', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('displays match details correctly for finished matches', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    expect(screen.getByText('2 - 1')).toBeInTheDocument()
  })

  it('shows empty state when no playoff matches', () => {
    renderWithProviders(<PlayoffBracket matches={[]} />)

    expect(screen.getByText('No hay partidos de llave generados')).toBeInTheDocument()
  })

  it('filters to show only playoff matches', () => {
    const regularMatch: Match = {
      id: 'regular-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 1,
      away_score: 1,
      match_date: '2024-01-01T10:00:00Z',
      match_time: '10:00',
      status: 'finished' as const,
      phase: 'regular' as const,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mixedMatches: Match[] = [...mockPlayoffMatches, regularMatch]

    renderWithProviders(<PlayoffBracket matches={mixedMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('displays all playoff rounds correctly', () => {
    const allRounds: Match[] = [
      {
        id: 'qf-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-01T10:00:00Z',
        match_time: '10:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'quarterfinals',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tp-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-5',
        away_team_id: 'team-6',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-15T14:00:00Z',
        match_time: '14:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'third_place',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={allRounds} />)

    expect(screen.getByText('Cuartos de Final')).toBeInTheDocument()
    expect(screen.getByText('Tercer Lugar')).toBeInTheDocument()
  })

  it('handles matches with home and away legs', () => {
    const legMatches: Match[] = [
      {
        id: 'semi-1-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 1,
        away_score: 0,
        match_date: '2024-02-05T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'first',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-05T00:00:00Z',
      },
      {
        id: 'semi-1-2',
        tournament_id: 'tour-1',
        home_team_id: 'team-2',
        away_team_id: 'team-1',
        home_score: 1,
        away_score: 1,
        match_date: '2024-02-12T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'second',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-12T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={legMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('1 - 0')).toBeInTheDocument()
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
  })
})

describe('PlayoffBracket', () => {
  const mockPlayoffMatches: Match[] = [
    {
      id: 'match-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T10:00:00Z',
      match_time: '10:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 1,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-2',
      tournament_id: 'tour-1',
      home_team_id: 'team-3',
      away_team_id: 'team-4',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T12:00:00Z',
      match_time: '12:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 2,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-3',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-3',
      home_score: 2,
      away_score: 1,
      match_date: '2024-02-08T10:00:00Z',
      match_time: '10:00',
      status: 'finished',
      phase: 'playoffs',
      playoff_round: 'final',
      playoff_position: 1,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-08T00:00:00Z',
    },
  ]

  it('renders playoff bracket with matches grouped by round', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('displays match details correctly for finished matches', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    // Finished match should show score
    expect(screen.getByText('2 - 1')).toBeInTheDocument()
  })

  it('shows empty state when no playoff matches', () => {
    renderWithProviders(<PlayoffBracket matches={[]} />)

    expect(screen.getByText('No hay partidos de llave generados')).toBeInTheDocument()
  })

  it('filters to show only playoff matches', () => {
    const regularMatch: Match = {
      id: 'regular-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 1,
      away_score: 1,
      match_date: '2024-01-01T10:00:00Z',
      match_time: '10:00',
      status: 'finished' as const,
      phase: 'regular' as const,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mixedMatches: Match[] = [...mockPlayoffMatches, regularMatch]

    renderWithProviders(<PlayoffBracket matches={mixedMatches} />)

    // Should show playoff matches, not regular ones
    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
    // Regular matches should not be visible
    expect(screen.queryByText(/equipos en regular/i)).not.toBeInTheDocument()
  })

  it('displays all playoff rounds correctly', () => {
    const allRounds: Match[] = [
      {
        id: 'qf-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-01T10:00:00Z',
        match_time: '10:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'quarterfinals',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tp-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-5',
        away_team_id: 'team-6',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-15T14:00:00Z',
        match_time: '14:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'third_place',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={allRounds} />)

    expect(screen.getByText('Cuartos de Final')).toBeInTheDocument()
    expect(screen.getByText('Tercer Lugar')).toBeInTheDocument()
  })

  it('handles matches with home and away legs', () => {
    const legMatches: Match[] = [
      {
        id: 'semi-1-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 1,
        away_score: 0,
        match_date: '2024-02-05T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'first',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-05T00:00:00Z',
      },
      {
        id: 'semi-1-2',
        tournament_id: 'tour-1',
        home_team_id: 'team-2',
        away_team_id: 'team-1',
        home_score: 1,
        away_score: 1,
        match_date: '2024-02-12T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'second',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-12T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={legMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    // Should show scores for both matches
    expect(screen.getByText('1 - 0')).toBeInTheDocument()
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
  })
})
