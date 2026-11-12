import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { league, list, mineOne, apiError } from './test-fixtures'
import { LeagueScope } from './league-scope'

describe('LeagueScope', () => {
  it('uses the only league without showing a selector', async () => {
    mockApi(mineOne)
    renderWithProviders(<LeagueScope>{(id) => <p>liga activa: {id}</p>}</LeagueScope>)

    expect(await screen.findByText('liga activa: league-1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Liga')).not.toBeInTheDocument()
  })

  it('lets the admin pick among several leagues and re-scopes the children', async () => {
    mockApi({ 'GET /leagues/mine': list([league(), league({ id: 'league-2', name: 'Liga Sur' })]) })
    const { user } = renderWithProviders(<LeagueScope>{(id) => <p>liga activa: {id}</p>}</LeagueScope>)

    expect(await screen.findByText('liga activa: league-1')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Liga'))
    await user.click(await screen.findByRole('option', { name: 'Liga Sur' }))

    expect(await screen.findByText('liga activa: league-2')).toBeInTheDocument()
  })

  it('shows the empty state when the user administers no league', async () => {
    mockApi({ 'GET /leagues/mine': list([]) })
    renderWithProviders(<LeagueScope>{(id) => <p>{id}</p>}</LeagueScope>)

    expect(await screen.findByText('Sin liga asignada')).toBeInTheDocument()
  })

  it('shows the API error with a retry button', async () => {
    mockApi({ 'GET /leagues/mine': apiError(500, 'internal', 'Error del servidor') })
    renderWithProviders(<LeagueScope>{(id) => <p>{id}</p>}</LeagueScope>)

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
