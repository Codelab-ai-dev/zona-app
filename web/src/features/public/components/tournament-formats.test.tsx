import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { league, matchFinished, matchScheduled, page, standingA, standingB, team, team2, tournament } from './fixtures'
import { TournamentDetailPage } from './tournament-detail-page'

const standingC = { ...standingA, team_id: 'team3', team_name: 'Águilas', position: 3, points: 4 }
const team3 = { ...team, id: 'team3', name: 'Águilas', slug: 'aguilas', tournament_id: 't1', group_name: 'B' }
const teamA = { ...team, tournament_id: 't1', group_name: 'A' }
const teamB = { ...team2, tournament_id: 't1', group_name: 'A' }
const semi = {
  ...matchScheduled, id: 'p1', phase: 'playoffs', playoff_round: 'semifinals', playoff_position: 1,
  home_team_id: 'team1', away_team_id: 'team3', round: undefined,
}
const final = { ...semi, id: 'p2', playoff_round: 'final', home_team_id: 'team2', away_team_id: 'team1', status: 'finished', home_score: 2, away_score: 0 }

function render(format: string, matches = [matchFinished, matchScheduled]) {
  mockApi({
    'GET /leagues/slug/liga-norte': { body: league },
    'GET /tournaments/t1': { body: { ...tournament, tournament_format: format, number_of_groups: 2, teams_advancing_per_group: 1 } },
    'GET /teams': { body: { data: [teamA, teamB, team3], page } },
    'GET /tournaments/t1/standings': { body: { data: [standingA, standingB, standingC], page } },
    'GET /tournaments/t1/matches': { body: { data: matches, page } },
    'GET /tournaments/t1/top-scorers': { body: { data: [], page } },
    'GET /tournaments/t1/discipline': { body: { data: [], page } },
  })
  return renderWithProviders(
    <Routes><Route path="liga/:slug/torneo/:tournamentId" element={<TournamentDetailPage />} /></Routes>,
    { route: '/liga/liga-norte/torneo/t1' },
  )
}

const tabNames = () => screen.getAllByRole('tab').map((t) => t.textContent)

describe('TournamentDetailPage by format', () => {
  it('league: Posiciones, Partidos, Jornadas, Equipos plus Goleadores and Disciplina', async () => {
    render('league')
    await screen.findByRole('table', { name: 'Tabla de posiciones' })
    expect(tabNames()).toEqual(['Posiciones', 'Partidos', 'Jornadas', 'Equipos', 'Goleadores', 'Disciplina'])
  })

  it('league: Jornadas shows the chosen round only', async () => {
    const { user } = render('league')
    await user.click(await screen.findByRole('tab', { name: 'Jornadas' }))
    expect(await screen.findByText('Tigres FC 3, Leones United 1. Finalizado. 1/2/2024')).toBeInTheDocument()
    expect(screen.queryByText(/Programado/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Seleccionar Jornada' }))
    await user.click(await screen.findByRole('option', { name: 'Jornada 6' }))
    expect(await screen.findByText('Leones United contra Tigres FC. Programado. 8/2/2024')).toBeInTheDocument()
    expect(screen.queryByText(/Finalizado\. 1\/2/)).not.toBeInTheDocument()
  })

  it('league: Equipos links every team to its page', async () => {
    const { user } = render('league')
    await user.click(await screen.findByRole('tab', { name: 'Equipos' }))
    expect(await screen.findByRole('link', { name: 'Águilas' })).toHaveAttribute('href', '/equipos/team3')
    expect(screen.getByRole('link', { name: 'Tigres FC' })).toHaveAttribute('href', '/equipos/team1')
  })

  it('group_knockout: Grupos has one standings table per group with positions re-ranked', async () => {
    render('group_knockout')
    const a = await screen.findByRole('table', { name: 'Posiciones del grupo A' })
    const b = screen.getByRole('table', { name: 'Posiciones del grupo B' })
    expect(tabNames()).toEqual(['Grupos', 'Eliminación', 'Partidos', 'Equipos', 'Goleadores', 'Disciplina'])
    expect(within(a).getAllByRole('row')).toHaveLength(3)
    const rowB = within(b).getAllByRole('row')[1]
    expect(rowB).toHaveTextContent('Águilas')
    expect(within(rowB as HTMLElement).getAllByRole('cell')[0]).toHaveTextContent('1')
    expect(screen.getByText('2 equipos • Top 1 avanzan')).toBeInTheDocument()
  })

  it('group_knockout: Eliminación groups playoff matches by round', async () => {
    const { user } = render('group_knockout', [matchFinished, semi, final] as never)
    await user.click(await screen.findByRole('tab', { name: 'Eliminación' }))
    expect(await screen.findByRole('heading', { name: 'Semifinales' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Final' })).toBeInTheDocument()
    expect(screen.getByText('2 - 0')).toBeInTheDocument()
    // regular match is not part of the bracket
    expect(screen.queryByText('3 - 1')).not.toBeInTheDocument()
  })

  it('knockout: Eliminación, Partidos, Equipos and an empty bracket message', async () => {
    render('knockout')
    expect(await screen.findByText('Aún no hay llaves de eliminación')).toBeInTheDocument()
    expect(tabNames()).toEqual(['Eliminación', 'Partidos', 'Equipos', 'Goleadores', 'Disciplina'])
  })
})
