import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, page } from '../test-fixtures'
import type { MatchWithRelations } from '../types'
import { MatchResultDialog } from './match-result-dialog'

const finished: MatchWithRelations = {
  ...match1,
  status: 'finished',
  home_score: 2,
  away_score: 1,
  goals: [
    { id: 'g1', match_id: 'match-1', player_id: 'p-home-1', team_id: 'team-1', minute: 10, goal_type: 'normal', assist_player_id: 'p-home-2', created_at: '' },
    { id: 'g2', match_id: 'match-1', player_id: 'p-away-1', team_id: 'team-2', minute: 30, goal_type: 'penalty', created_at: '' },
  ],
  cards: [{ id: 'c1', match_id: 'match-1', player_id: 'p-away-1', team_id: 'team-2', card_type: 'yellow', minute: 40, created_at: '' }],
}

const handlers = {
  'GET /matches/match-1': { body: finished },
  'GET /matches/match-1/referee-report': { body: { general_observations: 'Lluvia' } },
  'GET /teams/team-1/players': page([
    { id: 'p-home-1', name: 'Ana Pérez', jersey_number: 9 },
    { id: 'p-home-2', name: 'Beto Ruiz', jersey_number: 4 },
  ]),
  'GET /teams/team-2/players': page([{ id: 'p-away-1', name: 'Carlos Díaz', jersey_number: 7 }]),
  'POST /matches/match-1/result': { body: finished },
  'POST /knowledge/triggers': { status: 204 },
}

function setup() {
  const fetchMock = mockApi(handlers)
  const onSaved = vi.fn()
  const rendered = renderWithProviders(
    <MatchResultDialog match={{ ...match1, status: 'finished', home_score: 2, away_score: 1 }} leagueId="league-1" open onOpenChange={() => {}} onSaved={onSaved} />,
  )
  return { fetchMock, onSaved, ...rendered }
}

describe('MatchResultDialog editing a finished match', () => {
  it('prefills the stored score, goals, assists, cards and observations', async () => {
    const { user } = setup()

    expect(await screen.findByRole('heading', { name: 'Editar Marcador' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Goles Tigres FC')).toHaveValue(2)
    expect(screen.getByLabelText('Goles Leones United')).toHaveValue(1)

    await user.click(screen.getByRole('tab', { name: 'Goles' }))
    expect(await screen.findByRole('combobox', { name: 'Jugador (Tigres FC)' })).toHaveTextContent('Ana Pérez')
    expect(screen.getByRole('combobox', { name: 'Asistencia (Tigres FC)' })).toHaveTextContent('Beto Ruiz')
    expect(screen.getByRole('combobox', { name: 'Asistencia (Leones United)' })).toHaveTextContent('Sin asistencia')
    expect(screen.getByLabelText('Tipo de gol (Leones United)')).toHaveValue('penalty')

    await user.click(screen.getByRole('tab', { name: 'Observaciones' }))
    expect(screen.getByLabelText(/opcional/i)).toHaveValue('Lluvia')
  })

  it('saves the corrected score replacing goals/cards, keeps the assist and does not re-announce the match', async () => {
    const { fetchMock, onSaved, user } = setup()
    const home = await screen.findByLabelText('Goles Tigres FC')
    await vi.waitFor(() => expect(home).toHaveValue(2))

    await user.clear(home)
    await user.type(home, '3')
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    expect(await screen.findByText('Marcador actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toEqual([
      {
        home_score: 3,
        away_score: 1,
        goals: [
          { player_id: 'p-home-1', team_id: 'team-1', minute: 10, goal_type: 'normal', assist_player_id: 'p-home-2' },
          { player_id: 'p-away-1', team_id: 'team-2', minute: 30, goal_type: 'penalty' },
        ],
        cards: [{ player_id: 'p-away-1', team_id: 'team-2', card_type: 'yellow', minute: 40 }],
        observations: 'Lluvia',
      },
    ])
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toHaveLength(1)
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('match-1'))
  })

  it('sends the picked assist player, and none after choosing "Sin asistencia"', async () => {
    const { fetchMock, user } = setup()
    await vi.waitFor(() => expect(screen.getByLabelText('Goles Tigres FC')).toHaveValue(2))
    await user.click(screen.getByRole('tab', { name: 'Goles' }))

    // Clear the stored assist of the home goal.
    await user.click(screen.getByRole('combobox', { name: 'Asistencia (Tigres FC)' }))
    await user.click(await screen.findByRole('option', { name: 'Sin asistencia' }))
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    await screen.findByText('Marcador actualizado exitosamente')
    const [body] = requestsTo(fetchMock, 'POST /matches/match-1/result') as Array<{ goals: Array<Record<string, unknown>> }>
    expect(body?.goals[0]).toEqual({ player_id: 'p-home-1', team_id: 'team-1', minute: 10, goal_type: 'normal' })
  })

  it('offers only the other players of the team as assist', async () => {
    const { user } = setup()
    await vi.waitFor(() => expect(screen.getByLabelText('Goles Tigres FC')).toHaveValue(2))
    await user.click(screen.getByRole('tab', { name: 'Goles' }))
    await user.click(screen.getByRole('combobox', { name: 'Asistencia (Tigres FC)' }))
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(options).toEqual(['Sin asistencia', 'Beto Ruiz #4'])
  })

  it('does not allow editing when the stored result cannot be loaded', async () => {
    mockApi({ ...handlers, 'GET /matches/match-1': { status: 500, body: { error: { code: 'internal', message: 'Falla' } } } })
    renderWithProviders(
      <MatchResultDialog match={{ ...match1, status: 'finished' }} leagueId="league-1" open onOpenChange={() => {}} onSaved={() => {}} />,
    )
    expect(await screen.findByText(/No se pudo cargar el resultado actual/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar resultado' })).not.toBeInTheDocument()
  })
})
