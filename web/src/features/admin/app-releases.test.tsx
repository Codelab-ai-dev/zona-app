import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockApi } from '@/test/render'
import { AppReleases } from './components/app-releases'

const mockLeague = {
  id: 'league1',
  name: 'Liga Premier',
  slug: 'liga-premier',
  description: 'Liga premier mexicana',
  admin_id: 'admin1',
  is_active: true,
  product_mode: 'full' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockRelease = {
  key: 'app_releases/league1/app-1.0.apk',
  filename: 'app-1.0.apk',
  size: 50 * 1024 * 1024,
  modified: '2024-01-01T00:00:00Z',
  is_public: true,
}

const mockRelease2 = {
  key: 'app_releases/league1/app-1.1.apk',
  filename: 'app-1.1.apk',
  size: 60 * 1024 * 1024,
  modified: '2024-01-02T00:00:00Z',
  is_public: true,
}

describe('AppReleases', () => {
  beforeEach(() => {
    mockApi({
      'GET /leagues/admin': {
        status: 200,
        body: {
          data: [mockLeague],
          page: { limit: 100, offset: 0, total: 1 },
        },
      },
      'GET /storage/objects': {
        status: 200,
        body: {
          data: [],
          page: { limit: 100, offset: 0, total: 0 },
        },
      },
    })
  })

  describe('upload validation', () => {
    it('rejects non-.apk files before calling API', async () => {
      renderWithProviders(<AppReleases />)

      await waitFor(() => {
        expect(screen.getByText('Gestión de Versiones APK')).toBeInTheDocument()
      })

      // Select a league first
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      // Create a non-APK file
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })

      const input = screen.getByDisplayValue('') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [file],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText('Solo se permiten archivos APK')).toBeInTheDocument()
      })
    })

    it('rejects files larger than 150MB before calling API', async () => {
      renderWithProviders(<AppReleases />)

      await waitFor(() => {
        expect(screen.getByText('Gestión de Versiones APK')).toBeInTheDocument()
      })

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      // Create a large file
      const largeFile = new File(['x'.repeat(151 * 1024 * 1024)], 'app-large.apk', { type: 'application/vnd.android.package-archive' })

      const input = screen.getByDisplayValue('') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [largeFile],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText('El archivo es demasiado grande (máximo 150MB)')).toBeInTheDocument()
      })
    })

    it('accepts valid .apk files', async () => {
      renderWithProviders(<AppReleases />)

      await waitFor(() => {
        expect(screen.getByText('Gestión de Versiones APK')).toBeInTheDocument()
      })

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      // Create a valid file
      const validFile = new File(['x'.repeat(50 * 1024 * 1024)], 'app-1.0.apk', { type: 'application/vnd.android.package-archive' })

      const input = screen.getByDisplayValue('') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [validFile],
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
        expect(screen.getByText(/50.* MB/)).toBeInTheDocument()
      })
    })
  })

  describe('list releases', () => {
    it('renders releases list for selected league', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease, mockRelease2],
            page: { limit: 100, offset: 0, total: 2 },
          },
        },
      })

      renderWithProviders(<AppReleases />)

      await waitFor(() => {
        expect(screen.getByText('Gestión de Versiones APK')).toBeInTheDocument()
      })

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
        expect(screen.getByText('app-1.1.apk')).toBeInTheDocument()
      })
    })

    it('displays empty state when no releases', async () => {
      renderWithProviders(<AppReleases />)

      await waitFor(() => {
        expect(screen.getByText('Gestión de Versiones APK')).toBeInTheDocument()
      })

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('No hay versiones disponibles para esta liga')).toBeInTheDocument()
      })
    })

    it('displays file size and modification date', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })

      renderWithProviders(<AppReleases />)

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
      })

      // Check that size is displayed (50 MB)
      expect(screen.getByText(/50.*MB/)).toBeInTheDocument()
    })
  })

  describe('download release', () => {
    it('downloads release using GET /storage/url', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/url': {
          status: 200,
          body: { url: 'https://storage.example.com/download-url' },
        },
      })

      renderWithProviders(<AppReleases />)

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
      })

      const downloadButtons = screen.getAllByRole('button')
      const downloadButton = downloadButtons.find(b => b.querySelector('svg'))
      if (downloadButton) {
        fireEvent.click(downloadButton)
      }

      await waitFor(() => {
        expect(screen.getByText('Descarga iniciada')).toBeInTheDocument()
      })
    })
  })

  describe('delete release', () => {
    it('shows confirmation dialog on delete button click', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })

      renderWithProviders(<AppReleases />)

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Eliminar APK/i)).toBeInTheDocument()
        expect(screen.getByText(/app-1.0.apk/)).toBeInTheDocument()
      })
    })

    it('deletes release with confirmation', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'DELETE /storage/objects': {
          status: 204,
        },
      })

      renderWithProviders(<AppReleases />)

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Eliminar APK/i)).toBeInTheDocument()
      })

      const confirmDeleteButton = screen.getByRole('button', { name: /Eliminar/i })
      fireEvent.click(confirmDeleteButton)

      await waitFor(() => {
        expect(screen.getByText('APK eliminado exitosamente')).toBeInTheDocument()
      })
    })

    it('cancels deletion when alert is cancelled', async () => {
      mockApi({
        'GET /leagues/admin': {
          status: 200,
          body: {
            data: [mockLeague],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
        'GET /storage/objects': {
          status: 200,
          body: {
            data: [mockRelease],
            page: { limit: 100, offset: 0, total: 1 },
          },
        },
      })

      renderWithProviders(<AppReleases />)

      // Select a league
      const leagueSelect = screen.getByDisplayValue('Elige una liga')
      fireEvent.click(leagueSelect)

      const leagueOption = screen.getByText('Liga Premier')
      fireEvent.click(leagueOption)

      await waitFor(() => {
        expect(screen.getByText('app-1.0.apk')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/Eliminar APK/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/Eliminar APK/i)).not.toBeInTheDocument()
      })
    })
  })
})
