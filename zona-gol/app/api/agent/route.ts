// =====================================================
// AGENT API ENDPOINT
// =====================================================
// Endpoint público para interactuar con el Agent Service
// POST /api/agent
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from './core/agent.service';
import { AgentRequest } from '@/lib/types/agent.types';

/**
 * POST /api/agent
 *
 * Procesa una solicitud del usuario y retorna la respuesta del agente
 *
 * Body:
 * {
 *   channel: 'whatsapp' | 'web' | 'mobile',
 *   userIdentifier: string,  // Phone para WhatsApp, user_id para web/mobile
 *   message: string,
 *   leagueId?: string,        // Opcional, se resuelve desde identity
 *   tournamentId?: string,    // Opcional, se resuelve desde identity
 *   messageId?: string,       // ID del mensaje (para tracking)
 *   timestamp?: string        // ISO timestamp
 * }
 *
 * Response:
 * {
 *   text: string,
 *   actions?: AgentAction[],
 *   metadata: {
 *     conversationId: string,
 *     intent: Intent,
 *     intentConfidence: number,
 *     ragChunksUsed: RAGChunk[],
 *     sqlQueriesExecuted: SQLQuery[],
 *     latencyMs: number,
 *     llmModel: string,
 *     llmCostUsd: number
 *   },
 *   delivery: {
 *     withinWindow24h: boolean,
 *     templateRequired: boolean,
 *     templateName?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear body
    const body = await request.json();

    // Validar campos requeridos
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      );
    }

    // Construir AgentRequest
    const agentRequest: AgentRequest = {
      channel: body.channel,
      userIdentifier: body.userIdentifier,
      message: body.message,
      leagueId: body.leagueId,
      tournamentId: body.tournamentId,
      messageId: body.messageId || `msg-${Date.now()}`,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    console.log('📨 Agent API: Received request');

    // Procesar con Agent Service
    const response = await AgentService.processRequest(agentRequest);

    console.log('✅ Agent API: Request processed successfully');

    // Retornar respuesta
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Agent API: Error processing request:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent
 *
 * Health check del Agent Service
 */
export async function GET(request: NextRequest) {
  try {
    const health = await AgentService.healthCheck();

    const status = health.ok ? 200 : 503;

    return NextResponse.json(
      {
        status: health.ok ? 'healthy' : 'unhealthy',
        services: health.services,
        errors: health.errors,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Valida el request del agente
 *
 * @param body - Body del request
 * @returns Resultado de validación
 */
function validateRequest(body: any): {
  isValid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // Validar channel
  if (!body.channel) {
    errors.push('channel is required');
  } else if (!['whatsapp', 'web', 'mobile'].includes(body.channel)) {
    errors.push('channel must be whatsapp, web, or mobile');
  }

  // Validar userIdentifier
  if (!body.userIdentifier) {
    errors.push('userIdentifier is required');
  } else if (typeof body.userIdentifier !== 'string') {
    errors.push('userIdentifier must be a string');
  }

  // Validar message
  if (!body.message) {
    errors.push('message is required');
  } else if (typeof body.message !== 'string') {
    errors.push('message must be a string');
  } else if (body.message.length === 0) {
    errors.push('message cannot be empty');
  } else if (body.message.length > 4000) {
    errors.push('message is too long (max 4000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
