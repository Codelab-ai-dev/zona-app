import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase is used ONLY for sign-in/out and token refresh until the Go API
 * issues its own tokens (phase 3). All data access goes through src/lib/api.
 */
let client: SupabaseClient | null = null

export function supabaseAuth(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key) throw new Error('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias')
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  return client
}
