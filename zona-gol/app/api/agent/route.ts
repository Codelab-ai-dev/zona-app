// =====================================================
// AGENT API ENDPOINT
// =====================================================
// Endpoint público para interactuar con el Agent Service
// POST /api/agent
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from './core/agent.service';
import { AgentRequest } from '@/lib/types/agent.types';

// =====================================================
// RATE LIMITING (en memoria - simple pero efectivo)
// =====================================================
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 30; // máximo 30 requests por minuto por IP

// Mapa de IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Limpiar entradas viejas cada 5 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(ip);

  if (!existing || now > existing.resetTime) {
    // Nueva ventana
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: existing.resetTime - now };
  }

  existing.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - existing.count, resetIn: existing.resetTime - now };
}

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
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

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
