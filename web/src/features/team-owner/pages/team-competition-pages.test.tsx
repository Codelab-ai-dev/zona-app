import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import type { Match, PlayerStats, Standings } from '../types'
import { TEAM_ID, TOURNAMENT_ID, listBody, serverError, team, teamStats } from '../test-fixtures'
import { TeamCalendarPage } from './team-calendar-page'
import { TeamRecordPage } from './team-record-page'
import { TeamScorersPage } from './team-scorers-page'
import { TeamStandingsPage } from './team-standings-page'

const TEAM = `GET /teams/${TEAM_ID}`
const STANDINGS = `GET /tournaments/${TOURNAMENT_ID}/standings`
const SCORERS = `GET /tournaments/${TOURNAMENT_ID}/top-scorers`
const MATCHES = `GET /teams/${TEAM_ID}/matches`
const STATS = `GET /teams/${TEAM_ID}/stats`

const standing: Standings = {
  position: 1,
  team_id: TEAM_ID,
  team_name: 'Águilas FC',
  matches_played: 10,
  matches_won: 7,
  matches_drawn: 2,
  matches_lost: 1,
  goals_for: 25,
  goals_against: 8,
  goal_difference: 17,
  points: 23,
  points_adjustment: 0,
}

const scorer = (over: Partial<PlayerStats>): PlayerStats => ({
  id: 'ps-1',
  player_id: 'p-1',
  player_name: 'Juan Pérez',
  jersey_number: 10,
  team_id: TEAM_ID,
  team_name: 'Águilas FC',
  matches_played: 9,
  goals: 12,
  assists: 4,
  yellow_cards: 1,
  red_cards: 0,
  minutes_played: 800,
  ...over,
})

const match: Match = {
  id: 'm-1',
  tournament_id: TOURNAMENT_ID,
  home_team_id: TEAM_ID,
  away_team_id: 'team-2',
  home_score: 3,
  away_score: 1,
  match_date: '2024-01-15T12:00:00Z',
  match_time: '18:00',
  status: 'finished',
  phase: 'regular',
  is_published: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  home_team: { id: TEAM_ID, name: 'Águilas FC', slug: 'aguilas-fc' },
  away_team: { id: 'team-2', name: 'Tigres FC', slug: 'tigres-fc' },
}

describe('TeamStandingsPage', () => {
  it('requests the standings of the tournament the team belongs to and renders the table', async () => {
    const fetchMock = mockApi({ [TEAM]: { body: team }, [STANDINGS]: listBody([standing]) })
    renderWithProviders(<TeamStandingsPage teamId={TEAM_ID} />)

    const row = (await screen.findByRole('cell', { name: 'Águilas FC' })).closest('tr') as HTMLElement
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '1', 'Águilas FC', '10', '7', '2', '1', '25', '8', '17', '23',
    ])
    expect(requestsTo(fetchMock, STANDINGS)).toHaveLength(1)
  })

  it('shows an empty state when the team has no tournament (instead of loading forever)', async () => {
    mockApi({ [TEAM]: { body: { ...team, tournament_id: undefined } } })
    renderWithProviders(<TeamStandingsPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Sin torneo')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows an empty state when the tournament has no standings', async () => {
    mockApi({ [TEAM]: { body: team }, [STANDINGS]: listBody([]) })
    renderWithProviders(<TeamStandingsPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Sin posiciones')).toBeInTheDocument()
  })

  it('shows the error of the standings request and retries it', async () => {
    mockApi({ [TEAM]: { body: team }, [STANDINGS]: serverError })
    const { user } = renderWithProviders(<TeamStandingsPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [TEAM]: { body: team }, [STANDINGS]: listBody([standing]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('cell', { name: 'Águilas FC' })).toBeInTheDocument()
  })

  it('shows the error when the team itself cannot be loaded', async () => {
    mockApi({ [TEAM]: serverError })
    renderWithProviders(<TeamStandingsPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
  })
})

describe('TeamScorersPage', () => {
  it('lists tournament scorers and highlights this team scorers', async () => {
    mockApi({
      [TEAM]: { body: team },
      [SCORERS]: listBody([
        scorer({ player_id: 'p-9', player_name: 'Rival Uno', team_id: 'team-2', team_name: 'Tigres FC', goals: 15 }),
        scorer({}),
      ]),
    })
    renderWithProviders(<TeamScorersPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Rival Uno')).toBeInTheDocument()
    const own = screen.getByText('Goleadores de Tu Equipo').closest('[data-slot="card"]') as HTMLElement
    expect(within(own).getByText('Juan Pérez')).toBeInTheDocument()
    expect(within(own).queryByText('Rival Uno')).not.toBeInTheDocument()
  })

  it('shows an empty state without a tournament', async () => {
    mockApi({ [TEAM]: { body: { ...team, tournament_id: undefined } } })
    renderWithProviders(<TeamScorersPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Sin torneo')).toBeInTheDocument()
  })

  it('shows an empty state when nobody has scored', async () => {
    mockApi({ [TEAM]: { body: team }, [SCORERS]: listBody([]) })
    renderWithProviders(<TeamScorersPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Sin goleadores')).toBeInTheDocument()
  })

  it('shows the API error and retries', async () => {
    mockApi({ [TEAM]: { body: team }, [SCORERS]: serverError })
    const { user } = renderWithProviders(<TeamScorersPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [TEAM]: { body: team }, [SCORERS]: listBody([scorer({})]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findAllByText('Juan Pérez')).not.toHaveLength(0)
  })
})

describe('TeamCalendarPage', () => {
  it('renders the matches of the team with score and status', async () => {
    mockApi({ [MATCHES]: listBody([match]) })
    renderWithProviders(<TeamCalendarPage teamId={TEAM_ID} />)

    expect(await screen.findByText('Águilas FC')).toBeInTheDocument()
    expect(screen.getByText('Tigres FC')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('18:00')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ [MATCHES]: listBody([]) })
    renderWithProviders(<TeamCalendarPage teamId={TEAM_ID} />)

    expect(await screen.findByText('No hay partidos')).toBeInTheDocument()
  })

  it('shows the API error and retries', async () => {
    mockApi({ [MATCHES]: serverError })
    const { user } = renderWithProviders(<TeamCalendarPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [MATCHES]: listBody([match]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Tigres FC')).toBeInTheDocument()
  })
})

describe('TeamRecordPage', () => {
  it('shows the team record, goal average and cards', async () => {
    mockApi({ [STATS]: listBody([teamStats]) })
    renderWithProviders(<TeamRecordPage teamId={TEAM_ID} />)

    const row = async (label: string) =>
      (await screen.findByText(label)).parentElement?.lastElementChild?.textContent
    expect(await row('Jugados')).toBe('10')
    expect(await row('Ganados')).toBe('7')
    expect(await row('A Favor')).toBe('25')
    expect(await row('Promedio por Partido')).toBe('2.50')
    expect(await row('Tarjetas Amarillas')).toBe('12')
    expect(await row('Puntos')).toBe('23')
  })

  it('shows the empty state when there are no stats', async () => {
    mockApi({ [STATS]: listBody([]) })
    renderWithProviders(<TeamRecordPage teamId={TEAM_ID} />)

    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('shows the API error and retries', async () => {
    mockApi({ [STATS]: serverError })
    const { user } = renderWithProviders(<TeamRecordPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [STATS]: listBody([teamStats]) })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Jugados')).toBeInTheDocument()
  })
})
