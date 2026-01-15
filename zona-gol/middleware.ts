import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    isApiRoute(pathname)
  ) {
    return NextResponse.next()
  }

  // Create response and Supabase client
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  try {
    // Refresh session - this will automatically handle token refresh
    const { data: { session }, error } = await supabase.auth.getSession()

    // Handle refresh token errors
    if (error) {
      console.error('[Middleware] Auth error:', error.message)

      // Check if it's a refresh token error
      const isRefreshTokenError =
        error.message?.includes('Refresh Token') ||
        error.message?.includes('refresh_token') ||
        (error as any).code === 'refresh_token_not_found'

      if (isRefreshTokenError) {
        console.warn('[Middleware] Invalid refresh token, redirecting to login')

        // Clear the session cookies by redirecting to login
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('expired', 'true')

        const response = NextResponse.redirect(loginUrl)

        // Clear Supabase cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')

        return response
      }
    }

    // For protected routes, check if user is authenticated
    if (isProtectedRoute(pathname)) {
      if (!session) {
        console.log('[Middleware] No session, redirecting to login from:', pathname)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // If user is logged in and tries to access login page, redirect to dashboard
    if (pathname === '/login' && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return res
  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)

    // On unexpected errors, allow the request to continue
    // The client-side auth will handle it
    return res
  }
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
