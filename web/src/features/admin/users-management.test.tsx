import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockApi } from '@/test/render'
import { UsersManagement } from './components/users-management'

const mockUser = {
  id: '1',
  name: 'Juan Pérez',
  email: 'juan@example.com',
  phone: '+52 555 1234567',
  role: 'league_admin' as const,
  league_id: 'league1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockUser2 = {
  id: '2',
  name: 'María García',
  email: 'maria@example.com',
  phone: '+52 555 7654321',
  role: 'team_owner' as const,
  league_id: 'league2',
  is_active: true,
  created_at: '2024-01-02T00:00:00Z',
}

describe('UsersManagement', () => {
  beforeEach(() => {
    mockApi({
      'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
      'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
    })
  })

  describe('list with pagination', () => {
    it('renders users list with total from pagination', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser, mockUser2],
            page: { limit: 100, offset: 0, total: 2 },
          },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
        expect(screen.getByText('María García')).toBeInTheDocument()
      })
    })

    it('renders empty state when no users', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('No hay información para mostrar')).toBeInTheDocument()
      })
    })

    it('displays user details correctly in table', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('juan@example.com')).toBeInTheDocument()
        expect(screen.getByText(/league admin/i)).toBeInTheDocument()
        expect(screen.getByText('+52 555 1234567')).toBeInTheDocument()
        expect(screen.getByText('Activo')).toBeInTheDocument()
      })
    })
  })

  describe('create user', () => {
    it('opens create dialog on button click', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
      })
      renderWithProviders(<UsersManagement />)

      const newUserButton = screen.getByRole('button', { name: /Nuevo Usuario/i })
      fireEvent.click(newUserButton)

      await waitFor(() => {
        expect(screen.getByText('Crear Usuario')).toBeInTheDocument()
      })
    })

    it('successfully creates a user', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [mockUser], page: { limit: 100, offset: 0, total: 1 } } },
        'GET /leagues/admin': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
        'POST /admin/users': { status: 200, body: mockUser },
      })
      renderWithProviders(<UsersManagement />)

      const newUserButton = screen.getByRole('button', { name: /Nuevo Usuario/i })
      fireEvent.click(newUserButton)

      await waitFor(() => {
        expect(screen.getByText('Crear Usuario')).toBeInTheDocument()
      })

      // Fill form with valid data
      fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), { target: { value: 'Juan Pérez' } })
      fireEvent.change(screen.getByPlaceholderText('juan@ejemplo.com'), { target: { value: 'juan@example.com' } })

      const passwordInputs = screen.getAllByPlaceholderText(/••••••••••/)
      if (passwordInputs[0]) {
        fireEvent.change(passwordInputs[0], { target: { value: 'securepass123' } })
      }
      if (passwordInputs[1]) {
        fireEvent.change(passwordInputs[1], { target: { value: 'securepass123' } })
      }

      const createButton = screen.getByRole('button', { name: /^Crear$/ })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.queryByText('Crear Usuario')).not.toBeInTheDocument()
      })
    })

    it('shows password/confirmation mismatch error', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
      })
      renderWithProviders(<UsersManagement />)

      const newUserButton = screen.getByRole('button', { name: /Nuevo Usuario/i })
      fireEvent.click(newUserButton)

      await waitFor(() => {
        expect(screen.getByText('Crear Usuario')).toBeInTheDocument()
      })

      // Fill form with mismatched passwords
      const inputs = screen.getAllByPlaceholderText(/••••••••••/)
      const passwordField = inputs[0]
      const confirmField = inputs[1]

      if (passwordField) {
        fireEvent.change(passwordField, { target: { value: 'securepass123' } })
      }
      if (confirmField) {
        fireEvent.change(confirmField, { target: { value: 'different123' } })
      }

      const createButton = screen.getByRole('button', { name: /^Crear$/ })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('no coincide')).toBeInTheDocument()
      })
    })

    it('shows 422 validation field errors', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
        'POST /admin/users': {
          status: 422,
          body: { error: { message: 'Validation error', fields: { email: 'formato inválido' } } },
        },
      })
      renderWithProviders(<UsersManagement />)

      const newUserButton = screen.getByRole('button', { name: /Nuevo Usuario/i })
      fireEvent.click(newUserButton)

      await waitFor(() => {
        expect(screen.getByText('Crear Usuario')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), { target: { value: 'Juan' } })
      fireEvent.change(screen.getByPlaceholderText('juan@ejemplo.com'), { target: { value: 'invalid-email' } })

      const passwordInputs = screen.getAllByPlaceholderText(/••••••••••/)
      if (passwordInputs[0]) {
        fireEvent.change(passwordInputs[0], { target: { value: 'securepass123' } })
      }
      if (passwordInputs[1]) {
        fireEvent.change(passwordInputs[1], { target: { value: 'securepass123' } })
      }

      const createButton = screen.getByRole('button', { name: /^Crear$/ })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('formato inválido')).toBeInTheDocument()
      })
    })

    it('shows 409 duplicate email error', async () => {
      mockApi({
        'GET /users': { status: 200, body: { data: [], page: { limit: 100, offset: 0, total: 0 } } },
        'POST /admin/users': {
          status: 409,
          body: { error: { message: 'Email already exists' } },
        },
      })
      renderWithProviders(<UsersManagement />)

      const newUserButton = screen.getByRole('button', { name: /Nuevo Usuario/i })
      fireEvent.click(newUserButton)

      await waitFor(() => {
        expect(screen.getByText('Crear Usuario')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), { target: { value: 'Juan Pérez' } })
      fireEvent.change(screen.getByPlaceholderText('juan@ejemplo.com'), { target: { value: 'juan@example.com' } })

      const passwordInputs = screen.getAllByPlaceholderText(/••••••••••/)
      if (passwordInputs[0]) {
        fireEvent.change(passwordInputs[0], { target: { value: 'securepass123' } })
      }
      if (passwordInputs[1]) {
        fireEvent.change(passwordInputs[1], { target: { value: 'securepass123' } })
      }

      const createButton = screen.getByRole('button', { name: /^Crear$/ })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('ya existe')).toBeInTheDocument()
      })
    })
  })

  describe('edit user', () => {
    it('opens edit dialog and shows user data', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(b => b.querySelector('svg'))
      fireEvent.click(editButton!)

      await waitFor(() => {
        expect(screen.getByText('Editar Usuario')).toBeInTheDocument()
      })
    })

    it('successfully updates a user', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'PATCH /admin/users/1': { status: 200, body: { ...mockUser, name: 'Juan Actualizado' } },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(b => b.querySelector('svg'))
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByText('Editar Usuario')).toBeInTheDocument()
      })

      const updateButton = screen.getByRole('button', { name: /Actualizar/ })
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(screen.queryByText('Editar Usuario')).not.toBeInTheDocument()
      })
    })

    it('shows 422 validation errors on edit', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'PATCH /admin/users/1': {
          status: 422,
          body: { error: { message: 'Validation error', fields: { email: 'Email inválido' } } },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(b => b.querySelector('svg'))
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByText('Editar Usuario')).toBeInTheDocument()
      })

      const updateButton = screen.getByRole('button', { name: /Actualizar/ })
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(screen.getByText('Email inválido')).toBeInTheDocument()
      })
    })

    it('shows 409 duplicate email error on edit', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'PATCH /admin/users/1': {
          status: 409,
          body: { error: { message: 'Email already exists' } },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button')
      const editButton = editButtons.find(b => b.querySelector('svg'))
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByText('Editar Usuario')).toBeInTheDocument()
      })

      const updateButton = screen.getByRole('button', { name: /Actualizar/ })
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(screen.getByText('ya existe')).toBeInTheDocument()
      })
    })
  })

  describe('deactivate user', () => {
    it('shows AlertDialog on deactivate button click', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const deactivateButtons = screen.getAllByRole('button')
      const deactivateButton = deactivateButtons[deactivateButtons.length - 1]
      if (deactivateButton) {
        fireEvent.click(deactivateButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Desactivar usuario/i)).toBeInTheDocument()
      })
    })

    it('successfully deactivates a user with confirmation', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'PATCH /admin/users/1': { status: 200, body: { ...mockUser, is_active: false } },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const allButtons = screen.getAllByRole('button')
      const deactivateButton = allButtons[allButtons.length - 1]
      if (deactivateButton) {
        fireEvent.click(deactivateButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Desactivar usuario/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Desactivar/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText(/Desactivar usuario/i)).not.toBeInTheDocument()
      })
    })

    it('cancels deactivation when alert is cancelled', async () => {
      mockApi({
        'GET /users': {
          status: 200,
          body: {
            data: [mockUser],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })
      renderWithProviders(<UsersManagement />)

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })

      const allButtons = screen.getAllByRole('button')
      const deactivateButton = allButtons[allButtons.length - 1]
      if (deactivateButton) {
        fireEvent.click(deactivateButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Desactivar usuario/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/Desactivar usuario/i)).not.toBeInTheDocument()
      })
    })
  })
})
