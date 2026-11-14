import { screen, within, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { renderWithProviders } from '@/test/render'

import type { Player } from '../types'
import { buildPlayerQrPayload } from './credential-qr'
import { PlayerCredential } from './player-credential'

const html2canvasMock = vi.hoisted(() => vi.fn())
vi.mock('html2canvas-pro', () => ({ default: html2canvasMock }))

// Capture the exact string encoded in the QR instead of decoding an SVG.
const qrValues = vi.hoisted(() => [] as string[])
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) => {
    qrValues.push(value)
    return <svg data-testid="qr" data-value={value} />
  },
}))

const player: Player = {
  id: '3f2b8c1e-7a44-4d55-9b0e-a1b2c3d4e5f6',
  name: 'Juan Pérez Ñandú',
  team_id: '0a1b2c3d-1111-2222-3333-444455556666',
  position: 'Delantero',
  jersey_number: 10,
  photo: 'https://example.com/photo.jpg',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  id_verified: true,
}

function renderCredential(props: Partial<React.ComponentProps<typeof PlayerCredential>> = {}) {
  return renderWithProviders(
    <PlayerCredential open onOpenChange={vi.fn()} player={player} teamName="Águilas FC" {...props} />,
  )
}

afterEach(() => {
  qrValues.length = 0
  html2canvasMock.mockReset()
})

describe('player QR payload', () => {
  it('is exactly the JSON the mobile apps parse (player_id, normalized name, team_id, jersey_number)', () => {
    const payload = buildPlayerQrPayload(player, {
      leagueId: '9z-league',
      now: new Date('2025-03-01T10:20:30.000Z'),
    })

    expect(payload).toBe(
      '{"type":"player_verification",' +
        '"player_id":"3f2b8c1e-7a44-4d55-9b0e-a1b2c3d4e5f6",' +
        '"player_name":"JUAN PEREZ NANDU",' +
        '"team_id":"0a1b2c3d-1111-2222-3333-444455556666",' +
        '"jersey_number":10,' +
        '"league_id":"9z-league",' +
        '"timestamp":"2025-03-01T10:20:30.000Z",' +
        '"version":"1.0"}',
    )
  })

  it('omits league_id when unknown and keeps the fields the scanners require', () => {
    const parsed = JSON.parse(buildPlayerQrPayload(player, { now: new Date('2025-03-01T00:00:00Z') }))

    expect(parsed).not.toHaveProperty('league_id')
    expect(parsed.player_id).toBe(player.id)
    expect(parsed.team_id).toBe(player.team_id)
    expect(typeof parsed.jersey_number).toBe('number')
  })

  it('is what the credential renders in its QR code', () => {
    renderCredential({ leagueId: 'league-1' })

    const value = screen.getByTestId('qr').getAttribute('data-value') ?? ''
    expect(JSON.parse(value)).toMatchObject({
      type: 'player_verification',
      player_id: player.id,
      player_name: 'JUAN PEREZ NANDU',
      team_id: player.team_id,
      jersey_number: 10,
      league_id: 'league-1',
      version: '1.0',
    })
    // never the old pipe format that mobile rejects
    expect(value).not.toContain('|')
  })

  it('does not change when the component re-renders later', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-03-01T10:00:00Z'))
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user } = renderCredential()
    const before = screen.getByTestId('qr').getAttribute('data-value')
    vi.setSystemTime(new Date('2025-03-01T10:05:00Z'))

    // clicking "Imprimir" toggles state, which re-renders the card
    await user.click(screen.getByRole('button', { name: 'Imprimir' }))

    expect(await screen.findByText('Error al imprimir la credencial')).toBeInTheDocument()
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe(before)
    expect(before).toContain('2025-03-01T10:00:00.000Z')
    vi.useRealTimers()
  })
})

describe('PlayerCredential', () => {
  it('shows the card with team, player, position, jersey, photo and short id', () => {
    renderCredential({ teamLogo: 'https://example.com/logo.png' })

    const card = screen.getByTestId('credential-card')
    expect(within(card).getByText('ÁGUILAS FC')).toBeInTheDocument()
    expect(within(card).getByText('Juan Pérez Ñandú')).toBeInTheDocument()
    expect(within(card).getByText('Delantero')).toBeInTheDocument()
    expect(within(card).getByText('10')).toBeInTheDocument()
    expect(within(card).getByAltText('Juan Pérez Ñandú')).toHaveAttribute('src', player.photo)
    expect(within(card).getByAltText('Logo Águilas FC')).toBeInTheDocument()
    expect(within(card).getByText(`ID: ${player.id.slice(-8).toUpperCase()}`)).toBeInTheDocument()
  })

  it('shows initials when the player has no photo', () => {
    renderCredential({ player: { ...player, photo: undefined } })

    expect(within(screen.getByTestId('credential-card')).getByText('JP')).toBeInTheDocument()
  })

  it('lists player data and specifications', () => {
    renderCredential()

    const info = screen.getByRole('region', { name: 'Información del Jugador' })
    expect(within(info).getByText('Nombre:').nextSibling).toHaveTextContent('Juan Pérez Ñandú')
    expect(within(info).getByText('Número:').nextSibling).toHaveTextContent('#10')
    expect(within(info).getByText('Equipo:').nextSibling).toHaveTextContent('Águilas FC')
    const specs = screen.getByRole('region', { name: 'Especificaciones' })
    expect(within(specs).getByText('Tamaño:').nextSibling).toHaveTextContent('85.6 x 53.98 mm')
    expect(within(specs).getByText('Logo:').nextSibling).toHaveTextContent('No disponible')
  })

  it('opens a print window with the credential, QR and escaped player data, then prints', async () => {
    const written: string[] = []
    const fakeWindow = {
      document: { write: (html: string) => written.push(html), close: vi.fn() },
      print: vi.fn(),
      close: vi.fn(),
      onload: null as (() => void) | null,
    }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window)
    const { user } = renderCredential({ player: { ...player, name: 'Ana <b>"X"</b>' } })

    await user.click(screen.getByRole('button', { name: 'Imprimir' }))

    expect(openSpy).toHaveBeenCalledWith('', '_blank')
    const html = written.join('')
    expect(html).toContain('CREDENCIAL OFICIAL')
    expect(html).toContain('ÁGUILAS FC')
    expect(html).toContain('<svg')
    expect(html).toContain('Ana &lt;b&gt;&quot;X&quot;&lt;/b&gt;')
    expect(html).not.toContain('<b>')
    expect(fakeWindow.document.close).toHaveBeenCalled()

    // the window prints and closes once its content has loaded
    expect(fakeWindow.print).not.toHaveBeenCalled()
    fakeWindow.onload?.()
    expect(fakeWindow.print).toHaveBeenCalledTimes(1)
    expect(fakeWindow.close).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled())
  })

  it('tells the user when the browser blocks the print window', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user } = renderCredential()

    await user.click(screen.getByRole('button', { name: 'Imprimir' }))

    expect(await screen.findByText('Error al imprimir la credencial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled()
  })

  it('downloads the card as a PNG named after the player and confirms', async () => {
    html2canvasMock.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,AAAA' })
    const clicked: { download: string; href: string }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href })
    })
    const { user } = renderCredential()

    await user.click(screen.getByRole('button', { name: 'Descargar PNG' }))

    expect(await screen.findByText('Credencial descargada exitosamente')).toBeInTheDocument()
    expect(html2canvasMock).toHaveBeenCalledWith(screen.getByTestId('credential-card'), expect.objectContaining({ scale: 4 }))
    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.download).toMatch(/^credencial-Juan_Pérez_Ñandú-\d+\.png$/)
    expect(clicked[0]?.href).toBe('data:image/png;base64,AAAA')
  })

  it('shows an error toast when the image cannot be generated', async () => {
    html2canvasMock.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user } = renderCredential()

    await user.click(screen.getByRole('button', { name: 'Descargar PNG' }))

    expect(await screen.findByText('Error al descargar la credencial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar PNG' })).toBeEnabled()
  })

  it('asks the parent to close when the dialog is dismissed', async () => {
    const onOpenChange = vi.fn()
    const { user } = renderCredential({ onOpenChange })

    await user.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
