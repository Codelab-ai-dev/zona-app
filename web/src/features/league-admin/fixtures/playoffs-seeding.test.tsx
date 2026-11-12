import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { PlayoffsPage } from './playoffs-page'

const page = { limit: 100, offset: 0 }
const tournament = {
  id: 'tour-1',
  name: 'Torneo A',
  league_id: 'league-1',
  is_active: true,
  start_date: '2024-01-01',
  end_date: '2024-03-01',
  registration_open: false,
  tournament_format: 'group_knockout',
  number_of_groups: 2,
  teams_advancing_per_group: 2,
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const team = (id: string, group: string) => ({ id, name: `Equipo ${id}`, slug: id, league_id: 'league-1', tournament_id: 'tour-1', is_active: true, group_name: group })
const teams = [team('A1', 'A'), team('A2', 'A'), team('A3', 'A'), team('B1', 'B'), team('B2', 'B'), team('B3', 'B')]
const standings = ['B1', 'A1', 'A2', 'B2', 'A3', 'B3'].map((id, i) => ({
  position: i + 1, team_id: id, team_name: `Equipo ${id}`, points: 9 - i, goal_difference: 0, goals_for: 0,
}))

const base = {
  'GET /leagues/league-1/tournaments': { body: { data: [tournament], page } },
  'GET /teams': { body: { data: teams, page } },
  'GET /tournaments/tour-1/matches': { body: { data: [], page: { limit: 1000, offset: 0 } } },
  'GET /tournaments/tour-1/standings': { body: { data: standings, page } },
}

type User = ReturnType<typeof renderWithProviders>['user']

async function open(user: User, numTeams = '4 equipos') {
  await user.click(screen.getByRole('button', { name: /generar liguilla/i }))
  await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
  await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
  await user.click(screen.getByRole('combobox', { name: 'Equipos' }))
  await user.click(await screen.findByRole('option', { name: numTeams }))
  await user.type(screen.getByLabelText('Inicio'), '2024-03-10')
}

describe('PlayoffGenerateDialog seeding', () => {
  it('loads the qualified teams from the groups, previews the pairings and creates with team_ids', async () => {
    const fetchMock = mockApi({ ...base, 'POST /tournaments/tour-1/playoffs/generate': { status: 201, body: [{}, {}, {}, {}] } })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await open(user)

    await user.click(screen.getByRole('button', { name: 'Cargar Equipos Clasificados' }))
    expect(await screen.findByText('4 equipos clasificados de la fase de grupos cargados')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Lugar 1' })).toHaveTextContent('Equipo A1')
    expect(screen.getByRole('combobox', { name: 'Lugar 4' })).toHaveTextContent('Equipo B2')

    await user.click(screen.getByRole('button', { name: 'Vista previa' }))
    const preview = screen.getByRole('dialog')
    expect(within(preview).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Equipo A1 vs Equipo B2'),
      expect.stringContaining('Equipo B1 vs Equipo A2'),
    ])
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Confirmar y generar' }))

    expect(await screen.findByText('Llave generada con 4 partidos')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toEqual([
      {
        tournament_id: 'tour-1',
        num_teams: 4,
        start_date: '2024-03-10T00:00:00Z',
        start_time: '10:00',
        field_number: 1,
        third_place_match: true,
        home_and_away: false,
        team_ids: ['A1', 'B1', 'A2', 'B2'],
      },
    ])
  })

  it('lets the admin reorder the seeds by hand, and going back from the preview sends nothing', async () => {
    const fetchMock = mockApi({ ...base, 'POST /tournaments/tour-1/playoffs/generate': { status: 201, body: [{}] } })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Cargar Equipos Clasificados' }))
    await screen.findByText('4 equipos clasificados de la fase de grupos cargados')

    // Seat Equipo A3 as first seed instead of A1.
    await user.click(screen.getByRole('combobox', { name: 'Lugar 1' }))
    await user.click(await screen.findByRole('option', { name: 'Equipo A3' }))
    await user.click(screen.getByRole('button', { name: 'Vista previa' }))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[0]).toHaveTextContent('Equipo A3 vs Equipo B2')

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('combobox', { name: 'Lugar 1' })).toHaveTextContent('Equipo A3')
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Vista previa' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y generar' }))
    await screen.findByText('Llave generada con 1 partidos')
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toEqual([
      expect.objectContaining({ team_ids: ['A3', 'B1', 'A2', 'B2'] }),
    ])
  })

  it('refuses a half-filled seeding with a message next to the seeds and sends nothing', async () => {
    const fetchMock = mockApi({ ...base, 'POST /tournaments/tour-1/playoffs/generate': { status: 201, body: [] } })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await open(user)
    await user.click(screen.getByRole('combobox', { name: 'Lugar 1' }))
    await user.click(await screen.findByRole('option', { name: 'Equipo A1' }))
    await user.click(screen.getByRole('button', { name: 'Generar' }))

    expect(await screen.findByText('Elige los 4 equipos o deja todos los lugares sin elegir.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Lugar 1' })).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/playoffs/generate')).toHaveLength(0)
  })

  it('shows the API 422 for team_ids next to the seeds, keeping the chosen teams', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/playoffs/generate': {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { team_ids: 'todos los equipos deben ser equipos activos de la liga' } } },
      },
    })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Cargar Equipos Clasificados' }))
    await screen.findByText('4 equipos clasificados de la fase de grupos cargados')
    await user.click(screen.getByRole('button', { name: 'Vista previa' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y generar' }))

    expect(await screen.findByText('todos los equipos deben ser equipos activos de la liga')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Lugar 1' })).toHaveTextContent('Equipo A1')
  })

  it('only offers "Cargar Equipos Clasificados" for group + knockout tournaments', async () => {
    mockApi({
      ...base,
      'GET /leagues/league-1/tournaments': { body: { data: [{ ...tournament, tournament_format: 'knockout' }], page } },
    })
    const { user } = renderWithProviders(<PlayoffsPage leagueId="league-1" />)
    await user.click(screen.getByRole('button', { name: /generar liguilla/i }))
    await user.click(await screen.findByRole('combobox', { name: 'Torneo' }))
    await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
    expect(screen.getByRole('combobox', { name: 'Lugar 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar Equipos Clasificados' })).not.toBeInTheDocument()
  })
})
