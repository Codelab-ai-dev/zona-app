# Agent Service - Plan de Implementación Profesional

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura Propuesta](#arquitectura-propuesta)
3. [Estado Actual](#estado-actual)
4. [Roadmap de Implementación](#roadmap-de-implementación)
5. [Fase 1: Infraestructura](#fase-1-infraestructura)
6. [Fase 2: Agent Service Core](#fase-2-agent-service-core)
7. [Fase 3: Integración n8n](#fase-3-integración-n8n)
8. [Fase 4: Testing y Optimización](#fase-4-testing-y-optimización)
9. [Fase 5: Producción](#fase-5-producción)

---

## Visión General

### Objetivo

Crear un **Agent Service profesional** que sea:
- **Multi-tenant**: Cada consulta tiene `league_id` obligatorio
- **Reutilizable**: Mismo agente para WhatsApp, web y mobile
- **Auditado**: Logging completo de conversaciones
- **Seguro**: Permisos y rate limiting
- **Escalable**: Arquitectura desacoplada

### Principios de Diseño

1. **Separación de responsabilidades**
   - **Canal** (WhatsApp/Kapso): Solo recibe y entrega mensajes
   - **Orquestación** (n8n): Webhooks, plantillas, recordatorios, reintentos
   - **Cerebro** (Agent Service): Lógica, permisos, RAG, acciones
   - **Fuente de verdad** (Supabase): Data operativa + RAG + auditoría

2. **Contrato único**
   - Un endpoint `/api/agent` que acepta: canal + mensaje + identidad + contexto
   - Responde: texto + acciones + fuentes + metadata

3. **Multi-tenant blindado**
   - Toda consulta requiere `league_id`
   - WhatsApp vinculado a user → league → tournament
   - Sin vínculo = sin acceso a data

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES                          │
│         (Administradores, Equipos, Aficionados)              │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴──────────┬─────────────────┐
        │                      │                 │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────▼──────────┐
│  WhatsApp      │  │  Next.js Web     │  │ Flutter App   │
│  (AI Agent)    │  │  (Admin Portal)  │  │ (Zona-G)      │
└───────┬────────┘  └─────────┬────────┘  └────┬──────────┘
        │                      │                 │
┌───────▼──────────────────────▼─────────────────▼──────────┐
│                      n8n Workflows                         │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ WhatsApp Bot   │  │ Embeddings   │  │ Notifications │ │
│  └────────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼─────────┘
            │                  │                  │
┌───────────▼──────────────────▼──────────────────▼─────────┐
│                  AGENT SERVICE (Next.js API)               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  /api/agent (contrato único)                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Identity │  │ Router   │  │ RAG Svc  │  │ SQL Svc  │ │
│  │ Service  │  │ (intent) │  │ Service  │  │ Service  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ LLM Svc  │  │ Actions  │  │ Logging  │  │ Rate     │ │
│  │ Service  │  │ Service  │  │ Service  │  │ Limiting │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                  SUPABASE (PostgreSQL + pgvector)          │
│  - league_knowledge_base (RAG)                             │
│  - agent_conversations (auditoría)                         │
│  - whatsapp_user_links (identidad)                         │
│  - matches, tournaments, teams (data operativa)            │
└────────────────────────────────────────────────────────────┘
```

---

## Estado Actual

### ✅ LO QUE YA EXISTE

**Base de datos vectorial**
- ✅ Tabla `league_knowledge_base` con pgvector
- ✅ 6 tipos de contenido automatizados
- ✅ Triggers automáticos para partidos finalizados
- ✅ Funciones de búsqueda semántica

**APIs y Webhooks**
- ✅ `/api/generate-embedding` (proxy para n8n)
- ✅ Webhooks desde Flutter app
- ✅ Utilidades frontend para embeddings

**Workflows n8n**
- ✅ 3 workflows JSON listos para importar
- ✅ Documentación completa (7 docs)

### ❌ LO QUE FALTA

**Infraestructura del Agent Service**
- ❌ Tablas de identidad y auditoría (⏳ creadas en migración)
- ❌ Endpoint `/api/agent` centralizado
- ❌ Servicios de: identity, router, rag, sql, llm, actions
- ❌ Sistema de rate limiting
- ❌ Control de ventana 24h WhatsApp

**Integración**
- ❌ Flujo completo WhatsApp → n8n → Agent → Supabase → n8n → WhatsApp
- ❌ Vinculación de usuarios WhatsApp
- ❌ UI para vincular WhatsApp desde la app

---

## Roadmap de Implementación

| Fase | Descripción | Duración Estimada | Prioridad |
|------|-------------|-------------------|-----------|
| **Fase 1** | Infraestructura (DB + tipos) | 2 horas | 🔴 Crítica |
| **Fase 2** | Agent Service Core | 6-8 horas | 🔴 Crítica |
| **Fase 3** | Integración n8n | 3-4 horas | 🟠 Alta |
| **Fase 4** | Testing y Optimización | 4-6 horas | 🟡 Media |
| **Fase 5** | Producción | Ongoing | 🟢 Baja |

**Total estimado:** 15-20 horas de desarrollo

---

## Fase 1: Infraestructura

### Objetivo
Establecer las bases de datos y tipos necesarios para el Agent Service.

### Tareas

#### 1.1 Aplicar migración de infraestructura ✅ COMPLETADO

**Archivo:** `supabase/migrations/20250118000001_create_agent_infrastructure.sql`

**Tablas creadas:**
- `whatsapp_user_links` - Vinculación WhatsApp ↔ Usuario ↔ Liga
- `agent_conversations` - Auditoría completa
- `agent_rate_limits` - Control de tasa
- `agent_actions` - Acciones estructuradas
- `whatsapp_message_templates` - Plantillas aprobadas Meta
- `whatsapp_conversation_windows` - Seguimiento ventanas 24h

**Funciones creadas:**
- `is_within_24h_window(phone)` - Verifica ventana activa
- `open_24h_window(phone, opened_by)` - Abre nueva ventana
- `check_rate_limit(user, max, window)` - Aplica rate limiting
- `get_agent_stats(league_id, start, end)` - Estadísticas

**Comando:**
```bash
# Desde Supabase Dashboard → SQL Editor
# O usando CLI:
supabase db push
```

#### 1.2 Crear tipos TypeScript ✅ COMPLETADO

**Archivo:** `lib/types/agent.types.ts`

**Tipos principales:**
- `AgentRequest` - Request principal del agente
- `AgentResponse` - Respuesta completa
- `UserIdentity` - Identidad con contexto multi-tenant
- `RAGChunk` - Chunk de conocimiento recuperado
- `AgentAction` - Acción estructurada

#### 1.3 Verificar migración aplicada

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'whatsapp%' OR table_name LIKE 'agent%';

-- Debería retornar:
-- whatsapp_user_links
-- whatsapp_message_templates
-- whatsapp_conversation_windows
-- agent_conversations
-- agent_rate_limits
-- agent_actions
```

**Duración:** 30 minutos
**Dependencias:** Ninguna
**Estado:** ✅ Infraestructura lista

---

## Fase 2: Agent Service Core

### Objetivo
Implementar el "cerebro" del sistema: el Agent Service con todos sus componentes.

### Estructura de Archivos

```
app/api/agent/
├── route.ts                    # Endpoint principal
├── core/
│   ├── agent.ts                # Orquestador principal
│   ├── identity.service.ts     # Identidad y permisos
│   ├── router.service.ts       # Routing por intención
│   └── context.service.ts      # Gestión de contexto
├── services/
│   ├── rag.service.ts          # Servicio RAG
│   ├── sql.service.ts          # Consultas SQL
│   ├── llm.service.ts          # OpenAI integration
│   ├── actions.service.ts      # Sistema de acciones
│   ├── rate-limit.service.ts   # Rate limiting
│   └── whatsapp.service.ts     # Ventanas 24h
└── utils/
    ├── prompts.ts              # System prompts
    └── validators.ts           # Validadores

lib/
└── supabase/
    └── agent-queries.ts        # Queries específicas del agente
```

### 2.1 Identity Service (Paso 1: Identidad y Permisos)

**Responsabilidades:**
1. Identificar usuario desde `userIdentifier` (phone o user_id)
2. Verificar si está vinculado a liga/torneo
3. Determinar permisos (`role`)
4. Proveer contexto multi-tenant

**Archivo:** `app/api/agent/core/identity.service.ts`

**Funciones principales:**
```typescript
export class IdentityService {
  // Resolver identidad desde phone o user_id
  static async resolveIdentity(
    userIdentifier: string,
    channel: Channel
  ): Promise<UserIdentity>

  // Vincular teléfono WhatsApp a usuario
  static async linkWhatsAppUser(
    phoneNumber: string,
    userId: string,
    leagueId: string,
    role: UserRole
  ): Promise<WhatsAppUserLink>

  // Desvincular teléfono
  static async unlinkWhatsAppUser(
    phoneNumber: string
  ): Promise<void>

  // Verificar permisos
  static async checkPermission(
    identity: UserIdentity,
    action: string
  ): Promise<boolean>
}
```

**Flujo:**
```
1. Recibe: userIdentifier + channel
2. Si channel === 'whatsapp':
   - Busca en whatsapp_user_links WHERE phone_number = userIdentifier
   - Si encontrado → retorna identity con league_id/tournament_id/role
   - Si NO encontrado → retorna identity.isLinked = false
3. Si channel === 'web' o 'mobile':
   - Usa auth.uid() para obtener usuario
   - Busca league_id en tabla users (managed_league_id)
4. Retorna UserIdentity completo
```

**Casos especiales:**
- Usuario NO vinculado → responde con instrucciones de vinculación
- Usuario vinculado pero sin league_id → error (datos inconsistentes)

### 2.2 Router Service (Paso 2: Clasificación de Intención)

**Responsabilidades:**
1. Clasificar la pregunta del usuario en una intención
2. Determinar si conviene RAG, SQL o ambos
3. Extraer entidades clave (equipo, jornada, fecha, etc.)

**Archivo:** `app/api/agent/core/router.service.ts`

**Funciones principales:**
```typescript
export class RouterService {
  // Clasificar intención del mensaje
  static async classifyIntent(
    message: string,
    identity: UserIdentity
  ): Promise<{
    intent: Intent;
    confidence: number;
    entities: Record<string, any>;
    suggestedApproach: 'rag' | 'sql' | 'both';
  }>

  // Extraer entidades (equipo, jornada, fecha)
  static extractEntities(
    message: string,
    intent: Intent
  ): Promise<Record<string, any>>
}
```

**Estrategia de clasificación:**

Opción A: **Keywords pattern matching** (simple, rápido, sin costo)
```typescript
const intentPatterns = {
  calendario: ['jornada', 'horario', 'cuando', 'fecha', 'calendario', 'partidos'],
  resultados: ['resultado', 'marcador', 'ganó', 'empató', 'perdió', 'goles'],
  tabla_posiciones: ['tabla', 'posiciones', 'puntaje', 'primero', 'líder'],
  proximos_partidos: ['próximo', 'siguiente', 'jugará', 'contra'],
  suspensiones: ['suspendido', 'sancionado', 'tarjetas', 'expulsado'],
  // ...
};
```

Opción B: **LLM classification** (precisa, pero cuesta)
```typescript
const prompt = `Clasifica esta pregunta en una de estas categorías: ${intents}.
Pregunta: "${message}"
Retorna JSON: {"intent": "...", "confidence": 0.9, "entities": {...}}`;
```

**Recomendación:** Empezar con Opción A, migrar a Opción B si es necesario.

**Routing por intención:**
| Intent | Enfoque Sugerido | Razón |
|--------|------------------|-------|
| `calendario` | SQL | Datos estructurados, query directo a `matches` |
| `resultados` | SQL + RAG | SQL para datos recientes, RAG para contexto |
| `tabla_posiciones` | SQL | Función `generate_standings_content()` ya existe |
| `suspensiones` | SQL | Query directo a `player_suspensions` |
| `estadisticas` | SQL | Tablas `player_stats`, `team_stats` |
| `reglamento` | RAG | Contenido textual, no estructurado |
| `informacion_general` | RAG | Respuestas generales sobre la liga |
| `conversacion` | LLM | Sin data específica |

### 2.3 RAG Service (Paso 3: Búsqueda Vectorial)

**Responsabilidades:**
1. Generar embedding de la pregunta del usuario
2. Buscar en `league_knowledge_base` con filtros multi-tenant
3. Aplicar threshold de similitud
4. Retornar top-k chunks

**Archivo:** `app/api/agent/services/rag.service.ts`

**Funciones principales:**
```typescript
export class RAGService {
  // Buscar conocimiento relevante
  static async searchKnowledge(
    query: string,
    leagueId: string,
    tournamentId?: string,
    options?: {
      topK?: number;
      similarityThreshold?: number;
      contentTypes?: string[];
    }
  ): Promise<RAGChunk[]>

  // Generar embedding de query
  private static async generateEmbedding(
    text: string
  ): Promise<number[]>
}
```

**Implementación de búsqueda:**
```typescript
const { data, error } = await supabase.rpc('search_league_knowledge', {
  p_league_id: leagueId,
  p_tournament_id: tournamentId,
  p_query_embedding: embedding,  // Vector de 1536 dimensiones
  p_match_threshold: similarityThreshold || 0.7,
  p_match_count: topK || 5,
  p_content_types: contentTypes || null
});
```

**Filtros importantes:**
- `league_id` (OBLIGATORIO)
- `tournament_id` (opcional pero recomendado)
- `valid_from` y `valid_until` (ya filtrados en la función SQL)
- `content_type` (opcional: solo jornadas, solo resultados, etc.)

### 2.4 SQL Service (Paso 4: Consultas Directas)

**Responsabilidades:**
1. Ejecutar queries SQL para datos estructurados
2. Formatear resultados para el LLM
3. Logging de queries ejecutadas

**Archivo:** `app/api/agent/services/sql.service.ts`

**Funciones principales:**
```typescript
export class SQLService {
  // Obtener jornada actual o específica
  static async getJornada(
    leagueId: string,
    tournamentId: string,
    jornadaNumber?: number
  ): Promise<any>

  // Obtener resultados recientes
  static async getRecentResults(
    leagueId: string,
    tournamentId: string,
    limit?: number
  ): Promise<any[]>

  // Obtener tabla de posiciones
  static async getStandings(
    leagueId: string,
    tournamentId: string
  ): Promise<any[]>

  // Obtener suspensiones activas
  static async getSuspensions(
    leagueId: string,
    tournamentId: string
  ): Promise<any[]>

  // Próximos partidos de un equipo
  static async getTeamUpcomingMatches(
    teamId: string,
    limit?: number
  ): Promise<any[]>
}
```

**Ejemplo de implementación:**
```typescript
static async getJornada(leagueId: string, tournamentId: string, jornadaNumber?: number) {
  // Si no se especifica jornada, obtener la actual
  const jornada = jornadaNumber || await this.getCurrentJornada(tournamentId);

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      match_date,
      match_time,
      field_number,
      status,
      home_team:teams!matches_home_team_id_fkey(id, name, logo),
      away_team:teams!matches_away_team_id_fkey(id, name, logo),
      home_score,
      away_score
    `)
    .eq('tournament_id', tournamentId)
    .eq('round', jornada)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  if (error) throw error;

  return {
    jornada,
    matches: data,
    totalMatches: data.length
  };
}
```

### 2.5 LLM Service (Paso 5: Generación de Respuesta)

**Responsabilidades:**
1. Construir prompt del sistema con contexto
2. Llamar a OpenAI (GPT-4 o GPT-3.5)
3. Parsear respuesta
4. Generar acciones estructuradas si aplica

**Archivo:** `app/api/agent/services/llm.service.ts`

**Funciones principales:**
```typescript
export class LLMService {
  // Generar respuesta del agente
  static async generateResponse(
    context: AgentContext,
    config: AgentConfig
  ): Promise<{
    text: string;
    actions: AgentAction[];
    tokensUsed: number;
    costUsd: number;
  }>

  // Construir prompt del sistema
  private static buildSystemPrompt(
    context: AgentContext
  ): string

  // Construir mensajes para OpenAI
  private static buildMessages(
    context: AgentContext
  ): ChatCompletionMessageParam[]
}
```

**System Prompt (ejemplo):**
```typescript
const systemPrompt = `Eres el asistente virtual de ${league.name}, una liga de fútbol amateur.

TU MISIÓN:
- Ayudar a usuarios con información sobre partidos, resultados, tabla de posiciones, etc.
- Responder ÚNICAMENTE con información del contexto proporcionado.
- Si no sabes algo, admítelo y sugiere contactar a los administradores.
- Sé conciso y amigable.

CONTEXTO DEL USUARIO:
- Liga: ${context.identity.leagueName}
- Torneo: ${context.identity.tournamentName}
- Rol: ${context.identity.role}

INFORMACIÓN DISPONIBLE:
${context.ragChunks.map(chunk => chunk.contentText).join('\n\n')}

${context.sqlResults ? `DATOS ESTRUCTURADOS:\n${JSON.stringify(context.sqlResults, null, 2)}` : ''}

REGLAS ESTRICTAS:
1. NO INVENTAR información que no esté en el contexto.
2. Si algo no está en el contexto, dilo claramente: "No tengo esa información disponible".
3. Responde en español de México.
4. Si es WhatsApp, responde en máximo 3 párrafos cortos.
5. Incluye emojis relevantes (⚽️, 🏆, 📅) pero no excesivos.
`;
```

**Generación de acciones:**
```typescript
// El LLM puede sugerir acciones estructuradas
const functionCall = {
  name: 'generate_action',
  parameters: {
    type: 'object',
    properties: {
      action_type: { type: 'string', enum: ['show_match', 'show_jornada', 'show_standings'] },
      payload: { type: 'object' }
    }
  }
};

// Si el modelo retorna function_call, parsearlo y crear AgentAction
```

### 2.6 Actions Service (Paso 6: Sistema de Acciones)

**Responsabilidades:**
1. Parsear acciones sugeridas por el LLM
2. Ejecutar acciones (o marcarlas como pending)
3. Logging de ejecución

**Archivo:** `app/api/agent/services/actions.service.ts`

**Funciones principales:**
```typescript
export class ActionsService {
  // Ejecutar acción
  static async executeAction(
    action: AgentAction,
    conversationId: string
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }>

  // Registrar acción en DB
  static async logAction(
    action: AgentAction,
    conversationId: string
  ): Promise<string> // returns action_id
}
```

**Tipos de acciones implementables:**

| Tipo | Descripción | Ejecución |
|------|-------------|-----------|
| `show_match` | Mostrar detalles de partido | Generar URL deep-link a la app |
| `show_jornada` | Mostrar jornada completa | Generar URL con query params |
| `show_standings` | Mostrar tabla | Generar URL |
| `request_reschedule` | Solicitar reprogramación | Crear ticket en DB |
| `escalate_to_human` | Escalar a humano | Notificar admin por Slack/Email |
| `send_reminder` | Programar recordatorio | Crear evento en n8n |
| `generate_report` | Generar reporte | Encolar job de generación |

**Ejemplo de implementación:**
```typescript
static async executeAction(action: AgentAction, conversationId: string) {
  switch (action.type) {
    case 'show_match':
      // Generar deep-link
      const matchUrl = `zonagol://match/${action.payload.matchId}`;
      return { success: true, result: { url: matchUrl } };

    case 'escalate_to_human':
      // Notificar admin
      await this.notifyAdmin(conversationId, action.payload.reason);
      return { success: true };

    case 'send_reminder':
      // Programar en n8n
      await this.scheduleReminder(action.payload);
      return { success: true };

    default:
      return { success: false, error: 'Action type not implemented' };
  }
}
```

### 2.7 Rate Limiting Service

**Archivo:** `app/api/agent/services/rate-limit.service.ts`

```typescript
export class RateLimitService {
  static async checkLimit(
    userIdentifier: string,
    maxMessages: number = 10,
    windowMinutes: number = 10
  ): Promise<RateLimitResult> {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_identifier: userIdentifier,
      p_max_messages: maxMessages,
      p_window_minutes: windowMinutes
    });

    if (error) throw error;

    return {
      allowed: data as boolean,
      // ... metadata
    };
  }
}
```

### 2.8 WhatsApp Service (Ventanas 24h)

**Archivo:** `app/api/agent/services/whatsapp.service.ts`

```typescript
export class WhatsAppService {
  static async checkWindow24h(
    phoneNumber: string
  ): Promise<Window24hResult> {
    const { data } = await supabase.rpc('is_within_24h_window', {
      p_phone_number: phoneNumber
    });

    const withinWindow = data as boolean;

    return {
      withinWindow,
      requiresTemplate: !withinWindow
    };
  }

  static async openWindow(phoneNumber: string) {
    await supabase.rpc('open_24h_window', {
      p_phone_number: phoneNumber,
      p_opened_by: 'user_message'
    });
  }
}
```

### 2.9 Agent Core (Orquestador Principal)

**Archivo:** `app/api/agent/core/agent.ts`

Este es el "director de orquesta" que coordina todos los servicios.

```typescript
export class Agent {
  static async processMessage(
    request: AgentRequest,
    config: AgentConfig
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // 1. Identificar usuario y permisos
    const identity = await IdentityService.resolveIdentity(
      request.userIdentifier,
      request.channel
    );

    // 2. Verificar que esté vinculado a una liga
    if (!identity.isLinked || !identity.leagueId) {
      return this.buildLinkingResponse(identity);
    }

    // 3. Rate limiting
    const rateLimit = await RateLimitService.checkLimit(
      request.userIdentifier
    );
    if (!rateLimit.allowed) {
      return this.buildRateLimitResponse();
    }

    // 4. Clasificar intención
    const routing = await RouterService.classifyIntent(
      request.message,
      identity
    );

    // 5. Recuperar contexto (RAG y/o SQL según intención)
    let ragChunks: RAGChunk[] = [];
    let sqlResults: any = null;

    if (routing.suggestedApproach === 'rag' || routing.suggestedApproach === 'both') {
      ragChunks = await RAGService.searchKnowledge(
        request.message,
        identity.leagueId!,
        identity.tournamentId,
        { topK: config.ragTopK, similarityThreshold: config.ragSimilarityThreshold }
      );
    }

    if (routing.suggestedApproach === 'sql' || routing.suggestedApproach === 'both') {
      sqlResults = await this.executeSQLQuery(routing.intent, routing.entities, identity);
    }

    // 6. Construir contexto para el LLM
    const context: AgentContext = {
      identity,
      userMessage: request.message,
      ragChunks,
      sqlResults,
      intent: routing.intent,
      intentConfidence: routing.confidence
    };

    // 7. Generar respuesta con LLM
    const llmResponse = await LLMService.generateResponse(context, config);

    // 8. Verificar ventana 24h (si es WhatsApp)
    let delivery = { withinWindow24h: true, templateRequired: false };
    if (request.channel === 'whatsapp') {
      const window = await WhatsAppService.checkWindow24h(request.userIdentifier);
      delivery = {
        withinWindow24h: window.withinWindow,
        templateRequired: window.requiresTemplate
      };

      // Abrir ventana si recibimos mensaje del usuario
      if (!window.withinWindow) {
        await WhatsAppService.openWindow(request.userIdentifier);
      }
    }

    // 9. Logging (auditoría completa)
    const conversationId = await this.logConversation({
      request,
      identity,
      routing,
      ragChunks,
      sqlResults,
      llmResponse,
      latencyMs: Date.now() - startTime
    });

    // 10. Retornar respuesta
    return {
      text: llmResponse.text,
      actions: llmResponse.actions,
      metadata: {
        conversationId,
        intent: routing.intent,
        intentConfidence: routing.confidence,
        ragChunksUsed: ragChunks,
        sqlQueriesExecuted: this.extractSQLQueries(sqlResults),
        latencyMs: Date.now() - startTime,
        llmModel: config.chatModel,
        llmCostUsd: llmResponse.costUsd
      },
      delivery
    };
  }

  // ... métodos auxiliares
}
```

### 2.10 Endpoint Principal

**Archivo:** `app/api/agent/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Agent } from './core/agent';
import { AgentRequest, AgentConfig } from '@/lib/types/agent.types';

export const runtime = 'edge'; // O 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AgentRequest = await request.json();

    // Validar request
    if (!body.channel || !body.userIdentifier || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, userIdentifier, message' },
        { status: 400 }
      );
    }

    // Configuración del agente (desde env vars)
    const config: AgentConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY!,
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
      chatModel: process.env.CHAT_MODEL || 'gpt-4',
      temperature: 0.3,
      ragSimilarityThreshold: 0.7,
      ragTopK: 5,
      rateLimitMaxMessages: 10,
      rateLimitWindowMinutes: 10,
      whatsapp24hWindowEnabled: true,
      requireLeagueContext: true,
      enableDebugLogs: process.env.NODE_ENV === 'development'
    };

    // Procesar mensaje con el agente
    const response = await Agent.processMessage(body, config);

    // Retornar respuesta
    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('❌ Agent error:', error);

    return NextResponse.json(
      {
        error: 'Internal agent error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'Agent Service is running' });
}
```

**Duración Fase 2:** 6-8 horas
**Estado:** ⏳ Pendiente de implementación

---

## Fase 3: Integración n8n

### Objetivo
Conectar los flujos de n8n con el nuevo Agent Service.

### 3.1 Modificar Workflow de WhatsApp

**Archivo:** `docs/n8n_workflow_whatsapp_agent.json`

**Cambios necesarios:**

1. **Nodo "HTTP Request to Agent Service"**
   ```json
   {
     "method": "POST",
     "url": "https://zona-gol.com/api/agent",
     "body": {
       "channel": "whatsapp",
       "userIdentifier": "={{ $json.from }}",
       "message": "={{ $json.body }}",
       "messageId": "={{ $json.id }}",
       "timestamp": "={{ $json.timestamp }}"
     }
   }
   ```

2. **Nodo "Check 24h Window"**
   ```json
   {
     "if": "={{ $json.delivery.withinWindow24h }}",
     "then": "Send Free Text",
     "else": "Send Template Message"
   }
   ```

3. **Nodo "Send Free Text" (dentro de ventana)**
   ```json
   {
     "method": "POST",
     "url": "https://api.twilio.com/2010-04-01/Accounts/{{ACCOUNT_SID}}/Messages.json",
     "body": {
       "From": "whatsapp:+14155238886",
       "To": "whatsapp:={{ $json.userIdentifier }}",
       "Body": "={{ $json.text }}"
     }
   }
   ```

4. **Nodo "Send Template" (fuera de ventana)**
   ```json
   {
     // Usar template aprobada por Meta
     "ContentSid": "={{ $json.delivery.templateName }}",
     "ContentVariables": "={{ JSON.stringify($json.delivery.variables) }}"
   }
   ```

### 3.2 Crear UI de Vinculación WhatsApp

**Archivo:** `components/whatsapp/link-phone.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LinkPhoneForm({ userId, leagueId }: { userId: string; leagueId: string }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  const sendCode = async () => {
    // Generar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Enviar por WhatsApp usando n8n
    await fetch('https://n8n.zona-gol.com/webhook/send-verification', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        code: verificationCode
      })
    });

    // Guardar código temporalmente (Redis o DB)
    await fetch('/api/verification/save', {
      method: 'POST',
      body: JSON.stringify({ phone, code: verificationCode })
    });

    setStep('code');
  };

  const verifyAndLink = async () => {
    // Verificar código
    const res = await fetch('/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code })
    });

    if (!res.ok) {
      alert('Código incorrecto');
      return;
    }

    // Vincular
    await fetch('/api/whatsapp/link', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        userId,
        leagueId,
        role: 'user' // Obtener del contexto
      })
    });

    alert('¡WhatsApp vinculado correctamente!');
  };

  return (
    <div className="space-y-4">
      {step === 'phone' && (
        <>
          <Input
            type="tel"
            placeholder="+52 55 1234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button onClick={sendCode}>Enviar código de verificación</Button>
        </>
      )}

      {step === 'code' && (
        <>
          <p>Ingresa el código que recibiste por WhatsApp:</p>
          <Input
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <Button onClick={verifyAndLink}>Verificar y vincular</Button>
        </>
      )}
    </div>
  );
}
```

### 3.3 Crear Endpoints de Vinculación

**Archivo:** `app/api/whatsapp/link/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { phone, userId, leagueId, role } = await request.json();

  // Llamar IdentityService
  const link = await IdentityService.linkWhatsAppUser(
    phone,
    userId,
    leagueId,
    role
  );

  return NextResponse.json({ success: true, link });
}
```

**Duración Fase 3:** 3-4 horas
**Estado:** ⏳ Pendiente

---

## Fase 4: Testing y Optimización

### 4.1 Testing Unitario

**Archivos de prueba:**
```
__tests__/
├── agent/
│   ├── identity.service.test.ts
│   ├── router.service.test.ts
│   ├── rag.service.test.ts
│   ├── llm.service.test.ts
│   └── agent.test.ts
```

### 4.2 Testing de Integración

**Casos de prueba:**
1. Usuario NO vinculado → debe responder con instrucciones
2. Usuario vinculado → debe responder con data de su liga
3. Rate limit excedido → debe rechazar
4. Pregunta fuera de ventana 24h → debe usar template
5. Intención `calendario` → debe usar SQL
6. Intención `reglamento` → debe usar RAG
7. Escalación a humano → debe notificar

### 4.3 Optimizaciones

- [ ] Cachear embeddings de queries frecuentes
- [ ] Implementar retry logic para OpenAI
- [ ] Agregar timeout a todas las llamadas externas
- [ ] Implementar circuit breaker pattern
- [ ] Optimizar queries SQL con índices

**Duración Fase 4:** 4-6 horas
**Estado:** ⏳ Pendiente

---

## Fase 5: Producción

### 5.1 Monitoreo

- [ ] Configurar Sentry para errores
- [ ] Dashboard de métricas (`get_agent_stats()`)
- [ ] Alertas por Slack/Discord
- [ ] Logging centralizado

### 5.2 Escalabilidad

- [ ] Configurar Edge Functions si es necesario
- [ ] Implementar queue para mensajes de alto volumen
- [ ] Configurar replicas de DB (read replicas)

### 5.3 Documentación

- [ ] README del Agent Service
- [ ] Guía de troubleshooting
- [ ] Ejemplos de uso
- [ ] API reference

**Duración Fase 5:** Ongoing
**Estado:** ⏳ Pendiente

---

## Checklist de Implementación

### Infraestructura
- [x] Migración de tablas aplicada
- [x] Tipos TypeScript creados
- [ ] Verificación de tablas en Supabase

### Agent Service Core
- [ ] IdentityService implementado
- [ ] RouterService implementado
- [ ] RAGService implementado
- [ ] SQLService implementado
- [ ] LLMService implementado
- [ ] ActionsService implementado
- [ ] RateLimitService implementado
- [ ] WhatsAppService implementado
- [ ] Agent orquestador implementado
- [ ] Endpoint `/api/agent` funcionando

### Integración
- [ ] Workflow n8n actualizado
- [ ] UI de vinculación WhatsApp
- [ ] Endpoints de vinculación
- [ ] Testing end-to-end

### Producción
- [ ] Monitoreo configurado
- [ ] Documentación completa
- [ ] Deploy a producción

---

## Próximos Pasos Inmediatos

1. **Aplicar migración** (10 min)
   ```bash
   cd zona-gol
   supabase db push
   ```

2. **Implementar IdentityService** (1 hora)
   - Crear archivo `app/api/agent/core/identity.service.ts`
   - Implementar `resolveIdentity()`
   - Implementar `linkWhatsAppUser()`
   - Testing básico

3. **Implementar RouterService** (1 hora)
   - Crear archivo `app/api/agent/core/router.service.ts`
   - Implementar clasificación por keywords
   - Testing con casos reales

4. **Continuar con servicios restantes**
   - RAGService (1 hora)
   - SQLService (1.5 horas)
   - LLMService (2 horas)
   - Integrar en Agent orquestador (1 hora)

**Total estimado:** 15-20 horas de desarrollo

---

## Recursos

- [Documentación OpenAI](https://platform.openai.com/docs)
- [Documentación Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [n8n Documentation](https://docs.n8n.io)

---

**Última actualización:** 2025-01-18
**Autor:** Claude Code
**Estado:** En progreso
