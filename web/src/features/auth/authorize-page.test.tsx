import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AuthorizePage } from './authorize-page'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ status: 'authenticated', profile: { name: 'Ana Pérez', email: 'ana@liga.mx', role: 'league_admin' } }),
}))

afterEach(() => vi.unstubAllGlobals())

const id = '0b6f3a52-6a54-4f4e-9d77-5a8c3f0d9e11'
const request = {
  id,
  client_name: 'Claude',
  redirect_host: 'claude.ai',
  scopes: [{ scope: 'zonagol:read', description: 'Consultar los datos de las ligas y equipos que administras (solo lectura)' }],
  expires_at: '2026-11-24T12:10:00Z',
}

describe('AuthorizePage', () => {
  it('shows who asks for what and returns to the client after approving', async () => {
    const fetchMock = mockApi({
      [`GET /oauth/requests/${id}`]: { body: request },
      [`POST /oauth/requests/${id}/decision`]: { body: { redirect_to: 'https://claude.ai/cb?code=zgc_x&state=s' } },
    })
    const redirect = vi.fn()
    const { user } = renderWithProviders(<AuthorizePage redirect={redirect} />, { route: `/autorizar?solicitud=${id}` })

    expect(await screen.findByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText(/solo lectura/)).toBeInTheDocument()
    expect(screen.getAllByText('claude.ai').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Autorizar' }))
    expect(redirect).toHaveBeenCalledWith('https://claude.ai/cb?code=zgc_x&state=s')
    expect(requestsTo(fetchMock, `POST /oauth/requests/${id}/decision`)).toEqual([{ approve: true }])
    expect(await screen.findByText('Acceso autorizado')).toBeInTheDocument()
  })

  it('cancelling sends approve=false and still returns to the client', async () => {
    const fetchMock = mockApi({
      [`GET /oauth/requests/${id}`]: { body: request },
      [`POST /oauth/requests/${id}/decision`]: { body: { redirect_to: 'https://claude.ai/cb?error=access_denied' } },
    })
    const redirect = vi.fn()
    const { user } = renderWithProviders(<AuthorizePage redirect={redirect} />, { route: `/autorizar?solicitud=${id}` })
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(requestsTo(fetchMock, `POST /oauth/requests/${id}/decision`)).toEqual([{ approve: false }])
    expect(redirect).toHaveBeenCalledWith('https://claude.ai/cb?error=access_denied')
  })

  it('explains an expired request and offers no buttons', async () => {
    mockApi({
      [`GET /oauth/requests/${id}`]: {
        status: 404,
        body: { error: { code: 'authorization_not_found', message: 'La solicitud de conexión no existe o ya expiró.' } },
      },
    })
    renderWithProviders(<AuthorizePage redirect={vi.fn()} />, { route: `/autorizar?solicitud=${id}` })

    expect(await screen.findByRole('alert')).toHaveTextContent('ya expiró')
    expect(screen.queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument()
  })

  it('shows the API reason when the role cannot connect', async () => {
    mockApi({
      [`GET /oauth/requests/${id}`]: {
        status: 403,
        body: { error: { code: 'connection_not_allowed', message: 'Solo administradores de liga y dueños de equipo pueden conectar aplicaciones.' } },
      },
    })
    renderWithProviders(<AuthorizePage redirect={vi.fn()} />, { route: `/autorizar?solicitud=${id}` })
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo administradores de liga')
  })

  it('keeps the user here when the decision fails', async () => {
    mockApi({
      [`GET /oauth/requests/${id}`]: { body: request },
      [`POST /oauth/requests/${id}/decision`]: { status: 404, body: { error: { code: 'authorization_not_found', message: 'La solicitud ya expiró.' } } },
    })
    const redirect = vi.fn()
    const { user } = renderWithProviders(<AuthorizePage redirect={redirect} />, { route: `/autorizar?solicitud=${id}` })
    await user.click(await screen.findByRole('button', { name: 'Autorizar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La solicitud ya expiró.')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('never calls the API for an untrusted client error', async () => {
    const fetchMock = mockApi({})
    renderWithProviders(<AuthorizePage redirect={vi.fn()} />, { route: '/autorizar?error=invalid_redirect_uri' })
    expect(screen.getByRole('alert')).toHaveTextContent('no coincide con la registrada')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
