import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { ConnectedAppsDialog } from './connected-apps-dialog'

afterEach(() => vi.unstubAllGlobals())

const connection = {
  id: '7c1d7a40-5d0e-4a57-9a9b-3a1f1f1f2b22',
  client_name: 'Claude',
  scopes: [{ scope: 'zonagol:read', description: 'Consultar los datos de las ligas y equipos que administras (solo lectura)' }],
  created_at: '2026-11-20T10:00:00Z',
  last_used_at: '2026-11-24T09:00:00Z',
}
const page = { limit: 100, offset: 0 }

describe('ConnectedAppsDialog', () => {
  it('lists connections and disconnects after confirming', async () => {
    const fetchMock = mockApi({
      'GET /oauth/connections': { body: { data: [connection], page } },
      [`DELETE /oauth/connections/${connection.id}`]: { status: 204 },
    })
    const { user } = renderWithProviders(<ConnectedAppsDialog />)
    await user.click(screen.getByRole('button', { name: 'Aplicaciones conectadas' }))

    expect(await screen.findByText('Claude')).toBeInTheDocument()
    expect(screen.getByText(/último acceso/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))
    expect(requestsTo(fetchMock, `DELETE /oauth/connections/${connection.id}`)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Sí, desconectar' }))

    await waitFor(() => expect(requestsTo(fetchMock, `DELETE /oauth/connections/${connection.id}`)).toHaveLength(1))
    expect(await screen.findByText('Claude se desconectó.')).toBeInTheDocument()
  })

  it('does not load anything until opened, then shows the empty state', async () => {
    const fetchMock = mockApi({ 'GET /oauth/connections': { body: { data: [], page } } })
    const { user } = renderWithProviders(<ConnectedAppsDialog />)
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Aplicaciones conectadas' }))
    expect(await screen.findByText('No hay aplicaciones conectadas')).toBeInTheDocument()
  })

  it('offers a retry when the list fails', async () => {
    mockApi({ 'GET /oauth/connections': { status: 500, body: { error: { code: 'internal_error', message: 'x' } } } })
    const { user } = renderWithProviders(<ConnectedAppsDialog />)
    await user.click(screen.getByRole('button', { name: 'Aplicaciones conectadas' }))
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
