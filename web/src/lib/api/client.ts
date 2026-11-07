/**
 * Typed client for the Go API. Mirrors backend/CONVENTIONS.md → API contract:
 * - single resources are returned as-is
 * - lists are { data: T[], page: { limit, offset, total? } }
 * - payload-less actions return 204
 * - errors are { error: { code, message, fields? } }
 */

export interface Page {
  limit: number
  offset: number
  total?: number
}

export interface ListResponse<T> {
  data: T[]
  page: Page
}

export interface PageParams {
  limit?: number
  offset?: number
}

/** Error returned by the API; `message` is safe to show to users (Spanish). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isNotFound() {
    return this.status === 404
  }
  get isValidation() {
    return this.status === 422
  }
}

type TokenProvider = () => Promise<string | null>
type UnauthorizedHandler = () => void

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
let getToken: TokenProvider = async () => null
let onUnauthorized: UnauthorizedHandler = () => {}

/** Wired once by the AuthProvider; keeps the client free of React. */
export function configureApiClient(opts: { getToken: TokenProvider; onUnauthorized: UnauthorizedHandler }) {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

type Query = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(baseUrl + path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.pathname + url.search
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = await getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.body instanceof FormData) {
    body = opts.body // the browser sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body, signal: opts.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error', 'No se pudo conectar con el servidor. Revisa tu conexión.')
  }

  if (res.status === 204) return undefined as T
  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error
    const apiError = new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? 'Ocurrió un error inesperado.', err?.fields)
    if (apiError.isUnauthorized) onUnauthorized()
    throw apiError
  }
  return payload as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  list: <T>(path: string, page?: PageParams, opts?: RequestOptions) =>
    request<ListResponse<T>>('GET', path, { ...opts, query: { ...opts?.query, ...page } }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
  delete: <T = void>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
}
