import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { ResultsPage } from './results-page'
import { match1, match2, match3, page, tournament } from './test-fixtures'

const finished = { ...match3, id: 'match-9', status: 'finished', round: 2 }
const base = (matches: unknown[]) => ({
  'GET /leagues/league-1/tournaments': page([tournament]),
  'GET /tournaments/tour-1/matches': page(matches, 1000),
  'GET /teams/team-1/players': page([{ id: 'p1', name: 'Ana Pérez', jersey_number: 9 }]),
  'GET /teams/team-2/players': page([{ id: 'p2', name: 'Carlos Díaz', jersey_number: 7 }]),
  'POST /matches/match-1/result': { body: match1 },
  'POST /knowledge/triggers': { status: 204 },
  'POST /notifications/matches/match-1/finalized': { status: 204 },
})

describe('ResultsPage (Captura de Resultados)', () => {
  it('lists only scheduled / in progress matches and filters them by team', async () => {
    mockApi(base([match1, match2, finished]))
    const { user } = renderWithProviders(<ResultsPage leagueId="league-1" />)

    expect(await screen.findByRole('heading', { name: 'Captura de Resultados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tigres FC vs Leones United/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Águilas SC vs Pumas CD/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Leones United vs Águilas SC/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Equipo' }))
    await user.click(await screen.findByRole('option', { name: /Pumas CD/ }))
    expect(screen.queryByRole('button', { name: /Tigres FC vs Leones United/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Equipo' }))
    await user.click(await screen.findByRole('option', { name: /Tigres FC/ }))
    await user.click(screen.getByRole('combobox', { name: 'Jornada' }))
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['Todas las jornadas', 'Jornada 1'])
  })

  it('says there are no pending matches', async () => {
    mockApi(base([finished]))
    renderWithProviders(<ResultsPage leagueId="league-1" />)
    expect(await screen.findByText('No hay partidos disponibles')).toBeInTheDocument()
    expect(screen.getByText('No hay partidos programados o en progreso')).toBeInTheDocument()
  })

  it('shows the API error with a retry', async () => {
    mockApi({ ...base([]), 'GET /tournaments/tour-1/matches': { status: 500, body: { error: { code: 'internal', message: 'Falla' } } } })
    renderWithProviders(<ResultsPage leagueId="league-1" />)
    expect(await screen.findByText(/No se pudieron cargar los partidos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('saves the result of the picked match and confirms with the success dialog', async () => {
    const fetchMock = mockApi(base([match1]))
    const { user } = renderWithProviders(<ResultsPage leagueId="league-1" />)

    await user.click(await screen.findByRole('button', { name: /Registrar resultado: Tigres FC vs Leones United/ }))
    const dialog = await screen.findByRole('dialog')
    const home = await within(dialog).findByLabelText('Goles Tigres FC')
    await user.clear(home)
    await user.type(home, '2')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar resultado' }))

    expect(await screen.findByText('¡Resultado Guardado!')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toEqual([{ home_score: 2, away_score: 0, goals: [], cards: [] }])
    expect(requestsTo(fetchMock, 'POST /notifications/matches/match-1/finalized')).toHaveLength(1)
  })
})
