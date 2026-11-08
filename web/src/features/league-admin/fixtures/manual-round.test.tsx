import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { FixturesPage } from './fixtures-page'

const page = { limit: 100, offset: 0 }
const tournament = {
  id: 'tour-1', name: 'Torneo A', league_id: 'league-1', is_active: true, start_date: '2024-01-01', end_date: '2024-03-01',
  registration_open: false, tournament_format: 'round_robin', rounds_per_season: 10, has_third_place_match: false,
  age_validation_enabled: false, id_document_required: false, created_at: '', updated_at: '',
}
const team = (n: number) => ({ id: `team-${n}`, name: `Equipo ${n}`, slug: `e${n}`, league_id: 'league-1', tournament_id: 'tour-1', is_active: true })
const existing = { id: 'm1', tournament_id: 'tour-1', home_team_id: 'team-1', away_team_id: 'team-2', round: 3, status: 'scheduled', phase: 'regular', match_date: '2024-02-03T00:00:00Z' }

const base = {
  'GET /leagues/league-1/tournaments': { body: { data: [tournament], page } },
  'GET /teams': { body: { data: [team(1), team(2), team(3), team(4)], page } },
  'GET /tournaments/tour-1/matches': { body: { data: [existing], page: { limit: 1000, offset: 0 } } },
  'POST /tournaments/tour-1/matches/bulk': { status: 201, body: [{}, {}] },
}

type User = ReturnType<typeof renderWithProviders>['user']

async function pick(user: User, name: string, option: string) {
  await user.click(screen.getByRole('combobox', { name }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function openManual(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Modo Manual' }))
  await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
  await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
}

describe('Modo Manual', () => {
  it('creates a round by hand with POST /matches/bulk and the next round number', async () => {
    const fetchMock = mockApi(base)
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await openManual(user)

    expect(await screen.findByLabelText('Jornada')).toHaveValue(4)
    await pick(user, 'Local (partido 1)', 'Equipo 1')
    await pick(user, 'Visitante (partido 1)', 'Equipo 3')
    fireEvent.change(screen.getByLabelText('Fecha (partido 1)'), { target: { value: '2024-03-02' } })
    await user.click(screen.getByRole('button', { name: 'Agregar partido' }))
    await pick(user, 'Local (partido 2)', 'Equipo 2')
    await pick(user, 'Visitante (partido 2)', 'Equipo 4')
    fireEvent.change(screen.getByLabelText('Hora (partido 2)'), { target: { value: '09:30' } })
    await user.clear(screen.getByLabelText('Cancha (partido 2)'))
    await user.type(screen.getByLabelText('Cancha (partido 2)'), '2')
    await user.click(screen.getByRole('button', { name: 'Crear jornada' }))

    expect(await screen.findByText(/Jornada 4 creada con 2 partidos/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/matches/bulk')).toEqual([
      {
        tournament_id: 'tour-1',
        matches: [
          { home_team_id: 'team-1', away_team_id: 'team-3', match_date: '2024-03-02T08:00:00Z', match_time: '08:00', round: 4, field_number: 1 },
          // The second row inherits the first one's date.
          { home_team_id: 'team-2', away_team_id: 'team-4', match_date: '2024-03-02T09:30:00Z', match_time: '09:30', round: 4, field_number: 2 },
        ],
      },
    ])
  })

  it('does not send anything while a match is incomplete or plays itself', async () => {
    const fetchMock = mockApi(base)
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await openManual(user)

    await user.click(await screen.findByRole('button', { name: 'Crear jornada' }))
    expect(await screen.findByText('Partido 1: completa equipos, fecha y hora.')).toBeInTheDocument()

    await pick(user, 'Local (partido 1)', 'Equipo 1')
    await pick(user, 'Visitante (partido 1)', 'Equipo 1')
    fireEvent.change(screen.getByLabelText('Fecha (partido 1)'), { target: { value: '2024-03-02' } })
    await user.click(screen.getByRole('button', { name: 'Crear jornada' }))
    expect(await screen.findByText('Partido 1: un equipo no puede jugar contra sí mismo.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/matches/bulk')).toHaveLength(0)
  })

  it('shows the API validation messages and keeps the typed matches', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/matches/bulk': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { field_number: 'debe ser mayor que 0' } } },
      },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await openManual(user)
    await pick(user, 'Local (partido 1)', 'Equipo 1')
    await pick(user, 'Visitante (partido 1)', 'Equipo 2')
    fireEvent.change(screen.getByLabelText('Fecha (partido 1)'), { target: { value: '2024-03-02' } })
    await user.click(screen.getByRole('button', { name: 'Crear jornada' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('debe ser mayor que 0')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Local (partido 1)' })).toHaveTextContent('Equipo 1')
    expect(screen.getByLabelText('Fecha (partido 1)')).toHaveValue('2024-03-02')
  })
})
