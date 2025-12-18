import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const N8N_EMBEDDINGS_WEBHOOK_URL = 'https://n8n.zona-gol.com/webhook/embeddings'

// Supabase client (usando variables de entorno)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API Route: Generate Embedding
 *
 * This endpoint acts as a proxy to call the n8n webhook
 * from the server-side to avoid CORS issues
 *
 * For jornada updates, it generates the content first,
 * then sends to n8n (same format as Flutter)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()

    console.log('📤 Processing embedding request:', {
      trigger_type: body.trigger_type,
      round: body.round,
      tournament_id: body.tournament_id?.substring(0, 8) + '...'
    })

    let webhookPayload = body

    // If this is a jornada update, generate content first
    if (body.trigger_type === 'jornada_update') {
      console.log('🔄 Generando contenido de jornada...')

      try {
        // Call function to generate jornada content
        const { error: functionError } = await supabase.rpc('insert_jornada_to_knowledge_base', {
          p_league_id: body.league_id,
          p_tournament_id: body.tournament_id,
          p_round: body.round
        })

        if (functionError) {
          console.error('Error calling function:', functionError)
          throw functionError
        }

        // Get the generated content
        const { data: contentData, error: selectError } = await supabase
          .from('league_knowledge_base')
          .select('id, content_text')
          .eq('league_id', body.league_id)
          .eq('tournament_id', body.tournament_id)
          .eq('content_type', 'jornada')
          .eq('metadata->>round', body.round.toString())
          .not('content_text', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (selectError || !contentData) {
          console.error('Error getting content:', selectError)
          throw new Error('No se encontró el contenido generado')
        }

        console.log('✅ Contenido generado:', contentData.content_text.length, 'chars')

        // Transform to Flutter-like format for n8n
        webhookPayload = {
          knowledge_base_id: contentData.id,
          content_text: contentData.content_text,
          match_id: null // No hay match_id para jornadas
        }

      } catch (error) {
        console.error('❌ Error generando contenido:', error)
        return NextResponse.json(
          {
            error: 'Error generando contenido de jornada',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // Send to n8n webhook (same format for both Flutter and Next.js now)
    console.log('📤 Enviando a n8n webhook...')

    const response = await fetch(N8N_EMBEDDINGS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    const responseData = await response.text()
    let jsonData

    try {
      jsonData = JSON.parse(responseData)
    } catch {
      jsonData = { message: responseData }
    }

    if (!response.ok) {
      console.error('❌ Error from n8n webhook:', response.status, responseData)
      return NextResponse.json(
        {
          error: 'Error calling n8n webhook',
          status: response.status,
          details: jsonData
        },
        { status: response.status }
      )
    }

    console.log('✅ Embedding request successful')

    return NextResponse.json({
      success: true,
      data: jsonData
    })

  } catch (error) {
    console.error('❌ Error in generate-embedding API route:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
