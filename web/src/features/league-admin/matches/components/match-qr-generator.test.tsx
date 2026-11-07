import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { match1 } from '../test-fixtures'
import { MatchQRGenerator } from './match-qr-generator'

// Expose the QR value so the exact payload can be asserted.
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr" data-value={value} />,
}))

afterEach(() => vi.useRealTimers())

describe('MatchQRGenerator', () => {
  it('encodes the exact scanner payload (type, version, match_id, match_info, timestamp)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-20T12:00:00.000Z'))
    mockApi({ 'GET /matches/match-1': { body: match1 } })

    renderWithProviders(
      <MatchQRGenerator match={match1} tournamentName="Torneo Apertura" leagueSlug="liga-principal" open onOpenChange={() => {}} />,
    )

    expect(JSON.parse(screen.getByTestId('qr').dataset.value!)).toEqual({
      type: 'zona_gol_match',
      version: '1.0',
      match_id: 'match-1',
      match_info: {
        home_team: 'Tigres FC',
        away_team: 'Leones United',
        date: '2024-06-15',
        time: '15:00',
        tournament: 'Torneo Apertura',
        league_slug: 'liga-principal',
      },
      timestamp: '2024-06-20T12:00:00.000Z',
    })
    expect(screen.getByRole('heading', { name: /código qr/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descargar qr/i })).toBeInTheDocument()
  })

  it('falls back to 00:00 when the match has no time yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-20T12:00:00.000Z'))
    const bare = { ...match1, match_time: undefined }
    mockApi({ 'GET /matches/match-1': { body: bare } })

    renderWithProviders(<MatchQRGenerator match={bare} tournamentName="T" leagueSlug="l" open onOpenChange={() => {}} />)

    const payload = JSON.parse(screen.getByTestId('qr').dataset.value!) as { match_info: Record<string, string> }
    expect(payload.match_info).toMatchObject({ home_team: 'Tigres FC', away_team: 'Leones United', time: '00:00' })
  })
})
