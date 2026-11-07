import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { PlayoffBracket } from './playoff-bracket'
import type { Match } from './types'

describe('PlayoffBracket', () => {
  const mockPlayoffMatches: Match[] = [
    {
      id: 'match-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T10:00:00Z',
      match_time: '10:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 1,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-2',
      tournament_id: 'tour-1',
      home_team_id: 'team-3',
      away_team_id: 'team-4',
      home_score: 0,
      away_score: 0,
      match_date: '2024-02-01T12:00:00Z',
      match_time: '12:00',
      status: 'scheduled',
      phase: 'playoffs',
      playoff_round: 'semifinals',
      playoff_position: 2,
      is_published: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'match-3',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-3',
      home_score: 2,
      away_score: 1,
      match_date: '2024-02-08T10:00:00Z',
      match_time: '10:00',
      status: 'finished',
      phase: 'playoffs',
      playoff_round: 'final',
      playoff_position: 1,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-08T00:00:00Z',
    },
  ]

  it('renders playoff bracket with matches grouped by round', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('displays match details correctly for finished matches', () => {
    renderWithProviders(<PlayoffBracket matches={mockPlayoffMatches} />)

    expect(screen.getByText('2 - 1')).toBeInTheDocument()
  })

  it('shows empty state when no playoff matches', () => {
    renderWithProviders(<PlayoffBracket matches={[]} />)

    expect(screen.getByText('No hay partidos de llave generados')).toBeInTheDocument()
  })

  it('filters to show only playoff matches', () => {
    const regularMatch: Match = {
      id: 'regular-1',
      tournament_id: 'tour-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_score: 1,
      away_score: 1,
      match_date: '2024-01-01T10:00:00Z',
      match_time: '10:00',
      status: 'finished' as const,
      phase: 'regular' as const,
      is_published: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const mixedMatches: Match[] = [...mockPlayoffMatches, regularMatch]

    renderWithProviders(<PlayoffBracket matches={mixedMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('displays all playoff rounds correctly', () => {
    const allRounds: Match[] = [
      {
        id: 'qf-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-01T10:00:00Z',
        match_time: '10:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'quarterfinals',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tp-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-5',
        away_team_id: 'team-6',
        home_score: 0,
        away_score: 0,
        match_date: '2024-02-15T14:00:00Z',
        match_time: '14:00',
        status: 'scheduled',
        phase: 'playoffs',
        playoff_round: 'third_place',
        playoff_position: 1,
        is_published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={allRounds} />)

    expect(screen.getByText('Cuartos de Final')).toBeInTheDocument()
    expect(screen.getByText('Tercer Lugar')).toBeInTheDocument()
  })

  it('handles matches with home and away legs', () => {
    const legMatches: Match[] = [
      {
        id: 'semi-1-1',
        tournament_id: 'tour-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        home_score: 1,
        away_score: 0,
        match_date: '2024-02-05T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'first',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-05T00:00:00Z',
      },
      {
        id: 'semi-1-2',
        tournament_id: 'tour-1',
        home_team_id: 'team-2',
        away_team_id: 'team-1',
        home_score: 1,
        away_score: 1,
        match_date: '2024-02-12T10:00:00Z',
        match_time: '10:00',
        status: 'finished',
        phase: 'playoffs',
        playoff_round: 'semifinals',
        playoff_position: 1,
        leg: 'second',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-12T00:00:00Z',
      },
    ]

    renderWithProviders(<PlayoffBracket matches={legMatches} />)

    expect(screen.getByText('Semifinales')).toBeInTheDocument()
    expect(screen.getByText('1 - 0')).toBeInTheDocument()
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
  })
})
