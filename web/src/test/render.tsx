import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { vi, type Mock } from 'vitest'

import { Toaster } from '@/components/ui/sonner'

/** Renders UI with a fresh QueryClient (no retries) and a router. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  )
  return { ...result, user, client }
}

/**
 * Stubs fetch with handlers keyed by "METHOD /path" (path without /api/v1 and
 * query string). Unhandled requests fail the test loudly.
 */
type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>

/**
 * Returns the parsed JSON bodies sent to "METHOD /path" (path without
 * /api/v1 and query string), in call order. Use it to assert what a
 * mutation actually sent.
 */
export function requestsTo(fetchMock: FetchMock, key: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = new URL(String(input), 'http://localhost')
      return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}` === key
    })
    .map(([, init]) => (typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body))
}

export function mockApi(handlers: Record<string, { status?: number; body?: unknown }>): FetchMock {
  const fetchMock: FetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Unhandled request: ${key}`)
    const status = handler.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(handler.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
