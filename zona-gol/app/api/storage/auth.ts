import { cookies } from 'next/headers'

// Cookie name used by the client
const AUTH_COOKIE_NAME = 'sb-zona-gol-auth-token'

// Decode JWT to check expiration
function decodeJWT(token: string): { exp?: number; sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

// Verify authentication from custom cookie
export async function verifyStorageAuth(): Promise<{ userId: string } | null> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)

    if (!authCookie?.value) {
      console.log('[Storage Auth] No auth cookie found')
      return null
    }

    // Parse the session from the cookie
    const sessionData = JSON.parse(decodeURIComponent(authCookie.value))

    if (!sessionData?.access_token || !sessionData?.user?.id) {
      console.log('[Storage Auth] Invalid session data in cookie')
      return null
    }

    // Verify token is not expired
    const decoded = decodeJWT(sessionData.access_token)
    if (!decoded?.exp) {
      console.log('[Storage Auth] Could not decode JWT')
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp < now) {
      console.log('[Storage Auth] Token expired')
      return null
    }

    // Token is valid, trust the session
    return { userId: sessionData.user.id }
  } catch (error) {
    console.error('[Storage Auth] Verification error:', error)
    return null
  }
}
