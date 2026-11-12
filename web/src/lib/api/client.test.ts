import { afterEach, describe, expect, it, vi } from 'vitest'

import * as session from '@/lib/auth/session'

import { ApiError, api, configureApiClient } from './client'

afterEach(() => configureApiClient({ getToken: async () => null, refresh: async () => null, onUnauthorized: () => {} }))

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

describe('api client token refresh', () => {
  const future = () => new Date(Date.now() + 900_000).toISOString()

  function routeFetch(handler: (key: string, init: RequestInit | undefined, n: number) => Response) {
    const seen: Record<string, number> = {}
    const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${String(input).replace('/api/v1', '')}`
      seen[key] = (seen[key] ?? 0) + 1
      return handler(key, init, seen[key])
    })
    vi.stubGlobal('fetch', fn)
    return fn
  }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  const auth = (init?: RequestInit) => (init?.headers as Record<string, string>).Authorization

  afterEach(() => {
    session.clearSession()
    vi.unstubAllGlobals()
  })

  it('refreshes once on 401 and retries the request once with the new token', async () => {
    const fn = routeFetch((key, init, n) => {
      if (key === 'POST /auth/refresh') return json(200, { access_token: 'fresh', expires_at: future() })
      return n === 1 ? json(401, { error: { code: 'unauthorized', message: 'x' } }) : json(200, { id: 'u1', token: auth(init) })
    })
    session.setSession({ access_token: 'stale', expires_at: future() })
    const onUnauthorized = vi.fn()
    configureApiClient({ onUnauthorized })

    await expect(api.get('/me')).resolves.toMatchObject({ id: 'u1', token: 'Bearer fresh' })

    const keys = fn.mock.calls.map(([u, i]) => `${i?.method ?? 'GET'} ${String(u)}`)
    expect(keys).toEqual(['GET /api/v1/me', 'POST /api/v1/auth/refresh', 'GET /api/v1/me'])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('calls onUnauthorized without looping when refresh fails', async () => {
    const fn = routeFetch((key) => json(401, { error: { code: 'unauthorized', message: key } }))
    session.setSession({ access_token: 'stale', expires_at: future() })
    const onUnauthorized = vi.fn()
    configureApiClient({ onUnauthorized })

    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 })

    expect(fn).toHaveBeenCalledTimes(2) // /me + one refresh
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not retry forever when the retried request is also 401', async () => {
    const fn = routeFetch((key) =>
      key === 'POST /auth/refresh' ? json(200, { access_token: 'fresh', expires_at: future() }) : json(401, { error: { code: 'unauthorized', message: 'x' } }),
    )
    session.setSession({ access_token: 'stale', expires_at: future() })
    const onUnauthorized = vi.fn()
    configureApiClient({ onUnauthorized })

    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 })
    expect(fn).toHaveBeenCalledTimes(3)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('never sends Authorization to public /auth endpoints', async () => {
    const fn = routeFetch(() => json(200, { access_token: 'a', expires_at: future() }))
    session.setSession({ access_token: 'present', expires_at: future() })
    configureApiClient({ onUnauthorized: () => {} })

    await api.post('/auth/login', { email: 'a@b.mx', password: 'x' })
    await api.post('/auth/refresh')
    await api.post('/auth/password/forgot', { email: 'a@b.mx' })

    for (const [, init] of fn.mock.calls) expect(auth(init)).toBeUndefined()
    await api.post('/auth/password/change', {})
    expect(auth(fn.mock.calls[3]![1])).toBe('Bearer present')
  })
})
