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
export const supabase = (() => {
  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  // En el cliente, reutilizar la instancia existente
  if (!directClientSingleton) {
    directClientSingleton = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  return directClientSingleton
})()