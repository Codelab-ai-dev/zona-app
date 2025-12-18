# 🔄 Webhook n8n: Generación de Embeddings para Jornadas

## 🎯 Descripción

Cuando se crea o edita un partido/jornada desde el admin web (Next.js), se envía automáticamente un request al webhook de n8n para generar embeddings del calendario de la jornada.

**URL del Webhook:**
```
https://n8n.zona-gol.com/webhook-test/embeddings
```

---

## 📊 Estructura del JSON (Request desde Next.js)

### **Ejemplo de Request:**

```json
{
  "trigger_type": "jornada_update",
  "league_id": "abc123-league-id",
  "tournament_id": "def456-tournament-id",
  "round": 1,
  "content_type": "proximos_partidos",
  "timestamp": "2025-12-16T20:30:00.000Z"
}
```

### **Campos:**

- **`trigger_type`**: `"jornada_update"` - Indica que es una actualización de jornada
- **`league_id`**: UUID de la liga
- **`tournament_id`**: UUID del torneo
- **`round`**: Número de la jornada (1, 2, 3, etc.)
- **`content_type`**: Tipo de contenido
  - `"jornada"` - Calendario completo de la jornada
  - `"proximos_partidos"` - Próximos partidos programados
- **`timestamp`**: Fecha y hora del request

---

## 🔧 Configuración del Webhook en n8n

### **Workflow Structure:**

```
[Webhook] POST /webhook-test/embeddings
  ↓
[IF] Check trigger_type
  ↓ (jornada_update)
[Postgres] Call insert_jornada_to_knowledge_base()
  ↓
[Postgres] Get generated content
  ↓
[OpenAI] Generate embedding
  ↓
[Postgres] Update embedding
  ↓
[Respond] Success
```

---

### **Nodo 1: Webhook**

```
HTTP Method: POST
Path: /webhook-test/embeddings
Response Mode: When Last Node Finishes
```

---

### **Nodo 2: IF - Check Trigger Type**

```javascript
// IF Node - Verificar tipo de trigger
const triggerType = $json.trigger_type || 'match_finalized'

// Si es jornada_update, ir por una rama
// Si es otra cosa (match_finalized), ir por otra rama
return triggerType === 'jornada_update'
```

---

### **Nodo 3: Postgres - Generate Jornada Content**

**Operation:** Execute Query

**Query:**
```sql
SELECT insert_jornada_to_knowledge_base(
  $1::UUID,  -- league_id
  $2::UUID,  -- tournament_id
  $3::INTEGER -- round
) as success;
```

**Query Parameters:**
```javascript
$1 = {{ $json.league_id }}
$2 = {{ $json.tournament_id }}
$3 = {{ $json.round }}
```

**Output:**
```json
{
  "success": true
}
```

---

### **Nodo 4: Postgres - Get Generated Content**

**Operation:** Execute Query

**Query:**
```sql
SELECT
  id,
  content_text,
  content_type,
  league_id,
  tournament_id,
  metadata
FROM league_knowledge_base
WHERE league_id = $1::UUID
  AND tournament_id = $2::UUID
  AND content_type = 'jornada'
  AND metadata->>'round' = $3::TEXT
  AND content_text IS NOT NULL
LIMIT 1;
```

**Query Parameters:**
```javascript
$1 = {{ $json.league_id }}
$2 = {{ $json.tournament_id }}
$3 = {{ $json.round }}
```

**Output:**
```json
{
  "id": "knowledge-base-id",
  "content_text": "📅 JORNADA 1\n\n🏆 Liga: LIGA PREMIER...",
  "content_type": "jornada",
  "metadata": {
    "round": 1,
    "type": "jornada_calendar"
  }
}
```

---

### **Nodo 5: Code - Validate Content**

```javascript
const data = $input.all()

if (!data || data.length === 0) {
  throw new Error('No se encontró contenido generado para la jornada')
}

const knowledgeEntry = data[0].json

if (!knowledgeEntry.content_text || knowledgeEntry.content_text.length === 0) {
  throw new Error('El contenido de la jornada está vacío')
}

console.log(`✅ Contenido encontrado: ${knowledgeEntry.content_text.length} caracteres`)

return [{
  json: {
    knowledge_base_id: knowledgeEntry.id,
    content_text: knowledgeEntry.content_text,
    league_id: $('Webhook').item.json.league_id,
    tournament_id: $('Webhook').item.json.tournament_id,
    round: $('Webhook').item.json.round
  }
}]
```

---

### **Nodo 6: OpenAI - Generate Embedding**

**Operation:** Create Embedding

**Model:** text-embedding-ada-002

**Input:**
```javascript
{{ $json.content_text }}
```

**Output:**
```json
{
  "data": [
    {
      "embedding": [0.0023, -0.0015, ...],  // 1536 dimensions
      "index": 0
    }
  ],
  "usage": {
    "total_tokens": 150
  }
}
```

---

### **Nodo 7: Postgres - Update Embedding**

**Operation:** Execute Query

**Query:**
```sql
UPDATE league_knowledge_base
SET
  embedding = $1::vector,
  updated_at = NOW()
WHERE id = $2::UUID
RETURNING id, content_type, metadata;
```

**Query Parameters:**
```javascript
$1 = {{ JSON.stringify($json.data[0].embedding) }}
$2 = {{ $('Code').item.json.knowledge_base_id }}
```

---

### **Nodo 8: Respond to Webhook**

**Response Code:** 200

**Response Body:**
```json
{
  "success": true,
  "message": "Embedding de jornada generado exitosamente",
  "knowledge_base_id": "={{ $json.id }}",
  "round": "={{ $('Webhook').item.json.round }}",
  "content_type": "={{ $json.content_type }}",
  "tokens_used": "={{ $('OpenAI Embeddings').item.json.usage.total_tokens }}"
}
```

---

## 🧪 Testing del Workflow

### **1. Test Manual desde Postman:**

```bash
curl -X POST \
  https://n8n.zona-gol.com/webhook-test/embeddings \
  -H 'Content-Type: application/json' \
  -d '{
    "trigger_type": "jornada_update",
    "league_id": "TU-LEAGUE-ID",
    "tournament_id": "TU-TOURNAMENT-ID",
    "round": 1,
    "content_type": "jornada",
    "timestamp": "2025-12-16T20:30:00.000Z"
  }'
```

### **2. Test desde Next.js Admin:**

1. Ve al admin de tu liga
2. Abre **"Calendar View"** o **"Fixture Generator"**
3. Edita un partido existente o genera un nuevo fixture
4. Guarda los cambios
5. Verifica en los logs de la consola del navegador:
   ```
   🔄 Generando embedding para jornada: {round: 1, ...}
   ✅ Embedding de jornada generado: {...}
   ```

### **3. Verificar en Supabase:**

```sql
-- Ver embeddings de jornadas generados
SELECT
  id,
  content_type,
  metadata->>'round' as jornada,
  LEFT(content_text, 100) as preview,
  embedding IS NOT NULL as tiene_embedding,
  updated_at
FROM league_knowledge_base
WHERE content_type = 'jornada'
ORDER BY (metadata->>'round')::int DESC
LIMIT 10;
```

---

## 📋 Diferencia entre Tipos de Requests

El webhook ahora maneja **DOS tipos** de requests:

### **1. Match Finalized (desde Flutter):**

```json
{
  "knowledge_base_id": "xxx",
  "match_id": "xxx",
  "content_text": "⚽ RESULTADO DEL PARTIDO..."
}
```
- Ya tiene el `knowledge_base_id`
- Ya tiene el contenido generado
- Solo necesita generar y actualizar el embedding

### **2. Jornada Update (desde Next.js Admin):**

```json
{
  "trigger_type": "jornada_update",
  "league_id": "xxx",
  "tournament_id": "xxx",
  "round": 1
}
```
- NO tiene `knowledge_base_id` aún
- NO tiene contenido generado
- Necesita:
  1. Llamar función de Postgres para generar contenido
  2. Obtener el `knowledge_base_id` generado
  3. Generar embedding
  4. Actualizar embedding

---

## 🔀 Workflow Completo Actualizado

```
[Webhook]
  ↓
[IF] ¿Tiene trigger_type === 'jornada_update'?
  ├── YES → [Postgres] Generate Content
  │          ↓
  │         [Postgres] Get Content
  │          ↓
  │         [Code] Validate
  │          ↓
  │         [OpenAI] Generate Embedding
  │          ↓
  │         [Postgres] Update Embedding
  │          ↓
  │         [Respond] Success
  │
  └── NO → [Code] Validate Match Data (existing flow)
           ↓
          [OpenAI] Generate Embedding
           ↓
          [Postgres] Update Embedding
           ↓
          [Respond] Success
```

---

## 📊 Logs Esperados

### **En Next.js (Browser Console):**
```
🔄 Generando embedding para jornada: {
  league_id: "abc123",
  tournament_id: "def456",
  round: 1,
  content_type: "proximos_partidos"
}
✅ Embedding de jornada generado
```

### **En n8n (Workflow Execution):**
```
✅ Contenido encontrado: 450 caracteres
✅ Embedding generado: 1536 dimensiones
✅ Knowledge base actualizado: id=xxx
```

---

## 🚨 Errores Comunes

### **Error: "No se encontró contenido generado"**

**Causa:** La función `insert_jornada_to_knowledge_base()` no encontró partidos para esa jornada.

**Solución:**
- Verifica que existan partidos para esa jornada en la tabla `matches`
- Verifica que el `league_id` y `tournament_id` sean correctos

### **Error: "El contenido de la jornada está vacío"**

**Causa:** La función generó una entrada pero sin contenido.

**Solución:**
- Verifica que los partidos tengan `round` asignado
- Revisa la función `generate_jornada_calendar()` en Postgres

### **Error: "URI too long"**

**Causa:** Intentando pasar el embedding por URL parameters.

**Solución:**
- Usar Postgres node con `Execute Query`
- Pasar embedding en el body del query con `$1::vector`

---

## ✅ Checklist de Implementación

- [ ] Aplicar migración `20251215000004_add_jornada_calendar_function.sql`
- [ ] Crear/actualizar webhook en n8n con el flujo de dos ramas (IF)
- [ ] Configurar credenciales de OpenAI en n8n
- [ ] Configurar credenciales de Postgres en n8n
- [ ] Probar con request manual (Postman)
- [ ] Probar desde Next.js admin editando un partido
- [ ] Probar desde Next.js admin generando un fixture completo
- [ ] Verificar embeddings en Supabase

---

## 🎉 Resultado Final

Cuando se crea o edita un partido/jornada desde el admin:

1. ✅ El admin hace el cambio en la BD
2. ✅ Automáticamente llama al webhook de n8n
3. ✅ n8n genera el contenido del calendario de la jornada
4. ✅ n8n genera el embedding con OpenAI
5. ✅ n8n actualiza la tabla `league_knowledge_base`
6. ✅ El AI Agent de WhatsApp puede responder preguntas sobre la jornada actualizada

**Ejemplo de pregunta que ahora funcionará:**

**Usuario:** "¿Qué partidos hay en la jornada 1?"

**AI Agent:** "📅 JORNADA 1 - LIGA PREMIER

Partidos programados:

• Sábado 16/12/2025 10:00 - Cancha 1
  PUEBLA vs TECOS

• Sábado 16/12/2025 12:00 - Cancha 2
  ATLAS vs GUADALAJARA

Total: 2 partidos"

---

¿Necesitas ayuda configurando el workflow en n8n? Puedo darte un JSON de ejemplo para importar.
