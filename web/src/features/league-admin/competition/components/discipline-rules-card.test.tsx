import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { DisciplineRulesCard } from './discipline-rules-card'

const tournaments = { body: { data: [{ id: 't1', name: 'Apertura', is_active: true }], page: { limit: 100, offset: 0 } } }

describe('DisciplineRulesCard (#82)', () => {
  it('turns yellow accumulation on for the active tournament', async () => {
    const fetchMock = mockApi({
      'GET /leagues/l1/tournaments': tournaments,
      'GET /tournaments/t1/discipline-rules': { body: { yellow_accumulation_limit: null, yellow_accumulation_matches: 1 } },
      'PUT /tournaments/t1/discipline-rules': { body: { yellow_accumulation_limit: 3, yellow_accumulation_matches: 2 } },
    })
    const { user } = renderWithProviders(<DisciplineRulesCard leagueId="l1" />)

    const toggle = await screen.findByRole('switch', { name: 'Suspender por acumulación de amarillas' })
    expect(toggle).not.toBeChecked()
    expect(screen.queryByLabelText('Cada cuántas amarillas')).not.toBeInTheDocument()

    await user.click(toggle)
    await user.clear(screen.getByLabelText('Cada cuántas amarillas'))
    await user.type(screen.getByLabelText('Cada cuántas amarillas'), '3')
    await user.clear(screen.getByLabelText('Partidos de suspensión'))
    await user.type(screen.getByLabelText('Partidos de suspensión'), '2')
    await user.click(screen.getByRole('button', { name: 'Guardar reglas' }))

    expect(await screen.findByText('Acumulación de amarillas activada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PUT /tournaments/t1/discipline-rules')).toEqual([
      { yellow_accumulation_limit: 3, yellow_accumulation_matches: 2 },
    ])
  })

  it('shows saved rules and can turn them off', async () => {
    const fetchMock = mockApi({
      'GET /leagues/l1/tournaments': tournaments,
      'GET /tournaments/t1/discipline-rules': { body: { yellow_accumulation_limit: 5, yellow_accumulation_matches: 1 } },
      'PUT /tournaments/t1/discipline-rules': { body: { yellow_accumulation_limit: null, yellow_accumulation_matches: 1 } },
    })
    const { user } = renderWithProviders(<DisciplineRulesCard leagueId="l1" />)

    expect(await screen.findByLabelText('Cada cuántas amarillas')).toHaveValue(5)
    await user.click(screen.getByRole('switch', { name: 'Suspender por acumulación de amarillas' }))
    await user.click(screen.getByRole('button', { name: 'Guardar reglas' }))

    expect(await screen.findByText('Acumulación de amarillas desactivada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PUT /tournaments/t1/discipline-rules')).toEqual([
      { yellow_accumulation_limit: null, yellow_accumulation_matches: 1 },
    ])
  })
})
