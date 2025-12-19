// =====================================================
// AGENT SERVICE TYPES
// =====================================================
// Tipos TypeScript para el Agent Service profesional
// =====================================================

export type Channel = 'whatsapp' | 'web' | 'mobile';

export type UserRole = 'super_admin' | 'league_admin' | 'team_owner' | 'user' | 'public';

export type Intent =
  | 'calendario'           // Jornada / calendario de partidos
  | 'resultados'           // Resultados de partidos
  | 'proximos_partidos'    // Próximos partidos de un equipo
  | 'tabla_posiciones'     // Tabla de posiciones
  | 'suspensiones'         // Jugadores suspendidos
  | 'estadisticas'         // Estadísticas de jugadores/equipos
  | 'reglamento'           // Reglas y reglamento
  | 'pagos'                // Adeudos y pagos (si aplica)
  | 'informacion_general'  // Info general de la liga
  | 'conversacion'         // Conversación casual
  | 'unknown';             // No se pudo determinar

export type ActionType =
  | 'show_match'           // Mostrar detalles de un partido
  | 'show_jornada'         // Mostrar jornada completa
  | 'show_standings'       // Mostrar tabla de posiciones
  | 'show_team'            // Mostrar información de equipo
  | 'request_reschedule'   // Solicitar reprogramación
  | 'escalate_to_human'    // Escalar a atención humana
  | 'send_reminder'        // Enviar recordatorio
  | 'generate_report'      // Generar reporte
  | 'custom';              // Acción personalizada

// System actions (backend/n8n execution)
export type SystemActionType =
  | 'send_whatsapp_template'  // Enviar plantilla de WhatsApp
  | 'open_24h_window'         // Abrir ventana 24h de WhatsApp
  | 'create_notification'     // Crear notificación en app
  | 'log_conversation'        // Registrar conversación
  | 'update_user_context'     // Actualizar contexto de usuario
  | 'trigger_webhook'         // Disparar webhook
  | 'schedule_reminder';      // Programar recordatorio

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export type UserFeedback = 'positive' | 'negative' | 'neutral';

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Request principal del agente
 * Este es el contrato entre n8n (o cualquier canal) y el backend
 */
export interface AgentRequest {
  // Identificación del mensaje
  channel: Channel;
  userIdentifier: string;  // Teléfono para WhatsApp, user_id para web/mobile
  message: string;

  // Contexto opcional (puede venir de vinculación previa)
  leagueId?: string;
  tournamentId?: string;

  // Metadata del canal
  messageId?: string;      // Para deduplicación
  timestamp?: string;
  rawPayload?: any;        // Payload completo del canal para logs
}

/**
 * Respuesta del agente
 * Todo lo que necesita n8n para completar el flujo
 */
export interface AgentResponse {
  // Respuesta al usuario
  text: string;

  // Acciones estructuradas (opcionales)
  actions?: SystemAction[];

  // Contexto de debug/auditoría
  metadata: {
    conversationId: string;
    intent: Intent;
    intentConfidence: number;
    ragChunksUsed: RAGChunk[];
    sqlQueriesExecuted?: SQLQuery[];
    latencyMs: number;
    llmModel: string;
    llmCostUsd: number;
  };

  // Control de envío
  delivery: {
    withinWindow24h: boolean;  // ¿Está dentro de ventana 24h de WhatsApp?
    templateRequired: boolean;  // ¿Se requiere plantilla?
    templateName?: string;      // Nombre de la plantilla a usar
  };

  // Fuentes (para mostrar en UI si aplica)
  sources?: {
    type: 'match' | 'jornada' | 'team' | 'player';
    id: string;
    name: string;
    url?: string;
  }[];
}

// =====================================================
// INTERNAL TYPES
// =====================================================

/**
 * Identidad del usuario con contexto multi-tenant
 */
export interface UserIdentity {
  // Identificación
  userIdentifier: string;
  channel: Channel;

  // Usuario vinculado (si existe)
  userId?: string;
  role?: UserRole;

  // Contexto multi-tenant (OBLIGATORIO para consultas)
  leagueId?: string;
  leagueName?: string;        // Nombre de la liga para contexto LLM
  tournamentId?: string;
  tournamentName?: string;    // Nombre del torneo para contexto LLM

  // Metadata
  displayName?: string;
  preferredLanguage?: string;
  isLinked: boolean;  // ¿Usuario vinculado correctamente?
}

/**
 * Chunk de RAG recuperado
 */
export interface RAGChunk {
  id: string;
  contentType: string;
  contentText: string;
  similarity: number;
  metadata: Record<string, any>;
  leagueId: string;
  tournamentId?: string;
  matchId?: string;
}

/**
 * Query SQL ejecutada
 */
export interface SQLQuery {
  query: string;
  resultCount: number;
  executionTimeMs?: number;
}

/**
 * Acción estructurada del agente (para respuesta al usuario)
 */
export interface AgentAction {
  type: ActionType;
  payload: Record<string, any>;
  executed?: boolean;
  executionResult?: any;
  errorMessage?: string;
}

/**
 * System action (for backend/n8n execution)
 */
export interface SystemAction {
  type: SystemActionType;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  conversationId?: string;
  executedAt?: Date;
  errorMessage?: string;
}

/**
 * Contexto completo para el LLM
 */
export interface AgentContext {
  // Identidad y permisos
  identity: UserIdentity;

  // Mensaje del usuario
  userMessage: string;

  // Contexto recuperado
  ragChunks: RAGChunk[];
  sqlResults?: any[];

  // Intención detectada
  intent: Intent;
  intentConfidence: number;

  // Historial de conversación (opcional, futuro)
  conversationHistory?: ConversationMessage[];
}

/**
 * Mensaje de conversación (para contexto)
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * WhatsApp User Link (tabla whatsapp_user_links)
 */
export interface WhatsAppUserLink {
  id: string;
  phoneNumber: string;
  userId?: string;
  leagueId?: string;
  tournamentId?: string;
  role: UserRole;
  isActive: boolean;
  linkedAt: Date;
  lastInteractionAt?: Date;
  displayName?: string;
  preferredLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent Conversation (tabla agent_conversations)
 */
export interface AgentConversation {
  id: string;
  channel: Channel;
  userIdentifier: string;
  whatsappLinkId?: string;
  leagueId?: string;
  tournamentId?: string;
  userMessage: string;
  agentResponse?: string;
  agentResponseTokens?: number;
  ragChunksUsed?: RAGChunk[];
  ragSearchQuery?: string;
  ragSimilarityThreshold?: number;
  sqlQueriesExecuted?: SQLQuery[];
  intent?: Intent;
  intentConfidence?: number;
  actions?: AgentAction[];
  latencyMs?: number;
  llmModel?: string;
  llmCostUsd?: number;
  userFeedback?: UserFeedback;
  escalatedToHuman?: boolean;
  deliveryStatus?: DeliveryStatus;
  deliveryError?: string;
  createdAt: Date;
}

/**
 * WhatsApp Conversation Window (tabla whatsapp_conversation_windows)
 */
export interface WhatsAppConversationWindow {
  id: string;
  phoneNumber: string;
  windowOpenedAt: Date;
  windowClosesAt: Date;
  openedBy: 'user_message' | 'business_message' | 'template';
  isActive: boolean;
  createdAt: Date;
}

/**
 * WhatsApp Message Template (tabla whatsapp_message_templates)
 */
export interface WhatsAppMessageTemplate {
  id: string;
  templateName: string;
  category: 'utility' | 'marketing' | 'authentication';
  language: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variables?: TemplateVariable[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  usageCount: number;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  example: string;
  required: boolean;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

/**
 * Configuración del Agent Service
 */
export interface AgentConfig {
  // OpenAI
  openaiApiKey: string;
  embeddingModel: string;      // Default: text-embedding-ada-002
  chatModel: string;            // Default: gpt-4 o gpt-3.5-turbo
  temperature: number;          // Default: 0.3

  // RAG
  ragSimilarityThreshold: number;  // Default: 0.7
  ragTopK: number;                 // Default: 5

  // Rate Limiting
  rateLimitMaxMessages: number;    // Default: 10
  rateLimitWindowMinutes: number;  // Default: 10

  // WhatsApp
  whatsapp24hWindowEnabled: boolean;  // Default: true

  // Multi-tenant
  requireLeagueContext: boolean;   // Default: true

  // Logs
  enableDebugLogs: boolean;        // Default: false
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Resultado de rate limiting
 */
export interface RateLimitResult {
  allowed: boolean;
  currentCount?: number;
  maxMessages?: number;
  resetAt?: Date;
}

/**
 * Resultado de verificación de ventana 24h
 */
export interface Window24hResult {
  withinWindow: boolean;
  windowClosesAt?: Date;
  requiresTemplate: boolean;
}

/**
 * Estadísticas del agente
 */
export interface AgentStats {
  totalConversations: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  intents: Record<Intent, number>;
  channels: Record<Channel, number>;
  feedback: Record<UserFeedback | 'no_feedback', number>;
  escalations: number;
}
