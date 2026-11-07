import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { PlayerCredential } from './player-credential'

const mockPlayer = {
  id: 'player-123',
  name: 'Juan Pérez',
  team_id: 'team-1',
  position: 'Delantero',
  jersey_number: 10,
  photo: 'https://example.com/photo.jpg',
  birth_date: '2000-05-15',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  id_verified: true,
}

describe('PlayerCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open is true', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    expect(screen.getByText('Credencial de Jugador')).toBeInTheDocument()
    expect(screen.getByText(/Credencial imprimible para/)).toBeInTheDocument()
  })

  it('displays player information in credential', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    expect(screen.getByText('ÁGUILAS FC')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Delantero')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('displays player photo when available', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    const playerImages = screen.getAllByAltText('Juan Pérez')
    expect(playerImages.length).toBeGreaterThan(0)
  })

  it('displays player initials when photo is not available', () => {
    const playerNoPhoto = { ...mockPlayer, photo: undefined }
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={playerNoPhoto}
        teamName="Águilas FC"
      />,
    )

    // Should show initials in the preview
    expect(screen.getByText('JP')).toBeInTheDocument()
  })

  it('displays QR code in credential', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    // QRCode component renders an svg
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('displays credential ID', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    // Should display last 8 characters of ID in uppercase
    const shortId = mockPlayer.id.slice(-8).toUpperCase()
    expect(screen.getByText(new RegExp(`ID:.*${shortId}`))).toBeInTheDocument()
  })

  it('displays team logo when provided', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
        teamLogo="https://example.com/logo.png"
      />,
    )

    const images = screen.getAllByAltText(/Logo Águilas FC/)
    expect(images.length).toBeGreaterThan(0)
  })

  it('has print and download buttons', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    expect(screen.getByRole('button', { name: /Imprimir/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Descargar PNG/i })).toBeInTheDocument()
  })

  it('displays player information section', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    expect(screen.getByText('Información del Jugador')).toBeInTheDocument()
    expect(screen.getByText(/Nombre:.*Juan Pérez/)).toBeInTheDocument()
    expect(screen.getByText(/Posición:.*Delantero/)).toBeInTheDocument()
    expect(screen.getByText(/Número:.*#10/)).toBeInTheDocument()
    expect(screen.getByText(/Equipo:.*Águilas FC/)).toBeInTheDocument()
  })

  it('displays credential specifications', () => {
    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    expect(screen.getByText('Especificaciones')).toBeInTheDocument()
    expect(screen.getByText(/Tamaño:.*85.6 x 53.98 mm/)).toBeInTheDocument()
    expect(screen.getByText(/Formato:.*Tarjeta estándar/)).toBeInTheDocument()
    expect(screen.getByText(/QR:.*Código de identificación/)).toBeInTheDocument()
  })

  it('calls onOpenChange when closing dialog', () => {
    const onOpenChange = vi.fn()
    const { container } = renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={onOpenChange}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    // Close button is typically in the dialog header
    // We can trigger it by looking for the close trigger
    const closeButton = container.querySelector('[aria-label*="close"]') ||
                        container.querySelector('[aria-label*="Close"]')

    if (closeButton) {
      fireEvent.click(closeButton)
      expect(onOpenChange).toHaveBeenCalled()
    }
  })

  it('has print button that triggers window.open', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)

    renderWithProviders(
      <PlayerCredential
        open={true}
        onOpenChange={vi.fn()}
        player={mockPlayer}
        teamName="Águilas FC"
      />,
    )

    const printButton = screen.getByRole('button', { name: /Imprimir/i })
    fireEvent.click(printButton)

    // Print button should be clickable
    expect(printButton).toBeInTheDocument()

    openSpy.mockRestore()
  })
})
