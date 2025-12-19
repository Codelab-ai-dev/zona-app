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

interface MatchResultEmbeddingPayload {
  match_id: string
  league_id: string
  tournament_id: string
}

// ============================================================================
// NOTIFICATION UTILITIES
// ============================================================================

const NOTIFICATION_API_URL = '/api/notifications/send-league-notification'

interface JornadaNotificationPayload {
  league_id: string
  tournament_id: string
  round: number
  league_name: string
  tournament_name: string
  matches: Array<{
    home_team: string
    away_team: string
    date: string
    time: string
    field?: number
  }>
}

interface MatchResultNotificationPayload {
  league_id: string
  tournament_id: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  round?: number
  league_name: string
  tournament_name: string
  scorers?: Array<{
    player_name: string
    goals: number
  }>
}

/**
 * Send notification to all users linked to a league when a new jornada is created
 * Sends one notification per match in the jornada
 */
export async function sendJornadaNotification(params: JornadaNotificationPayload): Promise<void> {
  try {
    console.log('📢 ====== SENDING JORNADA NOTIFICATIONS ======')
    console.log('📢 Round:', params.round)
    console.log('📢 League ID:', params.league_id)
    console.log('📢 Matches to notify:', params.matches.length)

    // Send one notification per match
    for (const match of params.matches) {
      console.log(`📢 Sending notification for: ${match.home_team} vs ${match.away_team}`)

      const response = await fetch(NOTIFICATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          league_id: params.league_id,
          tournament_id: params.tournament_id,
          notification_type: 'jornada_created',
          content: {
            round: params.round,
            league_name: params.league_name,
            tournament_name: params.tournament_name,
            matches: [match], // Send only this match
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Notificación enviada: ${match.home_team} vs ${match.away_team}`, result)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.warn(`⚠️ Error enviando notificación: ${match.home_team} vs ${match.away_team}`, response.status, errorData)
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('✅ Todas las notificaciones de jornada enviadas')
  } catch (error) {
    console.error('❌ Error enviando notificaciones de jornada:', error)
    // Don't throw - we don't want to fail the main operation
  }
}

/**
 * Send notification to all users linked to a league when a match result is registered
 */
export async function sendMatchResultNotification(params: MatchResultNotificationPayload): Promise<void> {
  try {
    console.log('📢 Enviando notificación de resultado:', params.home_team, 'vs', params.away_team)

    const response = await fetch(NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        league_id: params.league_id,
        tournament_id: params.tournament_id,
        notification_type: 'match_result',
        content: {
          home_team: params.home_team,
          away_team: params.away_team,
          home_score: params.home_score,
          away_score: params.away_score,
          round: params.round,
          league_name: params.league_name,
          tournament_name: params.tournament_name,
          scorers: params.scorers,
        },
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Notificación de resultado enviada:', result)
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.warn('⚠️ Error enviando notificación de resultado:', response.status, errorData)
    }
  } catch (error) {
    console.error('❌ Error enviando notificación de resultado:', error)
    // Don't throw - we don't want to fail the main operation
  }
}

/**
 * Generate embedding for a finished match result
 * This will trigger the database function to create content and generate embedding
 */
export async function generateMatchResultEmbedding(params: MatchResultEmbeddingPayload): Promise<void> {
  try {
    console.log('🔄 Generando embedding para resultado de partido:', params)

    const response = await fetch(API_ROUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_type: 'match_result_update',
        match_id: params.match_id,
        league_id: params.league_id,
        tournament_id: params.tournament_id,
        timestamp: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Embedding de resultado generado:', result)
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.warn('⚠️ Error generando embedding de resultado:', response.status, errorData)
    }
  } catch (error) {
    console.error('❌ Error llamando API de embeddings para resultado:', error)
    // Don't throw - we don't want to fail the main operation if embedding fails
  }
}

interface StandingsEmbeddingPayload {
  league_id: string
  tournament_id: string
}

/**
 * Generate embedding for updated standings/tabla de posiciones
 * This will trigger the database function to create content and generate embedding
 */
export async function generateStandingsEmbedding(params: StandingsEmbeddingPayload): Promise<void> {
  try {
    console.log('🔄 Generando embedding para tabla de posiciones:', params)

    const response = await fetch(API_ROUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_type: 'standings_update',
        league_id: params.league_id,
        tournament_id: params.tournament_id,
        content_type: 'tabla_posiciones',
        timestamp: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Embedding de tabla de posiciones generado:', result)
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.warn('⚠️ Error generando embedding de tabla:', response.status, errorData)
    }
  } catch (error) {
    console.error('❌ Error llamando API de embeddings para tabla:', error)
    // Don't throw - we don't want to fail the main operation if embedding fails
  }
}
