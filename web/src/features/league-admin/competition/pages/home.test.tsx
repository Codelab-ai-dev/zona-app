import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { apiError, list, mineOne, standing, summary, tournament } from '../test-fixtures'
import { HomePage } from './home'

describe('Home (liga-admin)', () => {
  it('shows the active tournament, the finance summary and the top standings', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([tournament()]),
      'GET /tournaments/tour-1/standings': list([standing(), standing({ team_id: 't2', team_name: 'Leones', position: 2, points: 9 })]),
      'GET /leagues/league-1/finance/summary': { body: summary },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Apertura 2026')).toBeInTheDocument()
    expect(screen.getByText('Torneo Activo')).toBeInTheDocument()
    expect(screen.getByText('Abiertas')).toBeInTheDocument()
    expect(await screen.findByText('Tigres')).toBeInTheDocument()
    expect(screen.getByText('Leones')).toBeInTheDocument()
    expect(screen.getByText('12 pts')).toBeInTheDocument()
    expect(await screen.findByText(/1,800\.50/)).toBeInTheDocument()
    expect(screen.getByText(/700\.25/)).toBeInTheDocument()
  })

  it('shows the empty state when the league has no standings yet', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([]),
      'GET /leagues/league-1/finance/summary': { body: summary },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Sin posiciones')).toBeInTheDocument()
  })

  it('shows the API error when the finance summary fails', async () => {
    mockApi({
      ...mineOne,
      'GET /leagues/league-1/tournaments': list([]),
      'GET /leagues/league-1/finance/summary': apiError(500, 'internal', 'Falla en finanzas'),
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Falla en finanzas')).toBeInTheDocument()
  })
})
