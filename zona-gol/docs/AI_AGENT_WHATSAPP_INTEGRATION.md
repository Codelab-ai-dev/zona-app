# 🤖 Integración de Agente de IA con WhatsApp usando n8n

## Tabla de Contenidos
- [Arquitectura General](#arquitectura-general)
- [Base de Datos Vectorial](#base-de-datos-vectorial)
- [Configuración de n8n](#configuración-de-n8n)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Mantenimiento](#mantenimiento)

---

## Arquitectura General

```
Usuario WhatsApp
      ↓
[Twilio/WhatsApp Business API]
      ↓
[n8n Webhook Trigger]
      ↓
[Procesamiento de Mensaje]
      ↓
[Generación de Embedding] → OpenAI API
      ↓
[Búsqueda en Vector DB] → Supabase + pgvector
      ↓
[Generación de Respuesta] → OpenAI Chat Completion
      ↓
[Envío de Respuesta WhatsApp]
```

---

## Base de Datos Vectorial

### Tabla Principal: `league_knowledge_base`

Esta tabla almacena información vectorizada sobre las ligas:

```sql
CREATE TABLE league_knowledge_base (
  id UUID,
  league_id UUID,           -- Liga específica
  tournament_id UUID,       -- Torneo específico (opcional)
  content_type TEXT,        -- Tipo de contenido
  content_text TEXT,        -- Contenido textual legible
  metadata JSONB,           -- Metadatos estructurados
  embedding vector(1536),   -- Vector de embedding (OpenAI)
  valid_from TIMESTAMP,     -- Vigencia del contenido
  valid_until TIMESTAMP,    -- Expiración del contenido
  is_auto_generated BOOLEAN -- Si fue generado automáticamente
);
```

### Tipos de Contenido

| Tipo | Descripción | Ejemplo de Pregunta |
|------|-------------|---------------------|
| `jornada` | Partidos de la semana | "¿Qué partidos hay esta semana?" |
| `tabla_posiciones` | Tabla de posiciones del torneo | "¿Cómo va la tabla?" |
| `suspensiones` | Jugadores suspendidos actualmente | "¿Quién está suspendido?" |
| `resultados` | Resultados recientes | "¿Cuál fue el último resultado?" |
| `estadisticas` | Estadísticas de jugadores/equipos | "¿Quién es el goleador?" |
| `proximo_partido` | Próximo partido de un equipo | "¿Cuándo juega el Guadalajara?" |

---

## Configuración Inicial

### 1. Aplicar la Migración

```bash
# Ejecutar en Supabase SQL Editor
-- Pega el contenido de:
-- supabase/migrations/20251214000001_create_vector_knowledge_base.sql
```

### 2. Generar Contenido Inicial

```sql
-- Para cada liga activa, generar knowledge base
SELECT refresh_league_knowledge(
  '12345678-1234-1234-1234-123456789012'::UUID,  -- league_id
  NULL  -- NULL = todos los torneos de la liga
);

-- Verificar que se creó el contenido
SELECT content_type, content_text
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012';
```

### 3. Generar Embeddings (desde n8n)

**IMPORTANTE:** Los embeddings NO se generan automáticamente en la base de datos. Debes generarlos desde tu workflow de n8n.

---

## Configuración de n8n

### Workflow 1: Generación de Embeddings (Cron Job)

Este workflow se ejecuta cada 6 horas para actualizar los embeddings.

```
[Schedule Trigger (cada 6 horas)]
    ↓
[Supabase: Refresh Knowledge]
    ↓
[Supabase: Get New Content without Embeddings]
    ↓
[Loop: Para cada contenido]
    ↓
[OpenAI: Generate Embedding]
    ↓
[Supabase: Update Embedding]
```

#### Nodo 1: Schedule Trigger
```json
{
  "rule": {
    "interval": [
      {
        "field": "hours",
        "hoursInterval": 6
      }
    ]
  }
}
```

#### Nodo 2: Supabase - Refresh Knowledge
```javascript
// Function Node - Run for each league
const leagues = [
  '12345678-1234-1234-1234-123456789012',  // Liga 1
  '87654321-4321-4321-4321-210987654321'   // Liga 2
];

return leagues.map(leagueId => ({
  json: {
    league_id: leagueId
  }
}));
```

```sql
-- Supabase Execute Query
SELECT refresh_league_knowledge($1::UUID, NULL) as items_created;
-- Parameters: {{ $json.league_id }}
```

#### Nodo 3: Get Content Without Embeddings
```sql
-- Supabase Execute Query
SELECT id, content_text
FROM league_knowledge_base
WHERE embedding IS NULL
AND content_text IS NOT NULL
LIMIT 100;
```

#### Nodo 4: Generate Embedding (OpenAI)
```json
{
  "model": "text-embedding-ada-002",
  "input": "{{ $json.content_text }}"
}
```

#### Nodo 5: Update Embedding
```sql
-- Supabase Execute Query
UPDATE league_knowledge_base
SET embedding = $2::vector,
    updated_at = NOW()
WHERE id = $1::UUID;
-- Parameters:
-- $1 = {{ $json.id }}
-- $2 = {{ JSON.stringify($json.embedding) }}
```

---

### Workflow 2: WhatsApp Chatbot (Webhook)

Este workflow responde a mensajes de WhatsApp en tiempo real.

```
[Webhook Trigger]
    ↓
[Parse WhatsApp Message]
    ↓
[Detect League Context]
    ↓
[Generate Query Embedding] → OpenAI
    ↓
[Search Vector DB] → Supabase
    ↓
[Generate Response] → OpenAI Chat
    ↓
[Send WhatsApp Message] → Twilio/WhatsApp API
```

#### Nodo 1: Webhook Trigger
```json
{
  "path": "whatsapp-webhook",
  "httpMethod": "POST",
  "responseMode": "lastNode"
}
```

#### Nodo 2: Parse WhatsApp Message
```javascript
// Function Node
const body = $input.item.json.body;

return [{
  json: {
    from: body.From,           // +521234567890
    message: body.Body,        // Texto del usuario
    messageId: body.MessageSid
  }
}];
```

#### Nodo 3: Detect League Context
```javascript
// Function Node
// Puedes tener un sistema de contexto basado en el número de teléfono
// O detectar la liga del mensaje

const phoneNumber = $json.from;

// Mapeo de números a ligas (esto podría estar en una tabla)
const phoneToLeague = {
  '+521234567890': '12345678-1234-1234-1234-123456789012',  // Liga Elite
  '+529876543210': '87654321-4321-4321-4321-210987654321'   // Liga Amateur
};

const leagueId = phoneToLeague[phoneNumber] || 'default-league-id';

return [{
  json: {
    ...($json),
    league_id: leagueId
  }
}];
```

#### Nodo 4: Generate Query Embedding
```json
{
  "model": "text-embedding-ada-002",
  "input": "{{ $json.message }}"
}
```

**Output:** `data.embedding` (array de 1536 números)

#### Nodo 5: Search Vector Database
```javascript
// Function Node - Prepare embedding for Supabase
const embedding = $json.data[0].embedding;
const embeddingString = '[' + embedding.join(',') + ']';

return [{
  json: {
    query_embedding: embeddingString,
    league_id: $('Detect League Context').item.json.league_id,
    user_message: $('Parse WhatsApp Message').item.json.message
  }
}];
```

```sql
-- Supabase Execute Query
SELECT * FROM search_league_knowledge(
  $1::vector(1536),  -- query embedding
  $2::UUID,          -- league_id
  5,                 -- limit (top 5 results)
  0.7                -- similarity threshold (70%)
);
-- Parameters:
-- $1 = {{ $json.query_embedding }}
-- $2 = {{ $json.league_id }}
```

**Output:** Array de resultados con `content_text` y `similarity`

#### Nodo 6: Generate Response with OpenAI
```javascript
// Function Node - Prepare context
const searchResults = $input.all();
const userMessage = $('Parse WhatsApp Message').item.json.message;

// Concatenar los resultados de búsqueda
const context = searchResults
  .map(item => item.json.content_text)
  .join('\n\n---\n\n');

return [{
  json: {
    system_prompt: `Eres un asistente de WhatsApp para una liga de fútbol.

Usa la siguiente información para responder la pregunta del usuario:

${context}

Instrucciones:
- Responde en español
- Sé conciso (máximo 3 párrafos)
- Usa emojis cuando sea apropiado
- Si no tienes la información, dilo claramente
- Mantén un tono amigable y profesional`,
    user_message: userMessage
  }
}];
```

```json
// OpenAI Chat Node
{
  "model": "gpt-4-turbo-preview",
  "messages": [
    {
      "role": "system",
      "content": "{{ $json.system_prompt }}"
    },
    {
      "role": "user",
      "content": "{{ $json.user_message }}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

#### Nodo 7: Send WhatsApp Response
```javascript
// Twilio Send Message Node
{
  "from": "whatsapp:+14155238886",  // Tu número de Twilio
  "to": "{{ $('Parse WhatsApp Message').item.json.from }}",
  "body": "{{ $json.choices[0].message.content }}"
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Consultar Jornada

**Usuario:** "¿Qué partidos hay esta semana?"

**Proceso:**
1. Se genera embedding de la pregunta
2. Se busca en vector DB → encuentra contenido tipo "jornada"
3. GPT genera respuesta basada en el contexto

**Respuesta:**
```
📅 JORNADA SEMANAL
Liga: Elite Soccer

PARTIDOS:
• Sábado, 16/12/2024 18:00: Guadalajara vs Atlas - Programado
• Sábado, 16/12/2024 20:00: Chivas vs Pumas - Programado
• Domingo, 17/12/2024 12:00: América vs Cruz Azul - Programado

¡Prepárate para una semana emocionante! ⚽
```

### Ejemplo 2: Consultar Tabla de Posiciones

**Usuario:** "Cómo va la tabla?"

**Respuesta:**
```
🏆 TABLA DE POSICIONES
Liga: Elite Soccer

POS EQUIPO               PJ  PG  PE  PP   GF   GC   DG  PTS
1   Guadalajara          10   7   2   1   21   8   +13  23
2   Atlas                10   6   3   1   18   9    +9  21
3   Chivas               10   5   4   1   16  10    +6  19

¡Tu equipo va en excelente posición! 🔥
```

### Ejemplo 3: Consultar Suspensiones

**Usuario:** "Quién está suspendido?"

**Respuesta:**
```
🚫 JUGADORES SUSPENDIDOS

• Juan Pérez (#10) - Guadalajara
  Motivo: Tarjeta roja directa
  Partidos restantes: 1 de 1

• Carlos Gómez (#7) - Atlas
  Motivo: Acumulación de 5 tarjetas amarillas
  Partidos restantes: 1 de 1

Recuerda que no podrán jugar en el próximo partido.
```

---

## Mantenimiento y Actualizaciones

### Actualización Automática del Contenido

**Opción 1: Trigger en Base de Datos (Recomendado)**

```sql
-- Trigger para actualizar knowledge cuando cambia un partido
CREATE OR REPLACE FUNCTION trigger_refresh_knowledge_on_match_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Obtener league_id del match
  DECLARE
    v_league_id UUID;
    v_tournament_id UUID;
  BEGIN
    SELECT t.league_id, t.id
    INTO v_league_id, v_tournament_id
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    -- Refresh knowledge en background
    PERFORM refresh_league_knowledge(v_league_id, v_tournament_id);

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_on_match_update
  AFTER INSERT OR UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_knowledge_on_match_change();
```

**Opción 2: Cron Job en n8n (Más control)**

- Schedule: Cada 1 hora
- Action: Llamar `refresh_league_knowledge()` para todas las ligas activas

### Limpieza de Contenido Expirado

```sql
-- Ejecutar diariamente (puede ser desde n8n)
SELECT clean_expired_knowledge();
```

### Monitoreo de Calidad

```sql
-- Ver estadísticas del knowledge base
SELECT * FROM get_knowledge_base_stats('league-id-aqui');

-- Resultado:
-- content_type       | total_items | with_embeddings | avg_content_length
-- jornada           | 10          | 10              | 450.5
-- tabla_posiciones  | 5           | 5               | 1200.3
-- suspensiones      | 3           | 3               | 280.0
```

---

## Configuración Avanzada

### 1. Múltiples Ligas por Usuario

Puedes detectar de qué liga pregunta el usuario basándote en:

```javascript
// En el nodo "Detect League Context"
const message = $json.message.toLowerCase();

// Detectar keywords de ligas
if (message.includes('elite') || message.includes('liga 1')) {
  return { league_id: 'elite-league-id' };
}
else if (message.includes('amateur') || message.includes('liga 2')) {
  return { league_id: 'amateur-league-id' };
}
else {
  // Liga por defecto basada en el número
  return { league_id: phoneToLeague[$json.from] };
}
```

### 2. Contexto de Conversación

Guardar el contexto de la conversación en una tabla:

```sql
CREATE TABLE whatsapp_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  league_id UUID REFERENCES leagues(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context JSONB DEFAULT '{}'::jsonb
);

-- Guardar el último equipo consultado, etc.
```

### 3. Respuestas Rápidas (Quick Replies)

```javascript
// Detectar comandos específicos antes de buscar en vector DB
const message = $json.message.toLowerCase();

if (message === 'menu' || message === 'ayuda') {
  return [{
    json: {
      quick_reply: true,
      response: `
🤖 Comandos disponibles:

📅 "partidos" - Jornada de la semana
🏆 "tabla" - Tabla de posiciones
🚫 "suspendidos" - Jugadores suspendidos
⚽ "resultados" - Últimos resultados
📊 "goleadores" - Tabla de goleadores

O simplemente pregúntame lo que quieras saber!
      `
    }
  }];
}
```

### 4. Rate Limiting

```javascript
// En n8n, antes de procesar el mensaje
const redis = await $('Redis').getItem($json.from);
const lastMessageTime = redis ? new Date(redis) : null;
const now = new Date();

// Máximo 1 mensaje cada 3 segundos
if (lastMessageTime && (now - lastMessageTime) < 3000) {
  return [{
    json: {
      rate_limited: true,
      response: '⏱️ Por favor espera unos segundos antes de enviar otro mensaje.'
    }
  }];
}

// Guardar timestamp
await $('Redis').setItem($json.from, now.toISOString(), { ttl: 60 });
```

---

## Costos Estimados

### OpenAI API

| Modelo | Uso | Costo por 1K tokens | Estimado Mensual |
|--------|-----|---------------------|------------------|
| text-embedding-ada-002 | Embeddings | $0.0001 | $5-10 |
| gpt-4-turbo-preview | Respuestas | $0.01 (input) + $0.03 (output) | $50-100 |
| gpt-3.5-turbo | Respuestas (alternativa) | $0.0005 (input) + $0.0015 (output) | $10-20 |

**Recomendación:** Usar GPT-3.5-turbo para reducir costos (respuestas suficientemente buenas).

### Twilio WhatsApp

- **Mensajes recibidos:** $0.0075 por mensaje
- **Mensajes enviados:** $0.005 por mensaje
- **Estimado:** $20-50/mes para una liga activa

### Supabase

- **Free tier:** 500 MB database, 2 GB bandwidth
- **Pro tier:** $25/mes (8 GB database, 250 GB bandwidth)

---

## Troubleshooting

### Problema: Embeddings NULL

**Causa:** El workflow de generación de embeddings no se ejecutó.

**Solución:**
```sql
-- Ver cuántos contenidos NO tienen embedding
SELECT COUNT(*) FROM league_knowledge_base WHERE embedding IS NULL;

-- Ejecutar manualmente el workflow de embeddings en n8n
```

### Problema: Respuestas Genéricas

**Causa:** Umbral de similitud muy alto o embeddings de mala calidad.

**Solución:**
```sql
-- Reducir umbral de similitud de 0.7 a 0.5
SELECT * FROM search_league_knowledge(
  $1::vector(1536),
  $2::UUID,
  5,
  0.5  -- Umbral más bajo
);
```

### Problema: Contenido Desactualizado

**Causa:** Triggers no se ejecutan o cron job no corre.

**Solución:**
```sql
-- Forzar actualización manual
SELECT refresh_league_knowledge('league-id', NULL);

-- Verificar última actualización
SELECT content_type, MAX(updated_at) as last_update
FROM league_knowledge_base
WHERE league_id = 'league-id'
GROUP BY content_type;
```

---

## Próximos Pasos

1. ✅ Aplicar migración de base de datos
2. ✅ Crear workflows en n8n
3. ✅ Configurar WhatsApp Business API / Twilio
4. ✅ Generar embeddings iniciales
5. ✅ Probar con usuarios beta
6. 🔄 Iterar basándose en feedback

---

## Recursos Adicionales

- **pgvector Docs:** https://github.com/pgvector/pgvector
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **n8n Docs:** https://docs.n8n.io/
- **Twilio WhatsApp:** https://www.twilio.com/docs/whatsapp

---

**Última actualización:** 14 de Diciembre, 2025
**Autor:** Sistema de IA
**Versión:** 1.0
