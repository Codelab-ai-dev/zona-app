import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { extractINEData } from '@/lib/groq/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookieStore) })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get image data from request body
    const body = await request.json()
    const { imageBase64 } = body

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó imagen' },
        { status: 400 }
      )
    }

    // Validate image size (max ~4MB in base64)
    if (imageBase64.length > 5500000) {
      return NextResponse.json(
        { success: false, error: 'La imagen es demasiado grande. El tamaño máximo es 4MB' },
        { status: 400 }
      )
    }

    // Extract INE data using Groq Vision
    const result = await extractINEData(imageBase64)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Error in extract-id API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
