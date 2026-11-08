import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import type { PlayerStats } from '../types'
import { apiError, list, mineOne, tournament } from '../test-fixtures'
import { TopScorersPageComponent } from './top-scorers'

const player = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  id: 'ps-1',
  player_id: 'p1',
  player_name: 'Carlos Ruiz',
  jersey_number: 9,
  team_id: 'team-1',
  team_name: 'Tigres',
  matches_played: 5,
  goals: 7,
  assists: 2,
  yellow_cards: 3,
  red_cards: 1,
  minutes_played: 400,
  ...over,
})

const base = { ...mineOne, 'GET /leagues/league-1/tournaments': list([tournament()]), 'GET /tournaments/tour-1/manual-stats': list([]) }
const scorers = 'GET /tournaments/tour-1/top-scorers'
const discipline = 'GET /tournaments/tour-1/discipline'

describe('Top scorers page', () => {
  it('renders the scorers ranking', async () => {
    mockApi({ ...base, [scorers]: list([player(), player({ player_id: 'p2', player_name: 'Luis Gómez', goals: 4 })]) })
    renderWithProviders(<TopScorersPageComponent />)

    expect(await screen.findByText('Carlos Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Goles' })).toBeInTheDocument()
  })

  it('switches to discipline and only then requests it', async () => {
    const fetchMock = mockApi({ ...base, [scorers]: list([player()]), [discipline]: list([player({ player_name: 'Pedro Díaz' })]) })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await screen.findByText('Carlos Ruiz')
    expect(requestsTo(fetchMock, discipline)).toEqual([])
    await user.click(screen.getByLabelText('Vista'))
    await user.click(await screen.findByRole('option', { name: 'Disciplina' }))

    expect(await screen.findByText('Pedro Díaz')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Amarillas' })).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ ...base, [scorers]: list([]) })
    renderWithProviders(<TopScorersPageComponent />)

    expect(await screen.findByText('No hay jugadores en este torneo')).toBeInTheDocument()
  })

  it('does not load forever when the league has no tournaments', async () => {
    mockApi({ ...mineOne, 'GET /leagues/league-1/tournaments': list([]) })
    renderWithProviders(<TopScorersPageComponent />)

    expect(await screen.findByText('Sin torneos')).toBeInTheDocument()
  })

  it('shows the API error', async () => {
    mockApi({ ...base, [scorers]: apiError(500, 'internal', 'Falla en goleadores') })
    renderWithProviders(<TopScorersPageComponent />)

    expect(await screen.findByText('Falla en goleadores')).toBeInTheDocument()
  })
})
