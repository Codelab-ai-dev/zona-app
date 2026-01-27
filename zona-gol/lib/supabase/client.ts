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

// Hardcoded values to bypass env var caching issues
const SUPABASE_URL = 'https://api.zona-gol.com'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY'

// Nombre de cookie para sincronización
const COOKIE_NAME = 'sb-zona-gol-auth-token'

// Storage personalizado que sincroniza localStorage con cookies
const createCookieSyncStorage = () => {
  if (typeof window === 'undefined') {
    // En el servidor, retornar storage vacío
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }

  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value)

        // Sincronizar con cookie para que el middleware pueda leerla
        // Cookie expira en 7 días
        const expires = new Date()
        expires.setDate(expires.getDate() + 7)
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
      } catch (e) {
        console.warn('Error setting storage:', e)
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key)

        // Eliminar la cookie también
        document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      } catch (e) {
        console.warn('Error removing storage:', e)
      }
    },
  }
}

// Variable para almacenar la instancia singleton
let clientSingleton: ReturnType<typeof createClient<Database>> | null = null

// Opciones comunes para el cliente de Supabase
const getSupabaseOptions = (): SupabaseClientOptions<'public'> => ({
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: createCookieSyncStorage(),
    storageKey: 'supabase.auth.token',
  },
  global: {
    fetch: createFetchWithTimeout(FETCH_TIMEOUT_MS),
  },
})

// Función para crear o devolver el cliente de Supabase para componentes
export const createClientSupabaseClient = () => {
  // En el servidor, siempre crear una nueva instancia sin storage
  if (typeof window === 'undefined') {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: createFetchWithTimeout(FETCH_TIMEOUT_MS),
      },
    })
  }

  // En el cliente, reutilizar la instancia existente
  if (!clientSingleton) {
    clientSingleton = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, getSupabaseOptions())
  }

  return clientSingleton
}

// Alias para compatibilidad
export const getDirectSupabaseClient = createClientSupabaseClient

// Alias para compatibilidad con código existente (legacy)
// NOTA: Solo usar en contexto de cliente
export const supabase = typeof window !== 'undefined'
  ? createClientSupabaseClient()
  : (null as unknown as ReturnType<typeof createClient<Database>>)
