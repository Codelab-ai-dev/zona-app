import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración de embeddings (mismo modelo que RAGService)
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

// Create Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, key)
}

/**
 * Genera embedding usando OpenAI API directamente
 * @param text - Texto a convertir en embedding
 * @returns Vector de embeddings (1536 dimensiones)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
  }

  const result = await response.json()

  if (!result.data || !result.data[0] || !result.data[0].embedding) {
    throw new Error('Invalid embedding response from OpenAI')
  }

  const embedding = result.data[0].embedding

  // Validar dimensiones
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`)
  }

  return embedding
}

/**
 * Actualiza el embedding en la tabla league_knowledge_base
 */
async function updateEmbeddingInDatabase(
  supabase: any,
  knowledgeBaseId: string,
  embedding: number[]
): Promise<void> {
  // pgvector espera el embedding como string JSON
  const { error } = await supabase
    .from('league_knowledge_base')
    .update({
      embedding: JSON.stringify(embedding),
      updated_at: new Date().toISOString()
    })
    .eq('id', knowledgeBaseId)

  if (error) {
    throw new Error(`Failed to update embedding: ${error.message}`)
  }
}

/**
 * API Route: Generate Embedding
 *
 * Este endpoint genera embeddings directamente usando OpenAI API
 * y los guarda en la tabla league_knowledge_base.
 *
 * Soporta los siguientes tipos de contenido:
 * - jornada_update: Genera contenido de calendario de jornada
 * - match_result_update: Genera contenido de resultado de partido
 * - standings_update: Genera contenido de tabla de posiciones
 *
 * Flujo:
 * 1. Genera el contenido (texto) basado en el trigger_type
 * 2. Inserta/actualiza en league_knowledge_base
 * 3. Genera embedding con OpenAI (text-embedding-3-small)
 * 4. Actualiza el campo embedding en la tabla
 */
export async function POST(request: NextRequest) {
  try {
    // Get Supabase client (created lazily to avoid build errors)
    const supabase = getSupabaseClient()

    // Parse the request body
    const body = await request.json()

    console.log('📤 Processing embedding request:', {
      trigger_type: body.trigger_type,
      knowledge_base_id: body.knowledge_base_id,
      round: body.round,
      tournament_id: body.tournament_id?.substring(0, 8) + '...'
    })

    let webhookPayload = body

    // ==========================================================================
    // DIRECT EMBEDDING MODE (from Flutter/mobile)
    // Si recibimos knowledge_base_id y content_text directamente, solo generamos
    // el embedding sin pasar por los triggers de contenido
    // ==========================================================================
    if (body.knowledge_base_id && body.content_text) {
      console.log('🔄 Modo directo: Generando embedding para knowledge_base_id:', body.knowledge_base_id)

      try {
        const embedding = await generateEmbedding(body.content_text)
        console.log(`✅ Embedding generado: ${embedding.length} dimensiones`)

        await updateEmbeddingInDatabase(supabase, body.knowledge_base_id, embedding)
        console.log('✅ Embedding guardado en base de datos')

        return NextResponse.json({
          success: true,
          data: {
            knowledge_base_id: body.knowledge_base_id,
            match_id: body.match_id || null,
            embedding_dimensions: embedding.length,
            updated_at: new Date().toISOString()
          }
        })
      } catch (embeddingError) {
        console.error('❌ Error generando embedding (modo directo):', embeddingError)
        return NextResponse.json(
          {
            error: 'Error generating embedding',
            message: embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // ==========================================================================
    // TRIGGER MODE (from Next.js web app)
    // Genera el contenido primero y luego el embedding
    // ==========================================================================

    // If this is a standings update, generate content first
    if (body.trigger_type === 'standings_update') {
      console.log('🔄 Generando contenido de tabla de posiciones...')

      try {
        // Get standings data from team_stats
        const { data: standings, error: standingsError } = await supabase
          .from('team_stats')
          .select(`
            team_id,
            matches_played,
            matches_won,
            matches_drawn,
            matches_lost,
            goals_for,
            goals_against,
            goal_difference,
            points,
            points_adjustment,
            adjustment_reason,
            team:teams(name)
          `)
          .eq('tournament_id', body.tournament_id)
          .order('points', { ascending: false })

        if (standingsError) throw standingsError

        if (!standings || standings.length === 0) {
          console.log('⚠️ No hay standings para este torneo')
          return NextResponse.json({
            success: true,
            message: 'No hay standings para generar embedding'
          })
        }

        // Get tournament and league info
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('name, league:leagues(name)')
          .eq('id', body.tournament_id)
          .single()

        // Sort by total points (points + adjustment)
        const sortedStandings = standings.sort((a: any, b: any) => {
          const totalA = a.points + (a.points_adjustment || 0)
          const totalB = b.points + (b.points_adjustment || 0)
          if (totalB !== totalA) return totalB - totalA
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
          return b.goals_for - a.goals_for
        })

        // Generate content text
        const leagueName = (tournament?.league as any)?.name || 'Liga'
        const tournamentName = tournament?.name || 'Torneo'

        let contentText = `📊 TABLA DE POSICIONES - ${leagueName} - ${tournamentName}\n\n`
        contentText += `Pos | Equipo | PJ | PG | PE | PP | GF | GC | DIF | PTS\n`
        contentText += `---|--------|----|----|----|----|----|----|-----|----\n`

        sortedStandings.forEach((team: any, index: number) => {
          const totalPoints = team.points + (team.points_adjustment || 0)
          const teamName = team.team?.name || 'Equipo'
          const adjustment = team.points_adjustment ? ` (${team.points_adjustment > 0 ? '+' : ''}${team.points_adjustment})` : ''

          contentText += `${index + 1} | ${teamName} | ${team.matches_played} | ${team.matches_won} | ${team.matches_drawn} | ${team.matches_lost} | ${team.goals_for} | ${team.goals_against} | ${team.goal_difference > 0 ? '+' : ''}${team.goal_difference} | ${totalPoints}${adjustment}\n`
        })

        // Add summary
        const leader = sortedStandings[0]
        if (leader) {
          contentText += `\n🏆 Líder: ${leader.team?.name} con ${leader.points + (leader.points_adjustment || 0)} puntos`
        }

        // Check for teams with adjustments
        const teamsWithAdjustments = sortedStandings.filter((t: any) => t.points_adjustment !== 0)
        if (teamsWithAdjustments.length > 0) {
          contentText += `\n\n⚠️ Equipos con ajustes de puntos:\n`
          teamsWithAdjustments.forEach((t: any) => {
            contentText += `- ${t.team?.name}: ${t.points_adjustment > 0 ? '+' : ''}${t.points_adjustment} pts${t.adjustment_reason ? ` (${t.adjustment_reason})` : ''}\n`
          })
        }

        console.log('✅ Contenido de standings generado:', contentText.length, 'chars')

        // Upsert to knowledge base
        const { data: kbData, error: kbError } = await supabase
          .from('league_knowledge_base')
          .upsert({
            league_id: body.league_id,
            tournament_id: body.tournament_id,
            content_type: 'tabla_posiciones',
            content_text: contentText,
            metadata: {
              generated_at: new Date().toISOString(),
              teams_count: sortedStandings.length
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'league_id,tournament_id,content_type'
          })
          .select('id')
          .single()

        if (kbError) {
          console.error('Error saving to knowledge base:', kbError)
          // Try insert if upsert fails
          const { data: insertData, error: insertError } = await supabase
            .from('league_knowledge_base')
            .insert({
              league_id: body.league_id,
              tournament_id: body.tournament_id,
              content_type: 'tabla_posiciones',
              content_text: contentText,
              metadata: {
                generated_at: new Date().toISOString(),
                teams_count: sortedStandings.length
              }
            })
            .select('id')
            .single()

          if (insertError) throw insertError

          webhookPayload = {
            knowledge_base_id: insertData.id,
            content_text: contentText,
            match_id: null
          }
        } else {
          webhookPayload = {
            knowledge_base_id: kbData.id,
            content_text: contentText,
            match_id: null
          }
        }

      } catch (error) {
        console.error('❌ Error generando contenido de standings:', error)
        return NextResponse.json(
          {
            error: 'Error generando contenido de standings',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }
    // If this is a match result update, generate content first
    else if (body.trigger_type === 'match_result_update') {
      console.log('🔄 Generando contenido de resultado de partido...')

      try {
        // Call function to generate match result content
        const { error: functionError } = await supabase.rpc('generate_match_result_content', {
          p_match_id: body.match_id
        })

        if (functionError) {
          console.error('Error calling function:', functionError)
          throw functionError
        }

        // Get the generated content
        const { data: contentData, error: selectError } = await supabase
          .from('league_knowledge_base')
          .select('id, content_text')
          .eq('match_id', body.match_id)
          .eq('content_type', 'resultado_partido')
          .not('content_text', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (selectError || !contentData) {
          console.error('Error getting content:', selectError)
          throw new Error('No se encontró el contenido generado')
        }

        console.log('✅ Contenido de resultado generado:', contentData.content_text.length, 'chars')

        // Preparar payload para generación de embedding
        webhookPayload = {
          knowledge_base_id: contentData.id,
          content_text: contentData.content_text,
          match_id: body.match_id
        }

      } catch (error) {
        console.error('❌ Error generando contenido de resultado:', error)
        return NextResponse.json(
          {
            error: 'Error generando contenido de resultado',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }
    // If this is a jornada update, generate content first
    else if (body.trigger_type === 'jornada_update') {
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

        // Preparar payload para generación de embedding
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

    // Generar embedding directamente con OpenAI (sin n8n)
    console.log('🧠 Generando embedding con OpenAI...')

    try {
      const embedding = await generateEmbedding(webhookPayload.content_text)
      console.log(`✅ Embedding generado: ${embedding.length} dimensiones`)

      // Actualizar la tabla con el embedding
      await updateEmbeddingInDatabase(supabase, webhookPayload.knowledge_base_id, embedding)
      console.log('✅ Embedding guardado en base de datos')

      return NextResponse.json({
        success: true,
        data: {
          knowledge_base_id: webhookPayload.knowledge_base_id,
          embedding_dimensions: embedding.length,
          updated_at: new Date().toISOString()
        }
      })
    } catch (embeddingError) {
      console.error('❌ Error generando/guardando embedding:', embeddingError)
      return NextResponse.json(
        {
          error: 'Error generating embedding',
          message: embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

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
