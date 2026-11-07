import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, configureApiClient } from './client'

afterEach(() => configureApiClient({ getToken: async () => null, onUnauthorized: () => {} }))

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(body === null ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('api client', () => {
  it('sends the bearer token and pagination params', async () => {
    const fn = stubFetch(200, { data: [], page: { limit: 10, offset: 20 } })
    configureApiClient({ getToken: async () => 'tok', onUnauthorized: () => {} })

    await api.list('/teams', { limit: 10, offset: 20 }, { query: { league_id: 'l1', empty: '' } })

    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/teams?league_id=l1&limit=10&offset=20')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('maps API errors with field details', async () => {
    stubFetch(422, { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { name: 'requerido' } } })
    const err = await api.post('/teams', { name: '' }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 422, code: 'validation_failed', message: 'Datos inválidos', fields: { name: 'requerido' } })
  })

  it('notifies on 401 so the session can be cleared', async () => {
    stubFetch(401, { error: { code: 'unauthorized', message: 'Autenticación requerida' } })
    const onUnauthorized = vi.fn()
    configureApiClient({ getToken: async () => 'expired', onUnauthorized })
    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('returns undefined for 204', async () => {
    stubFetch(204, null)
    await expect(api.delete('/storage/objects')).resolves.toBeUndefined()
  })

  it('turns network failures into a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(api.get('/leagues')).rejects.toMatchObject({ code: 'network_error' })
  })
})
