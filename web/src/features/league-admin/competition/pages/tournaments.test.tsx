import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, tournament } from '../test-fixtures'
import { TournamentsPage } from './tournaments'

const listRoute = 'GET /leagues/league-1/tournaments'

describe('Tournaments page', () => {
  it('lists the league tournaments', async () => {
    mockApi({ ...mineOne, [listRoute]: list([tournament(), tournament({ id: 'tour-2', name: 'Clausura', is_active: false })]) })
    renderWithProviders(<TournamentsPage />)

    expect(await screen.findByText('Apertura 2026')).toBeInTheDocument()
    expect(screen.getByText('Clausura')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ ...mineOne, [listRoute]: list([]) })
    renderWithProviders(<TournamentsPage />)

    expect(await screen.findByText('Sin torneos')).toBeInTheDocument()
  })

  it('shows the API error', async () => {
    mockApi({ ...mineOne, [listRoute]: apiError(500, 'internal', 'Falla al cargar torneos') })
    renderWithProviders(<TournamentsPage />)

    expect(await screen.findByText('Falla al cargar torneos')).toBeInTheDocument()
  })

  it('creates a tournament in the current league and refreshes the list', async () => {
    const created = tournament({ id: 'tour-9', name: 'COPA PRIMAVERA' })
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([]),
      'POST /tournaments': { status: 201, body: created },
    })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: /nuevo torneo/i }))
    await user.type(screen.getByLabelText('Nombre del Torneo'), 'Copa Primavera')
    await user.type(screen.getByLabelText('Fecha Inicio'), '2026-03-01')
    await user.type(screen.getByLabelText('Fecha Fin'), '2026-05-30')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Torneo creado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments')).toEqual([
      {
        league_id: 'league-1',
        name: 'COPA PRIMAVERA',
        start_date: '2026-03-01',
        end_date: '2026-05-30',
        tournament_format: 'league',
        rounds_per_season: 1,
        is_active: true,
      },
    ])
    // the list was invalidated and fetched again
    expect(requestsTo(fetchMock, listRoute).length).toBeGreaterThanOrEqual(2)
  })

  it('maps 422 field errors next to the field and keeps what was typed', async () => {
    mockApi({
      ...mineOne,
      [listRoute]: list([]),
      'POST /tournaments': apiError(422, 'validation_failed', 'Datos inválidos', { name: 'ya existe un torneo con ese nombre' }),
    })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: /nuevo torneo/i }))
    await user.type(screen.getByLabelText('Nombre del Torneo'), 'Copa')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const name = screen.getByLabelText('Nombre del Torneo')
    expect(await screen.findByText('ya existe un torneo con ese nombre')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('COPA')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('edits a tournament with PATCH /tournaments/{id}', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([tournament({ start_date: '2026-02-01T00:00:00Z' })]),
      'PATCH /tournaments/tour-1': { body: tournament({ name: 'APERTURA 2027' }) },
    })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const name = screen.getByLabelText('Nombre del Torneo')
    expect(name).toHaveValue('Apertura 2026')
    expect(screen.getByLabelText('Fecha Inicio')).toHaveValue('2026-02-01')
    await user.clear(name)
    await user.type(name, 'Apertura 2027')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Torneo actualizado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /tournaments/tour-1')).toEqual([
      {
        name: 'APERTURA 2027',
        start_date: '2026-02-01',
        end_date: '2026-06-30',
        tournament_format: 'league',
        rounds_per_season: 2,
        is_active: true,
      },
    ])
  })
})
