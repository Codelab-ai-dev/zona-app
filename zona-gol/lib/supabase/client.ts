import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Variables para almacenar las instancias singleton
let clientComponentSingleton: ReturnType<typeof createClientComponentClient<Database>> | null = null
let directClientSingleton: ReturnType<typeof createClient<Database>> | null = null

// Función para crear o devolver el cliente de Supabase para componentes
export const createClientSupabaseClient = () => {
  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClientComponentClient<Database>()
  }
  
  // En el cliente, reutilizar la instancia existente
  if (!clientComponentSingleton) {
    // Crear una única instancia y guardarla
    clientComponentSingleton = createClientComponentClient<Database>()
    
    // Agregar un mensaje de depuración
    console.log('Supabase client singleton created')
  } else {
    console.log('Reusing existing Supabase client singleton')
  }
  
  return clientComponentSingleton
}

// Cliente directo para cuando necesitas más control (singleton)
// IMPORTANTE: Esta es una función, no una constante ejecutada inmediatamente
// para evitar errores de build cuando las env vars no están disponibles
export const getDirectSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClient<Database>(url, key)
  }

  // En el cliente, reutilizar la instancia existente
  if (!directClientSingleton) {
    directClientSingleton = createClient<Database>(url, key)
  }

  return directClientSingleton
}

// Alias para compatibilidad con código existente (legacy)
// NOTA: Solo usar en contexto de cliente, no en el servidor durante build
export const supabase = typeof window !== 'undefined'
  ? getDirectSupabaseClient()
  : (null as unknown as ReturnType<typeof createClient<Database>>)