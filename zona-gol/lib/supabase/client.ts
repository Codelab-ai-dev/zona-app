import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { Database } from './database.types'

// Configuración de timeout para fetch
const FETCH_TIMEOUT_MS = 15000 // 15 segundos

// Crear un fetch con timeout
function createFetchWithTimeout(timeoutMs: number): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // Convertir AbortError a un error más descriptivo
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`)
        ;(timeoutError as any).code = 'ETIMEDOUT'
        throw timeoutError
      }

      throw error
    }
  }
}

// Variables para almacenar las instancias singleton
let clientComponentSingleton: ReturnType<typeof createClientComponentClient<Database>> | null = null
let directClientSingleton: ReturnType<typeof createClient<Database>> | null = null

// Opciones comunes para el cliente de Supabase
const getSupabaseOptions = (): SupabaseClientOptions<'public'> => ({
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: createFetchWithTimeout(FETCH_TIMEOUT_MS),
  },
})

// Hardcoded values to bypass env var caching issues
const SUPABASE_URL = 'https://api.zona-gol.com'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY'

// Función para crear o devolver el cliente de Supabase para componentes
export const createClientSupabaseClient = () => {
  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, getSupabaseOptions())
  }

  // En el cliente, reutilizar la instancia existente
  if (!clientComponentSingleton) {
    // Crear una única instancia con opciones de timeout usando URL hardcodeada
    clientComponentSingleton = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, getSupabaseOptions())
  }

  return clientComponentSingleton as any
}

// Cliente directo para cuando necesitas más control (singleton)
// IMPORTANTE: Esta es una función, no una constante ejecutada inmediatamente
// para evitar errores de build cuando las env vars no están disponibles
export const getDirectSupabaseClient = () => {
  // Hardcoded URL to bypass env var caching issues
  const url = 'https://api.zona-gol.com'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY'

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  // En el servidor, siempre crear una nueva instancia con timeout
  if (typeof window === 'undefined') {
    return createClient<Database>(url, key, getSupabaseOptions())
  }

  // En el cliente, reutilizar la instancia existente
  if (!directClientSingleton) {
    directClientSingleton = createClient<Database>(url, key, getSupabaseOptions())
  }

  return directClientSingleton
}

// Alias para compatibilidad con código existente (legacy)
// NOTA: Solo usar en contexto de cliente, no en el servidor durante build
export const supabase = typeof window !== 'undefined'
  ? getDirectSupabaseClient()
  : (null as unknown as ReturnType<typeof createClient<Database>>)