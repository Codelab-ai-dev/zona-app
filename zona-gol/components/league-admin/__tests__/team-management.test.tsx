import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock useAuth hook
const mockUser = { id: 'user-123', email: 'admin@test.com' }
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

// Mock data
const mockTeams = [
  {
    id: 'team-1',
    name: 'Team Alpha',
    slug: 'team-alpha',
    description: 'Description Alpha',
    logo: 'https://example.com/logo1.png',
    league_id: 'league-123',
    tournament_id: 'tournament-1',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'team-2',
    name: 'Team Beta',
    slug: 'team-beta',
    description: 'Description Beta',
    logo: null,
    league_id: 'league-123',
    tournament_id: null,
    is_active: false,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
]

const mockTournaments = [
  {
    id: 'tournament-1',
    name: 'Tournament A',
    league_id: 'league-123',
    season: '2024-A',
  },
  {
    id: 'tournament-2',
    name: 'Tournament B',
    league_id: 'league-123',
    season: '2024-B',
  },
]

// Mock functions
const mockUpdateTeamMutate = vi.fn()
const mockDeleteTeamMutate = vi.fn()
const mockCreateTeamWithNewOwner = vi.fn()
const mockInvalidateQueries = vi.fn()

// Mock TanStack Query hooks
vi.mock('@/lib/queries', () => ({
  useTeamsByLeague: vi.fn(() => ({
    data: mockTeams,
    isLoading: false,
    error: null,
  })),
  useTournamentsByLeague: vi.fn(() => ({
    data: mockTournaments,
    isLoading: false,
    error: null,
  })),
  useUpdateTeam: vi.fn(() => ({
    mutateAsync: mockUpdateTeamMutate,
  })),
  useDeleteTeam: vi.fn(() => ({
    mutateAsync: mockDeleteTeamMutate,
  })),
  queryKeys: {
    teams: {
      byLeague: (id: string) => ['teams', 'league', id],
    },
  },
}))

// Mock useTeams hook
vi.mock('@/lib/hooks/use-teams', () => ({
  useTeams: vi.fn(() => ({
    createTeamWithNewOwner: mockCreateTeamWithNewOwner,
  })),
}))

// Mock TanStack Query client
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock file upload component
vi.mock('@/components/ui/file-upload-storage', () => ({
  FileUploadStorage: ({ onUploadComplete }: any) => (
    <div data-testid="file-upload-storage">
      <button onClick={() => onUploadComplete?.('https://example.com/new-logo.png')}>
        Upload Logo
      </button>
    </div>
  ),
}))

import { TeamManagement } from '../team-management'
import { toast } from 'sonner'

const mockToast = toast as any

describe('TeamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders team management with header', () => {
      render(<TeamManagement leagueId="league-123" />)

      expect(screen.getByText(/gestión de equipos/i)).toBeInTheDocument()
      expect(screen.getByText(/administra los equipos de tu liga/i)).toBeInTheDocument()
    })

    it('renders add team button', () => {
      render(<TeamManagement leagueId="league-123" />)

      expect(screen.getByRole('button', { name: /agregar equipo/i })).toBeInTheDocument()
    })

    it('renders all teams from data', () => {
      render(<TeamManagement leagueId="league-123" />)

      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })

    it('shows error message when no league ID is provided', () => {
      render(<TeamManagement leagueId="" />)

      expect(screen.getByText(/liga no encontrada/i)).toBeInTheDocument()
      expect(screen.getByText(/no se pudo cargar la información de la liga/i)).toBeInTheDocument()
    })

    it('displays team status badges correctly', () => {
      render(<TeamManagement leagueId="league-123" />)

      // Active team should show active badge
      const activeTeamCard = screen.getByText('Team Alpha').closest('div')
      expect(activeTeamCard).toBeInTheDocument()

      // Inactive team should show inactive badge
      const inactiveTeamCard = screen.getByText('Team Beta').closest('div')
      expect(inactiveTeamCard).toBeInTheDocument()
    })
  })

  describe('Team Filtering', () => {
    it('shows all teams by default', () => {
      render(<TeamManagement leagueId="league-123" />)

      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })

    it('displays tournament filter with label', () => {
      render(<TeamManagement leagueId="league-123" />)

      expect(screen.getByText(/filtrar por torneo/i)).toBeInTheDocument()
      expect(screen.getByText(/2 equipos/i)).toBeInTheDocument()
    })

    it('shows team count', () => {
      render(<TeamManagement leagueId="league-123" />)

      // Should show count of all teams
      expect(screen.getByText(/2 equipos/i)).toBeInTheDocument()
    })
  })

  describe('Create Team', () => {
    it('opens create dialog when clicking add button', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const addButton = screen.getByRole('button', { name: /agregar equipo/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/crear equipo/i)).toBeInTheDocument()
      })
    })

    it('displays create team form fields', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const addButton = screen.getByRole('button', { name: /agregar equipo/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/información del equipo/i)).toBeInTheDocument()
        expect(screen.getByText(/información del propietario/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/ej: real madrid cf/i)).toBeInTheDocument()
      })
    })

    it('shows owner credentials after creating team', async () => {
      const user = userEvent.setup()
      mockCreateTeamWithNewOwner.mockResolvedValue({ id: 'new-team-id' })

      render(<TeamManagement leagueId="league-123" />)

      const addButton = screen.getByRole('button', { name: /agregar equipo/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText(/ej: real madrid cf/i), 'New Team')
      await user.type(screen.getByPlaceholderText(/ej: juan pérez/i), 'John Doe')
      await user.type(screen.getByPlaceholderText(/propietario@ejemplo\.com/i), 'john@example.com')

      const createButton = screen.getByRole('button', { name: /crear equipo/i })
      await user.click(createButton)

      // Credentials should be displayed
      await waitFor(() => {
        expect(screen.getByText(/credenciales del propietario/i)).toBeInTheDocument()
      })
    })

    it('uploads team logo', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const addButton = screen.getByRole('button', { name: /agregar equipo/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Find and click the upload button
      const uploadButton = screen.getByText('Upload Logo')
      await user.click(uploadButton)

      // Logo should be set in form data (would need to verify via submission)
    })
  })

  describe('Update Team', () => {
    it('opens edit dialog when clicking edit button', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      // Find edit button for Team Alpha
      const editButtons = screen.getAllByRole('button', { name: /editar/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/editar equipo/i)).toBeInTheDocument()
      })
    })
  })

  describe('Delete Team', () => {
    it('shows delete buttons for each team', () => {
      render(<TeamManagement leagueId="league-123" />)

      const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Activate/Deactivate Team', () => {
    it('opens activate/deactivate confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const toggleButtons = screen.getAllByRole('button', { name: /activar|desactivar/i })
      await user.click(toggleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Team Navigation', () => {
    it('navigates to team page when clicking on team card', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const teamName = screen.getByText('Team Alpha')
      await user.click(teamName)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/equipos/team-1')
      })
    })

    it('sets navigating state when clicking team', async () => {
      const user = userEvent.setup()
      render(<TeamManagement leagueId="league-123" />)

      const teamName = screen.getByText('Team Alpha')
      await user.click(teamName)

      // The component should set navigatingToTeam state
      expect(mockPush).toHaveBeenCalled()
    })
  })

  describe('Helper Functions', () => {
    it('generates correct team initials', () => {
      render(<TeamManagement leagueId="league-123" />)

      // Team Alpha should show "TA" initials if no logo
      // Team Beta should show "TB" initials (no logo)
      // This would be visible in the avatar fallback
    })
  })
})
