# Agent Service - Guía de Implementación Completa

## Descripción General

El **Agent Service** es un sistema de IA conversacional profesional que permite a usuarios interactuar con la plataforma Zona-Gol a través de WhatsApp, web o móvil. Utiliza RAG (Retrieval-Augmented Generation) con búsqueda vectorial y consultas SQL para proporcionar respuestas precisas y contextuales.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     CANALES DE ENTRADA                       │
│              WhatsApp | Web | Mobile App                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   API ENDPOINT: /api/agent                   │
│                  POST - Procesar mensaje                     │
│                  GET  - Health check                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     AGENT SERVICE                            │
│                  Orquestador Principal                       │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┬─────────┬──────────┬──────────┐
        ▼                 ▼         ▼          ▼          ▼
┌──────────────┐  ┌──────────┐  ┌─────┐  ┌─────┐  ┌─────────┐
│   Identity   │  │  Router  │  │ RAG │  │ SQL │  │   LLM   │
│   Service    │  │ Service  │  │ Svc │  │ Svc │  │ Service │
└──────────────┘  └──────────┘  └─────┘  └─────┘  └─────────┘
        │                 │         │       │          │
        └─────────────────┴─────────┴───────┴──────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Actions        │
                    │  Service        │
                    └─────────────────┘
```

## Componentes del Sistema

### 1. Identity Service
**Archivo:** `app/api/agent/core/identity.service.ts`

**Responsabilidad:** Resolver la identidad del usuario y el contexto multi-tenant.

**Funciones principales:**
- `resolveIdentity()` - Resuelve identidad desde WhatsApp o usuario autenticado
- `linkWhatsAppUser()` - Vincula número de WhatsApp con usuario
- `unlinkWhatsAppUser()` - Desvincula número de WhatsApp
- `checkPermission()` - Verifica permisos del usuario

**Flujo:**
```
WhatsApp Phone → whatsapp_user_links → User → League → Tournament
```

### 2. Router Service
**Archivo:** `app/api/agent/core/router.service.ts`

**Responsabilidad:** Clasificar la intención del usuario y determinar el enfoque (RAG, SQL o ambos).

**Intenciones soportadas:**
- `calendario` - Jornada / calendario de partidos
- `resultados` - Resultados de partidos
- `proximos_partidos` - Próximos partidos de un equipo
- `tabla_posiciones` - Tabla de posiciones
- `suspensiones` - Jugadores suspendidos
- `estadisticas` - Estadísticas de jugadores/equipos
- `reglamento` - Reglas y reglamento
- `pagos` - Adeudos y pagos
- `informacion_general` - Info general de la liga
- `conversacion` - Conversación casual
- `unknown` - No se pudo determinar

**Enfoques:**
- `rag` - Búsqueda vectorial en knowledge base
- `sql` - Consultas directas a la base de datos
- `both` - Combinar ambos enfoques

### 3. RAG Service
**Archivo:** `app/api/agent/core/rag.service.ts`

**Responsabilidad:** Búsqueda vectorial en `league_knowledge_base` usando OpenAI embeddings y pgvector.

**Funciones principales:**
- `search()` - Búsqueda principal con embeddings
- `generateEmbedding()` - Genera embedding usando OpenAI
- `performVectorSearch()` - Ejecuta búsqueda vectorial
- `healthCheck()` - Verifica OpenAI y pgvector

**Configuración:**
- Modelo: `text-embedding-3-small`
- Dimensiones: 1536
- Umbral de similitud: 0.7
- TopK: 5 resultados

### 4. SQL Service
**Archivo:** `app/api/agent/core/sql.service.ts`

**Responsabilidad:** Ejecutar consultas SQL directas para datos estructurados.

**Funciones principales:**
- `getJornadaMatches()` - Obtener partidos de una jornada
- `getMatchResults()` - Obtener resultados de partidos
- `getStandings()` - Obtener tabla de posiciones
- `getUpcomingMatches()` - Obtener próximos partidos
- `getSuspendedPlayers()` - Obtener jugadores suspendidos

### 5. LLM Service
**Archivo:** `app/api/agent/core/llm.service.ts`

**Responsabilidad:** Generar respuestas naturales usando OpenAI Chat Completions.

**Funciones principales:**
- `generateResponse()` - Genera respuesta basada en contexto RAG/SQL
- `generateIntent()` - Clasifica intención usando LLM
- `calculateCost()` - Calcula costo de la operación

**Modelos soportados:**
- `gpt-4o-mini` (recomendado) - $0.15/$0.60 por 1M tokens
- `gpt-4o` - $2.50/$10.00 por 1M tokens
- `gpt-3.5-turbo` - $0.50/$1.50 por 1M tokens

### 6. Actions Service
**Archivo:** `app/api/agent/core/actions.service.ts`

**Responsabilidad:** Gestionar acciones estructuradas y system actions.

**System Actions:**
- `send_whatsapp_template` - Enviar plantilla de WhatsApp
- `open_24h_window` - Abrir ventana 24h
- `create_notification` - Crear notificación
- `log_conversation` - Registrar conversación
- `update_user_context` - Actualizar contexto
- `trigger_webhook` - Disparar webhook
- `schedule_reminder` - Programar recordatorio

### 7. Agent Service (Orquestador)
**Archivo:** `app/api/agent/core/agent.service.ts`

**Responsabilidad:** Coordinar todos los servicios y procesar requests.

**Flujo de procesamiento:**
```
1. Resolver identidad (IdentityService)
2. Verificar rate limiting
3. Clasificar intención (RouterService)
4. Verificar permisos
5. Buscar contexto (RAG/SQL según intent)
6. Generar respuesta (LLMService)
7. Verificar ventana 24h WhatsApp
8. Persistir conversación
9. Retornar respuesta
```

## Base de Datos

### Tablas Principales

#### 1. `whatsapp_user_links`
Vincula números de WhatsApp con usuarios del sistema.

```sql
- id: UUID
- phone_number: TEXT (único, normalizado)
- user_id: UUID (FK → auth.users)
- league_id: UUID (FK → leagues)
- tournament_id: UUID (FK → tournaments)
- role: TEXT (super_admin|league_admin|team_owner|user)
- is_active: BOOLEAN
- display_name: TEXT
- preferred_language: TEXT
```

#### 2. `agent_conversations`
Auditoría completa de conversaciones.

```sql
- id: UUID
- channel: TEXT (whatsapp|web|mobile)
- user_identifier: TEXT
- league_id: UUID
- tournament_id: UUID
- user_message: TEXT
- agent_response: TEXT
- rag_chunks_used: JSONB
- sql_queries_executed: JSONB
- intent: TEXT
- intent_confidence: REAL
- actions: JSONB
- latency_ms: INTEGER
- llm_model: TEXT
- llm_cost_usd: REAL
- user_feedback: TEXT
```

#### 3. `whatsapp_conversation_windows`
Seguimiento de ventanas 24h de WhatsApp.

```sql
- id: UUID
- phone_number: TEXT
- window_opened_at: TIMESTAMPTZ
- window_closes_at: TIMESTAMPTZ
- opened_by: TEXT (user_message|business_message|template)
- is_active: BOOLEAN
```

#### 4. `agent_actions`
Acciones estructuradas generadas.

```sql
- id: UUID
- conversation_id: UUID
- action_type: TEXT
- payload: JSONB
- status: TEXT (pending|executed|failed)
- executed_at: TIMESTAMPTZ
- execution_result: JSONB
```

### Funciones SQL

#### `is_within_24h_window(phone_number)`
Verifica si un número está dentro de ventana activa.

#### `open_24h_window(phone_number, opened_by)`
Abre nueva ventana de 24 horas.

#### `check_rate_limit(user_identifier, max_messages, window_minutes)`
Verifica y aplica rate limiting.

#### `get_agent_stats(league_id, start_date, end_date)`
Obtiene estadísticas del agente.

## Configuración

### Variables de Entorno

Agregar a `.env.local`:

```bash
# OpenAI API Key (requerido)
OPENAI_API_KEY=sk-...

# Agent Configuration (opcional)
AGENT_EMBEDDING_MODEL=text-embedding-3-small
AGENT_CHAT_MODEL=gpt-4o-mini
AGENT_TEMPERATURE=0.3
AGENT_RAG_SIMILARITY_THRESHOLD=0.7
AGENT_RAG_TOP_K=5
AGENT_RATE_LIMIT_MAX_MESSAGES=10
AGENT_RATE_LIMIT_WINDOW_MINUTES=10
AGENT_ENABLE_DEBUG_LOGS=false
```

### Aplicar Migración

```bash
# Aplicar migración de base de datos
cd zona-gol
npx supabase db push

# O si estás usando Supabase CLI
supabase migration up
```

## Uso del API

### POST /api/agent

Procesar un mensaje del usuario.

**Request:**
```json
{
  "channel": "whatsapp",
  "userIdentifier": "+525512345678",
  "message": "¿Cuándo juega el próximo partido?",
  "leagueId": "uuid-optional",
  "tournamentId": "uuid-optional",
  "messageId": "msg-123",
  "timestamp": "2025-01-18T10:00:00Z"
}
```

**Response:**
```json
{
  "text": "El próximo partido es el viernes 20 de enero a las 19:00...",
  "actions": [
    {
      "type": "show_match",
      "payload": {
        "matchId": "uuid-123",
        "homeTeam": "Team A",
        "awayTeam": "Team B"
      },
      "status": "pending"
    }
  ],
  "metadata": {
    "conversationId": "uuid-conv-123",
    "intent": "proximos_partidos",
    "intentConfidence": 0.95,
    "ragChunksUsed": [...],
    "sqlQueriesExecuted": [...],
    "latencyMs": 1234,
    "llmModel": "gpt-4o-mini",
    "llmCostUsd": 0.0012
  },
  "delivery": {
    "withinWindow24h": true,
    "templateRequired": false
  },
  "sources": [
    {
      "type": "match",
      "id": "uuid-123",
      "name": "Team A vs Team B"
    }
  ]
}
```

### GET /api/agent

Health check del servicio.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "openai": true,
    "embedding": true,
    "vectorDB": true,
    "database": true
  },
  "errors": [],
  "timestamp": "2025-01-18T10:00:00Z"
}
```

## Integración con n8n

### Flujo de WhatsApp → n8n → Agent Service

1. **Recibir mensaje de WhatsApp** (Webhook n8n)
2. **Normalizar datos:**
   ```json
   {
     "channel": "whatsapp",
     "userIdentifier": "{{ $json.from }}",
     "message": "{{ $json.text.body }}",
     "messageId": "{{ $json.id }}",
     "timestamp": "{{ $json.timestamp }}"
   }
   ```

3. **Llamar a /api/agent** (HTTP Request node)
   - Method: POST
   - URL: `https://tu-dominio.com/api/agent`
   - Body: JSON del paso anterior

4. **Procesar respuesta:**
   - Si `delivery.withinWindow24h = true`: Enviar respuesta directamente
   - Si `delivery.withinWindow24h = false`: Usar template de WhatsApp

5. **Enviar respuesta a WhatsApp**

### Ejemplo de Workflow n8n

```json
{
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp-webhook",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Call Agent Service",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://tu-dominio.com/api/agent",
        "sendBody": true,
        "bodyParameters": {
          "channel": "whatsapp",
          "userIdentifier": "={{ $json.from }}",
          "message": "={{ $json.text.body }}"
        }
      }
    },
    {
      "name": "Send WhatsApp Response",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v18.0/{{PHONE_ID}}/messages",
        "sendBody": true,
        "bodyParameters": {
          "messaging_product": "whatsapp",
          "to": "={{ $('WhatsApp Webhook').item.json.from }}",
          "text": {
            "body": "={{ $('Call Agent Service').item.json.text }}"
          }
        }
      }
    }
  ]
}
```

## Ejemplos de Uso

### Vincular Usuario de WhatsApp

```typescript
import { IdentityService } from '@/app/api/agent/core/identity.service';

const link = await IdentityService.linkWhatsAppUser(
  '+525512345678',      // phoneNumber
  'user-uuid',          // userId
  'league-uuid',        // leagueId
  'tournament-uuid',    // tournamentId
  'team_owner'          // role
);
```

### Procesar Mensaje Manualmente

```typescript
import { AgentService } from '@/app/api/agent/core/agent.service';

const response = await AgentService.processRequest({
  channel: 'whatsapp',
  userIdentifier: '+525512345678',
  message: '¿Cuál es la tabla de posiciones?',
  messageId: 'msg-123',
  timestamp: new Date().toISOString()
});

console.log(response.text);
```

### Obtener Estadísticas

```sql
SELECT * FROM get_agent_stats(
  'league-uuid',                    -- league_id
  now() - interval '7 days',        -- start_date
  now()                             -- end_date
);
```

## Monitoreo y Analytics

### Métricas Importantes

1. **Latencia promedio** - `avg_latency_ms`
2. **Costo total** - `total_cost_usd`
3. **Distribución de intenciones** - `intents`
4. **Tasa de escalación** - `escalations / total_conversations`
5. **Feedback de usuarios** - `feedback`

### Queries de Análisis

```sql
-- Conversaciones por día
SELECT
  DATE(created_at) as date,
  COUNT(*) as conversations,
  AVG(latency_ms) as avg_latency,
  SUM(llm_cost_usd) as total_cost
FROM agent_conversations
WHERE league_id = 'your-league-uuid'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Intenciones más comunes
SELECT
  intent,
  COUNT(*) as count,
  AVG(intent_confidence) as avg_confidence
FROM agent_conversations
WHERE league_id = 'your-league-uuid'
GROUP BY intent
ORDER BY count DESC;

-- Usuarios más activos
SELECT
  user_identifier,
  COUNT(*) as conversations,
  MAX(created_at) as last_conversation
FROM agent_conversations
WHERE channel = 'whatsapp'
GROUP BY user_identifier
ORDER BY conversations DESC
LIMIT 10;
```

## Troubleshooting

### Error: "OpenAI API key not configured"

**Solución:** Agregar `OPENAI_API_KEY` en `.env.local`

### Error: "Vector search failed"

**Solución:**
1. Verificar que pgvector esté habilitado en Supabase
2. Verificar que la función `match_league_knowledge` exista
3. Verificar que haya datos en `league_knowledge_base`

### Error: "User not linked"

**Solución:** El número de WhatsApp no está vinculado. Usar `IdentityService.linkWhatsAppUser()`

### Error: "Rate limit exceeded"

**Solución:** Usuario ha excedido el límite de mensajes. Ajustar `AGENT_RATE_LIMIT_MAX_MESSAGES` o esperar a que expire la ventana.

## Mejores Prácticas

1. **Rate Limiting:** Siempre habilitar rate limiting en producción
2. **Costos:** Monitorear costos de OpenAI regularmente
3. **Logging:** Habilitar logs en desarrollo, deshabilitar en producción
4. **Permisos:** Verificar permisos antes de acciones sensibles
5. **Feedback:** Recopilar feedback de usuarios para mejorar el sistema
6. **Testing:** Probar con diferentes intenciones antes de desplegar
7. **Monitoring:** Configurar alertas para latencia alta o errores

## Próximos Pasos

1. ✅ Implementar Agent Service básico
2. ✅ Crear infraestructura de base de datos
3. ✅ Implementar RAG con búsqueda vectorial
4. ⏳ Poblar knowledge base con datos de partidos
5. ⏳ Integrar con n8n para WhatsApp
6. ⏳ Configurar plantillas de WhatsApp
7. ⏳ Implementar analytics dashboard
8. ⏳ Agregar soporte multi-idioma

## Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.
