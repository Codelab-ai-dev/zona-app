import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Obtener URL y code
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')

    if (code) {
        const cookieStore = await cookies()
        const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookieStore) })

        // Intercambiar el código por una sesión
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth code exchange error:', error)
            // Redirigir a login con error
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-code-error`)
        }
    }

    // URL a redirigir después del intercambio
    // Si hay un parámetro 'next', usarlo (ej: /reset-password)
    // Si no, ir al dashboard
    if (next) {
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }

    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
