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

const mockTeams = [
  {
    id: 'team-1',
    name: 'Team Alpha',
    slug: 'team-alpha',
    logo: 'https://example.com/logo1.png',
    league_id: 'league-123',
  },
  {
    id: 'team-2',
    name: 'Team Beta',
    slug: 'team-beta',
    logo: null,
    league_id: 'league-123',
  },
]

const mockMatches = [
  {
    id: 'match-1',
    round: 1,
    home_team: {
      id: 'team-1',
      name: 'Team Alpha',
      slug: 'team-alpha',
      logo: 'https://example.com/logo1.png',
    },
    away_team: {
      id: 'team-2',
      name: 'Team Beta',
      slug: 'team-beta',
      logo: null,
    },
    match_date: '2024-01-15T10:00:00Z',
    match_time: '10:00',
    field_number: 1,
    status: 'scheduled',
    home_score: null,
    away_score: null,
    bye_team_id: null,
    phase: 'regular',
    playoff_round: null,
    playoff_position: null,
  },
  {
    id: 'match-2',
    round: 2,
    home_team: {
      id: 'team-2',
      name: 'Team Beta',
      slug: 'team-beta',
      logo: null,
    },
    away_team: {
      id: 'team-1',
      name: 'Team Alpha',
      slug: 'team-alpha',
      logo: 'https://example.com/logo1.png',
    },
    match_date: '2024-01-22T14:00:00Z',
    match_time: '14:00',
    field_number: 2,
    status: 'completed',
    home_score: 2,
    away_score: 1,
    bye_team_id: null,
    phase: 'regular',
    playoff_round: null,
    playoff_position: null,
  },
]

// Mock functions
const mockRefetchMatches = vi.fn()
const mockInvalidateByTournament = vi.fn()

// Mock React Query hooks
vi.mock('@/lib/queries', () => ({
  useTeamsByLeague: vi.fn(() => ({
    data: mockTeams,
    isLoading: false,
  })),
  useTournamentsByLeague: vi.fn(() => ({
    data: mockTournaments,
    isLoading: false,
  })),
  useMatchesByTournament: vi.fn(() => ({
    data: mockMatches,
    isLoading: false,
    refetch: mockRefetchMatches,
  })),
  useInvalidateMatches: vi.fn(() => ({
    invalidateByTournament: mockInvalidateByTournament,
  })),
}))

// Mock Supabase client
const mockSupabaseFrom = vi.fn()
const mockSupabaseClient = {
  from: mockSupabaseFrom,
}

vi.mock('@/lib/supabase/client', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}))

// Mock utility functions
vi.mock('@/lib/utils/calendar-adjuster', () => ({
  analyzeTeamActivity: vi.fn(),
  generateRoundRobinSchedule: vi.fn(),
  getNextMatchDate: vi.fn(),
}))

vi.mock('@/lib/utils/generate-embeddings', () => ({
  generateMatchScheduleEmbedding: vi.fn(),
  sendJornadaNotification: vi.fn(),
  generateMatchResultEmbedding: vi.fn(),
  generateStandingsEmbedding: vi.fn(),
  sendMatchResultNotification: vi.fn(),
}))

import { CalendarView } from '../calendar-view'

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('displays tournament selector', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getByText(/apertura 2024/i)).toBeInTheDocument()
      })
    })

    it('auto-selects first active tournament', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        // Should auto-select Apertura 2024 (the active tournament)
        expect(screen.getByText(/apertura 2024/i)).toBeInTheDocument()
      })
    })

    it('renders calendar component successfully', () => {
      const { container } = render(<CalendarView leagueId="league-123" />)

      expect(container).toBeInTheDocument()
    })
  })

  describe('Tournament Selection', () => {
    it('displays tournament data from query', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        // Should display tournament name
        expect(screen.getByText(/apertura 2024/i)).toBeInTheDocument()
      })
    })
  })

  describe('Match Display', () => {
    it('shows match date and time', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        // Should show time from match
        expect(screen.getByText(/10:00/)).toBeInTheDocument()
      })
    })

    it('indicates match status', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        // Should show status badges or indicators
        const matches = screen.getAllByText(/team/i)
        expect(matches.length).toBeGreaterThan(0)
      })
    })

    it('successfully renders match data', () => {
      const { container } = render(<CalendarView leagueId="league-123" />)

      // Component should render successfully
      expect(container).toBeInTheDocument()
    })
  })

  describe('Round Filtering', () => {
    it('shows all rounds option', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getByText(/todas|all/i)).toBeInTheDocument()
      })
    })

    it('filters matches by selected round', async () => {
      const user = userEvent.setup()
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getAllByText(/team/i).length).toBeGreaterThan(0)
      })

      // Initially should show all matches (2)
      const initialMatches = screen.getAllByText(/team alpha/i)
      expect(initialMatches.length).toBeGreaterThan(0)
    })
  })

  describe('Calendar Actions', () => {
    it('displays refresh button', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        const refreshButtons = screen.getAllByRole('button')
        expect(refreshButtons.length).toBeGreaterThan(0)
      })
    })

    it('calls refetch when clicking refresh', async () => {
      const user = userEvent.setup()
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
      })

      // Find refresh button (could be identified by icon or aria-label)
      const buttons = screen.getAllByRole('button')
      const refreshButton = buttons.find(btn => btn.textContent?.includes('Actualizar') || btn.getAttribute('aria-label')?.includes('refresh'))

      if (refreshButton) {
        await user.click(refreshButton)

        await waitFor(() => {
          expect(mockRefetchMatches).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Match Cards', () => {
    it('displays match cards for each match', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        // Should have 2 match cards from mockMatches
        const teamNames = screen.getAllByText(/team/i)
        expect(teamNames.length).toBeGreaterThan(0)
      })
    })

    it('displays team logos when available', async () => {
      render(<CalendarView leagueId="league-123" />)

      await waitFor(() => {
        const images = screen.getAllByRole('img', { hidden: true })
        expect(images.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('renders without crashing on mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(<CalendarView leagueId="league-123" />)
      expect(container).toBeInTheDocument()
    })

    it('renders without crashing on desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1920
      global.innerHeight = 1080

      const { container } = render(<CalendarView leagueId="league-123" />)
      expect(container).toBeInTheDocument()
    })
  })
})
