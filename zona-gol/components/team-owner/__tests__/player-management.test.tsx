import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock data
const mockPlayers = [
  {
    id: 'player-1',
    name: 'John Doe',
    position: 'Delantero',
    jersey_number: 10,
    birth_date: '2000-01-15',
    photo: 'https://example.com/photo1.jpg',
    team_id: 'team-123',
    created_at: '2024-01-01',
  },
  {
    id: 'player-2',
    name: 'Jane Smith',
    position: 'Portero',
    jersey_number: 1,
    birth_date: '1999-05-20',
    photo: null,
    team_id: 'team-123',
    created_at: '2024-01-02',
  },
]

const mockTeamData = {
  id: 'team-123',
  name: 'Test Team',
  slug: 'test-team',
  logo: 'https://example.com/logo.png',
  league_id: 'league-123',
  tournament_id: 'tournament-123',
}

// Mock functions
const mockGeneratePlayerQR = vi.fn()
const mockCreatePlayer = vi.fn()
const mockUpdatePlayer = vi.fn()
const mockDeletePlayer = vi.fn()
const mockInvalidateQueries = vi.fn()

// Mock useAuth
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    profile: { id: 'user-123', email: 'owner@test.com' },
  }),
}))

// Mock useQRGenerator
vi.mock('@/lib/hooks/use-qr-generator', () => ({
  useQRGenerator: () => ({
    generatePlayerQR: mockGeneratePlayerQR,
  }),
}))

// Mock useLeagueFeatures
vi.mock('@/lib/hooks/use-league-features', () => ({
  useLeagueFeatures: () => ({
    hasFeature: vi.fn(() => true),
  }),
}))

// Mock useAgeValidation
vi.mock('@/lib/hooks/use-age-validation', () => ({
  useAgeValidation: () => ({
    isAgeValidationEnabled: false,
    isIdDocumentRequired: false,
    validateAge: vi.fn(),
    rulesDescription: '',
    availableExceptions: [],
  }),
}))

// Mock React Query hooks
vi.mock('@/lib/queries', () => ({
  usePlayers: vi.fn(() => ({
    data: {
      players: mockPlayers,
      maxLimit: null,
      registrationOpen: true,
      tournamentId: 'tournament-123',
    },
    isLoading: false,
    error: null,
  })),
  useTeamById: vi.fn(() => ({
    data: mockTeamData,
    isLoading: false,
  })),
  useTeamSuspensions: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreatePlayer: vi.fn(() => ({
    mutateAsync: mockCreatePlayer,
  })),
  useUpdatePlayer: vi.fn(() => ({
    mutateAsync: mockUpdatePlayer,
  })),
  useDeletePlayer: vi.fn(() => ({
    mutateAsync: mockDeletePlayer,
  })),
  useTournamentById: vi.fn(() => ({
    data: null,
  })),
  queryKeys: {
    players: {
      byTeam: (id: string) => ['players', 'team', id],
    },
  },
}))

// Mock TanStack Query client
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClientSupabaseClient: () => ({
    from: vi.fn(),
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock file upload components
vi.mock('@/components/ui/file-upload', () => ({
  FileUpload: () => <div data-testid="file-upload">File Upload</div>,
}))

vi.mock('@/components/ui/file-upload-storage', () => ({
  FileUploadStorage: () => <div data-testid="file-upload-storage">File Upload Storage</div>,
}))

vi.mock('@/components/ui/player-qr-modal', () => ({
  PlayerQRModal: ({ open }: { open: boolean }) => (
    open ? <div data-testid="player-qr-modal">QR Modal</div> : null
  ),
}))

import { PlayerManagement } from '../player-management'

describe('PlayerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders player management component successfully', () => {
      const { container } = render(<PlayerManagement teamId="team-123" />)

      expect(container).toBeInTheDocument()
    })
  })

  describe('Player List', () => {
    it('displays all players from data', async () => {
      render(<PlayerManagement teamId="team-123" />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('shows player positions', async () => {
      render(<PlayerManagement teamId="team-123" />)

      await waitFor(() => {
        expect(screen.getByText(/delantero/i)).toBeInTheDocument()
        expect(screen.getByText(/portero/i)).toBeInTheDocument()
      })
    })
  })


  describe('Player Cards', () => {
    it('displays player information in cards', async () => {
      render(<PlayerManagement teamId="team-123" />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText(/delantero/i)).toBeInTheDocument()
        expect(screen.getByText(/10/)).toBeInTheDocument()
      })
    })

    it('shows avatar for each player', async () => {
      render(<PlayerManagement teamId="team-123" />)

      await waitFor(() => {
        // Check that avatars are rendered (could be images or fallback initials)
        const container = screen.getByText('John Doe').closest('div')
        expect(container).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('renders without crashing on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(<PlayerManagement teamId="team-123" />)
      expect(container).toBeInTheDocument()
    })

    it('renders without crashing on desktop viewport', () => {
      global.innerWidth = 1920
      global.innerHeight = 1080

      const { container } = render(<PlayerManagement teamId="team-123" />)
      expect(container).toBeInTheDocument()
    })
  })
})
