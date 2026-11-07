import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearSession, getToken, refresh, setSession } from './session'

const future = (ms: number) => new Date(Date.now() + ms).toISOString()

function stubRefresh(status = 200) {
  const fn = vi.fn(async () => {
    await new Promise((r) => setTimeout(r, 5))
    return new Response(status === 200 ? JSON.stringify({ access_token: 'new', expires_at: future(900_000) }) : JSON.stringify({ error: { code: 'unauthorized', message: 'x' } }), { status })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => clearSession())
afterEach(() => vi.unstubAllGlobals())

describe('session', () => {
  it('shares ONE refresh request between concurrent callers', async () => {
    const fetchMock = stubRefresh()
    setSession({ access_token: 'old', expires_at: future(-1000) })

    const tokens = await Promise.all([getToken(), getToken(), getToken()])

    expect(tokens).toEqual(['new', 'new', 'new'])
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls).toHaveLength(1)
    expect(calls[0]![0]).toBe('/api/v1/auth/refresh')
    expect(calls[0]![1]).toMatchObject({ method: 'POST', credentials: 'same-origin' })
    expect(calls[0]![1].headers).not.toHaveProperty('Authorization')
  })

  it('refreshes proactively when the token expires in under 30 seconds', async () => {
    const fetchMock = stubRefresh()
    setSession({ access_token: 'old', expires_at: future(10_000) })
    expect(await getToken()).toBe('new')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps a fresh token without calling the API', async () => {
    const fetchMock = stubRefresh()
    setSession({ access_token: 'ok', expires_at: future(600_000) })
    expect(await getToken()).toBe('ok')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never writes the token to web storage', async () => {
    stubRefresh()
    const local = vi.spyOn(Storage.prototype, 'setItem')
    setSession({ access_token: 'secret', expires_at: future(600_000) })
    await refresh()
    expect(local).not.toHaveBeenCalled()
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('new')
    local.mockRestore()
  })

  it('resolves null and forgets the token when refresh answers 401', async () => {
    stubRefresh(401)
    setSession({ access_token: 'old', expires_at: future(-1) })
    expect(await refresh()).toBeNull()
    expect(await getToken()).toBeNull()
  })
})
