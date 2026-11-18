import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, page } from '../test-fixtures'
import type { MatchWithRelations } from '../types'
import { MatchCard } from './match-card'
import { MatchResultDialog } from './match-result-dialog'

const knockout: MatchWithRelations = { ...match1, phase: 'playoffs', playoff_round: 'final', playoff_position: 1 }

function open(match: MatchWithRelations, result: { status?: number; body?: unknown } = { body: match }) {
  const fetchMock = mockApi({
    'GET /teams/team-1/players': page([]),
    'GET /teams/team-2/players': page([]),
    [`POST /matches/${match.id}/result`]: result,
    'POST /knowledge/triggers': { status: 204 },
    [`POST /notifications/matches/${match.id}/finalized`]: { status: 204 },
  })
  return { fetchMock, ...renderWithProviders(<MatchResultDialog match={match} leagueId="league-1" open onOpenChange={() => {}} onSaved={vi.fn()} />) }
}

// Knockout ties level after full time are decided on penalties (#83).
describe('penalties in the result form', () => {
  it('sends the shoot-out of a level knockout match', async () => {
    const { fetchMock, user } = open(knockout)
    await user.type(screen.getByLabelText(`Penales ${match1.home_team_name}`), '4')
    await user.type(screen.getByLabelText(`Penales ${match1.away_team_name}`), '3')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await vi.waitFor(() => expect(requestsTo(fetchMock, `POST /matches/${knockout.id}/result`)).toHaveLength(1))
    expect(requestsTo(fetchMock, `POST /matches/${knockout.id}/result`)[0]).toMatchObject({ home_penalties: 4, away_penalties: 3 })
  })

  it('leaves them out when not filled, and shows the API saying they are needed', async () => {
    const { fetchMock, user } = open(knockout, {
      status: 422,
      body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { home_penalties: 'la eliminatoria quedó empatada: captura los penales' } } },
    })
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByText(/captura los penales/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, `POST /matches/${knockout.id}/result`)[0]).not.toHaveProperty('home_penalties')
  })

  it('is not offered in regular matches or first legs', () => {
    open(match1)
    expect(screen.queryByLabelText(/^Penales/)).not.toBeInTheDocument()
  })

  it('is not offered in a first leg', () => {
    open({ ...knockout, leg: 'first' })
    expect(screen.queryByLabelText(/^Penales/)).not.toBeInTheDocument()
  })
})

describe('MatchCard', () => {
  it('shows the shoot-out next to a finished score', () => {
    renderWithProviders(
      <MatchCard
        match={{ ...knockout, status: 'finished', home_score: 1, away_score: 1, home_penalties: 5, away_penalties: 4 }}
        onEdit={vi.fn()} onResult={vi.fn()} onDelete={vi.fn()} onQr={vi.fn()} onAttendance={vi.fn()} onReport={vi.fn()} onStatus={vi.fn()} onReopen={vi.fn()}
      />,
    )
    expect(screen.getByText('(pen. 5-4)')).toBeInTheDocument()
  })
})
