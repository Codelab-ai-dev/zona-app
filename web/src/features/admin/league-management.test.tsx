import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LeagueManagement } from './components/league-management'
import { emptyPage, errorBody, inactiveLeague, league, pageOf } from './test-fixtures'

function setup(extra: Record<string, { status?: number; body?: unknown }> = {}) {
  const fetchMock = mockApi({
    'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    'GET /users': { body: emptyPage },
    ...extra,
  })
  return { fetchMock, ...renderWithProviders(<LeagueManagement />) }
}

describe('LeagueManagement list', () => {
  it('shows the loading state first', () => {
    setup()
    expect(screen.getByText('Cargando ligas…')).toBeInTheDocument()
  })

  it('lists every league from GET /leagues/admin, inactive ones included', async () => {
    setup()

    expect(await screen.findByText('Liga Premier')).toBeInTheDocument()
    expect(screen.getByText('/liga-premier')).toBeInTheDocument()
    expect(screen.getByText('Liga premier mexicana')).toBeInTheDocument()
    expect(screen.getByText('Liga Ascenso')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('renders the empty state', async () => {
    setup({ 'GET /leagues/admin': { body: emptyPage } })
    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('renders the API error with a retry button', async () => {
    setup({ 'GET /leagues/admin': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('LeagueManagement status', () => {
  it('asks for confirmation before deactivating, then sends PATCH /leagues/league1/status', async () => {
    const { fetchMock, user } = setup({ 'PATCH /leagues/league1/status': { body: { ...league, is_active: false } } })
    await screen.findByText('Liga Premier')
    await user.click(screen.getByRole('button', { name: /desactivar liga/i }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Desactivar liga' })
    expect(dialog).toHaveTextContent('Liga Premier')
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/status')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Liga desactivada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/status')).toEqual([{ is_active: false }])
    expect(requestsTo(fetchMock, 'GET /leagues/admin').length).toBeGreaterThanOrEqual(2)
  })

  it('does not deactivate when the confirmation is cancelled', async () => {
    const { fetchMock, user } = setup()
    await screen.findByText('Liga Premier')
    await user.click(screen.getByRole('button', { name: /desactivar liga/i }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league1/status')).toHaveLength(0)
  })

  it('activates an inactive league directly with PATCH /leagues/league2/status', async () => {
    const { fetchMock, user } = setup({ 'PATCH /leagues/league2/status': { body: { ...inactiveLeague, is_active: true } } })
    await screen.findByText('Liga Ascenso')
    await user.click(screen.getByRole('button', { name: /^activar$/i }))

    expect(await screen.findByText('Liga activada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league2/status')).toEqual([{ is_active: true }])
  })

  it('shows an error toast when the status change fails', async () => {
    const { user } = setup({ 'PATCH /leagues/league2/status': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    await screen.findByText('Liga Ascenso')
    await user.click(screen.getByRole('button', { name: /^activar$/i }))

    expect(await screen.findByText('Error al cambiar el estado de la liga')).toBeInTheDocument()
  })

  it('opens the features editor for the chosen league', async () => {
    const { user } = setup()
    await screen.findByText('Liga Ascenso')
    await user.click(screen.getAllByRole('button', { name: /features/i })[1]!)

    const dialog = await screen.findByRole('dialog', { name: 'Configurar Features' })
    expect(dialog).toHaveTextContent('Liga Ascenso')
  })
})
