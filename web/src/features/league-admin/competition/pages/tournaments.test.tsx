import { screen, within } from '@testing-library/react'
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
    await user.type(screen.getByLabelText('Fecha de Inicio'), '2026-03-01')
    await user.type(screen.getByLabelText('Fecha de Fin'), '2026-05-30')
    await user.click(screen.getByRole('button', { name: 'Crear Torneo' }))

    expect(await screen.findByText('Torneo "COPA PRIMAVERA" creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments')).toEqual([
      {
        league_id: 'league-1',
        name: 'COPA PRIMAVERA',
        start_date: '2026-03-01',
        end_date: '2026-05-30',
        tournament_format: 'league',
        max_coaching_staff: 10,
        rounds_per_season: 2,
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
    await user.type(screen.getByLabelText('Fecha de Inicio'), '2026-03-01')
    await user.type(screen.getByLabelText('Fecha de Fin'), '2026-05-30')
    await user.click(screen.getByRole('button', { name: 'Crear Torneo' }))

    const name = screen.getByLabelText('Nombre del Torneo')
    expect(await screen.findByText('ya existe un torneo con ese nombre')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('COPA')
    expect(screen.getByRole('button', { name: 'Crear Torneo' })).toBeEnabled()
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
    expect(screen.getByLabelText('Fecha de Inicio')).toHaveValue('2026-02-01')
    await user.clear(name)
    await user.type(name, 'Apertura 2027')
    await user.click(screen.getByRole('button', { name: 'Actualizar Torneo' }))

    expect(await screen.findByText('Torneo "APERTURA 2027" actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /tournaments/tour-1')).toEqual([
      {
        name: 'APERTURA 2027',
        start_date: '2026-02-01',
        end_date: '2026-06-30',
        max_coaching_staff: 10,
        tournament_format: 'league',
        rounds_per_season: 2,
        is_active: true,
      },
    ])
  })

  it('asks before closing registrations and sends nothing when cancelled', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([tournament()]),
      'PATCH /tournaments/tour-1': { body: tournament({ registration_open: false }) },
    })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: /cerrar registros/i }))
    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('¿Estás seguro de que quieres cerrar los registros de jugadores para "Apertura 2026"?'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, 'PATCH /tournaments/tour-1')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /cerrar registros/i }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Registros cerrados exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /tournaments/tour-1')).toEqual([{ registration_open: false }])
  })

  it('deactivates a tournament and reports it', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [listRoute]: list([tournament()]),
      'PATCH /tournaments/tour-1': { body: tournament({ is_active: false }) },
    })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Torneo desactivado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /tournaments/tour-1')).toEqual([{ is_active: false }])
  })

  it('requires name and dates before sending anything', async () => {
    const fetchMock = mockApi({ ...mineOne, [listRoute]: list([]), 'POST /tournaments': { status: 201, body: tournament() } })
    const { user } = renderWithProviders(<TournamentsPage />)

    await user.click(await screen.findByRole('button', { name: /nuevo torneo/i }))
    await user.click(screen.getByRole('button', { name: 'Crear Torneo' }))

    expect(await screen.findByText('Por favor completa todos los campos requeridos')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments')).toHaveLength(0)
  })
})
