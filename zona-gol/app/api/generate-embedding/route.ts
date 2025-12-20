import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const N8N_EMBEDDINGS_WEBHOOK_URL = 'https://n8n.zona-gol.com/webhook/embeddings'

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
    // Get Supabase client (created lazily to avoid build errors)
    const supabase = getSupabaseClient()

    // Parse the request body
    const body = await request.json()

    console.log('📤 Processing embedding request:', {
      trigger_type: body.trigger_type,
      round: body.round,
      tournament_id: body.tournament_id?.substring(0, 8) + '...'
    })

    let webhookPayload = body

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

        // Transform to Flutter-like format for n8n
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
