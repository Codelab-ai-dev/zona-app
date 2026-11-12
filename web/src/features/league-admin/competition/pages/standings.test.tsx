import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, standing, tournament } from '../test-fixtures'
import { StandingsPageComponent } from './standings'

const tournaments = { 'GET /leagues/league-1/tournaments': list([tournament()]) }
const table = 'GET /tournaments/tour-1/standings'

describe('Standings page', () => {
  it('renders the table of the first tournament', async () => {
    mockApi({ ...mineOne, ...tournaments, [table]: list([standing(), standing({ team_id: 't2', team_name: 'Leones', position: 2, points: 9, points_adjustment: -3 })]) })
    renderWithProviders(<StandingsPageComponent />)

    expect(await screen.findByText('Tigres')).toBeInTheDocument()
    expect(screen.getByText('Leones')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('(9-3)')).toBeInTheDocument()
  })

  it('shows the empty state when the tournament has no teams', async () => {
    mockApi({ ...mineOne, ...tournaments, [table]: list([]) })
    renderWithProviders(<StandingsPageComponent />)

    expect(await screen.findByText('No hay equipos en este torneo')).toBeInTheDocument()
  })

  it('shows an empty state instead of loading forever when there are no tournaments', async () => {
    mockApi({ ...mineOne, 'GET /leagues/league-1/tournaments': list([]) })
    renderWithProviders(<StandingsPageComponent />)

    expect(await screen.findByText('Sin torneos')).toBeInTheDocument()
    expect(screen.queryByText('Cargando posiciones…')).not.toBeInTheDocument()
  })

  it('shows the API error', async () => {
    mockApi({ ...mineOne, ...tournaments, [table]: apiError(500, 'internal', 'Falla en posiciones') })
    renderWithProviders(<StandingsPageComponent />)

    expect(await screen.findByText('Falla en posiciones')).toBeInTheDocument()
  })

  it('adjusts points: POST /standings/adjust with the integer and the reason, then refreshes', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      ...tournaments,
      [table]: list([standing()]),
      'POST /standings/adjust': { status: 204 },
    })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar puntos de Tigres' }))
    const points = screen.getByLabelText('Ajuste de Puntos')
    await user.clear(points)
    await user.type(points, '-3')
    expect(screen.getByText('Puntos totales:').nextSibling).toHaveTextContent('9')
    await user.type(screen.getByLabelText('Motivo'), 'alineación indebida')
    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByText('Puntos ajustados correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /standings/adjust')).toEqual([
      { team_id: 'team-1', tournament_id: 'tour-1', points_adjustment: -3, adjustment_reason: 'ALINEACIÓN INDEBIDA' },
    ])
    expect(requestsTo(fetchMock, table).length).toBeGreaterThanOrEqual(2)
  })

  it('starts from the current adjustment and removes it by saving 0', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      ...tournaments,
      [table]: list([standing({ points_adjustment: -3, adjustment_reason: 'Alineación indebida' })]),
      'POST /standings/adjust': { status: 204 },
    })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar puntos de Tigres' }))
    const points = screen.getByLabelText('Ajuste de Puntos')
    expect(points).toHaveValue(-3)
    expect(screen.getByLabelText('Motivo')).toHaveValue('Alineación indebida')
    expect(screen.getByText('Puntos totales:').nextSibling).toHaveTextContent('9')
    await user.clear(points)
    await user.type(points, '0')
    await user.clear(screen.getByLabelText('Motivo'))
    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByText('Puntos ajustados correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /standings/adjust')).toEqual([
      { team_id: 'team-1', tournament_id: 'tour-1', points_adjustment: 0, adjustment_reason: 'Ajuste retirado' },
    ])
  })

  it('blocks an adjustment without a reason and sends nothing', async () => {
    const fetchMock = mockApi({ ...mineOne, ...tournaments, [table]: list([standing()]) })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar puntos de Tigres' }))
    await user.clear(screen.getByLabelText('Ajuste de Puntos'))
    await user.type(screen.getByLabelText('Ajuste de Puntos'), '2')
    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByText('El motivo es obligatorio')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /standings/adjust')).toEqual([])
  })

  it('rejects a zero or non-integer adjustment client-side', async () => {
    const fetchMock = mockApi({ ...mineOne, ...tournaments, [table]: list([standing()]) })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar puntos de Tigres' }))
    await user.type(screen.getByLabelText('Motivo'), 'x')
    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByText('El ajuste no puede ser 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Ajuste de Puntos')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /standings/adjust')).toEqual([])
  })

  it('shows the API error inside the dialog and keeps the typed values', async () => {
    mockApi({
      ...mineOne,
      ...tournaments,
      [table]: list([standing()]),
      'POST /standings/adjust': apiError(403, 'forbidden', 'No tienes permiso'),
    })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Ajustar puntos de Tigres' }))
    await user.clear(screen.getByLabelText('Ajuste de Puntos'))
    await user.type(screen.getByLabelText('Ajuste de Puntos'), '2')
    await user.type(screen.getByLabelText('Motivo'), 'premio')
    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect((await screen.findAllByText('No tienes permiso')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Motivo')).toHaveValue('PREMIO')
  })

  it('switches tournament and loads its table', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([tournament(), tournament({ id: 'tour-2', name: 'Clausura' })]),
      [table]: list([standing()]),
      'GET /tournaments/tour-2/standings': list([standing({ team_id: 't9', team_name: 'Panteras' })]),
    })
    const { user } = renderWithProviders(<StandingsPageComponent />)

    await screen.findByText('Tigres')
    await user.click(screen.getByLabelText('Seleccionar Torneo'))
    await user.click(await screen.findByRole('option', { name: /Clausura/ }))

    expect(await screen.findByText('Panteras')).toBeInTheDocument()
  })
})
