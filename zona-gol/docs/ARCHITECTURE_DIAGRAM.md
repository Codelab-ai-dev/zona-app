# 🏗️ Arquitectura del Agente de IA - Zona GOL

## Diagrama General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USUARIO FINAL (WhatsApp)                        │
│                                                                          │
│  "¿Qué partidos hay esta semana?"                                       │
│  "¿Cómo va la tabla?"                                                   │
│  "¿Quién está suspendido?"                                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TWILIO WHATSAPP BUSINESS API                          │
│                                                                          │
│  • Recibe mensaje del usuario                                           │
│  • Envía webhook a n8n                                                  │
│  • Entrega respuesta al usuario                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP POST
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           N8N WORKFLOW ENGINE                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW 1: WhatsApp Chatbot (Tiempo Real)                      │  │
│  │                                                                   │  │
│  │  1. Webhook Trigger       ← Recibe mensaje de Twilio             │  │
│  │  2. Parse Message         ← Extrae texto y número                │  │
│  │  3. Detect League Context ← Mapea número → league_id             │  │
│  │  4. Check Quick Replies   ← Comandos rápidos (menu, ayuda)       │  │
│  │                                                                   │  │
│  │  ┌─ IF Quick Reply = YES ─────────────────────┐                  │  │
│  │  │  5a. Send Quick Reply → Respuesta inmediata │                  │  │
│  │  └──────────────────────────────────────────┬─┘                  │  │
│  │                                              │                     │  │
│  │  ┌─ IF Quick Reply = NO (Usar IA) ──────────┘                    │  │
│  │  │                                                                │  │
│  │  │  5b. OpenAI Embedding    ← text-embedding-ada-002             │  │
│  │  │      Input: "¿Qué partidos hay esta semana?"                  │  │
│  │  │      Output: [0.123, -0.456, ..., 0.789] (1536 números)       │  │
│  │  │                                                                │  │
│  │  │  6. Supabase Vector Search                                    │  │
│  │  │     ↓                                                          │  │
│  │  │     SELECT * FROM search_league_knowledge(                    │  │
│  │  │       embedding_vector,                                       │  │
│  │  │       league_id,                                              │  │
│  │  │       limit=5,                                                │  │
│  │  │       threshold=0.7                                           │  │
│  │  │     );                                                         │  │
│  │  │     ↓                                                          │  │
│  │  │     Results: Top 5 documentos más similares                   │  │
│  │  │                                                                │  │
│  │  │  7. Build GPT Context                                         │  │
│  │  │     Concatena resultados de búsqueda                          │  │
│  │  │                                                                │  │
│  │  │  8. OpenAI Chat Completion  ← gpt-3.5-turbo o gpt-4          │  │
│  │  │     System: "Eres asistente de liga de fútbol..."            │  │
│  │  │     Context: [Jornada, Tabla, Suspensiones...]               │  │
│  │  │     User: "¿Qué partidos hay esta semana?"                   │  │
│  │  │     ↓                                                          │  │
│  │  │     Response: "📅 Esta semana hay 3 partidos..."             │  │
│  │  │                                                                │  │
│  │  └──────────────────────────────┬─────────────────────────────┘  │  │
│  │                                 │                                 │  │
│  │  9. Twilio Send Message ← Envía respuesta por WhatsApp           │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  WORKFLOW 2: Generate Embeddings (Cron Job - Cada 6 horas)       │  │
│  │                                                                   │  │
│  │  1. Schedule Trigger      ← Cada 6 horas                         │  │
│  │  2. List Active Leagues   ← [league_1, league_2, ...]           │  │
│  │  3. FOR EACH League:                                             │  │
│  │     │                                                             │  │
│  │     ├─ 3a. Refresh Knowledge                                     │  │
│  │     │   ↓                                                         │  │
│  │     │   SELECT refresh_league_knowledge(league_id);              │  │
│  │     │   ↓                                                         │  │
│  │     │   Genera 4 documentos:                                     │  │
│  │     │   • Jornada (partidos de la semana)                        │  │
│  │     │   • Tabla de posiciones                                    │  │
│  │     │   • Suspensiones activas                                   │  │
│  │     │   • Resultados recientes                                   │  │
│  │     │                                                             │  │
│  │     ├─ 3b. Get Content Without Embeddings                        │  │
│  │     │   ↓                                                         │  │
│  │     │   SELECT id, content_text                                  │  │
│  │     │   FROM league_knowledge_base                               │  │
│  │     │   WHERE embedding IS NULL                                  │  │
│  │     │                                                             │  │
│  │     ├─ 3c. FOR EACH Content:                                     │  │
│  │     │   │                                                         │  │
│  │     │   ├─ Generate Embedding (OpenAI)                           │  │
│  │     │   │   Input: content_text                                  │  │
│  │     │   │   Output: vector[1536]                                 │  │
│  │     │   │                                                         │  │
│  │     │   ├─ Update Database                                       │  │
│  │     │   │   UPDATE league_knowledge_base                         │  │
│  │     │   │   SET embedding = [...]                                │  │
│  │     │   │   WHERE id = content_id                                │  │
│  │     │   │                                                         │  │
│  │     │   └─ Wait 1 second (rate limit)                            │  │
│  │     │                                                             │  │
│  │     └─ 3d. Log Results                                           │  │
│  │                                                                   │  │
│  │  4. Clean Expired Knowledge                                      │  │
│  │     ↓                                                             │  │
│  │     SELECT clean_expired_knowledge();                            │  │
│  │                                                                   │  │
│  │  5. Get Stats & Report                                           │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL + pgvector)                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  TABLA: league_knowledge_base                                   │    │
│  │                                                                 │    │
│  │  id              UUID                                           │    │
│  │  league_id       UUID → leagues(id)                            │    │
│  │  content_type    TEXT (jornada, tabla_posiciones, etc.)        │    │
│  │  content_text    TEXT (contenido legible)                      │    │
│  │  embedding       vector(1536) ← Vector de 1536 dimensiones     │    │
│  │  metadata        JSONB                                          │    │
│  │  created_at      TIMESTAMP                                      │    │
│  │  updated_at      TIMESTAMP                                      │    │
│  │                                                                 │    │
│  │  ÍNDICES:                                                       │    │
│  │  • idx_knowledge_base_embedding (HNSW) ← Búsqueda rápida      │    │
│  │  • idx_knowledge_base_league_id (B-tree)                       │    │
│  │  • idx_knowledge_base_content_type (B-tree)                    │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  FUNCIÓN: search_league_knowledge()                             │    │
│  │                                                                 │    │
│  │  Input:                                                         │    │
│  │  • query_embedding: vector(1536)                               │    │
│  │  • league_id: UUID                                             │    │
│  │  • limit: INTEGER (default 5)                                  │    │
│  │  • threshold: FLOAT (default 0.7)                              │    │
│  │                                                                 │    │
│  │  Query:                                                         │    │
│  │  SELECT *, 1 - (embedding <=> query_embedding) as similarity   │    │
│  │  FROM league_knowledge_base                                    │    │
│  │  WHERE league_id = p_league_id                                 │    │
│  │  AND similarity > threshold                                    │    │
│  │  ORDER BY embedding <=> query_embedding  ← Distancia coseno    │    │
│  │  LIMIT p_limit;                                                │    │
│  │                                                                 │    │
│  │  Output:                                                        │    │
│  │  [                                                              │    │
│  │    { content_text: "📅 JORNADA...", similarity: 0.92 },       │    │
│  │    { content_text: "⚽ RESULTADOS...", similarity: 0.85 }      │    │
│  │  ]                                                              │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  FUNCIÓN: refresh_league_knowledge()                            │    │
│  │                                                                 │    │
│  │  1. Delete old auto-generated content                          │    │
│  │  2. Generate new content:                                      │    │
│  │     • generate_jornada_content()      → Partidos semana        │    │
│  │     • generate_standings_content()    → Tabla posiciones       │    │
│  │     • generate_suspensions_content()  → Suspensiones activas   │    │
│  │     • generate_results_content()      → Últimos resultados     │    │
│  │  3. Insert into league_knowledge_base                          │    │
│  │  4. Return count of items created                              │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  TABLAS RELACIONADAS:                                                   │
│  • leagues         ← Liga principal                                     │
│  • tournaments     ← Torneos de la liga                                 │
│  • matches         ← Partidos (schedule, resultados)                    │
│  • teams           ← Equipos                                            │
│  • team_stats      ← Estadísticas (PJ, PG, PE, PP, GF, GC, Pts)       │
│  • players         ← Jugadores                                          │
│  • player_stats    ← Goles, asistencias, tarjetas                      │
│  • player_suspensions ← Suspensiones activas                            │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            OPENAI API                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  MODELO 1: text-embedding-ada-002                               │    │
│  │                                                                 │    │
│  │  Uso: Convertir texto a vector                                 │    │
│  │  Input: String de texto (max ~8000 tokens)                     │    │
│  │  Output: Array de 1536 números flotantes                       │    │
│  │                                                                 │    │
│  │  Ejemplo:                                                       │    │
│  │  Input: "¿Qué partidos hay esta semana?"                       │    │
│  │  Output: [0.0234, -0.0156, 0.0891, ..., -0.0234]              │    │
│  │                                                                 │    │
│  │  Costo: $0.0001 / 1K tokens                                    │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  MODELO 2: gpt-3.5-turbo (o gpt-4-turbo-preview)               │    │
│  │                                                                 │    │
│  │  Uso: Generar respuesta conversacional                         │    │
│  │  Input:                                                         │    │
│  │  • System: "Eres un asistente de liga de fútbol..."           │    │
│  │  • Context: Resultados de búsqueda vectorial                   │    │
│  │  • User: Pregunta original del usuario                         │    │
│  │                                                                 │    │
│  │  Output: Respuesta en lenguaje natural                         │    │
│  │                                                                 │    │
│  │  Ejemplo:                                                       │    │
│  │  Output: "📅 Esta semana hay 3 partidos programados:           │    │
│  │          • Sábado 18:00 - Guadalajara vs Atlas                 │    │
│  │          • Domingo 12:00 - Chivas vs Pumas..."                 │    │
│  │                                                                 │    │
│  │  Costo (GPT-3.5): $0.0005 input + $0.0015 output / 1K tokens  │    │
│  │  Costo (GPT-4): $0.01 input + $0.03 output / 1K tokens        │    │
│  │                                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos - Ejemplo Completo

### Escenario: Usuario pregunta "¿Qué partidos hay esta semana?"

```
PASO 1: Usuario envía mensaje por WhatsApp
├─ De: +521234567890
├─ A: +14155238886 (Twilio)
└─ Mensaje: "¿Qué partidos hay esta semana?"

PASO 2: Twilio recibe y envía webhook a n8n
├─ POST https://tu-n8n.app/webhook/whatsapp-webhook
├─ Body: {
│    From: "whatsapp:+521234567890",
│    Body: "¿Qué partidos hay esta semana?",
│    MessageSid: "SM1234567890"
│  }

PASO 3: n8n procesa el mensaje
├─ Parse WhatsApp Message
│  └─ from: "+521234567890"
│  └─ message: "¿Qué partidos hay esta semana?"
│
├─ Detect League Context
│  └─ league_id: "12345678-1234-1234-1234-123456789012"
│
├─ Check Quick Replies
│  └─ quick_reply: false (no es comando rápido)
│
├─ OpenAI - Generate Query Embedding
│  ├─ Input: "¿Qué partidos hay esta semana?"
│  └─ Output: [0.0234, -0.0156, ..., 0.0891] (1536 números)
│
├─ Supabase - Search Vector DB
│  ├─ Query: search_league_knowledge(
│  │   embedding: [0.0234, ...],
│  │   league_id: "1234...",
│  │   limit: 5,
│  │   threshold: 0.7
│  │ )
│  └─ Results:
│      1. { type: "jornada", similarity: 0.92, text: "📅 JORNADA..." }
│      2. { type: "resultados", similarity: 0.78, text: "⚽ RESULTADOS..." }
│
├─ Build GPT Context
│  ├─ System: "Eres un asistente de WhatsApp..."
│  ├─ Context: "📅 JORNADA SEMANAL\nLiga: Elite Soccer\n..."
│  └─ User: "¿Qué partidos hay esta semana?"
│
├─ OpenAI - Generate Response
│  ├─ Model: gpt-3.5-turbo
│  └─ Response: "📅 Esta semana hay 3 partidos programados:\n
│                • Sábado 16/12 18:00: Guadalajara vs Atlas
│                • Sábado 16/12 20:00: Chivas vs Pumas
│                • Domingo 17/12 12:00: América vs Cruz Azul\n
│                ¡No te los pierdas! ⚽"
│
└─ Twilio - Send WhatsApp Message
   ├─ To: whatsapp:+521234567890
   └─ Body: "📅 Esta semana hay 3 partidos programados:..."

PASO 4: Usuario recibe respuesta en WhatsApp
└─ Tiempo total: ~3-5 segundos
```

---

## Componentes Clave

### 1. Vector Database (pgvector)

**¿Qué es?**
- Extensión de PostgreSQL para almacenar y buscar vectores
- Usa índices HNSW (Hierarchical Navigable Small World) para búsqueda rápida
- Soporta distancia coseno, euclidiana, y producto punto

**¿Cómo funciona?**
```
Texto: "¿Qué partidos hay?"
   ↓ (OpenAI Embedding)
Vector: [0.123, -0.456, 0.789, ...]
   ↓ (Búsqueda por similitud)
Documentos similares:
   • "📅 JORNADA..." (92% similar)
   • "⚽ RESULTADOS..." (78% similar)
```

**Ventajas:**
- Búsqueda semántica (entiende el significado, no solo palabras clave)
- Multilingüe (funciona en español, inglés, etc.)
- Escalable (millones de vectores)

### 2. Embeddings (OpenAI)

**¿Qué son?**
- Representación numérica de texto
- Textos similares tienen vectores cercanos
- 1536 dimensiones para text-embedding-ada-002

**Ejemplo:**
```
"¿Qué partidos hay?" → [0.1, 0.2, -0.3, ...]
"Partidos de la semana" → [0.11, 0.19, -0.29, ...]
                            ↑ Vectores muy similares

"El clima está soleado" → [0.8, -0.5, 0.1, ...]
                            ↑ Vector completamente diferente
```

### 3. RAG (Retrieval Augmented Generation)

**¿Qué es RAG?**
- Técnica que combina búsqueda (Retrieval) + generación (Generation)
- El LLM no inventa, usa información real de tu base de datos

**Flujo RAG:**
```
1. Retrieval (Búsqueda)
   ├─ Pregunta usuario
   ├─ Buscar documentos relevantes en vector DB
   └─ Obtener top 5 resultados

2. Augmentation (Aumento)
   ├─ Tomar resultados de búsqueda
   ├─ Construir contexto para el LLM
   └─ "Aquí está la información relevante..."

3. Generation (Generación)
   ├─ LLM lee el contexto
   ├─ LLM genera respuesta basada en contexto
   └─ Respuesta precisa y actualizada
```

**Sin RAG:**
```
Usuario: "¿Cuándo juega Guadalajara?"
LLM: "No tengo información en tiempo real..."
      ❌ No útil
```

**Con RAG:**
```
Usuario: "¿Cuándo juega Guadalajara?"
Sistema: [Busca en vector DB] → Encuentra "Jornada" con info de Guadalajara
LLM: "Guadalajara juega el Sábado 16/12 a las 18:00 contra Atlas"
      ✅ Respuesta precisa
```

---

## Escalabilidad

### Capacidad por Componente

| Componente | Límite Actual | Puede Escalar a |
|------------|---------------|-----------------|
| Supabase Free | 500 MB DB | 8 GB (Pro: $25/mes) |
| pgvector | ~100K vectores | Millones con índice HNSW |
| n8n Self-hosted | Ilimitado | Ilimitado |
| n8n Cloud | 5K ejecuciones/mes | 50K+ (Pro: $50/mes) |
| OpenAI API | Rate limit | Solicitar aumento |
| Twilio WhatsApp | Ilimitado | Ilimitado (pago por uso) |

### Proyección de Costos (1 Liga Activa)

| Métrica | Cantidad | Costo Mensual |
|---------|----------|---------------|
| Usuarios activos | 100 | - |
| Mensajes enviados | 3000 | $22.50 (Twilio) |
| Embeddings generados | 480/mes (4 cada 6h) | $0.10 (OpenAI) |
| Respuestas GPT-3.5 | 3000 | $15-20 (OpenAI) |
| Hosting n8n | Self-hosted | $0 (o $50 Cloud) |
| Supabase | Free tier | $0 (o $25 Pro) |
| **TOTAL** | | **$40-90/mes** |

---

## Mejoras Futuras

### Fase 2: Multimodal
- Enviar imágenes (logos de equipos, flyers)
- Generar gráficas de estadísticas

### Fase 3: Proactividad
- Notificaciones push antes de partidos
- Alertas de cambios en tabla de posiciones
- Recordatorios de suspensiones

### Fase 4: Integraciones
- Transmisiones en vivo (YouTube/Twitch links)
- Pagos de inscripciones (Stripe)
- Encuestas y votaciones

---

## Seguridad y Privacidad

### Datos Almacenados
- ❌ NO se almacenan conversaciones completas
- ✅ Solo se guarda: número, league_id, timestamp
- ✅ Embeddings son anónimos (no contienen info personal)

### Acceso a Datos
- RLS (Row Level Security) en Supabase
- Solo admins de liga ven su propia data
- Super admins ven todo

### Rate Limiting
- Máximo 1 mensaje cada 3 segundos por usuario
- Previene spam y abuso

---

**Diagrama creado:** 14 de Diciembre, 2025
**Versión:** 1.0
