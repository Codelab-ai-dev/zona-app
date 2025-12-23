import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { extractINEData } from '@/lib/groq/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    console.log('🔵 extract-id: Iniciando...')

    // Verify authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('❌ extract-id: No autorizado')
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('🔵 extract-id: Usuario autenticado:', user.id)

    // Get image data from request body
    const body = await request.json()
    const { imageBase64 } = body

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó imagen' },
        { status: 400 }
      )
    }

    console.log('🔵 extract-id: Imagen recibida, tamaño:', imageBase64.length)

    // Validate image size (max ~4MB in base64)
    if (imageBase64.length > 5500000) {
      return NextResponse.json(
        { success: false, error: 'La imagen es demasiado grande. El tamaño máximo es 4MB' },
        { status: 400 }
      )
    }

    // Extract INE data using Groq Vision
    console.log('🔵 extract-id: Llamando a extractINEData...')
    const result = await extractINEData(imageBase64)
    console.log('🔵 extract-id: Resultado:', result)

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

    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'

    // Check if it's a configuration error
    if (errorMessage.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'Servicio de extracción no configurado' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
