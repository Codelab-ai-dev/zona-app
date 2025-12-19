import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint for WhatsApp template notifications
 *
 * GET /api/notifications/test?phone=523339567241
 */

const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID || '860360857167907';
const TEMPLATE_JORNADA = process.env.WHATSAPP_TEMPLATE_JORNADA || 'jornadas';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({
      error: 'Missing phone parameter',
      usage: '/api/notifications/test?phone=523339567241',
    }, { status: 400 });
  }

  if (!KAPSO_API_KEY) {
    return NextResponse.json({
      error: 'KAPSO_API_KEY not configured in environment',
      configured: false,
    }, { status: 500 });
  }

  console.log('🧪 Testing template notification...');
  console.log('📱 Phone:', phone);
  console.log('📝 Template:', TEMPLATE_JORNADA);
  console.log('🔑 API Key configured:', !!KAPSO_API_KEY);

  try {
    const kapsoApiUrl = `https://api.kapso.ai/meta/whatsapp/v21.0/${KAPSO_PHONE_NUMBER_ID}/messages`;

    // Template payload for "jornadas" template
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: TEMPLATE_JORNADA,
        language: {
          code: 'es_MX',
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: '5' },                    // {{1}} Round
              { type: 'text', text: 'ELITE SOCCER GUERREROS' }, // {{2}} League
              { type: 'text', text: 'CLAUSURA-2026' },        // {{3}} Tournament
              { type: 'text', text: 'SANTOS' },               // {{4}} Home team
              { type: 'text', text: 'ROMA FC' },              // {{5}} Away team
              { type: 'text', text: '10:30' },                // {{6}} Time
              { type: 'text', text: 'Si quieres ver el resto de la jornada da click en: https://admin.zona-gol.com/liga/elite-soccer/torneo/test-123' }, // {{7}} URL
            ],
          },
        ],
      },
    };

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(kapsoApiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': KAPSO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Kapso API error',
        status: response.status,
        response: responseData,
        payload_sent: payload,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Template sent successfully',
      response: responseData,
      payload_sent: payload,
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
