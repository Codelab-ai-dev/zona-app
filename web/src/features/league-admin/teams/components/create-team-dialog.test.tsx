import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { CreateTeamDialog } from './create-team-dialog'

type User = ReturnType<typeof renderWithProviders>['user']

const created = { status: 201, body: { id: 'team-1' } }

async function fillTeam(user: User, name = 'Los Campeones') {
  await user.type(screen.getByLabelText('Nombre del equipo'), name)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

async function fillOwner(user: User, password = 'SecurePass123!', confirm = password, email = 'juan@example.com') {
  await user.type(await screen.findByLabelText('Nombre del propietario'), 'Juan Pérez')
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText(/^contraseña/i), password)
  await user.type(screen.getByLabelText('Confirmar contraseña'), confirm)
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: /crear equipo y propietario|reintentar propietario/i }))
const setup = (onOpenChange = vi.fn()) =>
  renderWithProviders(<CreateTeamDialog open onOpenChange={onOpenChange} leagueId="league-1" />)

describe('CreateTeamDialog', () => {
  it('creates the team, then the owner with the typed password, and closes', async () => {
    const onOpenChange = vi.fn()
    const fetchMock = mockApi({ 'POST /teams': created, 'POST /admin/users': created })
    const { user } = setup(onOpenChange)

    await fillTeam(user)
    await fillOwner(user)
    await user.type(screen.getByLabelText(/teléfono/i), '5512345678')
    await submit(user)

    expect(await screen.findByText('Equipo creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /teams')).toEqual([
      { name: 'LOS CAMPEONES', slug: 'los-campeones', league_id: 'league-1' },
    ])
    expect(requestsTo(fetchMock, 'POST /admin/users')).toEqual([
      {
        name: 'JUAN PÉREZ',
        email: 'juan@example.com',
        password: 'SecurePass123!',
        phone: '5512345678',
        role: 'team_owner',
        league_id: 'league-1',
      },
    ])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('requires a team name and sends nothing', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    const name = screen.getByLabelText('Nombre del equipo')
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')).toEqual([])
  })

  it('generates an accent-free slug from the name until the slug is edited by hand', async () => {
    mockApi({})
    const { user } = setup()

    const name = screen.getByLabelText('Nombre del equipo')
    await user.type(name, 'Las Águilas FC')
    expect(screen.getByLabelText('Slug')).toHaveValue('las-aguilas-fc')

    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'Águilas')
    await user.type(name, ' B')
    expect(screen.getByLabelText('Slug')).toHaveValue('águilas')
  })

  it('blocks a mismatched password: error shown, values kept, no request', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user, 'SecurePass123!', 'DifferentPass456!')
    await submit(user)

    const confirm = screen.getByLabelText('Confirmar contraseña')
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(confirm).toHaveAttribute('aria-invalid', 'true')
    expect(confirm).toHaveValue('DifferentPass456!')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')).toEqual([])
  })

  it('blocks a password shorter than 10 characters: no request', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user, 'short')
    await submit(user)

    expect(screen.getByText('La contraseña debe tener mínimo 10 caracteres')).toBeInTheDocument()
    expect(screen.getByLabelText(/^contraseña/i)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')).toEqual([])
  })

  it('blocks an invalid email: no request', async () => {
    const fetchMock = mockApi({})
    const { user } = setup()

    await fillTeam(user)
    await fillOwner(user, 'SecurePass123!', 'SecurePass123!', 'no-es-email')
    await submit(user)

    expect(screen.getByText('Email inválido')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')).toEqual([])
  })

  it('shows API field errors on the team step and keeps what was typed', async () => {
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
    const slug = screen.getByLabelText('Slug')
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    expect(slug).toHaveValue('los-campeones')
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
    expect(screen.getByLabelText('Email')).toHaveValue('juan@example.com')
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
    expect(requestsTo(fetchMock, 'POST /admin/users')).toHaveLength(2)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
