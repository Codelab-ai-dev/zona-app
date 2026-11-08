import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import type { ManualStats } from '../api'
import { apiError, list, mineOne, tournament } from '../test-fixtures'
import { TopScorersPageComponent } from './top-scorers'

const manualRoute = 'GET /tournaments/tour-1/manual-stats'
const put = 'PUT /tournaments/tour-1/players/player-1/manual-stats'
const team = { id: 'team-1', name: 'Tigres', slug: 'tigres', league_id: 'league-1', owner_id: 'o', is_active: true, created_at: '', updated_at: '' }
const player = { id: 'player-1', name: 'Carlos Ruiz', team_id: 'team-1', position: 'DEL', jersey_number: 9, is_active: true }
const entry = (over: Partial<ManualStats> = {}): ManualStats => ({
  player_id: 'player-1',
  player_name: 'Carlos Ruiz',
  jersey_number: 9,
  team_id: 'team-1',
  team_name: 'Tigres',
  goals: 3,
  assists: 1,
  yellow_cards: 0,
  red_cards: 0,
  ...over,
})

const base = {
  ...mineOne,
  'GET /leagues/league-1/tournaments': list([tournament()]),
  'GET /tournaments/tour-1/top-scorers': list([]),
  'GET /teams': list([team]),
  'GET /teams/team-1/players': list([player]),
}

describe('Manual stats (goles extemporáneos)', () => {
  it('lists the manual entries below the scorers table', async () => {
    mockApi({ ...base, [manualRoute]: list([entry()]) })
    renderWithProviders(<TopScorersPageComponent />)

    expect(await screen.findByText('Estadísticas manuales')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar manuales de Carlos Ruiz' })).toBeInTheDocument()
  })

  it('adds goals picking team then player: PUT with the four stats, then refreshes', async () => {
    const fetchMock = mockApi({ ...base, [manualRoute]: list([]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Agregar Goles' }))
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.click(screen.getByLabelText('Jugador'))
    await user.click(await screen.findByRole('option', { name: /Carlos Ruiz/ }))
    await user.clear(screen.getByLabelText('Goles'))
    await user.type(screen.getByLabelText('Goles'), '4')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('Estadísticas actualizadas correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([{ goals: 4, assists: 0, yellow_cards: 0, red_cards: 0 }])
    expect(requestsTo(fetchMock, manualRoute).length).toBeGreaterThanOrEqual(2)
    expect(requestsTo(fetchMock, 'GET /tournaments/tour-1/top-scorers').length).toBeGreaterThanOrEqual(2)
  })

  it('adding to a player that already has manual goals sums them up', async () => {
    const fetchMock = mockApi({ ...base, [manualRoute]: list([entry()]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Agregar Goles' }))
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.click(screen.getByLabelText('Jugador'))
    await user.click(await screen.findByRole('option', { name: /Carlos Ruiz/ }))
    await user.clear(screen.getByLabelText('Goles'))
    await user.type(screen.getByLabelText('Goles'), '2')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await screen.findByText('Estadísticas actualizadas correctamente')
    expect(requestsTo(fetchMock, put)).toEqual([{ goals: 5, assists: 1, yellow_cards: 0, red_cards: 0 }])
  })

  it('requires a player and at least one stat, sending nothing', async () => {
    const fetchMock = mockApi({ ...base, [manualRoute]: list([]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Agregar Goles' }))
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('Selecciona un equipo', { selector: 'p' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([])
  })

  it('edits the manual totals of a player: PUT replaces them', async () => {
    const fetchMock = mockApi({ ...base, [manualRoute]: list([entry()]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar manuales de Carlos Ruiz' }))
    expect(screen.getByLabelText('Goles')).toHaveValue(3)
    await user.clear(screen.getByLabelText('Goles'))
    await user.type(screen.getByLabelText('Goles'), '6')
    await user.clear(screen.getByLabelText('Rojas'))
    await user.type(screen.getByLabelText('Rojas'), '1')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Estadísticas actualizadas correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([{ goals: 6, assists: 1, yellow_cards: 0, red_cards: 1 }])
  })

  it('shows the 422 field error in the dialog and keeps the typed value', async () => {
    mockApi({
      ...base,
      [manualRoute]: list([entry()]),
      [put]: apiError(422, 'validation', 'datos inválidos', { goals: 'debe estar entre 0 y 500' }),
    })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar manuales de Carlos Ruiz' }))
    await user.clear(screen.getByLabelText('Goles'))
    await user.type(screen.getByLabelText('Goles'), '400')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('debe estar entre 0 y 500')).toBeInTheDocument()
    expect(screen.getByLabelText('Goles')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Goles')).toHaveValue(400)
  })

  it('deletes the manual entry sending all zeros, only after confirming', async () => {
    const fetchMock = mockApi({ ...base, [manualRoute]: list([entry()]), [put]: { status: 204 } })
    const { user } = renderWithProviders(<TopScorersPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar manuales de Carlos Ruiz' }))
    expect(screen.getByText(/3 gol\(es\) y 1 asistencia\(s\) extemporáneos/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, put)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Eliminar manuales de Carlos Ruiz' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Estadísticas manuales eliminadas')).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([{ goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 }])
  })
})
