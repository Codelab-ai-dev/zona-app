import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, user_metadata } = await request.json()
    
    console.log('🔵 Creating user with admin API:', { email, hasPassword: !!password })
    
    // Verificar que tenemos las variables de entorno necesarias
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Missing Supabase URL' }, { status: 500 })
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }
    
    // Usar el cliente de servicio con permisos de administrador
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('🔵 Supabase admin client created')
    
    // Crear el usuario usando la API de administración
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata,
      email_confirm: true // Auto-confirmar el email
    })
    
    if (error) {
      console.error('❌ Error creating user:', error)
      return NextResponse.json({ 
        error: error.message, 
        code: error.code || 'unknown',
        status: error.status || 'unknown'
      }, { status: 400 })
    }
    
    if (!data.user) {
      console.error('❌ No user data returned')
      return NextResponse.json({ error: 'No user data returned' }, { status: 500 })
    }
    
    console.log('✅ User created successfully:', { id: data.user.id, email: data.user.email })
    
    return NextResponse.json({ user: data.user }, { status: 201 })
  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}