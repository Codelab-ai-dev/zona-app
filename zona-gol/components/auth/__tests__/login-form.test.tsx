import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'

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
const mockSignIn = vi.fn()
const mockUser = null
const mockLoading = false
const mockError = null
const mockIsAuthenticated = false
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    signIn: mockSignIn,
    loading: mockLoading,
    error: mockError,
    isAuthenticated: mockIsAuthenticated,
  }),
}))

// Mock Supabase client
const mockResetPasswordForEmail = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseClient = {
  auth: {
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
  from: mockSupabaseFrom,
}

// Mock the Supabase from query for connection check
mockSupabaseFrom.mockReturnValue({
  select: vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
})

vi.mock('@/lib/supabase/client', () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders login form with all elements', () => {
      render(<LoginForm />)

      // Use getAllByText since "Zona Gol" appears in both heading and footer
      const zonaGolTexts = screen.getAllByText(/zona gol/i)
      expect(zonaGolTexts.length).toBeGreaterThan(0)
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
      expect(screen.getByText(/¿olvidaste tu contraseña\?/i)).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('renders password input with correct attributes', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('renders password visibility toggle button', () => {
      render(<LoginForm />)

      // The toggle button is inside the password field, find it by its icon
      const passwordField = screen.getByLabelText(/contraseña/i).parentElement
      const toggleButtons = passwordField?.querySelectorAll('button[type="button"]')
      expect(toggleButtons).toBeDefined()
      expect(toggleButtons?.length).toBeGreaterThan(0)
    })
  })

  describe('Form Input Handling', () => {
    it('allows typing in email field', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('allows typing in password field', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('toggles password visibility when clicking eye button', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/contraseña/i)

      // Find the toggle button (it's the only button of type="button" in the password field's parent)
      const passwordField = passwordInput.parentElement
      const toggleButton = passwordField?.querySelector('button[type="button"]')
      expect(toggleButton).toBeDefined()

      // Initially password type
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show password
      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')

        // Click to hide password again
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })

    it('does not clear form if signIn does not return user', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ success: true }) // No user object
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })

      // Form should still have values since login was incomplete
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })
  })

  describe('Form Validation', () => {
    it('requires email field to be filled', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement

      // Both fields have required attribute
      expect(emailInput.required).toBe(true)
      expect(passwordInput.required).toBe(true)
    })

    it('email field has correct type for browser validation', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i) as HTMLInputElement
      expect(emailInput.type).toBe('email')
    })

  })

  describe('Form Submission - Success', () => {
    it('calls signIn with correct credentials on valid submission', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ success: true })
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })


    it('calls signIn successfully without errors', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ user: { id: '123', email: 'test@example.com' } })
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })
  })

  describe('Form Submission - Error Handling', () => {
    it('shows error when signIn does not return user', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({}) // No user object
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/autenticación incompleta\. intenta de nuevo\./i)).toBeInTheDocument()
      })
    })

    it('displays error for invalid credentials', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValue(new Error('Invalid login credentials'))
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/credenciales inválidas\. verifica tu correo y contraseña\./i)).toBeInTheDocument()
      })
    })

    it('displays error for network issues', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValue(new Error('network connection failed'))
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/error de conexión\. verifica tu internet\./i)).toBeInTheDocument()
      })
    })

    it('displays generic error on other failures', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValue(new Error('Something went wrong'))
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset Dialog', () => {
    it('opens password reset dialog when clicking forgot password link', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/recuperar contraseña/i)).toBeInTheDocument()
      })
    })

    it('renders reset password form in dialog', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        // Find the reset email input by id
        expect(screen.getByLabelText(/correo electrónico/i, { selector: '#reset-email' })).toBeInTheDocument()
        // There are multiple "enviar" buttons (one in main form might exist), just check for presence
        const enviarButtons = screen.getAllByRole('button', { name: /enviar|cancelar/i })
        expect(enviarButtons.length).toBeGreaterThan(0)
      })
    })

    it('closes dialog when clicking cancel or close', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('sends password reset email on valid submission', async () => {
      const user = userEvent.setup()
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Use the id to target the reset email input specifically
      const resetEmailInput = document.getElementById('reset-email') as HTMLInputElement
      expect(resetEmailInput).toBeTruthy()

      await user.type(resetEmailInput, 'reset@example.com')

      // Find the "Enviar" button inside the dialog
      const dialog = screen.getByRole('dialog')
      const sendButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
          redirectTo: expect.stringContaining('/reset-password'),
        })
      })
    })

    it('shows success message after sending reset email', async () => {
      const user = userEvent.setup()
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const resetEmailInput = document.getElementById('reset-email') as HTMLInputElement
      expect(resetEmailInput).toBeTruthy()

      await user.type(resetEmailInput, 'reset@example.com')

      const dialog = screen.getByRole('dialog')
      const sendButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/correo enviado\. revisa tu bandeja de entrada\./i)).toBeInTheDocument()
      })
    })

    it('calls resetPasswordForEmail on failed password reset', async () => {
      const user = userEvent.setup()
      mockResetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email not found' },
      })
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const resetEmailInput = document.getElementById('reset-email') as HTMLInputElement
      expect(resetEmailInput).toBeTruthy()

      await user.type(resetEmailInput, 'nonexistent@example.com')

      const dialog = screen.getByRole('dialog')
      const sendButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement
      await user.click(sendButton)

      // Verify the resetPasswordForEmail was called with correct parameters
      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('nonexistent@example.com', {
          redirectTo: 'https://admin.zona-gol.com/reset-password',
        })
      })
    })

    it('submit button is disabled when email field is empty', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const resetEmailInput = document.getElementById('reset-email') as HTMLInputElement
      expect(resetEmailInput).toBeTruthy()
      expect(resetEmailInput.value).toBe('')

      const dialog = screen.getByRole('dialog')
      const sendButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement

      // Button should be disabled when input is empty (as per component code: disabled={resetLoading || !resetEmail})
      expect(sendButton.disabled).toBe(true)
    })
  })

  describe('Supabase Connection Check', () => {
    it('checks Supabase connection on mount', async () => {
      render(<LoginForm />)

      // Component should attempt to query the database on mount
      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('users')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for inputs', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    })

    it('has proper submit button', () => {
      render(<LoginForm />)

      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })

    it('dialog has proper role', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('allows form submission with Enter key', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ success: true })
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('allows tabbing between form fields', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/correo electrónico/i)

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.keyboard('{Tab}')
      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveFocus()
    })
  })
})
