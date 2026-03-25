import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock data
const mockTournaments = [
  {
    id: 'tournament-1',
    name: 'Apertura 2024',
    league_id: 'league-123',
    season: '2024-A',
    is_active: true,
  },
  {
    id: 'tournament-2',
    name: 'Clausura 2024',
    league_id: 'league-123',
    season: '2024-B',
    is_active: false,
  },
]

const mockStandings = [
  {
    id: 'stats-1',
    team_id: 'team-1',
    tournament_id: 'tournament-1',
    matches_played: 10,
    matches_won: 7,
    matches_drawn: 2,
    matches_lost: 1,
    goals_for: 20,
    goals_against: 8,
    goal_difference: 12,
    points: 23,
    points_adjustment: 0,
    adjustment_reason: null,
    team: {
      id: 'team-1',
      name: 'Team Alpha',
      logo: 'https://example.com/logo1.png',
    },
  },
  {
    id: 'stats-2',
    team_id: 'team-2',
    tournament_id: 'tournament-1',
    matches_played: 10,
    matches_won: 5,
    matches_drawn: 3,
    matches_lost: 2,
    goals_for: 15,
    goals_against: 10,
    goal_difference: 5,
    points: 18,
    points_adjustment: -3,
    adjustment_reason: 'Incumplimiento de reglamento',
    team: {
      id: 'team-2',
      name: 'Team Beta',
      logo: null,
    },
  },
]

// Mock functions
const mockRefetchStandings = vi.fn()
const mockInvalidateByTournament = vi.fn()
const mockUpdateStats = vi.fn()
const mockInsertStats = vi.fn()

// Mock Supabase client
const mockSupabaseUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({ error: null })),
}))

const mockSupabaseInsert = vi.fn(() => ({ error: null }))

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'team_stats') {
      return {
        update: mockSupabaseUpdate,
        insert: mockSupabaseInsert,
      }
    }
    return {}
  }),
}

vi.mock('@/lib/supabase/client', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}))

// Mock React Query hooks
vi.mock('@/lib/queries', () => ({
  useTournamentsByLeague: vi.fn(() => ({
    data: mockTournaments,
    isLoading: false,
  })),
  useTeamStatsByTournament: vi.fn(() => ({
    data: mockStandings,
    isLoading: false,
    refetch: mockRefetchStandings,
  })),
  useInvalidateTeamStats: vi.fn(() => ({
    invalidateByTournament: mockInvalidateByTournament,
  })),
  useLeagueById: vi.fn(() => ({
    data: { id: 'league-123', name: 'Test League', logo: null },
    isLoading: false,
  })),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock generate embeddings
vi.mock('@/lib/utils/generate-embeddings', () => ({
  generateStandingsEmbedding: vi.fn(() => Promise.resolve()),
}))

import { StandingsManagement } from '../standings-management'

describe('StandingsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders standings management component successfully', () => {
      const { container } = render(<StandingsManagement leagueId="league-123" />)

      expect(container).toBeInTheDocument()
    })

    it('shows empty state when no teams', async () => {
      const useQueryMock = await import('@/lib/queries')
      vi.mocked(useQueryMock.useTeamStatsByTournament).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetchStandings,
      } as any)

      render(<StandingsManagement leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getByText(/no hay equipos en este torneo/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tournament Selection', () => {
    it('displays tournament selector', async () => {
      render(<StandingsManagement leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getByText(/seleccionar torneo/i)).toBeInTheDocument()
      })
    })

    it('auto-selects active tournament', async () => {
      render(<StandingsManagement leagueId="league-123" />)

      await waitFor(() => {
        // Should auto-select Apertura 2024 (active tournament)
        expect(screen.getByText(/apertura 2024/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('renders without crashing on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(<StandingsManagement leagueId="league-123" />)
      expect(container).toBeInTheDocument()
    })

    it('renders without crashing on desktop viewport', () => {
      global.innerWidth = 1920
      global.innerHeight = 1080

      const { container } = render(<StandingsManagement leagueId="league-123" />)
      expect(container).toBeInTheDocument()
    })
  })
})
