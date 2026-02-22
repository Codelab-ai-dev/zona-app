import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'

const getSupabaseConfig = () => {
  // Usar NEXT_PUBLIC_SUPABASE_URL para consistencia con el cliente
  // SUPABASE_URL es la URL interna, NEXT_PUBLIC es la URL pública/proxy
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.zona-gol.com'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return { url, key }
}

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseConfig()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll puede fallar en Server Components (son read-only)
          // Esto es esperado y se puede ignorar
        }
      },
    },
  })
}

// For API Route Handlers (app/api/*)
export const createRouteSupabaseClient = async () => {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseConfig()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignorar errores en contexto read-only
        }
      },
    },
  })
}