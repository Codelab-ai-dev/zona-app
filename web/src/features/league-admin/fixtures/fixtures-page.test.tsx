import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { FixturesPage } from './fixtures-page'

const page = { limit: 100, offset: 0 }
const tournament = {
  id: 'tour-1',
  name: 'Torneo A',
  league_id: 'league-1',
  is_active: true,
  start_date: '2024-01-01',
  end_date: '2024-03-01',
  registration_open: false,
  tournament_format: 'round_robin',
  rounds_per_season: 10,
  has_third_place_match: false,
  age_validation_enabled: false,
  id_document_required: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const teams = [
  { id: 'team-1', name: 'Equipo 1', slug: 'equipo-1', league_id: 'league-1', tournament_id: 'tour-1', is_active: true },
  { id: 'team-2', name: 'Equipo 2', slug: 'equipo-2', league_id: 'league-1', tournament_id: 'tour-1', is_active: true },
  { id: 'team-3', name: 'Equipo 3', slug: 'equipo-3', league_id: 'league-1', is_active: false },
]
const match = (i: number) => ({
  id: `m-${i}`,
  tournament_id: 'tour-1',
  home_team_id: 'team-1',
  away_team_id: 'team-2',
  home_score: 0,
  away_score: 0,
  match_date: '2024-02-03T00:00:00Z',
  status: 'scheduled',
  round: 1,
  phase: 'regular',
  is_published: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
})

const base = {
  'GET /leagues/league-1/tournaments': { body: { data: [tournament], page } },
  'GET /teams': { body: { data: teams, page } },
  'GET /tournaments/tour-1/matches': { body: { data: [], page: { limit: 1000, offset: 0 } } },
  'GET /tournaments/tour-1/duplicates': { body: [] },
}

type User = ReturnType<typeof renderWithProviders>['user']

/** Opens the dialog, picks the tournament and clicks through to the schedule step. */
async function goToSchedule(user: User) {
  await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
  await user.click(await screen.findByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
  expect(await screen.findByText('Equipos (2/2)')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
}

async function next(user: User) {
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
}

describe('FixturesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows title and the generate button', () => {
    mockApi(base)
    renderWithProviders(<FixturesPage leagueId="league-1" />)
    expect(screen.getByRole('heading', { name: 'Generador de Jornadas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generar jornadas/i })).toBeInTheDocument()
  })

  it('shows an empty state when the league has no tournaments', async () => {
    mockApi({ ...base, 'GET /leagues/league-1/tournaments': { body: { data: [], page } } })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
    expect(await screen.findByText('Sin torneos')).toBeInTheDocument()
  })

  it('shows an empty state when the league has no teams', async () => {
    mockApi({ ...base, 'GET /teams': { body: { data: [], page } } })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
    expect(await screen.findByText('Sin equipos')).toBeInTheDocument()
  })

  it('shows an error with retry when the tournaments request fails', async () => {
    mockApi({
      ...base,
      'GET /leagues/league-1/tournaments': { status: 500, body: { error: { code: 'internal', message: 'Falla del servidor' } } },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
    expect(await screen.findByText('Falla del servidor')).toBeInTheDocument()
  })

  it('requests teams of the current league', async () => {
    const fetchMock = mockApi(base)
    renderWithProviders(<FixturesPage leagueId="league-1" />)
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/teams?'))).toBe(true))
    const url = new URL(String(fetchMock.mock.calls.find(([u]) => String(u).includes('/teams?'))![0]), 'http://localhost')
    expect(url.searchParams.get('league_id')).toBe('league-1')
  })

  it('goes through every step and posts the exact generate request, then shows the rounds', async () => {
    const fetchMock = mockApi({
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': {
        status: 201,
        body: { matches: [match(1), match(2), match(3)], rounds: 3 },
      },
      'POST /knowledge/triggers': { body: {} },
      'POST /notifications/leagues/league-1': { body: {} },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)

    await goToSchedule(user)
    // the inactive team is not offered; schedule step: fill everything
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await user.type(screen.getByLabelText('Fecha de fin (opcional)'), '2024-05-01')
    await user.click(screen.getByLabelText('Domingo'))
    await user.clear(screen.getByLabelText('Hora de inicio'))
    await user.type(screen.getByLabelText('Hora de inicio'), '09:30')
    await user.type(screen.getByLabelText('Hora de fin (opcional)'), '20:00')
    await user.clear(screen.getByLabelText('Canchas disponibles'))
    await user.type(screen.getByLabelText('Canchas disponibles'), '2')
    await user.clear(screen.getByLabelText('Minutos por tiempo'))
    await user.type(screen.getByLabelText('Minutos por tiempo'), '25')
    await user.clear(screen.getByLabelText('Descanso entretiempos'))
    await user.type(screen.getByLabelText('Descanso entretiempos'), '5')
    await user.clear(screen.getByLabelText('Descanso entre partidos'))
    await user.type(screen.getByLabelText('Descanso entre partidos'), '10')
    await next(user)

    await user.click(screen.getByLabelText('Ida y vuelta (doblete)'))
    await next(user)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Torneo A')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))

    expect(await screen.findByText(/Fixtures generados correctamente/)).toBeInTheDocument()
    expect(screen.getByText('Se generaron 3 partidos en 3 jornadas.')).toBeInTheDocument()
    const schedule = {
      start_date: '2024-02-03',
      end_date: '2024-05-01',
      match_days: ['saturday', 'sunday'],
      start_time: '09:30',
      end_time: '20:00',
      fields_available: 2,
      half_minutes: 25,
      halftime_break_minutes: 5,
      break_between_matches: 10,
    }
    const sent = { tournament_id: 'tour-1', teams: [{ id: 'team-1', name: 'Equipo 1' }, { id: 'team-2', name: 'Equipo 2' }], is_double_round: true, schedule }
    // First the preview (dry_run), then the same request without it.
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate')).toEqual([{ ...sent, dry_run: true }, sent])
    expect(requestsTo(fetchMock, 'POST /knowledge/triggers')).toEqual([
      { trigger_type: 'jornada_update', league_id: 'league-1', tournament_id: 'tour-1', round: 1 },
    ])
    expect(requestsTo(fetchMock, 'POST /notifications/leagues/league-1')).toEqual([
      { league_id: 'league-1', tournament_id: 'tour-1', round: 1 },
    ])
  })

  it('sends only the teams the admin keeps checked', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': { body: { data: [...teams.slice(0, 2), { ...teams[0]!, id: 'team-4', name: 'Equipo 4' }], page } },
      'POST /tournaments/tour-1/fixtures/generate': { status: 201, body: { matches: [match(1)], rounds: 1 } },
      'POST /knowledge/triggers': { body: {} },
      'POST /notifications/leagues/league-1': { body: {} },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
    await screen.findByText('Equipos (3/3)')
    await user.click(screen.getByLabelText('Equipo 4'))
    await next(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))
    await screen.findByText(/Fixtures generados correctamente/)

    const [body] = requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate') as Array<{
      teams: unknown[]
      is_double_round: boolean
    }>
    expect(body?.teams).toEqual([
      { id: 'team-1', name: 'Equipo 1' },
      { id: 'team-2', name: 'Equipo 2' },
    ])
    expect(body?.is_double_round).toBe(false)
  })

  it('shows a 422 on schedule.start_date next to the field and keeps the typed value', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { 'schedule.start_date': 'debe tener formato AAAA-MM-DD' },
          },
        },
      },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await goToSchedule(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))

    const input = await screen.findByLabelText('Fecha de inicio')
    expect(screen.getByText('debe tener formato AAAA-MM-DD')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveValue('2024-02-03')
    expect(screen.queryByText(/Fixtures generados correctamente/)).not.toBeInTheDocument()
  })

  it('shows a 422 on "schedule" (rounds do not fit) at the top of the schedule step', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { schedule: 'la jornada 2 no cabe antes de la fecha de fin' },
          },
        },
      },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await goToSchedule(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('la jornada 2 no cabe antes de la fecha de fin')
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2024-02-03')
  })

  it('keeps the success view and warns when the follow-up requests fail', async () => {
    mockApi({
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': { status: 201, body: { matches: [match(1)], rounds: 1 } },
      'POST /knowledge/triggers': { status: 500, body: { error: { code: 'internal', message: 'boom' } } },
      'POST /notifications/leagues/league-1': { body: {} },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await goToSchedule(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))

    expect(await screen.findByText(/no se pudo notificar o actualizar la base de conocimiento/)).toBeInTheDocument()
    expect(screen.getByText(/Fixtures generados correctamente/)).toBeInTheDocument()
  })

  it('invalidates the tournament matches so calendars refresh', async () => {
    const fetchMock = mockApi({
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': { status: 201, body: { matches: [match(1)], rounds: 1 } },
      'POST /knowledge/triggers': { body: {} },
      'POST /notifications/leagues/league-1': { body: {} },
    })
    const { user, client } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    // a calendar query as the matches area registers it
    client.setQueryData(['matches', 'tournament', 'tour-1'], { data: [], page })
    await goToSchedule(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))
    await screen.findByText(/Fixtures generados correctamente/)

    expect(client.getQueryState(['matches', 'tournament', 'tour-1'])?.isInvalidated).toBe(true)
    // the wizard's own matches query is refetched too
    const getsToMatches = fetchMock.mock.calls.filter(
      ([u, i]) => String(u).includes('/tournaments/tour-1/matches') && (i?.method ?? 'GET') === 'GET',
    )
    expect(getsToMatches.length).toBeGreaterThanOrEqual(2)
  })

  it('asks for confirmation when duplicates exist before generating', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /tournaments/tour-1/duplicates': {
        body: [{ pair: 'A-B', matches: [{ id: 'x', date: '2024-02-01', home_team: 'A', away_team: 'B' }] }],
      },
      'POST /tournaments/tour-1/fixtures/generate': { status: 201, body: { matches: [match(1)], rounds: 1 } },
      'POST /knowledge/triggers': { body: {} },
      'POST /notifications/leagues/league-1': { body: {} },
    })
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await goToSchedule(user)
    await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))
    expect(await screen.findByText('Partidos duplicados encontrados')).toBeInTheDocument()
    // Only the preview was requested so far.
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Generar de todas formas' }))
    expect(await screen.findByText(/Fixtures generados correctamente/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate')).toHaveLength(2)
  })

  it('offers quick day selections and shows the configuration summary before generating', async () => {
    mockApi(base)
    const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
    await goToSchedule(user)

    await user.click(screen.getByRole('button', { name: 'Fines de semana' }))
    expect(screen.getByRole('checkbox', { name: 'Sábado' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Domingo' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Todos los días' }))
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Fines de semana' }))

    await next(user)
    await next(user)
    const summary = await screen.findByRole('region', { name: 'Resumen de Configuración' })
    expect(summary).toHaveTextContent('Jornadas: 1')
    expect(summary).toHaveTextContent('Partidos total: 1')
    expect(summary).toHaveTextContent('Días por semana: 2')
    expect(summary).toHaveTextContent('Duración del partido: 20min + 10min + 20min = 50min')
    expect(summary).toHaveTextContent('Total por espacio: 65min')
  })

  describe('Vista Previa', () => {
    const generated = (i: number, round: number) => ({
      tournament_id: 'tour-1', home_team_id: 'team-1', away_team_id: 'team-2', match_date: `2024-02-0${i}T00:00:00Z`,
      match_time: '09:30', field_number: 2, round,
    })
    const handlers = {
      ...base,
      'POST /tournaments/tour-1/fixtures/generate': { status: 200, body: { matches: [generated(3, 1), generated(10, 2)], rounds: 2, dry_run: true } },
      'POST /knowledge/triggers': { body: {} },
      'POST /notifications/leagues/league-1': { body: {} },
    }
    const toPreview = async (user: User) => {
      await goToSchedule(user)
      await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
      await next(user)
      await next(user)
      await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
      await screen.findByText('Vista Previa del Calendario')
    }

    it('shows rounds with team names, date, time and field, and Volver saves nothing', async () => {
      const fetchMock = mockApi(handlers)
      const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
      await toPreview(user)

      const round1 = screen.getByRole('region', { name: 'Jornada 1' })
      expect(round1).toHaveTextContent('Equipo 1 vs Equipo 2')
      expect(round1).toHaveTextContent('09:30')
      expect(round1).toHaveTextContent('Cancha 2')
      expect(screen.getByRole('region', { name: 'Jornada 2' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Volver' }))
      expect(await screen.findByRole('button', { name: 'Generar Vista Previa' })).toBeInTheDocument()
      const bodies = requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate') as Array<{ dry_run?: boolean }>
      expect(bodies).toHaveLength(1)
      expect(bodies[0]?.dry_run).toBe(true)
      expect(screen.queryByText(/Fixtures generados correctamente/)).not.toBeInTheDocument()
    })

    it('Guardar Calendario sends the same request without dry_run', async () => {
      const fetchMock = mockApi(handlers)
      const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
      await toPreview(user)
      await user.click(screen.getByRole('button', { name: 'Guardar Calendario' }))

      expect(await screen.findByText(/Fixtures generados correctamente/)).toBeInTheDocument()
      const [dry, real] = requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate') as Array<Record<string, unknown>>
      expect(dry).toEqual({ ...real, dry_run: true })
      expect(real).not.toHaveProperty('dry_run')
    })
  })

  describe('group stage', () => {
    const groupTournament = { ...tournament, tournament_format: 'group_knockout', number_of_groups: 2 }
    const grouped = (n: number, group?: string) => ({ ...teams[0]!, id: `team-${n}`, name: `Equipo ${n}`, tournament_id: 'tour-1', ...(group ? { group_name: group } : {}) })
    const groupBase = (list: unknown[]) => ({
      ...base,
      'GET /leagues/league-1/tournaments': { body: { data: [groupTournament], page } },
      'GET /teams': { body: { data: list, page } },
      'POST /tournaments/tour-1/fixtures/generate': { status: 200, body: { matches: [], rounds: 3, dry_run: true } },
    })
    const open = async (user: User) => {
      await user.click(screen.getByRole('button', { name: /generar jornadas/i }))
      await user.click(await screen.findByRole('combobox'))
      await user.click(await screen.findByRole('option', { name: 'Torneo A' }))
    }

    it('blocks while a team has no group and links to Grupos', async () => {
      mockApi(groupBase([grouped(1, 'A'), grouped(2, 'A'), grouped(3, 'B'), grouped(4)]))
      const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
      await open(user)

      expect(await screen.findByText(/no tiene grupo: Equipo 4/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir a Grupos' })).toHaveAttribute('href', '/liga-admin/grupos')
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    })

    it('previews with the chosen groups only, then saves them', async () => {
      const fetchMock = mockApi(groupBase([grouped(1, 'A'), grouped(2, 'A'), grouped(3, 'B'), grouped(4, 'B')]))
      const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
      await open(user)

      expect(await screen.findByText('Seleccionar Grupos (2 de 2)')).toBeInTheDocument()
      await user.click(screen.getByLabelText(/Grupo B/))
      expect(screen.getByText('Seleccionar Grupos (1 de 2)')).toBeInTheDocument()
      await next(user)
      await user.type(screen.getByLabelText('Fecha de inicio'), '2024-02-03')
      await next(user)
      await next(user)
      await user.click(screen.getByRole('button', { name: 'Generar Vista Previa' }))
      await user.click(await screen.findByRole('button', { name: 'Guardar Calendario' }))
      await screen.findByText(/Fixtures generados correctamente/)

      const groups = [{ name: 'A', teams: [{ id: 'team-1', name: 'Equipo 1' }, { id: 'team-2', name: 'Equipo 2' }] }]
      const [dry, real] = requestsTo(fetchMock, 'POST /tournaments/tour-1/fixtures/generate') as Array<Record<string, unknown>>
      expect(dry).toMatchObject({ tournament_id: 'tour-1', groups, dry_run: true })
      expect(dry).not.toHaveProperty('teams')
      expect(real).toMatchObject({ groups })
      expect(real).not.toHaveProperty('dry_run')
    })

    it('blocks a selected group with fewer than 2 teams', async () => {
      mockApi(groupBase([grouped(1, 'A'), grouped(2, 'A'), grouped(3, 'B')]))
      const { user } = renderWithProviders(<FixturesPage leagueId="league-1" />)
      await open(user)
      await screen.findByText('Seleccionar Grupos (1 de 2)')
      await user.click(screen.getByLabelText(/Grupo B/))
      expect(screen.getByText(/Cada grupo necesita al menos 2 equipos: revisa Grupo B/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    })
  })
})
