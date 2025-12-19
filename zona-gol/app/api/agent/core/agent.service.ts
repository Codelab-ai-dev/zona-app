// =====================================================
// AGENT SERVICE - ORCHESTRATOR
// =====================================================
// El cerebro del agente que coordina todos los servicios
// Flujo: Identity → Router → RAG/SQL → LLM → Actions
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AgentRequest, AgentResponse, RAGChunk, SQLQuery, Intent } from '@/lib/types/agent.types';
import { IdentityService } from './identity.service';
import { RouterService } from './router.service';
import { RAGService } from './rag.service';
import { SQLService } from './sql.service';
import { LLMService } from './llm.service';
import { ActionsService } from './actions.service';

/**
 * Resultado interno del procesamiento
 */
interface ProcessingResult {
  conversationId: string;
  ragContext?: string;
  sqlContext?: string;
  ragChunks: RAGChunk[];
  sqlQueries: SQLQuery[];
  latencyMs: number;
}

export class AgentService {
  /**
   * Procesa una solicitud del usuario y genera una respuesta
   *
   * Este es el método principal que orquesta todo el flujo del agente:
   * 1. Resolver identidad del usuario
   * 2. Verificar permisos y contexto
   * 3. Clasificar intención
   * 4. Obtener contexto (RAG y/o SQL según approach)
   * 5. Generar respuesta con LLM
   * 6. Crear acciones estructuradas
   * 7. Persistir conversación
   * 8. Retornar respuesta
   *
   * @param request - Solicitud del usuario
   * @returns Respuesta del agente
   */
  static async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    console.log('🚀 Agent: Processing request');
    console.log(`📝 Message: "${request.message.substring(0, 50)}..."`);
    console.log(`📱 Channel: ${request.channel}, User: ${request.userIdentifier}`);

    try {
      // ==================================================
      // PASO 1: RESOLVER IDENTIDAD
      // ==================================================
      const identity = await IdentityService.resolveIdentity(
        request.userIdentifier,
        request.channel
      );

      // Si no está vinculado y el canal requiere vinculación
      if (!identity.isLinked && request.channel === 'whatsapp') {
        return this.generateUnlinkedUserResponse(request);
      }

      // ==================================================
      // PASO 2: CLASIFICAR INTENCIÓN
      // ==================================================
      const intentClassification = await RouterService.classifyIntent(
        request.message,
        identity
      );

      const { intent, confidence, entities, suggestedApproach } = intentClassification;

      console.log(`🎯 Intent: ${intent} (confidence: ${confidence.toFixed(2)}, approach: ${suggestedApproach})`);

      // ==================================================
      // PASO 3: VERIFICAR PERMISOS (si requiere contexto de liga)
      // ==================================================
      if (RouterService.requiresLeagueContext(intent)) {
        if (!identity.leagueId) {
          return this.generateNoLeagueContextResponse(request, intent);
        }

        // Verificar permisos específicos si es necesario
        const requiredPermission = IdentityService.getRequiredPermission(intent);
        if (requiredPermission) {
          const hasPermission = await IdentityService.checkPermission(
            identity,
            requiredPermission
          );

          if (!hasPermission) {
            return this.generateNoPermissionResponse(request, intent);
          }
        }
      }

      // ==================================================
      // PASO 4: OBTENER CONTEXTO (RAG y/o SQL)
      // ==================================================
      const { ragContext, sqlContext, ragChunks, sqlQueries } =
        await this.gatherContext(
          request.message,
          intent,
          entities,
          identity,
          suggestedApproach
        );

      // ==================================================
      // PASO 5: GENERAR RESPUESTA CON LLM
      // ==================================================
      const llmResult = await LLMService.generateResponse({
        identity,
        userMessage: request.message,
        intent,
        ragContext,
        sqlContext,
        // TODO: Agregar historial de conversación si existe
        conversationHistory: [],
      });

      // ==================================================
      // PASO 6: CREAR ACCIONES ESTRUCTURADAS
      // ==================================================
      // Verificar si está dentro de ventana 24h (WhatsApp)
      const withinWindow24h = request.channel === 'whatsapp'
        ? await this.isWithin24hWindow(request.userIdentifier)
        : true;

      const suggestedActions = ActionsService.suggestActions(
        intent,
        identity,
        withinWindow24h
      );

      // ==================================================
      // PASO 7: PERSISTIR CONVERSACIÓN
      // ==================================================
      const conversationId = await this.persistConversation({
        request,
        identity,
        intent,
        confidence,
        ragChunks,
        sqlQueries,
        llmResult,
        latencyMs: Date.now() - startTime,
      });

      // Persistir acciones
      for (const action of suggestedActions) {
        await ActionsService.persistAction(action, conversationId);
      }

      // ==================================================
      // PASO 8: CONSTRUIR Y RETORNAR RESPUESTA
      // ==================================================
      const response: AgentResponse = {
        text: llmResult.text,
        actions: ActionsService.formatActionsForResponse(suggestedActions),
        metadata: {
          conversationId,
          intent,
          intentConfidence: confidence,
          ragChunksUsed: ragChunks,
          sqlQueriesExecuted: sqlQueries,
          latencyMs: Date.now() - startTime,
          llmModel: llmResult.model,
          llmCostUsd: llmResult.costUsd,
        },
        delivery: {
          withinWindow24h,
          templateRequired: !withinWindow24h && request.channel === 'whatsapp',
          templateName: !withinWindow24h ? 'agent_response' : undefined,
        },
      };

      console.log(`✅ Agent: Response generated (${response.metadata.latencyMs}ms, $${response.metadata.llmCostUsd.toFixed(4)})`);

      return response;
    } catch (error: any) {
      console.error('❌ Agent: Error processing request:', error);

      // Retornar respuesta de error
      return this.generateErrorResponse(request, error);
    }
  }

  /**
   * Reúne contexto de RAG y SQL según el approach sugerido
   *
   * @param message - Mensaje del usuario
   * @param intent - Intención detectada
   * @param entities - Entidades extraídas
   * @param identity - Identidad del usuario
   * @param approach - Enfoque sugerido (rag, sql, both)
   * @returns Contexto recopilado
   */
  private static async gatherContext(
    message: string,
    intent: string,
    entities: Record<string, any>,
    identity: any,
    approach: 'rag' | 'sql' | 'both'
  ): Promise<{
    ragContext?: string;
    sqlContext?: string;
    ragChunks: RAGChunk[];
    sqlQueries: SQLQuery[];
  }> {
    let ragContext: string | undefined;
    let sqlContext: string | undefined;
    const ragChunks: RAGChunk[] = [];
    const sqlQueries: SQLQuery[] = [];

    // RAG: Búsqueda vectorial
    if (approach === 'rag' || approach === 'both') {
      if (identity.leagueId) {
        try {
          const ragResult = await RAGService.searchKnowledge(message, identity.leagueId, {
            topK: 5,
            similarityThreshold: 0.7,
            tournamentId: identity.tournamentId,
          });

          ragChunks.push(...ragResult.chunks);
          ragContext = RAGService.formatChunksForLLM(ragResult.chunks);
        } catch (error) {
          console.warn('⚠️ RAG search failed:', error);
        }
      }
    }

    // SQL: Queries directas
    if (approach === 'sql' || approach === 'both') {
      if (identity.leagueId) {
        try {
          sqlContext = await this.executeSQLForIntent(intent, entities, identity);

          // Agregar query ejecutado a la lista
          sqlQueries.push({
            query: `Intent: ${intent}`,
            resultCount: 0, // TODO: obtener de sqlContext cuando esté disponible
            executionTimeMs: 0,
          });
        } catch (error) {
          console.warn('⚠️ SQL execution failed:', error);
        }
      }
    }

    return { ragContext, sqlContext, ragChunks, sqlQueries };
  }

  /**
   * Ejecuta queries SQL según la intención
   *
   * @param intent - Intención del usuario
   * @param entities - Entidades extraídas
   * @param identity - Identidad del usuario
   * @returns Contexto SQL formateado
   */
  private static async executeSQLForIntent(
    intent: string,
    entities: Record<string, any>,
    identity: any
  ): Promise<string> {
    switch (intent) {
      case 'calendario': {
        if (entities.jornada && identity.leagueId) {
          const result = await SQLService.getJornadaCalendar(
            entities.jornada,
            identity.leagueId,
            identity.tournamentId
          );
          return SQLService.formatMatchesForLLM(result.data);
        }

        // Si no hay jornada específica, mostrar partidos de hoy
        if (identity.leagueId) {
          const result = await SQLService.getTodayMatches(
            identity.leagueId,
            identity.tournamentId
          );
          return SQLService.formatMatchesForLLM(result.data);
        }
        break;
      }

      case 'resultados': {
        if (identity.leagueId) {
          const result = await SQLService.getMatchResults(identity.leagueId, {
            jornada: entities.jornada,
            teamName: entities.team_name,
            limit: 10,
            tournamentId: identity.tournamentId,
          });
          return SQLService.formatMatchesForLLM(result.data);
        }
        break;
      }

      case 'tabla_posiciones': {
        if (identity.leagueId && identity.tournamentId) {
          const result = await SQLService.getStandings(
            identity.leagueId,
            identity.tournamentId
          );
          return SQLService.formatStandingsForLLM(result.data);
        }
        break;
      }

      case 'suspensiones': {
        if (identity.leagueId) {
          const result = await SQLService.getSuspendedPlayers(
            identity.leagueId,
            identity.tournamentId
          );

          if (result.data.length === 0) {
            return 'No hay jugadores suspendidos actualmente.';
          }

          let formatted = 'Jugadores suspendidos:\n';
          result.data.forEach((suspension) => {
            formatted += `- ${suspension.playerName} (${suspension.teamName})`;
            if (suspension.suspendedUntil) {
              formatted += ` hasta ${suspension.suspendedUntil}`;
            }
            formatted += '\n';
          });
          return formatted;
        }
        break;
      }

      case 'estadisticas': {
        if (identity.leagueId && identity.tournamentId) {
          const result = await SQLService.getTopScorers(
            identity.leagueId,
            identity.tournamentId,
            10
          );
          return SQLService.formatScorersForLLM(result.data);
        }
        break;
      }

      case 'proximos_partidos': {
        if (entities.team_name && identity.leagueId) {
          const result = await SQLService.getTeamUpcomingMatches(
            entities.team_name,
            identity.leagueId,
            5
          );
          return SQLService.formatMatchesForLLM(result.data);
        }
        break;
      }
    }

    return '';
  }

  /**
   * Verifica si un número está dentro de ventana 24h
   *
   * @param phoneNumber - Número de teléfono
   * @returns true si está dentro de ventana
   */
  private static async isWithin24hWindow(phoneNumber: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();

    // @ts-expect-error - Supabase type inference issue without generated types
    const { data, error } = await supabase.rpc('is_within_24h_window', {
      p_phone_number: phoneNumber,
    });

    if (error) {
      console.warn('⚠️ Failed to check 24h window:', error);
      return false;
    }

    return data === true;
  }

  /**
   * Persiste una conversación en la base de datos
   *
   * @param data - Datos de la conversación
   * @returns ID de la conversación
   */
  private static async persistConversation(data: {
    request: AgentRequest;
    identity: any;
    intent: string;
    confidence: number;
    ragChunks: RAGChunk[];
    sqlQueries: SQLQuery[];
    llmResult: any;
    latencyMs: number;
  }): Promise<string> {
    const supabase = await createServerSupabaseClient();

    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      // @ts-expect-error - Supabase type inference issue without generated types
      .insert({
        channel: data.request.channel,
        user_identifier: data.request.userIdentifier,
        user_id: data.identity.userId,
        league_id: data.identity.leagueId,
        tournament_id: data.identity.tournamentId,
        user_message: data.request.message,
        agent_response: data.llmResult.text,
        intent: data.intent,
        intent_confidence: data.confidence,
        rag_chunks_used: data.ragChunks.length > 0 ? data.ragChunks : null,
        sql_queries_executed: data.sqlQueries.length > 0 ? data.sqlQueries : null,
        llm_model: data.llmResult.model,
        llm_tokens_used: data.llmResult.tokensUsed,
        llm_cost_usd: data.llmResult.costUsd,
        latency_ms: data.latencyMs,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to persist conversation:', error);
      throw new Error('Failed to persist conversation');
    }

    const conversationData = conversation as any;
    return conversationData.id;
  }

  /**
   * Genera respuesta para usuario no vinculado
   */
  private static generateUnlinkedUserResponse(
    request: AgentRequest
  ): AgentResponse {
    return {
      text: `¡Hola! 👋 Para usar este servicio, primero necesitas vincular tu WhatsApp desde la aplicación.

Ve a Configuración → Vincular WhatsApp y sigue las instrucciones.

Una vez vinculado, podrás consultar información sobre partidos, resultados, tabla de posiciones y mucho más! ⚽`,
      actions: [],
      metadata: {
        conversationId: '',
        intent: 'conversacion',
        intentConfidence: 1.0,
        ragChunksUsed: [],
        sqlQueriesExecuted: [],
        latencyMs: 0,
        llmModel: 'fallback',
        llmCostUsd: 0,
      },
      delivery: {
        withinWindow24h: false,
        templateRequired: true,
        templateName: 'link_whatsapp',
      },
    };
  }

  /**
   * Genera respuesta cuando falta contexto de liga
   */
  private static generateNoLeagueContextResponse(
    request: AgentRequest,
    intent: string
  ): AgentResponse {
    return {
      text: 'Lo siento, no puedo procesar esta consulta sin un contexto de liga. Por favor, asegúrate de estar vinculado correctamente.',
      actions: [],
      metadata: {
        conversationId: '',
        intent: intent as Intent,
        intentConfidence: 0,
        ragChunksUsed: [],
        sqlQueriesExecuted: [],
        latencyMs: 0,
        llmModel: 'fallback',
        llmCostUsd: 0,
      },
      delivery: {
        withinWindow24h: true,
        templateRequired: false,
      },
    };
  }

  /**
   * Genera respuesta cuando el usuario no tiene permisos
   */
  private static generateNoPermissionResponse(
    request: AgentRequest,
    intent: string
  ): AgentResponse {
    return {
      text: 'No tienes permisos para acceder a esta información. Contacta al administrador de tu liga si crees que esto es un error.',
      actions: [],
      metadata: {
        conversationId: '',
        intent: intent as Intent,
        intentConfidence: 0,
        ragChunksUsed: [],
        sqlQueriesExecuted: [],
        latencyMs: 0,
        llmModel: 'fallback',
        llmCostUsd: 0,
      },
      delivery: {
        withinWindow24h: true,
        templateRequired: false,
      },
    };
  }

  /**
   * Genera respuesta de error
   */
  private static generateErrorResponse(
    request: AgentRequest,
    error: Error
  ): AgentResponse {
    console.error('Error details:', error);

    return {
      text: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo en unos momentos.',
      actions: [],
      metadata: {
        conversationId: '',
        intent: 'unknown',
        intentConfidence: 0,
        ragChunksUsed: [],
        sqlQueriesExecuted: [],
        latencyMs: 0,
        llmModel: 'fallback',
        llmCostUsd: 0,
      },
      delivery: {
        withinWindow24h: true,
        templateRequired: false,
      },
    };
  }

  /**
   * Health check completo del Agent Service
   *
   * @returns Estado de todos los servicios
   */
  static async healthCheck(): Promise<{
    ok: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const services: Record<string, boolean> = {};

    // Check RAG
    try {
      const ragHealth = await RAGService.healthCheck();
      services.rag = ragHealth.ok;
      if (!ragHealth.ok) errors.push(`RAG: ${ragHealth.error}`);
    } catch (error: any) {
      services.rag = false;
      errors.push(`RAG: ${error.message}`);
    }

    // Check LLM
    try {
      const llmHealth = await LLMService.healthCheck();
      services.llm = llmHealth.ok;
      if (!llmHealth.ok) errors.push(`LLM: ${llmHealth.error}`);
    } catch (error: any) {
      services.llm = false;
      errors.push(`LLM: ${error.message}`);
    }

    // Check Database (intenta una query simple)
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from('leagues').select('id').limit(1);
      services.database = !error;
      if (error) errors.push(`Database: ${error.message}`);
    } catch (error: any) {
      services.database = false;
      errors.push(`Database: ${error.message}`);
    }

    const ok = Object.values(services).every((s) => s === true);

    return { ok, services, errors };
  }
}
