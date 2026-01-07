import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Endpoint para recibir notificaciones de partidos finalizados desde Flutter
 *
 * POST /api/notifications/match-finalized
 *
 * Este endpoint reemplaza el webhook de n8n y maneja:
 * 1. Recibir el payload del partido finalizado desde Flutter
 * 2. Enviar notificaciones WhatsApp a los usuarios vinculados
 */

// Kapso API configuration
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID || '860360857167907';
const TEMPLATE_RESULTADO = process.env.WHATSAPP_TEMPLATE_RESULTADO_JORNADAS || 'resultado_jornadas';

interface FlutterMatchPayload {
  event: 'match_finalized';
  timestamp: string;
  match: {
    id: string;
    date: string;
    time: string;
    field_number?: number;
    round?: string;
    status: string;
    phase?: string;
    playoff_round?: string;
  };
  score: {
    home: number;
    away: number;
    result: 'home_win' | 'away_win' | 'draw';
  };
  home_team: {
    id: string;
    name: string;
    score: number;
    stats?: {
      points: number;
      position: number;
      matches_played: number;
    };
  };
  away_team: {
    id: string;
    name: string;
    score: number;
    stats?: {
      points: number;
      position: number;
      matches_played: number;
    };
  };
  tournament: {
    id: string;
    name: string;
  };
  player_highlights?: Array<{
    player?: {
      name: string;
      jersey_number: number;
      team_id: string;
    };
    goals?: number;
    red_cards?: number;
  }>;
}

export async function POST(request: NextRequest) {
  console.log('');
  console.log('⚽⚽⚽ ========== MATCH FINALIZED NOTIFICATION ========== ⚽⚽⚽');
  console.log('');

  try {
    const body: FlutterMatchPayload = await request.json();

    console.log('📝 Received match finalization:', {
      event: body.event,
      match_id: body.match?.id,
      home_team: body.home_team?.name,
      away_team: body.away_team?.name,
      score: `${body.score?.home} - ${body.score?.away}`,
    });

    // Validate required fields
    if (!body.match?.id || !body.home_team || !body.away_team || !body.tournament) {
      console.error('❌ Missing required fields in payload');
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Get league_id from match
    const supabase = await createServerSupabaseClient();

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('league_id, round')
      .eq('id', body.match.id)
      .single() as { data: { league_id: string; round: string } | null; error: any };

    if (matchError || !matchData) {
      console.error('❌ Error fetching match:', matchError);
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const leagueId = matchData.league_id;
    console.log('🏆 League ID:', leagueId);

    // Get league info for slug
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('name, slug')
      .eq('id', leagueId)
      .single() as { data: { name: string; slug: string } | null };

    // Get all users linked to this league
    const { data: linkedUsers, error: usersError } = await supabase
      .from('whatsapp_user_links')
      .select('phone_number, display_name')
      .eq('league_id', leagueId)
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error fetching linked users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch linked users' },
        { status: 500 }
      );
    }

    if (!linkedUsers || linkedUsers.length === 0) {
      console.log('⚠️ No users linked to this league');
      return NextResponse.json({
        success: true,
        message: 'No users to notify',
        notifications_sent: 0,
      });
    }

    console.log(`📱 Found ${linkedUsers.length} users to notify`);

    // Extract round number from string like "Jornada 5"
    const roundMatch = (body.match.round || matchData.round || '').match(/\d+/);
    const roundNumber = roundMatch ? roundMatch[0] : 'N/A';

    // Build template payload for WhatsApp
    const templatePayload = {
      templateName: TEMPLATE_RESULTADO,
      language: 'en',
      components: [
        {
          type: 'header' as const,
          parameters: [
            { type: 'text' as const, text: body.tournament.name },
          ],
        },
        {
          type: 'body' as const,
          parameters: [
            { type: 'text' as const, text: roundNumber },
            { type: 'text' as const, text: leagueData?.name || 'Liga' },
            { type: 'text' as const, text: body.home_team.name },
            { type: 'text' as const, text: String(body.score.home) },
            { type: 'text' as const, text: body.away_team.name },
            { type: 'text' as const, text: String(body.score.away) },
          ],
        },
        {
          type: 'button' as const,
          sub_type: 'url' as const,
          index: 0,
          parameters: [
            { type: 'text' as const, text: 'https://admin.zona-gol.com' },
          ],
        },
      ],
    };

    // Send notifications to all linked users
    const results = await Promise.allSettled(
      linkedUsers.map(async (user: any) => {
        return sendWhatsAppTemplate(user.phone_number, templatePayload);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Notifications sent: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      notifications_sent: successful,
      notifications_failed: failed,
      total_users: linkedUsers.length,
      match_id: body.match.id,
    });

  } catch (error: any) {
    console.error('❌ Match finalized notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send WhatsApp template message via Kapso API
 */
async function sendWhatsAppTemplate(phoneNumber: string, templatePayload: any): Promise<void> {
  const kapsoApiUrl = `https://api.kapso.ai/meta/whatsapp/v21.0/${KAPSO_PHONE_NUMBER_ID}/messages`;

  // Normalize phone number
  const normalizedPhone = phoneNumber.startsWith('+')
    ? phoneNumber.substring(1)
    : phoneNumber;

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

  console.log(`📤 Sending template to ${normalizedPhone}...`);

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
    console.error(`❌ Failed to send to ${normalizedPhone}:`, errorData);
    throw new Error(`Kapso API error: ${response.status}`);
  }

  console.log(`✅ Sent to ${normalizedPhone}`);
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'match-finalized-notifications',
    kapso_configured: !!KAPSO_API_KEY,
  });
}
