import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from './database.types'

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore as any })
}

// For API Route Handlers (app/api/*)
export const createRouteSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore as any })
}