import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { apiError, list, mineOne, standing, tournament } from '../test-fixtures'
import { HomePage } from './home'

const team = (over: Record<string, unknown> = {}) => ({
  id: 'team-1',
  name: 'Tigres',
  slug: 'tigres',
  league_id: 'league-1',
  owner_id: 'o',
  is_active: true,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...over,
})

const match = {
  id: 'm1',
  tournament_id: 'tour-1',
  home_team_id: 'team-1',
  away_team_id: 'team-2',
  home_score: 0,
  away_score: 0,
  match_date: '2026-03-10T00:00:00Z',
  status: 'scheduled',
  phase: 'regular',
  is_published: true,
  created_at: '',
  updated_at: '',
  home_team_name: 'Tigres',
  away_team_name: 'Leones',
}

describe('Home (liga-admin)', () => {
  it('shows the active tournament, recent teams, upcoming matches and the top standings', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([tournament()]),
      'GET /teams': list([team(), team({ id: 'team-2', name: 'Leones', is_active: false })]),
      'GET /tournaments/tour-1/matches': list([match], 14),
      'GET /tournaments/tour-1/matches/upcoming': list([match]),
      'GET /leagues/league-1/players/verification/summary': { body: { total: 37, pending: 0, verified: 0, no_document: 0 } },
      'GET /tournaments/tour-1/standings': list([standing(), standing({ team_id: 't2', team_name: 'Panteras', position: 2, points: 9 })]),
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Torneo Activo')).toBeInTheDocument()
    expect(screen.getAllByText('Apertura 2026').length).toBeGreaterThan(0)
    expect(screen.getByText('Abiertas')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
    expect(screen.getByText('37')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(await screen.findByText('Tigres vs Leones')).toBeInTheDocument()
    expect(await screen.findByText('Panteras')).toBeInTheDocument()
    expect(screen.getByText('12 pts')).toBeInTheDocument()
  })

  it('shows empty messages when the league has no teams or matches yet', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([]),
      'GET /teams': list([]),
      'GET /leagues/league-1/players/verification/summary': { body: { total: 0 } },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('No hay equipos registrados')).toBeInTheDocument()
    expect(screen.getByText('No hay partidos programados')).toBeInTheDocument()
  })

  it('shows the API error when the tournaments fail', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': apiError(500, 'internal', 'Falla en torneos'),
      'GET /teams': list([]),
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Falla en torneos')).toBeInTheDocument()
  })
})
