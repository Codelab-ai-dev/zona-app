import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '../core/agent.service';

/**
 * Kapso Webhook Adapter
 *
 * Este endpoint recibe webhooks de Kapso y los transforma al formato
 * que espera el Agent Service de Zona-Gol.
 *
 * Flujo:
 * Kapso → /api/agent/kapso → Agent Service → Response → Kapso
 */

// Kapso Webhook format
interface KapsoWebhook {
  type: string;
  batch: boolean;
  data: Array<{
    message: {
      context: any;
      from: string;
      id: string;
      kapso: {
        direction: string;
        status: string;
        processing_status: string;
        has_media: boolean;
        origin: string;
        content: string;
      };
      text?: {
        body: string;
      };
      interactive?: {
        type: string;
        button_reply?: {
          id: string;
          title: string;
        };
        list_reply?: {
          id: string;
          title: string;
        };
      };
      timestamp: string;
      type: string;
    };
    conversation: {
      id: string;
      contact_name: string;
      phone_number: string;
      phone_number_id: string;
      status: string;
    };
    is_new_conversation: boolean;
    phone_number_id: string;
  }>;
  batch_info?: {
    size: number;
    window_ms: number;
    conversation_id: string;
  };
}

interface AgentRequest {
  channel: string;
  userIdentifier: string;
  message: string;
  metadata?: any;
}

/**
 * Extrae el texto del mensaje de diferentes tipos de mensajes de Kapso
 */
function extractMessageText(message: KapsoWebhook['data'][0]['message']): string {
  // Mensaje de texto
  if (message.type === 'text' && message.text?.body) {
    return message.text.body;
  }

  // Mensaje interactivo - botón
  if (message.type === 'interactive' && message.interactive?.button_reply) {
    return message.interactive.button_reply.title;
  }

  // Mensaje interactivo - lista
  if (message.type === 'interactive' && message.interactive?.list_reply) {
    return message.interactive.list_reply.title;
  }

  // Tipo de mensaje no soportado
  return `Mensaje de tipo "${message.type}" no soportado`;
}

/**
 * Formatea el número de teléfono con el código de país
 */
function formatPhoneNumber(phone: string): string {
  // Si ya tiene +, retornar tal cual
  if (phone.startsWith('+')) {
    return phone;
  }

  // Si no tiene +, agregarlo
  return '+' + phone;
}

/**
 * Transforma el payload de Kapso al formato del Agent Service
 */
function transformKapsoToAgent(webhook: KapsoWebhook): AgentRequest {
  const data = webhook.data[0];
  const message = data.message;
  const conversation = data.conversation;

  const messageText = extractMessageText(message);
  const phoneNumber = formatPhoneNumber(message.from);

  return {
    channel: 'whatsapp',
    userIdentifier: phoneNumber,
    message: messageText,
    metadata: {
      kapso_message_id: message.id,
      kapso_timestamp: message.timestamp,
      contact_name: conversation.contact_name,
      message_type: message.type,
      phone_number_id: data.phone_number_id,
      conversation_id: conversation.id,
    },
  };
}

/**
 * GET /api/agent/kapso
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    adapter: 'kapso',
    version: '1.0.0',
    message: 'Kapso webhook adapter is ready',
  });
}

/**
 * POST /api/agent/kapso
 * Recibe webhooks de Kapso y los procesa con el Agent Service
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Kapso Adapter: Received webhook');

    // Parse request body
    const webhook: KapsoWebhook = await request.json();

    console.log('📝 Webhook type:', webhook.type);

    // Validar que sea un webhook de mensaje de WhatsApp
    if (webhook.type !== 'whatsapp.message.received') {
      console.log('⚠️ Ignoring non-message webhook:', webhook.type);
      return NextResponse.json({
        success: true,
        message: 'Event ignored',
      });
    }

    // Validar que haya data
    if (!webhook.data || webhook.data.length === 0) {
      console.error('❌ Invalid webhook: no data');
      return NextResponse.json(
        { error: 'Invalid payload: no data' },
        { status: 400 }
      );
    }

    const data = webhook.data[0];
    const message = data.message;
    const conversation = data.conversation;

    console.log('📱 From:', message.from);
    console.log('💬 Message Type:', message.type);
    console.log('👤 Contact:', conversation.contact_name);

    // Transformar al formato del Agent Service
    const agentRequest = transformKapsoToAgent(webhook);

    console.log('🔄 Transformed request:', {
      userIdentifier: agentRequest.userIdentifier,
      message: agentRequest.message,
    });

    // Llamar al Agent Service
    const agentResponse = await AgentService.processRequest(agentRequest);

    console.log('✅ Agent response:', {
      intent: agentResponse.metadata?.intent,
      textLength: agentResponse.text?.length || 0,
    });

    // Enviar mensaje usando la API de Kapso
    const kapsoApiKey = process.env.KAPSO_API_KEY;
    const phoneNumberId = data.phone_number_id;

    if (!kapsoApiKey) {
      console.error('❌ KAPSO_API_KEY not configured');
      return NextResponse.json(
        { error: 'Kapso API key not configured' },
        { status: 500 }
      );
    }

    try {
      // Enviar mensaje usando Kapso API
      const kapsoApiUrl = `https://api.kapso.ai/meta/whatsapp/v21.0/${phoneNumberId}/messages`;

      const messagePayload = {
        messaging_product: 'whatsapp',
        to: message.from,
        type: 'text',
        text: {
          body: agentResponse.text,
        },
      };

      console.log('📤 Sending message via Kapso API:', {
        to: message.from,
        messageLength: agentResponse.text.length,
        phoneNumberId,
      });

      const kapsoResponse = await fetch(kapsoApiUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': kapsoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      if (!kapsoResponse.ok) {
        const errorData = await kapsoResponse.text();
        console.error('❌ Kapso API error:', errorData);
        throw new Error(`Kapso API error: ${kapsoResponse.status}`);
      }

      const kapsoResult = await kapsoResponse.json();
      console.log('✅ Message sent via Kapso:', kapsoResult);

      // Responder al webhook con confirmación
      return NextResponse.json({
        success: true,
        message_id: kapsoResult.messages?.[0]?.id,
        metadata: {
          intent: agentResponse.metadata?.intent,
          confidence: agentResponse.metadata?.intentConfidence,
        },
      });
    } catch (apiError: any) {
      console.error('❌ Failed to send message via Kapso:', apiError);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send message via Kapso',
          details: apiError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Kapso Adapter Error:', error);

    // Log detallado del error
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    // Respuesta de error para Kapso
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        message: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
