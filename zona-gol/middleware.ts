import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Nombre de la cookie que usamos para sincronizar
const AUTH_COOKIE_NAME = 'sb-zona-gol-auth-token'

// Rutas que requieren autenticación
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
]

// Rutas públicas (no requieren auth)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/reset-password',
  '/offline',
  '/play',
  '/liga',
  '/ligas',
  '/equipos',
]

// Rutas de API que no deben pasar por el middleware de auth
const API_ROUTES = [
  '/api/auth',
  '/api/upload',
  '/api/cron',
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  // Página principal exacta
  if (pathname === '/') return true

  return PUBLIC_ROUTES.some(route =>
    route !== '/' && pathname.startsWith(route)
  )
}

function isApiRoute(pathname: string): boolean {
  return API_ROUTES.some(route => pathname.startsWith(route))
}

// Decodificar JWT sin verificar firma (solo para extraer exp)
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

// Verificar si hay una sesión válida en las cookies
function hasValidSession(request: NextRequest): boolean {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)

  if (!authCookie?.value) {
    return false
  }

  try {
    // La cookie contiene el objeto de sesión de Supabase codificado
    const sessionData = JSON.parse(decodeURIComponent(authCookie.value))

    if (!sessionData?.access_token) {
      return false
    }

    // Decodificar el JWT para verificar expiración
    const decoded = decodeJWT(sessionData.access_token)

    if (!decoded?.exp) {
      return false
    }

    // Verificar que no haya expirado (con 60 segundos de margen)
    const now = Math.floor(Date.now() / 1000)
    const isValid = decoded.exp > (now - 60)

    return isValid
  } catch (e) {
    console.warn('[Middleware] Error parsing auth cookie:', e)
    return false
  }
}

// Helper para limpiar cookies de sesión y redirigir a login
function clearSessionAndRedirect(request: NextRequest, reason: string): NextResponse {
  console.warn(`[Middleware] ${reason}, clearing session`)

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('expired', 'true')

  const response = NextResponse.redirect(loginUrl)

  // Limpiar la cookie de auth
  response.cookies.delete(AUTH_COOKIE_NAME)

  // También limpiar cookies legacy de Supabase
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      response.cookies.delete(cookie.name)
    }
  })

  return response
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    isApiRoute(pathname)
  ) {
    return NextResponse.next()
  }

  // Handle auth callback tokens (recovery, email verification, etc.)
  // If token and type params are present, redirect to auth callback
  // BUT skip if already on reset-password (to avoid redirect loop)
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  if (token && type && (type === 'recovery' || type === 'email' || type === 'signup')) {
    // Don't redirect if already on reset-password page (callback redirects here with token)
    if (pathname === '/reset-password') {
      return NextResponse.next()
    }
    const callbackUrl = new URL('/api/auth/callback', request.url)
    // Pass all search params to the callback
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
  }

  // Para rutas públicas que no son login, permitir sin verificar auth
  if (isPublicRoute(pathname) && pathname !== '/login') {
    return NextResponse.next()
  }

  // Verificar si hay sesión válida
  const hasSession = hasValidSession(request)

  // For protected routes, check if user is authenticated
  if (isProtectedRoute(pathname)) {
    if (!hasSession) {
      console.log('[Middleware] No valid session, redirecting to login from:', pathname)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
