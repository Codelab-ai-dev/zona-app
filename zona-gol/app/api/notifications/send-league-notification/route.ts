import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Send WhatsApp notifications to all users linked to a league
 *
 * POST /api/notifications/send-league-notification
 *
 * Body:
 * - league_id: string (required)
 * - tournament_id: string (optional)
 * - notification_type: 'jornada_created' | 'match_result' (required)
 * - content: object with notification-specific data
 */

interface NotificationRequest {
  league_id: string;
  tournament_id?: string;
  notification_type: 'jornada_created' | 'match_result';
  content: JornadaNotification | MatchResultNotification;
}

interface JornadaNotification {
  round: number;
  league_name: string;
  league_slug?: string;
  tournament_name: string;
  tournament_id?: string;
  matches: Array<{
    home_team: string;
    away_team: string;
    date: string;
    time: string;
    field?: number;
  }>;
}

interface MatchResultNotification {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  round?: number;
  league_name: string;
  tournament_name: string;
  scorers?: Array<{
    player_name: string;
    goals: number;
  }>;
}

// Kapso API configuration
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID || '860360857167907';

// WhatsApp Template Names (must match exactly what's configured in Kapso/Meta)
const TEMPLATE_JORNADA = process.env.WHATSAPP_TEMPLATE_JORNADA || 'jornadas';
const TEMPLATE_RESULTADO = process.env.WHATSAPP_TEMPLATE_RESULTADO || 'resultado_partido';

// Rate limiting configuration
const RATE_LIMIT_MAX_MESSAGES = parseInt(process.env.WHATSAPP_RATE_LIMIT_MAX || '20'); // Max messages per user
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.WHATSAPP_RATE_LIMIT_WINDOW_MS || '3600000'); // 1 hour in ms

// In-memory rate limit tracker (phone -> timestamps of sent messages)
const rateLimitMap = new Map<string, number[]>();

/**
 * Check if a phone number has exceeded the rate limit
 * Returns true if the user can receive more messages, false if rate limited
 */
function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(phoneNumber) || [];

  // Filter out timestamps outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  // Update the map with only recent timestamps
  rateLimitMap.set(phoneNumber, recentTimestamps);

  // Check if under limit
  return recentTimestamps.length < RATE_LIMIT_MAX_MESSAGES;
}

/**
 * Record a sent message for rate limiting
 */
function recordSentMessage(phoneNumber: string): void {
  const timestamps = rateLimitMap.get(phoneNumber) || [];
  timestamps.push(Date.now());
  rateLimitMap.set(phoneNumber, timestamps);
}

/**
 * Get remaining messages for a phone number
 */
function getRemainingMessages(phoneNumber: string): number {
  const now = Date.now();
  const timestamps = rateLimitMap.get(phoneNumber) || [];
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  return Math.max(0, RATE_LIMIT_MAX_MESSAGES - recentTimestamps.length);
}

export async function POST(request: NextRequest) {
  console.log('');
  console.log('🔔🔔🔔 ========== NOTIFICATION API CALLED ========== 🔔🔔🔔');
  console.log('');
  try {
    console.log('📨 Notification API: Received request');

    const body: NotificationRequest = await request.json();
    const { league_id, tournament_id, notification_type, content } = body;

    console.log('📝 Request body:', JSON.stringify({ league_id, tournament_id, notification_type }, null, 2));

    if (!league_id || !notification_type || !content) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: league_id, notification_type, content' },
        { status: 400 }
      );
    }

    if (!KAPSO_API_KEY) {
      console.error('❌ KAPSO_API_KEY not configured');
      return NextResponse.json(
        { error: 'Notification service not configured' },
        { status: 500 }
      );
    }

    console.log(`📢 Sending ${notification_type} notifications for league ${league_id}`);

    // Get all users linked to this league
    const supabase = await createServerSupabaseClient();

    console.log('🔍 Querying whatsapp_user_links for league:', league_id);

    const { data: linkedUsers, error: usersError } = await supabase
      .from('whatsapp_user_links')
      .select('phone_number, display_name')
      .eq('league_id', league_id)
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error fetching linked users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch linked users' },
        { status: 500 }
      );
    }

    console.log('📋 Linked users found:', linkedUsers);

    if (!linkedUsers || linkedUsers.length === 0) {
      console.log('⚠️ No users linked to this league - check whatsapp_user_links table');
      return NextResponse.json({
        success: true,
        message: 'No users to notify',
        notifications_sent: 0,
        league_id: league_id,
      });
    }

    console.log(`📱 Found ${linkedUsers.length} users to notify:`, linkedUsers.map(u => u.phone_number));

    // Get league slug for URL construction (for jornada notifications)
    let enrichedContent = content;
    if (notification_type === 'jornada_created') {
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('slug')
        .eq('id', league_id)
        .single();

      if (leagueData?.slug) {
        enrichedContent = {
          ...content,
          league_slug: leagueData.slug,
          tournament_id: tournament_id,
        } as JornadaNotification;
        console.log('🔗 League slug found:', leagueData.slug);
      }
    }

    // Build template payload based on notification type
    const templatePayload = buildTemplatePayload(notification_type, enrichedContent);

    // Send notifications to all linked users using templates (with rate limiting)
    let rateLimited = 0;
    const usersToNotify: typeof linkedUsers = [];

    // Check rate limits before sending
    for (const user of linkedUsers) {
      if (checkRateLimit(user.phone_number)) {
        usersToNotify.push(user);
      } else {
        rateLimited++;
        console.log(`⚠️ Rate limited: ${user.phone_number} (${getRemainingMessages(user.phone_number)} messages remaining)`);
      }
    }

    if (rateLimited > 0) {
      console.log(`🚫 ${rateLimited} users rate limited, ${usersToNotify.length} will receive notifications`);
    }

    const results = await Promise.allSettled(
      usersToNotify.map(async (user) => {
        const result = await sendWhatsAppTemplate(user.phone_number, templatePayload);
        // Record successful send for rate limiting
        recordSentMessage(user.phone_number);
        return result;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Notifications sent: ${successful} successful, ${failed} failed, ${rateLimited} rate limited`);

    return NextResponse.json({
      success: true,
      notifications_sent: successful,
      notifications_failed: failed,
      notifications_rate_limited: rateLimited,
      total_users: linkedUsers.length,
      rate_limit: {
        max_per_hour: RATE_LIMIT_MAX_MESSAGES,
        window_ms: RATE_LIMIT_WINDOW_MS,
      },
    });

  } catch (error: any) {
    console.error('❌ Notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Template payload structure for WhatsApp
 */
interface TemplatePayload {
  templateName: string;
  language: string;
  components: Array<{
    type: 'body';
    parameters: Array<{
      type: 'text';
      text: string;
    }>;
  }>;
}

/**
 * Build template payload based on notification type
 *
 * Template jornada_notification has 7 parameters:
 * {{1}} = Round number
 * {{2}} = League name
 * {{3}} = Tournament name
 * {{4}} = Home team (first match)
 * {{5}} = Away team (first match)
 * {{6}} = Time (first match)
 * {{7}} = Tournament URL (e.g., https://admin.zona-gol.com/liga/elite-soccer/torneo/xxx)
 *
 * Template resultado_partido has 6 parameters:
 * {{1}} = Home team
 * {{2}} = Home score
 * {{3}} = Away score
 * {{4}} = Away team
 * {{5}} = Round number
 * {{6}} = League name
 */
function buildTemplatePayload(
  type: 'jornada_created' | 'match_result',
  content: JornadaNotification | MatchResultNotification
): TemplatePayload {
  if (type === 'jornada_created') {
    const data = content as JornadaNotification;
    const firstMatch = data.matches[0];

    // Build tournament URL if we have the slug and tournament_id
    const baseUrl = data.league_slug && data.tournament_id
      ? `https://admin.zona-gol.com/liga/${data.league_slug}/torneo/${data.tournament_id}`
      : 'https://admin.zona-gol.com';
    const tournamentUrl = `Si quieres ver el resto de la jornada da click en: ${baseUrl}`;

    return {
      templateName: TEMPLATE_JORNADA,
      language: 'es_MX',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(data.round) },                    // {{1}} Round
            { type: 'text', text: data.league_name },                      // {{2}} League
            { type: 'text', text: data.tournament_name },                  // {{3}} Tournament
            { type: 'text', text: firstMatch?.home_team || 'TBD' },        // {{4}} Home team
            { type: 'text', text: firstMatch?.away_team || 'TBD' },        // {{5}} Away team
            { type: 'text', text: firstMatch?.time || 'Por definir' },     // {{6}} Time
            { type: 'text', text: tournamentUrl },                          // {{7}} Tournament URL
          ],
        },
      ],
    };
  }

  if (type === 'match_result') {
    const data = content as MatchResultNotification;

    return {
      templateName: TEMPLATE_RESULTADO,
      language: 'es_MX',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.home_team },                        // {{1}} Home team
            { type: 'text', text: String(data.home_score) },               // {{2}} Home score
            { type: 'text', text: String(data.away_score) },               // {{3}} Away score
            { type: 'text', text: data.away_team },                        // {{4}} Away team
            { type: 'text', text: data.round ? String(data.round) : 'N/A' }, // {{5}} Round
            { type: 'text', text: data.league_name },                      // {{6}} League
          ],
        },
      ],
    };
  }

  // Fallback (should never happen)
  return {
    templateName: TEMPLATE_JORNADA,
    language: 'es_MX',
    components: [{ type: 'body', parameters: [] }],
  };
}

/**
 * Send WhatsApp template message via Kapso API
 */
async function sendWhatsAppTemplate(phoneNumber: string, templatePayload: TemplatePayload): Promise<void> {
  const kapsoApiUrl = `https://api.kapso.ai/meta/whatsapp/v21.0/${KAPSO_PHONE_NUMBER_ID}/messages`;

  // Normalize phone number (remove + if present for the API)
  const normalizedPhone = phoneNumber.startsWith('+')
    ? phoneNumber.substring(1)
    : phoneNumber;

  // WhatsApp template message format
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templatePayload.templateName,
      language: {
        code: templatePayload.language,
      },
      components: templatePayload.components,
    },
  };

  console.log(`📤 Sending template "${templatePayload.templateName}" to ${normalizedPhone}...`);
  console.log(`📝 Parameters:`, templatePayload.components[0]?.parameters.map(p => p.text));

  const response = await fetch(kapsoApiUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': KAPSO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`❌ Failed to send template to ${normalizedPhone}:`, errorData);
    throw new Error(`Kapso API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  console.log(`✅ Template sent to ${normalizedPhone}:`, result);
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'league-notifications',
    kapso_configured: !!KAPSO_API_KEY,
    rate_limit: {
      max_messages_per_user: RATE_LIMIT_MAX_MESSAGES,
      window_hours: RATE_LIMIT_WINDOW_MS / 3600000,
    },
  });
}
