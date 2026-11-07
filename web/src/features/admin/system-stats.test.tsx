import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { SystemStats } from './components/system-stats'
import { emptyPage, errorBody, inactiveLeague, juan, league, maria, pageOf } from './test-fixtures'

const card = (title: string) => screen.getByText(title).closest('div')!.parentElement!

describe('SystemStats', () => {
  it('shows the loading state first', () => {
    mockApi({ 'GET /leagues/admin': { body: emptyPage }, 'GET /users': { body: emptyPage } })
    renderWithProviders(<SystemStats />)
    expect(screen.getByText('Cargando estadísticas…')).toBeInTheDocument()
  })

  it('counts active leagues out of the total, league admins and all users', async () => {
    mockApi({
      'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
      'GET /users': { body: pageOf([juan, maria]) },
    })
    renderWithProviders(<SystemStats />)

    expect(await screen.findByText('Estadísticas del Sistema')).toBeInTheDocument()
    const leagues = card('Ligas')
    expect(within(leagues).getByText('1')).toBeInTheDocument()
    expect(within(leagues).getByText('/2')).toBeInTheDocument()
    const admins = card('Administradores')
    expect(within(admins).getByText('1')).toBeInTheDocument()
    expect(within(admins).getByText('/2')).toBeInTheDocument()
    const users = card('Total de Usuarios')
    expect(within(users).getByText('2')).toBeInTheDocument()
  })

  it('shows the failure message when a request fails', async () => {
    mockApi({
      'GET /leagues/admin': { status: 500, body: errorBody('internal', 'Internal server error') },
      'GET /users': { body: emptyPage },
    })
    renderWithProviders(<SystemStats />)
    expect(await screen.findByText('No se pudieron cargar las estadísticas')).toBeInTheDocument()
  })
})
