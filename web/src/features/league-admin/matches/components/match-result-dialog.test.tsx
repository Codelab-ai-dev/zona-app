import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, page, validationError } from '../test-fixtures'
import { MatchResultDialog } from './match-result-dialog'

const homeRoster = page([
  { id: 'p-home-1', name: 'Ana Pérez', team_id: 'team-1', jersey_number: 9 },
  { id: 'p-home-2', name: 'Beto Ruiz', team_id: 'team-1', jersey_number: 4 },
])
const awayRoster = page([{ id: 'p-away-1', name: 'Carlos Díaz', team_id: 'team-2', jersey_number: 7 }])

const baseHandlers = {
  'GET /teams/team-1/players': homeRoster,
  'GET /teams/team-2/players': awayRoster,
  'POST /matches/match-1/result': { body: match1 },
  'POST /knowledge/triggers': { status: 204 },
  'POST /notifications/matches/match-1/finalized': { status: 204 },
}

type User = ReturnType<typeof renderWithProviders>['user']

function setup(handlers: Parameters<typeof mockApi>[0] = baseHandlers) {
  const fetchMock = mockApi(handlers)
  const onSaved = vi.fn()
  const rendered = renderWithProviders(
    <MatchResultDialog match={match1} leagueId="league-1" open onOpenChange={() => {}} onSaved={onSaved} />,
  )
  return { fetchMock, onSaved, ...rendered }
}

async function setScore(user: User, label: string, value: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  await user.type(input, value)
}

async function addEvent(user: User, tab: 'Goles' | 'Tarjetas', add: string, team: string, player: string, minute: string) {
  await user.click(screen.getByRole('tab', { name: tab }))
  await user.click(screen.getByRole('button', { name: add }))
  await user.click(screen.getByRole('combobox', { name: `Jugador (${team})` }))
  await user.click(await screen.findByRole('option', { name: new RegExp(player) }))
  const minuteInput = screen.getByLabelText(`Minuto (${team})`)
  await user.clear(minuteInput)
  await user.type(minuteInput, minute)
}

describe('MatchResultDialog', () => {
  it('lists each roster so players can be picked per team', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Goles' }))
    await user.click(screen.getByRole('button', { name: 'Agregar gol (Leones United)' }))
    await user.click(screen.getByRole('combobox', { name: 'Jugador (Leones United)' }))
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Carlos Díaz #7'])
  })

  it('posts the exact result body: score, goal, red card (team derived from the roster) and observations', async () => {
    const { fetchMock, onSaved, user } = setup()
    await screen.findByLabelText('Goles Tigres FC')

    await setScore(user, 'Goles Tigres FC', '1')
    await addEvent(user, 'Goles', 'Agregar gol (Tigres FC)', 'Tigres FC', 'Ana Pérez', '12')
    await addEvent(user, 'Tarjetas', 'Agregar tarjeta (Leones United)', 'Leones United', 'Carlos Díaz', '30')
    await user.selectOptions(screen.getByLabelText('Tipo de tarjeta (Leones United)'), 'red')
    await user.click(screen.getByRole('tab', { name: 'Observaciones' }))
    await user.type(screen.getByLabelText(/opcional/i), 'lluvia fuerte')
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    expect(await screen.findByText('Resultado registrado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toEqual([
      {
        home_score: 1,
        away_score: 0,
        goals: [{ player_id: 'p-home-1', team_id: 'team-1', minute: 12, goal_type: 'normal' }],
        cards: [{ player_id: 'p-away-1', team_id: 'team-2', card_type: 'red', minute: 30 }],
        observations: 'LLUVIA FUERTE',
      },
    ])
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toEqual([
      { trigger_type: 'match_result_update', league_id: 'league-1', tournament_id: 'tour-1', match_id: 'match-1' },
    ])
    expect(requestsTo(fetchMock, 'POST /notifications/matches/match-1/finalized')).toHaveLength(1)
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('match-1'))
  })

  it('sends events of both teams ordered by minute and a penalty goal_type', async () => {
    const { fetchMock, user } = setup()
    await screen.findByLabelText('Goles Tigres FC')

    await addEvent(user, 'Goles', 'Agregar gol (Leones United)', 'Leones United', 'Carlos Díaz', '60')
    await addEvent(user, 'Goles', 'Agregar gol (Tigres FC)', 'Tigres FC', 'Beto Ruiz', '20')
    await user.selectOptions(screen.getByLabelText('Tipo de gol (Tigres FC)'), 'penalty')
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    await screen.findByText('Resultado registrado exitosamente')
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toEqual([
      {
        home_score: 0,
        away_score: 0,
        goals: [
          { player_id: 'p-home-2', team_id: 'team-1', minute: 20, goal_type: 'penalty' },
          { player_id: 'p-away-1', team_id: 'team-2', minute: 60, goal_type: 'normal' },
        ],
        cards: [],
      },
    ])
  })

  it('does not post while a goal has no player picked', async () => {
    const { fetchMock, user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Goles' }))
    await user.click(screen.getByRole('button', { name: 'Agregar gol (Tigres FC)' }))
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    expect(await screen.findByText('Selecciona el jugador de cada gol y tarjeta.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toHaveLength(0)
  })

  it('maps a 422 to the form, keeps typed values and skips the follow-ups', async () => {
    const { fetchMock, onSaved, user } = setup({
      ...baseHandlers,
      'POST /matches/match-1/result': validationError({ home_score: 'no puede ser negativo' }),
    })

    const home = screen.getByLabelText('Goles Tigres FC')
    fireEvent.change(home, { target: { value: '-1' } })
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    const message = await screen.findByText('no puede ser negativo')
    expect(message.closest('[role="alert"]')).toBeInTheDocument()
    expect(home).toHaveAttribute('aria-invalid', 'true')
    expect(home).toHaveValue(-1)
    expect(onSaved).not.toHaveBeenCalled()
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toHaveLength(0)
    expect(requestsTo(fetchMock, 'POST /notifications/matches/match-1/finalized')).toHaveLength(0)
  })

  it('keeps the result saved and warns when the follow-ups fail', async () => {
    const { fetchMock, onSaved, user } = setup({
      ...baseHandlers,
      'POST /knowledge/triggers': { status: 500, body: { error: { code: 'internal', message: 'Falla' } } },
      'POST /notifications/matches/match-1/finalized': { status: 502, body: { error: { code: 'bad_gateway', message: 'Falla' } } },
    })

    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }))

    expect(await screen.findByText('Resultado registrado exitosamente')).toBeInTheDocument()
    expect(await screen.findByText(/el resultado se guardó, pero no se pudo/i)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/result')).toHaveLength(1)
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('match-1'))
  })
})
