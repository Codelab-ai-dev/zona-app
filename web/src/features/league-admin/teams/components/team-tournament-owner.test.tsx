import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { page, team } from '../test-fixtures'
import { CreateTeamDialog } from './create-team-dialog'
import { EditTeamDialog } from './edit-team-dialog'

const tournaments = page([{ id: 'tour-1', name: 'Apertura', league_id: 'league-1' }])

describe('create team with a tournament', () => {
  it('creates the team assigned to the chosen tournament', async () => {
    const fetchMock = mockApi({
      'GET /leagues/league-1/tournaments': tournaments,
      'POST /teams': { status: 201, body: { id: 't1' } },
      'POST /admin/users': { status: 201, body: { id: 'u1' } },
    })
    const { user } = renderWithProviders(<CreateTeamDialog open onOpenChange={() => {}} leagueId="league-1" />)

    await user.type(screen.getByLabelText('Nombre del Equipo *'), 'Tigres')
    await user.click(screen.getByRole('combobox', { name: /torneo/i }))
    await user.click(await screen.findByRole('option', { name: 'Apertura' }))
    await user.type(screen.getByLabelText('Nombre Completo *'), 'Ana')
    await user.type(screen.getByLabelText('Email *'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Crear Equipo' }))

    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams')).toEqual([
      { name: 'TIGRES', slug: 'tigres', league_id: 'league-1', tournament_id: 'tour-1' },
    ])
  })
})

const owner = { id: 'owner-team-1', name: 'JUAN PEREZ', email: 'juan@example.com', phone: '5511111111', role: 'team_owner', is_active: true, created_at: '2024-01-01T00:00:00Z' }

describe('edit team tournament and owner', () => {
  const t = team('team-1', 'Los Campeones', { tournament_id: 'tour-1' })
  const reads = { 'GET /leagues/league-1/tournaments': tournaments, 'GET /admin/users/owner-team-1': { body: owner } }
  const open = () => renderWithProviders(<EditTeamDialog team={t} open onOpenChange={() => {}} />)

  it('prefills the owner and sends only the changed fields', async () => {
    const fetchMock = mockApi({ ...reads, 'PATCH /teams/team-1': { body: t }, 'PATCH /admin/users/owner-team-1': { body: owner } })
    const { user } = open()

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('juan@example.com'))
    expect(screen.getByLabelText('Nombre')).toHaveValue('JUAN PEREZ')
    const phone = screen.getByLabelText('Teléfono')
    await user.clear(phone)
    await user.type(phone, '5512345678')
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))

    expect(await screen.findByText('Equipo actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /admin/users/owner-team-1')).toEqual([{ phone: '5512345678' }])
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ name: 'Los Campeones' }])
  })

  it('clears the description by sending an empty string and uploads a new logo', async () => {
    const withDescription = team('team-1', 'Los Campeones', { tournament_id: 'tour-1', description: 'Del barrio' })
    const fetchMock = mockApi({
      ...reads,
      'POST /storage/objects': { status: 201, body: { key: 'team/team-1/l.png', url: 'https://cdn/l.png', is_public: true } },
      'PATCH /teams/team-1': { body: withDescription },
    })
    const { user } = renderWithProviders(<EditTeamDialog team={withDescription} open onOpenChange={() => {}} />)

    await user.clear(screen.getByLabelText('Descripción'))
    await user.upload(screen.getByLabelText('Logo del equipo'), new File(['x'], 'l.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))

    expect(await screen.findByText('Equipo actualizado exitosamente')).toBeInTheDocument()
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope_id')).toBe('team-1')
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([
      { name: 'Los Campeones', description: '', logo: 'https://cdn/l.png' },
    ])
  })

  it('changes the URL (slug) only when edited and shows the duplicate error on 422', async () => {
    const fetchMock = mockApi({
      ...reads,
      'PATCH /teams/team-1': { status: 422, body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { slug: 'ya existe un equipo con esa URL en la liga' } } } },
    })
    const { user } = open()

    const slug = screen.getByLabelText('URL Personalizada')
    expect(slug).toHaveValue('los-campeones')
    await user.clear(slug)
    await user.type(slug, 'Campeones-FC')
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))

    expect(await screen.findByText('ya existe un equipo con esa URL en la liga')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ name: 'Los Campeones', slug: 'campeones-fc' }])
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    expect(slug).toHaveValue('campeones-fc')
  })

  it('clears the tournament with the nil UUID', async () => {
    const fetchMock = mockApi({ ...reads, 'PATCH /teams/team-1': { body: t } })
    const { user } = open()

    await user.click(screen.getByRole('combobox', { name: 'Torneo' }))
    await user.click(await screen.findByRole('option', { name: 'Sin torneo asignado' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))

    expect(await screen.findByText('Equipo actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([
      { name: 'Los Campeones', tournament_id: '00000000-0000-0000-0000-000000000000' },
    ])
  })

  it('shows the tournament field error on 422 and keeps the dialog open', async () => {
    mockApi({
      ...reads,
      'PATCH /teams/team-1': { status: 422, body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { tournament_id: 'El torneo no pertenece a la liga' } } } },
    })
    const { user } = open()

    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))
    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument()
  })

  it('keeps the owner blank with an explanation when the account cannot be loaded', async () => {
    const fetchMock = mockApi({
      'GET /leagues/league-1/tournaments': tournaments,
      'GET /admin/users/owner-team-1': { status: 403, body: { error: { code: 'forbidden', message: 'Sin permiso' } } },
      'PATCH /teams/team-1': { body: t },
    })
    const { user } = open()

    expect(await screen.findByText(/no se pudieron cargar los datos actuales/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))
    expect(await screen.findByText('Equipo actualizado exitosamente')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u, init]) => String(u).includes('/admin/users') && init?.method === 'PATCH')).toBe(false)
  })

  it('shows the owner field error on 422 and keeps the typed value', async () => {
    mockApi({
      ...reads,
      'PATCH /teams/team-1': { body: t },
      'PATCH /admin/users/owner-team-1': { status: 422, body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { email: 'El formato del email no es válido' } } } },
    })
    const { user } = open()

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('juan@example.com'))
    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'malo')
    await user.click(screen.getByRole('button', { name: 'Actualizar Equipo' }))

    expect(await screen.findByText('El formato del email no es válido')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveValue('malo')
  })
})
