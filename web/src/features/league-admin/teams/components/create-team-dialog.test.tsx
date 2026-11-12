import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CreateTeamDialog } from './create-team-dialog'

type User = ReturnType<typeof renderWithProviders>['user']

const created = { status: 201, body: { id: 'team-1' } }

async function fillTeam(user: User, name = 'Los Campeones') {
  await user.type(screen.getByLabelText('Nombre del Equipo *'), name)
}

async function fillOwner(user: User, email = 'juan@example.com') {
  await user.type(screen.getByLabelText('Nombre Completo *'), 'Juan Pérez')
  await user.type(screen.getByLabelText('Email *'), email)
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: /^crear equipo$|reintentar propietario/i }))
const setup = (onOpenChange = vi.fn()) =>
  renderWithProviders(<CreateTeamDialog open onOpenChange={onOpenChange} leagueId="league-1" />)
const noWrites = (fetchMock: ReturnType<typeof mockApi>) => fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')

describe('CreateTeamDialog', () => {
  it('creates the team, then the owner with a generated password, closes and shows the credentials', async () => {
    const onOpenChange = vi.fn()
    const fetchMock = mockApi({ 'POST /teams': created, 'POST /admin/users': created })
    const { user } = setup(onOpenChange)

    await fillTeam(user)
    await fillOwner(user)
    await user.type(screen.getByLabelText('Teléfono'), '5512345678')
    await submit(user)

    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams')).toEqual([
      { name: 'LOS CAMPEONES', slug: 'los-campeones', league_id: 'league-1' },
    ])
    const [ownerBody] = requestsTo(fetchMock, 'POST /admin/users') as Array<{ password: string }>
    expect(ownerBody).toMatchObject({
      name: 'JUAN PÉREZ',
      email: 'juan@example.com',
      phone: '5512345678',
      role: 'team_owner',
      league_id: 'league-1',
      team_id: 'team-1',
    })
    expect(ownerBody?.password).toHaveLength(12)
    expect(onOpenChange).toHaveBeenCalledWith(false)

    const credentials = await screen.findByRole('dialog', { name: 'Equipo Creado Exitosamente' })
    expect(within(credentials).getByText(ownerBody?.password ?? '')).toBeInTheDocument()
    expect(within(credentials).getByText('juan@example.com')).toBeInTheDocument()
    await user.click(within(credentials).getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog', { name: 'Equipo Creado Exitosamente' })).not.toBeInTheDocument()
  })

  it('uploads the chosen logo to the new team and stores its URL', async () => {
    const fetchMock = mockApi({
      'POST /teams': created,
      'POST /storage/objects': { status: 201, body: { key: 'team/team-1/logo.png', url: 'https://cdn/logo.png', is_public: true } },
      'PATCH /teams/team-1': { body: {} },
      'POST /admin/users': created,
    })
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user)
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo del equipo'), file)
    await submit(user)

    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope')).toBe('team')
    expect(form?.get('scope_id')).toBe('team-1')
    expect((form?.get('file') as File).name).toBe('logo.png')
    expect(requestsTo(fetchMock, 'PATCH /teams/team-1')).toEqual([{ logo: 'https://cdn/logo.png' }])
  })

  it('creates the team anyway when the logo upload fails and warns about it', async () => {
    const fetchMock = mockApi({
      'POST /teams': created,
      'POST /storage/objects': { status: 413, body: { error: { code: 'too_large', message: 'Archivo muy grande' } } },
      'POST /admin/users': created,
    })
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user)
    await user.upload(screen.getByLabelText('Logo del equipo'), new File(['x'], 'logo.png', { type: 'image/png' }))
    await submit(user)

    expect(await screen.findByText(/no se pudo guardar el logo: Archivo muy grande/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(1)
  })

  it('rejects a logo larger than 2 MB without sending anything', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo del equipo'), big)

    expect(screen.getByRole('alert')).toHaveTextContent('La imagen no debe exceder 2 MB')
    expect(noWrites(fetchMock)).toEqual([])
  })

  it('generates the slug from the name when the slug is left empty', async () => {
    const fetchMock = mockApi({ 'POST /teams': created, 'POST /admin/users': created })
    const { user } = setup()

    await fillTeam(user, 'Las Águilas FC')
    await user.clear(screen.getByLabelText('URL Personalizada'))
    await fillOwner(user)
    await submit(user)

    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams')).toEqual([{ name: 'LAS ÁGUILAS FC', slug: 'las-aguilas-fc', league_id: 'league-1' }])
  })

  it('requires the team name, owner name and email and sends nothing', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await submit(user)

    const name = screen.getByLabelText('Nombre del Equipo *')
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('El nombre del propietario es requerido')).toBeInTheDocument()
    expect(screen.getByText('El email es requerido')).toBeInTheDocument()
    expect(noWrites(fetchMock)).toEqual([])
  })

  it('generates an accent-free slug from the name until the slug is edited by hand', async () => {
    mockApi({})
    const { user } = setup()

    const name = screen.getByLabelText('Nombre del Equipo *')
    await user.type(name, 'Las Águilas FC')
    expect(screen.getByLabelText('URL Personalizada')).toHaveValue('las-aguilas-fc')

    await user.clear(screen.getByLabelText('URL Personalizada'))
    await user.type(screen.getByLabelText('URL Personalizada'), 'Águilas')
    await user.type(name, ' B')
    expect(screen.getByLabelText('URL Personalizada')).toHaveValue('águilas')
  })

  it('blocks an invalid email: no request', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user, 'no-es-email')
    await submit(user)

    expect(screen.getByText('Email inválido')).toBeInTheDocument()
    expect(noWrites(fetchMock)).toEqual([])
  })

  it('shows API field errors and keeps what was typed', async () => {
    mockApi({
      'POST /teams': {
        status: 422,
        body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { slug: 'El slug ya está en uso' } } },
      },
    })
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user)
    await submit(user)

    expect(await screen.findByText('El slug ya está en uso')).toBeInTheDocument()
    const slug = screen.getByLabelText('URL Personalizada')
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    expect(slug).toHaveValue('los-campeones')
    expect(screen.getByLabelText('Email *')).toHaveValue('juan@example.com')
  })

  it('shows the API message on a 409 conflict and does not create the owner', async () => {
    const fetchMock = mockApi({
      'POST /teams': { status: 409, body: { error: { code: 'conflict', message: 'El equipo ya existe' } } },
    })
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user)
    await submit(user)

    expect(await screen.findByText('El equipo ya existe')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([])
    expect(screen.getByLabelText('Email *')).toHaveValue('juan@example.com')
  })

  it('retries only the owner when the team was already created', async () => {
    let attempt = 0
    const fetchMock = mockApi({ 'POST /teams': created, 'POST /admin/users': created })
    const original = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith('/admin/users') && attempt++ === 0) {
        return new Response(JSON.stringify({ error: { code: 'conflict', message: 'El email ya está registrado' } }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    })
    const onOpenChange = vi.fn()
    const { user } = setup(onOpenChange)

    await fillTeam(user)
    await fillOwner(user)
    await submit(user)
    expect(await screen.findByText('El equipo se creó, pero falló el propietario: El email ya está registrado')).toBeInTheDocument()

    await submit(user)
    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams')).toHaveLength(1)
    const owners = requestsTo(fetchMock, 'POST /admin/users') as Array<{ team_id?: string }>
    expect(owners.map((o) => o.team_id)).toEqual(['team-1', 'team-1'])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
