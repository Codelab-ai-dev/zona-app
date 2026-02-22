import { describe, it, expect, vi, beforeEach } from 'vitest'
import { leagueActions } from '../league-actions'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
}

// Mock league store
const mockLeagueStore = {
  getState: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  setLeagues: vi.fn(),
  setCurrentLeague: vi.fn(),
  addLeague: vi.fn(),
  updateLeague: vi.fn(),
  removeLeague: vi.fn(),
  setTournaments: vi.fn(),
  setTeams: vi.fn(),
}

// Mock auth store
const mockAuthStore = {
  getState: vi.fn(),
  user: null,
  setProfile: vi.fn(),
}

// Mock modules
vi.mock('../../supabase/client', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
  createPublicSupabaseClient: () => mockSupabaseClient,
}))

vi.mock('../../stores/league-store', () => ({
  useLeagueStore: {
    getState: () => mockLeagueStore.getState(),
  },
}))

vi.mock('../../stores/auth-store', () => ({
  useAuthStore: {
    getState: () => mockAuthStore.getState(),
  },
}))

describe('league-actions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Default mock implementations
    mockLeagueStore.getState.mockReturnValue({
      setLoading: mockLeagueStore.setLoading,
      setError: mockLeagueStore.setError,
      setLeagues: mockLeagueStore.setLeagues,
      setCurrentLeague: mockLeagueStore.setCurrentLeague,
      addLeague: mockLeagueStore.addLeague,
      updateLeague: mockLeagueStore.updateLeague,
      removeLeague: mockLeagueStore.removeLeague,
      setTournaments: mockLeagueStore.setTournaments,
      setTeams: mockLeagueStore.setTeams,
    })

    mockAuthStore.getState.mockReturnValue({
      user: null,
      setProfile: mockAuthStore.setProfile,
    })
  })

  describe('getActiveLeagues', () => {
    it('fetches and stores active leagues', async () => {
      const mockLeagues = [
        { id: '1', name: 'Liga A', is_active: true, slug: 'liga-a' },
        { id: '2', name: 'Liga B', is_active: true, slug: 'liga-b' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              returns: vi.fn().mockResolvedValue({
                data: mockLeagues,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.getActiveLeagues()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('leagues')
      expect(mockLeagueStore.setLoading).toHaveBeenCalledWith(true)
      expect(mockLeagueStore.setLeagues).toHaveBeenCalledWith(mockLeagues)
      expect(mockLeagueStore.setError).toHaveBeenCalledWith(null)
      expect(mockLeagueStore.setLoading).toHaveBeenCalledWith(false)
      expect(result).toEqual(mockLeagues)
    })

    it('handles fetch error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              returns: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error'),
              }),
            }),
          }),
        }),
      })

      await expect(leagueActions.getActiveLeagues()).rejects.toThrow()
      expect(mockLeagueStore.setError).toHaveBeenLastCalledWith('Database error')
    })

    it('sets empty array when no leagues found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              returns: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.getActiveLeagues()

      expect(mockLeagueStore.setLeagues).toHaveBeenCalledWith([])
      expect(result).toBeNull()
    })
  })

  describe('getLeaguesByAdmin', () => {
    it('fetches leagues for authenticated admin', async () => {
      const mockUser = { id: 'admin-1' }
      const mockLeagues = [
        { id: '1', name: 'Liga A', admin_id: 'admin-1' },
      ]

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockLeagues,
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.getLeaguesByAdmin()

      expect(result).toEqual(mockLeagues)
      expect(mockLeagueStore.setLeagues).toHaveBeenCalledWith(mockLeagues)
    })

    it('throws error when user not authenticated', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
      })

      await expect(leagueActions.getLeaguesByAdmin()).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('handles database error', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: { id: 'admin-1' },
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Query failed'),
            }),
          }),
        }),
      })

      await expect(leagueActions.getLeaguesByAdmin()).rejects.toThrow()
      expect(mockLeagueStore.setError).toHaveBeenLastCalledWith('Query failed')
    })
  })

  describe('getAllLeagues', () => {
    it('fetches all leagues for super admin', async () => {
      const mockLeagues = [
        { id: '1', name: 'Liga A', is_active: true },
        { id: '2', name: 'Liga B', is_active: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            returns: vi.fn().mockResolvedValue({
              data: mockLeagues,
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.getAllLeagues()

      expect(result).toEqual(mockLeagues)
      expect(mockLeagueStore.setLeagues).toHaveBeenCalledWith(mockLeagues)
    })

    it('returns empty array when no leagues exist', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            returns: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.getAllLeagues()

      expect(result).toEqual([])
      expect(mockLeagueStore.setLeagues).toHaveBeenCalledWith([])
    })
  })

  describe('getLeagueBySlug', () => {
    it('fetches league by slug successfully', async () => {
      const mockLeague = {
        id: '1',
        name: 'Liga A',
        slug: 'liga-a',
        is_active: true,
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockLeague,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.getLeagueBySlug('liga-a')

      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.setCurrentLeague).toHaveBeenCalledWith(mockLeague)
    })

    it('throws League not found error for PGRST116 code', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      await expect(leagueActions.getLeagueBySlug('non-existent')).rejects.toThrow(
        'League not found'
      )
      expect(mockLeagueStore.setCurrentLeague).toHaveBeenCalledWith(null)
    })

    it('handles other database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database connection failed'),
              }),
            }),
          }),
        }),
      })

      await expect(leagueActions.getLeagueBySlug('liga-a')).rejects.toThrow()
    })
  })

  describe('createLeague', () => {
    it('creates league and assigns to current user', async () => {
      const mockUser = { id: 'user-1' }
      const mockLeague = {
        id: 'league-1',
        name: 'Nueva Liga',
        slug: 'nueva-liga',
        admin_id: 'user-1',
        is_active: true,
      }
      const mockUpdatedAdmin = {
        id: 'user-1',
        league_id: 'league-1',
        role: 'league_admin',
      }

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        setProfile: mockAuthStore.setProfile,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLeague,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedAdmin,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.createLeague({
        name: 'Nueva Liga',
        slug: 'nueva-liga',
      })

      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.addLeague).toHaveBeenCalledWith(mockLeague)
      expect(mockAuthStore.setProfile).toHaveBeenCalledWith(mockUpdatedAdmin)
    })

    it('throws error when user not authenticated', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
      })

      await expect(
        leagueActions.createLeague({ name: 'Test', slug: 'test' })
      ).rejects.toThrow('User not authenticated')
    })

    it('creates league even if admin assignment fails', async () => {
      const mockUser = { id: 'user-1' }
      const mockLeague = {
        id: 'league-1',
        name: 'Nueva Liga',
        admin_id: 'user-1',
      }

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        setProfile: mockAuthStore.setProfile,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLeague,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Update failed'),
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.createLeague({
        name: 'Nueva Liga',
        slug: 'nueva-liga',
      })

      // Should still succeed even if admin assignment failed
      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.addLeague).toHaveBeenCalledWith(mockLeague)
    })

    it('sets is_active to true by default', async () => {
      const mockUser = { id: 'user-1' }
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '1', is_active: true },
            error: null,
          }),
        }),
      })

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        setProfile: vi.fn(),
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {},
                error: null,
              }),
            }),
          }),
        }),
      })

      await leagueActions.createLeague({ name: 'Test', slug: 'test' })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        })
      )
    })
  })

  describe('createLeagueWithAdmin', () => {
    it('creates league with specific admin', async () => {
      const mockLeague = {
        id: 'league-1',
        name: 'Liga Especial',
        admin_id: 'admin-1',
        is_active: true,
      }
      const mockUpdatedAdmin = {
        id: 'admin-1',
        league_id: 'league-1',
        role: 'league_admin',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLeague,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedAdmin,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.createLeagueWithAdmin({
        name: 'Liga Especial',
        slug: 'liga-especial',
        admin_id: 'admin-1',
      })

      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.addLeague).toHaveBeenCalledWith(mockLeague)
    })

    it('handles league creation error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Creation failed'),
            }),
          }),
        }),
      })

      await expect(
        leagueActions.createLeagueWithAdmin({
          name: 'Test',
          slug: 'test',
          admin_id: 'admin-1',
        })
      ).rejects.toThrow()
    })
  })

  describe('updateLeague', () => {
    beforeEach(() => {
      // Mock window for event dispatching
      global.window = {
        dispatchEvent: vi.fn(),
      } as any

      // Mock setTimeout
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('updates league successfully', async () => {
      const mockLeague = {
        id: 'league-1',
        name: 'Liga Updated',
        is_active: true,
      }

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockLeague,
                error: null,
              }),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockLeague],
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.updateLeague('league-1', {
        name: 'Liga Updated',
      })

      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.updateLeague).toHaveBeenCalledWith(mockLeague)
    })

    it('updates store with new league data after update', async () => {
      const mockLeague = { id: 'league-1', is_active: true, name: 'Updated League' }

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockLeague,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.updateLeague('league-1', { name: 'Updated League' })

      expect(result).toEqual(mockLeague)
      expect(mockLeagueStore.updateLeague).toHaveBeenCalledWith(mockLeague)
      expect(mockLeagueStore.setLoading).toHaveBeenCalledWith(false)
    })

    it('handles update error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Update failed'),
              }),
            }),
          }),
        }),
      })

      await expect(
        leagueActions.updateLeague('league-1', { name: 'Test' })
      ).rejects.toThrow()
    })
  })

  describe('deleteLeague', () => {
    it('performs soft delete by setting is_active to false', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })

      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
      })

      await leagueActions.deleteLeague('league-1')

      expect(updateMock).toHaveBeenCalledWith({ is_active: false })
      expect(mockLeagueStore.removeLeague).toHaveBeenCalledWith('league-1')
    })

    it('handles delete error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error('Delete failed'),
          }),
        }),
      })

      await expect(leagueActions.deleteLeague('league-1')).rejects.toThrow()
      expect(mockLeagueStore.setError).toHaveBeenLastCalledWith('Delete failed')
    })
  })

  describe('getTournamentsByLeague', () => {
    it('fetches tournaments for a league', async () => {
      const mockTournaments = [
        { id: '1', name: 'Torneo A', league_id: 'league-1' },
        { id: '2', name: 'Torneo B', league_id: 'league-1' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTournaments,
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.getTournamentsByLeague('league-1')

      expect(result).toEqual(mockTournaments)
      expect(mockLeagueStore.setTournaments).toHaveBeenCalledWith(mockTournaments)
    })

    it('sets empty array when no tournaments found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const result = await leagueActions.getTournamentsByLeague('league-1')

      expect(result).toBeNull()
      expect(mockLeagueStore.setTournaments).toHaveBeenCalledWith([])
    })
  })

  describe('getTeamsByLeague', () => {
    it('fetches active teams for a league', async () => {
      const mockTeams = [
        { id: '1', name: 'Team A', league_id: 'league-1', is_active: true },
        { id: '2', name: 'Team B', league_id: 'league-1', is_active: true },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockTeams,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await leagueActions.getTeamsByLeague('league-1')

      expect(result).toEqual(mockTeams)
      expect(mockLeagueStore.setTeams).toHaveBeenCalledWith(mockTeams)
    })

    it('handles fetch error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Query failed'),
              }),
            }),
          }),
        }),
      })

      await expect(leagueActions.getTeamsByLeague('league-1')).rejects.toThrow()
    })
  })

  describe('getLeagueStats', () => {
    it('fetches league statistics successfully', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Team A' }]
      const mockTournaments = [
        { id: 'tournament-1', name: 'Torneo A', is_active: true },
      ]

      // Mock for teams query
      const teamsQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockTeams,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      }

      // Mock for tournaments query
      const tournamentsQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTournaments,
              count: 1,
            }),
          }),
        }),
      }

      // Mock for players query
      const playersQuery = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 5,
            }),
          }),
        }),
      }

      // Mock for matches count query
      const matchesCountQuery = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            count: 10,
          }),
        }),
      }

      // Mock for matches data query (upcoming matches)
      const matchesDataQuery = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            }),
          }),
        }),
      }

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (table === 'teams') return teamsQuery
        if (table === 'tournaments') return tournamentsQuery
        if (table === 'players') return playersQuery
        if (table === 'matches') {
          // Return count query first, then data query
          if (callCount === 4) return matchesCountQuery
          return matchesDataQuery
        }
        return teamsQuery
      })

      const stats = await leagueActions.getLeagueStats('league-1')

      expect(stats).toHaveProperty('teamsCount')
      expect(stats).toHaveProperty('tournamentsCount')
      expect(stats).toHaveProperty('playersCount')
      expect(stats).toHaveProperty('matchesCount')
      expect(stats.teamsCount).toBe(1)
      expect(stats.tournamentsCount).toBe(1)
    })

    it('handles empty league stats', async () => {
      const emptyQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                }),
              }),
            }),
            order: vi.fn().mockResolvedValue({
              data: [],
              count: 0,
            }),
          }),
          in: vi.fn().mockResolvedValue({
            count: 0,
          }),
        }),
      }

      mockSupabaseClient.from.mockReturnValue(emptyQuery)

      const stats = await leagueActions.getLeagueStats('league-1')

      expect(stats.teamsCount).toBe(0)
      expect(stats.tournamentsCount).toBe(0)
    })
  })

  describe('getSystemStats', () => {
    it('fetches system-wide statistics', async () => {
      const mockLeagues = [
        { id: '1', name: 'Liga A', is_active: true },
        { id: '2', name: 'Liga B', is_active: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockLeagues,
              count: 2,
            }),
          }),
          eq: vi.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      })

      const stats = await leagueActions.getSystemStats()

      expect(stats).toHaveProperty('leagues')
      expect(stats).toHaveProperty('tournaments')
      expect(stats).toHaveProperty('teams')
      expect(stats).toHaveProperty('players')
      expect(stats.leagues).toHaveProperty('active')
      expect(stats.leagues).toHaveProperty('total')
    })

    it('counts active leagues correctly', async () => {
      const mockLeagues = [
        { id: '1', is_active: true },
        { id: '2', is_active: true },
        { id: '3', is_active: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockLeagues,
              count: 3,
            }),
          }),
          eq: vi.fn().mockResolvedValue({
            count: 0,
          }),
        }),
      })

      const stats = await leagueActions.getSystemStats()

      expect(stats.leagues.active).toBe(2)
      expect(stats.leagues.total).toBe(3)
    })
  })
})
