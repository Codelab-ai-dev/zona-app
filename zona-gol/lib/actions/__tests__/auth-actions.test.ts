import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authActions } from '../auth-actions'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    setSession: vi.fn(),
  },
  from: vi.fn(),
}

// Mock auth store
const mockAuthStore = {
  getState: vi.fn(),
  setLoading: vi.fn(),
  setUser: vi.fn(),
  setSession: vi.fn(),
  setProfile: vi.fn(),
  setError: vi.fn(),
  signOut: vi.fn(),
}

// Mock modules
vi.mock('../../supabase/client', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}))

vi.mock('../../stores/auth-store', () => ({
  useAuthStore: {
    getState: () => mockAuthStore.getState(),
  },
}))

describe('auth-actions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Default mock implementations
    mockAuthStore.getState.mockReturnValue({
      isAuthenticated: false,
      user: null,
      session: null,
      profile: null,
      setLoading: mockAuthStore.setLoading,
      setUser: mockAuthStore.setUser,
      setSession: mockAuthStore.setSession,
      setProfile: mockAuthStore.setProfile,
      setError: mockAuthStore.setError,
      signOut: mockAuthStore.signOut,
    })
  })

  describe('initialize', () => {
    it('skips initialization when session already exists', async () => {
      mockAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        user: { id: 'user-1' },
        session: { access_token: 'token' },
        setLoading: mockAuthStore.setLoading,
        setUser: mockAuthStore.setUser,
        setSession: mockAuthStore.setSession,
        setProfile: mockAuthStore.setProfile,
        setError: mockAuthStore.setError,
      })

      await authActions.initialize()

      expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled()
    })

    it('initializes auth state with session and profile', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      }

      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'public',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      await authActions.initialize()

      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(true)
      expect(mockAuthStore.setSession).toHaveBeenCalledWith(mockSession)
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockSession.user)
      expect(mockAuthStore.setProfile).toHaveBeenCalledWith(mockProfile)
      expect(mockAuthStore.setError).toHaveBeenCalledWith(null)
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false)
    })

    it('handles session error gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      await authActions.initialize()

      expect(mockAuthStore.setError).toHaveBeenCalledWith('Session error')
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false)
    })

    it('handles profile error without blocking auth', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      })

      await authActions.initialize()

      expect(mockAuthStore.setSession).toHaveBeenCalledWith(mockSession)
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockSession.user)
      expect(mockAuthStore.setProfile).not.toHaveBeenCalled()
      expect(mockAuthStore.setError).toHaveBeenCalledWith(null)
    })
  })

  describe('signIn', () => {
    it('signs in user and fetches profile', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      const mockSession = { access_token: 'token', user: mockUser }
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'public',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      const result = await authActions.signIn('test@example.com', 'password123')

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockUser)
      expect(mockAuthStore.setSession).toHaveBeenCalledWith(mockSession)
      expect(mockAuthStore.setProfile).toHaveBeenCalledWith(mockProfile)
      expect(result).toEqual({ user: mockUser, session: mockSession })
    })

    it('handles sign in error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials'),
      })

      await expect(authActions.signIn('test@example.com', 'wrong')).rejects.toThrow()
      // setError is called twice: first with null, then with error message
      expect(mockAuthStore.setError).toHaveBeenLastCalledWith('Invalid credentials')
    })

    it('sets loading states correctly', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: { access_token: 'token' } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          }),
        }),
      })

      await authActions.signIn('test@example.com', 'password')

      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(true)
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false)
    })
  })

  describe('signUp', () => {
    it('signs up new user and creates profile', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      })

      const result = await authActions.signUp('test@example.com', 'password123', {
        name: 'Test User',
        role: 'public',
      })

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
            role: 'public',
          },
        },
      })
      expect(result).toEqual({ user: mockUser })
    })

    it('handles sign up error', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: new Error('Email already exists'),
      })

      await expect(
        authActions.signUp('test@example.com', 'password', { name: 'Test' })
      ).rejects.toThrow()
      expect(mockAuthStore.setError).toHaveBeenLastCalledWith('Email already exists')
    })

    it('creates user profile with default values', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      const insertMock = vi.fn().mockResolvedValue({ error: null })

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
      })

      await authActions.signUp('test@example.com', 'password', {})

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          name: '',
          role: 'public',
          is_active: true,
        })
      )
    })
  })

  describe('signOut', () => {
    it('signs out user successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      await authActions.signOut()

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(mockAuthStore.signOut).toHaveBeenCalled()
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false)
    })

    it('ignores "Auth session missing" error', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Auth session missing', name: 'AuthSessionMissingError' },
      })

      await authActions.signOut()

      expect(mockAuthStore.signOut).toHaveBeenCalled()
    })

    it('clears local state even on error', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(new Error('Network error'))

      await authActions.signOut()

      expect(mockAuthStore.signOut).toHaveBeenCalled()
    })
  })

  describe('updateProfile', () => {
    it('updates user profile', async () => {
      const mockUser = { id: 'user-1' }
      const updatedProfile = {
        id: 'user-1',
        name: 'Updated Name',
        phone: '123456789',
      }

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        setLoading: mockAuthStore.setLoading,
        setError: mockAuthStore.setError,
        setProfile: mockAuthStore.setProfile,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await authActions.updateProfile({ name: 'Updated Name' })

      expect(mockAuthStore.setProfile).toHaveBeenCalledWith(updatedProfile)
      expect(result).toEqual(updatedProfile)
    })

    it('throws error when user not authenticated', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
        setLoading: mockAuthStore.setLoading,
        setError: mockAuthStore.setError,
      })

      await expect(authActions.updateProfile({ name: 'Test' })).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('handles update error', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: { id: 'user-1' },
        setLoading: mockAuthStore.setLoading,
        setError: mockAuthStore.setError,
        setProfile: mockAuthStore.setProfile,
      })

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

      await expect(authActions.updateProfile({ name: 'Test' })).rejects.toThrow()
      expect(mockAuthStore.setError).toHaveBeenLastCalledWith('Update failed')
    })
  })

  describe('getProfile', () => {
    it('gets profile by user ID', async () => {
      const mockProfile = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      const result = await authActions.getProfile('user-1')

      expect(result).toEqual(mockProfile)
    })

    it('gets profile for current user when no ID provided', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: { id: 'user-1' },
      })

      const mockProfile = { id: 'user-1', name: 'Test' }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      const result = await authActions.getProfile()

      expect(result).toEqual(mockProfile)
    })

    it('throws error when no user ID available', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
      })

      await expect(authActions.getProfile()).rejects.toThrow('User ID required')
    })
  })

  describe('resetPassword', () => {
    it('sends password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      })

      await authActions.resetPassword('test@example.com')

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      )
      expect(mockAuthStore.setError).toHaveBeenCalledWith(null)
    })

    it('handles reset password error', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: new Error('Email not found'),
      })

      await expect(authActions.resetPassword('test@example.com')).rejects.toThrow()
      expect(mockAuthStore.setError).toHaveBeenLastCalledWith('Email not found')
    })
  })

  describe('updatePassword', () => {
    it('updates user password', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null,
      })

      await authActions.updatePassword('newpassword123')

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
    })

    it('handles password update error', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: new Error('Password too weak'),
      })

      await expect(authActions.updatePassword('weak')).rejects.toThrow()
      expect(mockAuthStore.setError).toHaveBeenLastCalledWith('Password too weak')
    })
  })

  describe('createUser', () => {
    it('creates new user and restores admin session', async () => {
      const currentSession = {
        access_token: 'admin-token',
        refresh_token: 'admin-refresh',
      }

      const newUser = { id: 'new-user-1', email: 'newuser@example.com' }
      const newProfile = {
        id: 'new-user-1',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'team_owner',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: currentSession },
        error: null,
      })

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      })

      mockSupabaseClient.auth.setSession.mockResolvedValue({
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: newProfile,
              error: null,
            }),
          }),
        }),
      })

      const result = await authActions.createUser({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'team_owner',
      })

      expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'admin-token',
        refresh_token: 'admin-refresh',
      })
      expect(result.profile).toEqual(newProfile)
      expect(result.credentials).toEqual({
        email: 'newuser@example.com',
        password: 'password123',
      })
    })

    it('throws error when no admin session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      await expect(
        authActions.createUser({
          email: 'test@example.com',
          password: 'password',
          name: 'Test',
          role: 'public',
        })
      ).rejects.toThrow('No hay sesión activa de super admin')
    })
  })

  describe('getAllProfiles', () => {
    it('gets all user profiles ordered by creation date', async () => {
      const mockProfiles = [
        { id: 'user-1', name: 'User 1', created_at: '2024-01-02' },
        { id: 'user-2', name: 'User 2', created_at: '2024-01-01' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      })

      const result = await authActions.getAllProfiles()

      expect(result).toEqual(mockProfiles)
    })

    it('returns empty array on error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      await expect(authActions.getAllProfiles()).rejects.toThrow()
    })
  })

  describe('updateProfileById', () => {
    it('updates another user profile by ID', async () => {
      const updatedProfile = {
        id: 'user-1',
        name: 'Updated Name',
        role: 'league_admin',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await authActions.updateProfileById('user-1', {
        name: 'Updated Name',
      })

      expect(result).toEqual(updatedProfile)
    })

    it('handles update error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'User not found' },
              }),
            }),
          }),
        }),
      })

      await expect(
        authActions.updateProfileById('user-1', { name: 'Test' })
      ).rejects.toThrow()
    })
  })

  describe('assignLeagueToCurrentUser', () => {
    it('assigns league to current user', async () => {
      const mockUser = { id: 'user-1' }
      const updatedProfile = {
        id: 'user-1',
        league_id: 'league-1',
      }

      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        setProfile: mockAuthStore.setProfile,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await authActions.assignLeagueToCurrentUser('league-1')

      expect(result).toEqual(updatedProfile)
      expect(mockAuthStore.setProfile).toHaveBeenCalledWith(updatedProfile)
    })

    it('throws error when user not authenticated', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
      })

      await expect(authActions.assignLeagueToCurrentUser('league-1')).rejects.toThrow(
        'User not authenticated'
      )
    })
  })
})
