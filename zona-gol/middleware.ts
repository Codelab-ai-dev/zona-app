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
  '/monitoring', // Sentry tunnel route
]

// Timeout para operaciones de auth en el middleware (5 segundos)
const AUTH_TIMEOUT_MS = 5000

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

// Helper para crear una promesa con timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ])
}

// Helper para limpiar cookies de sesión y redirigir a login
function clearSessionAndRedirect(request: NextRequest, reason: string): NextResponse {
  console.warn(`[Middleware] ${reason}, clearing session`)

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('expired', 'true')

  const response = NextResponse.redirect(loginUrl)

  // Limpiar todas las cookies de Supabase
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
  ]

  // También limpiar cookies con el prefijo del proyecto
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      cookiesToClear.push(cookie.name)
    }
  })

  cookiesToClear.forEach(name => {
    response.cookies.delete(name)
  })

  return response
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

  // Para rutas públicas que no son login, permitir sin verificar auth
  // Esto evita llamadas innecesarias a Supabase
  if (isPublicRoute(pathname) && pathname !== '/login') {
    return NextResponse.next()
  }

  // Create response and Supabase client
  const res = NextResponse.next()

  // Crear cliente con auto-refresh deshabilitado para evitar loops
  const supabase = createMiddlewareClient(
    { req: request, res },
    {
      options: {
        auth: {
          autoRefreshToken: false, // Deshabilitar auto-refresh en middleware
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    }
  )

  try {
    // Obtener sesión con timeout para evitar que se cuelgue
    const sessionPromise = supabase.auth.getSession()
    const { data: { session }, error } = await withTimeout(
      sessionPromise,
      AUTH_TIMEOUT_MS,
      'Auth timeout'
    )

    // Handle any auth errors
    if (error) {
      console.error('[Middleware] Auth error:', error.message)

      // Para rutas protegidas, redirigir a login
      if (isProtectedRoute(pathname)) {
        return clearSessionAndRedirect(request, `Auth error: ${error.message}`)
      }

      // Para otras rutas, continuar sin sesión
      return res
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Middleware] Unexpected error:', errorMessage)

    // Si es un error de timeout o red en ruta protegida, redirigir a login
    if (isProtectedRoute(pathname)) {
      // Verificar si es error de red/timeout
      const isNetworkError =
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ETIMEDOUT')

      if (isNetworkError) {
        return clearSessionAndRedirect(request, `Network error: ${errorMessage}`)
      }

      // Para otros errores en rutas protegidas, también redirigir
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'auth_error')
      return NextResponse.redirect(loginUrl)
    }

    // Para rutas públicas, permitir continuar
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
