import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, standing, tournament } from '../test-fixtures'
import { StandingsPageComponent } from './standings'

const table = 'GET /tournaments/tour-1/standings'
const put = 'PUT /tournaments/tour-1/standings/team-1'
const base = { ...mineOne, 'GET /leagues/league-1/tournaments': list([tournament()]), [table]: list([standing()]) }

async function openEdit(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Editar estadísticas de Tigres' }))
}

describe('Standings stats edit', () => {
  it('saves the edited totals: PUT with every stat and the reason, then refreshes the table', async () => {
    const fetchMock = mockApi({ ...base, [put]: { status: 204 } })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await openEdit(user)
    expect(screen.getByLabelText('PJ')).toHaveValue(5)
    expect(screen.getByText(/se guardan encima de los partidos registrados/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('PJ'))
    await user.type(screen.getByLabelText('PJ'), '7')
    await user.clear(screen.getByLabelText('PE'))
    await user.type(screen.getByLabelText('PE'), '2')
    await user.clear(screen.getByLabelText('Goles a Favor'))
    await user.type(screen.getByLabelText('Goles a Favor'), '12')
    await user.type(screen.getByLabelText('Motivo del Ajuste'), 'partidos previos')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Estadísticas del equipo actualizadas')).toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([
      { matches_played: 7, matches_won: 4, matches_drawn: 2, matches_lost: 1, goals_for: 12, goals_against: 4, reason: 'PARTIDOS PREVIOS' },
    ])
    expect(requestsTo(fetchMock, table).length).toBeGreaterThanOrEqual(2)
  })

  it('blocks PJ different from PG+PE+PP and sends nothing', async () => {
    const fetchMock = mockApi({ ...base, [put]: { status: 204 } })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await openEdit(user)
    await user.clear(screen.getByLabelText('PG'))
    await user.type(screen.getByLabelText('PG'), '5')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('PJ debe ser la suma de PG + PE + PP')).toBeInTheDocument()
    expect(screen.getByLabelText('PJ')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, put)).toEqual([])
  })

  it('shows the 422 minimums from recorded matches and keeps the typed values', async () => {
    mockApi({
      ...base,
      [put]: apiError(422, 'validation', 'datos inválidos', {
        matches_played: 'no puede ser menor que lo registrado en partidos (PG 4, PE 0, PP 1, GF 10, GC 4)',
      }),
    })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await openEdit(user)
    await user.clear(screen.getByLabelText('Goles a Favor'))
    await user.type(screen.getByLabelText('Goles a Favor'), '3')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/no puede ser menor que lo registrado en partidos \(PG 4/)).toBeInTheDocument()
    expect(screen.getByLabelText('PJ')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Goles a Favor')).toHaveValue(3)
  })

  it('cancelling sends nothing', async () => {
    const fetchMock = mockApi({ ...base, [put]: { status: 204 } })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await openEdit(user)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('PJ')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, put)).toEqual([])
  })
})
