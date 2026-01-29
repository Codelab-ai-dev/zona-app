import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const token = requestUrl.searchParams.get('token')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next')
    const redirectTo = requestUrl.searchParams.get('redirect_to')

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookieStore) })

    // Handle PKCE code exchange
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            console.error('Auth code exchange error:', error)
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-code-error`)
        }
    }

    // Handle password recovery token - pass to reset-password page
    if (token && type === 'recovery') {
        // Pass the token to reset-password page to handle verification
        const resetUrl = new URL('/reset-password', requestUrl.origin)
        resetUrl.searchParams.set('token', token)
        resetUrl.searchParams.set('type', 'recovery')
        return NextResponse.redirect(resetUrl.toString())
    }

    // Handle email confirmation token
    if (token && type === 'email') {
        const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
        })
        if (error) {
            console.error('Email verification error:', error)
            return NextResponse.redirect(`${requestUrl.origin}/login?error=email-verification-error`)
        }
    }

    // Determine redirect URL
    const finalRedirect = next || redirectTo || '/dashboard'
    const redirectUrl = finalRedirect.startsWith('http')
        ? finalRedirect
        : `${requestUrl.origin}${finalRedirect}`

    return NextResponse.redirect(redirectUrl)
}
