/**
 * Utility functions for generating embeddings via n8n webhook
 * Uses Next.js API route to avoid CORS issues
 */

// Use Next.js API route as proxy to n8n webhook
const API_ROUTE_URL = '/api/generate-embedding'

interface JornadaEmbeddingPayload {
  league_id: string
  tournament_id: string
  round: number
  content_type: 'jornada' | 'proximos_partidos'
}

/**
 * Generate embedding for a jornada (round) via n8n webhook
 * This will trigger the database function to create content and generate embedding
 */
export async function generateJornadaEmbedding(params: JornadaEmbeddingPayload): Promise<void> {
  try {
    console.log('🔄 Generando embedding para jornada:', params)

    const response = await fetch(API_ROUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_type: 'jornada_update',
        league_id: params.league_id,
        tournament_id: params.tournament_id,
        round: params.round,
        content_type: params.content_type,
        timestamp: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Embedding de jornada generado:', result)
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.warn('⚠️ Error generando embedding de jornada:', response.status, errorData)
    }
  } catch (error) {
    console.error('❌ Error llamando API de embeddings:', error)
    // Don't throw - we don't want to fail the main operation if embedding fails
  }
}

/**
 * Generate embeddings for multiple rounds (jornadas)
 * Useful when generating a full fixture
 */
export async function generateMultipleJornadaEmbeddings(
  league_id: string,
  tournament_id: string,
  rounds: number[],
  content_type: 'jornada' | 'proximos_partidos' = 'jornada'
): Promise<void> {
  console.log(`🔄 Generando embeddings para ${rounds.length} jornadas...`)

  // Generate embeddings sequentially to avoid overwhelming the server
  for (const round of rounds) {
    await generateJornadaEmbedding({
      league_id,
      tournament_id,
      round,
      content_type,
    })

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('✅ Embeddings de jornadas generados')
}

/**
 * Generate embedding for updated match schedule
 * Triggers regeneration of the jornada content
 */
export async function generateMatchScheduleEmbedding(
  league_id: string,
  tournament_id: string,
  round: number
): Promise<void> {
  return generateJornadaEmbedding({
    league_id,
    tournament_id,
    round,
    content_type: 'proximos_partidos',
  })
}
