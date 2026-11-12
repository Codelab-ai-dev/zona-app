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

    expect(await screen.findByText('No hay goles registrados en este torneo todavía')).toBeInTheDocument()
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

  it('edits the total goals of a scorer: the difference goes into the manual stats', async () => {
    const put = 'PUT /tournaments/tour-1/players/p1/manual-stats'
    const manual = { player_id: 'p1', player_name: 'Carlos Ruiz', jersey_number: 9, team_id: 'team-1', team_name: 'Tigres', goals: 3, assists: 1, yellow_cards: 2, red_cards: 0 }
    const fetchMock = mockApi({
      ...base,
      'GET /tournaments/tour-1/manual-stats': list([manual]),
      [scorers]: list([player()]),
      [put]: { status: 204 },
    })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar estadísticas de Carlos Ruiz' }))
    const goals = screen.getByLabelText('Total Goles')
    expect(goals).toHaveValue(7)
    await user.clear(goals)
    await user.type(goals, '9')
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Estadísticas actualizadas correctamente')).toBeInTheDocument()
    // shown 7 = 4 from matches + 3 manual; wanting 9 means 5 manual. Cards are preserved.
    expect(requestsTo(fetchMock, put)).toEqual([{ goals: 5, assists: 1, yellow_cards: 2, red_cards: 0 }])
  })

  it('does not call the API when the totals did not change', async () => {
    const put = 'PUT /tournaments/tour-1/players/p1/manual-stats'
    const fetchMock = mockApi({ ...base, [scorers]: list([player()]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar estadísticas de Carlos Ruiz' }))
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('No hay cambios que guardar')).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([])
  })

  it('flags suspended players in the discipline table', async () => {
    mockApi({
      ...base,
      [scorers]: list([player()]),
      [discipline]: list([player({ player_name: 'Pedro Díaz', player_id: 'p9' })]),
      'GET /leagues/league-1/suspensions': list([
        { id: 's1', player_id: 'p9', team_id: 'team-1', league_id: 'league-1', suspension_type: 'red_card', reason: 'Roja directa', matches_to_serve: 2, matches_served: 0, status: 'active', start_date: '', created_at: '', updated_at: '' },
      ]),
    })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await screen.findByText('Carlos Ruiz')
    await user.click(screen.getByLabelText('Vista'))
    await user.click(await screen.findByRole('option', { name: 'Disciplina' }))

    expect(await screen.findByText('SUSPENDIDO')).toBeInTheDocument()
    expect(screen.getByText('Roja directa')).toBeInTheDocument()
    expect(screen.getByText('Tabla de Disciplina')).toBeInTheDocument()
  })
})
