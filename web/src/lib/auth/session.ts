/**
 * In-memory access-token session (no React). The refresh token lives in an
 * HttpOnly cookie managed by the browser; the access token is NEVER written to
 * localStorage/sessionStorage so XSS cannot read a long-lived credential.
 */

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
const REFRESH_SKEW_MS = 30_000

export interface TokenResponse {
  access_token: string
  expires_at: string
}

let token: string | null = null
let expiresAt = 0
let inflight: Promise<string | null> | null = null

/** Stores a token pair returned by /auth/login or /auth/refresh. */
export function setSession(res: TokenResponse): void {
  token = res.access_token
  const t = Date.parse(res.expires_at)
  expiresAt = Number.isNaN(t) ? Date.now() + 5 * 60_000 : t
}

/** Forgets the access token (the cookie is cleared by POST /auth/logout). */
export function clearSession(): void {
  token = null
  expiresAt = 0
}

export function hasToken(): boolean {
  return token !== null
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share
 * ONE request: the server treats a reused refresh token as theft and revokes
 * the whole session. Resolves null when anonymous (no/invalid cookie).
 */
export function refresh(): Promise<string | null> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        if (res.status === 401) clearSession()
        return null
      }
      setSession((await res.json()) as TokenResponse)
      return token
    } catch {
      return null // network failure: keep whatever we have, caller decides
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Current token; refreshes proactively when it expires in under 30 seconds. */
export async function getToken(): Promise<string | null> {
  if (token === null) return null
  if (expiresAt - Date.now() > REFRESH_SKEW_MS) return token
  return refresh()
}
