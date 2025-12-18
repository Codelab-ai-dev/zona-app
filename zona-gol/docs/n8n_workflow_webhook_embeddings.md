# Workflow n8n: Generar Embeddings desde Flutter Webhook

## Configuración del Workflow

Este workflow recibe un webhook desde Flutter cuando se finaliza un partido y genera el embedding automáticamente.

### URL del Webhook
```
http://n8n-n8nwithpostgres-dff3da-168-231-70-73.traefik.me/webhook-test/embeddings
```

### Estructura del Workflow

```
1. Webhook Trigger (POST /webhook-test/embeddings)
   ↓
2. Code - Generar Embedding con OpenAI
   ↓
3. Postgres - Actualizar embedding en knowledge_base
   ↓
4. Respond to Webhook
```

---

## Nodo 1: Webhook Trigger

**Configuración:**
```
HTTP Method: POST
Path: /webhook-test/embeddings
Authentication: None (o Header Auth si quieres seguridad)
Response Mode: When Last Node Finishes

Expected Body (JSON):
{
  "knowledge_base_id": "uuid",
  "match_id": "uuid",
  "content_text": "texto del resultado del partido"
}
```

---

## Nodo 2: Code - Generar Embedding

**Language:** JavaScript

```javascript
// Extraer datos del webhook
const { knowledge_base_id, match_id, content_text } = $input.first().json.body;

// Validar que tenemos los datos necesarios
if (!knowledge_base_id || !content_text) {
  throw new Error('Faltan datos: knowledge_base_id y content_text son requeridos');
}

console.log(`Generando embedding para match_id: ${match_id}`);
console.log(`Content length: ${content_text.length} caracteres`);

// Llamar a OpenAI para generar el embedding
const openaiResponse = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.openai.com/v1/embeddings',
  headers: {
    'Authorization': 'Bearer TU_OPENAI_API_KEY_AQUI',
    'Content-Type': 'application/json',
  },
  body: {
    input: content_text,
    model: 'text-embedding-ada-002'
  },
});

// Extraer el embedding
const embedding = openaiResponse.data[0].embedding;

console.log(`✅ Embedding generado: ${embedding.length} dimensiones`);

// Retornar datos para el siguiente nodo
return [{
  json: {
    knowledge_base_id,
    match_id,
    embedding,
    dimensions: embedding.length,
    tokens_used: openaiResponse.usage.total_tokens
  }
}];
```

**⚠️ IMPORTANTE:** Reemplaza `TU_OPENAI_API_KEY_AQUI` con tu API key real de OpenAI.

---

## Nodo 3: Postgres - Actualizar Embedding

**Operation:** Execute Query

**Query:**
```sql
UPDATE league_knowledge_base
SET
  embedding = $1::vector,
  updated_at = NOW()
WHERE id = $2::uuid
RETURNING id, match_id, content_type;
```

**Query Parameters:**
```
Parameter 1: {{ JSON.stringify($json.embedding) }}
Parameter 2: {{ $json.knowledge_base_id }}
```

**Credentials:**
```
Host: srv1190257.hstgr.cloud (o localhost)
Database: postgres
User: postgres
Password: [tu password]
Port: 5432
SSL: No
```

---

## Nodo 4: Respond to Webhook

**Response Code:** 200

**Response Body (JSON):**
```json
{
  "success": true,
  "knowledge_base_id": "={{ $json.id }}",
  "match_id": "={{ $json.match_id }}",
  "dimensions": "={{ $('Code').item.json.dimensions }}",
  "tokens_used": "={{ $('Code').item.json.tokens_used }}",
  "message": "Embedding generado y guardado exitosamente"
}
```

---

## Testing del Workflow

### Desde Postman/cURL:

```bash
curl -X POST \
  http://n8n-n8nwithpostgres-dff3da-168-231-70-73.traefik.me/webhook-test/embeddings \
  -H 'Content-Type: application/json' \
  -d '{
    "knowledge_base_id": "UUID-AQUI",
    "match_id": "UUID-AQUI",
    "content_text": "⚽ RESULTADO DEL PARTIDO\n\nTigres 1 - 1 Atlas\n\nEmpate"
  }'
```

### Desde Flutter:

Ya está implementado en `match_service.dart` - se ejecuta automáticamente al finalizar un partido.

---

## Verificar que funcionó

### En Supabase SQL Editor:

```sql
-- Ver el último embedding generado
SELECT
  id,
  match_id,
  content_type,
  embedding IS NOT NULL as tiene_embedding,
  updated_at
FROM league_knowledge_base
WHERE match_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- Verificar dimensiones del embedding
SELECT
  id,
  match_id,
  array_length(embedding::float[], 1) as dimensiones
FROM league_knowledge_base
WHERE embedding IS NOT NULL
LIMIT 5;
```

---

## Manejo de Errores

El workflow debe manejar estos casos:

1. **Si OpenAI falla:** Retornar error 500 con mensaje descriptivo
2. **Si Postgres falla:** Retornar error 500 con mensaje descriptivo
3. **Si falta data:** Retornar error 400 con mensaje "Datos incompletos"

**Agregar nodo "Error Trigger":**
```
Respond to Webhook:
  Status Code: 500
  Body: {
    "success": false,
    "error": "={{ $json.message }}"
  }
```

---

## Costos Aproximados

**OpenAI text-embedding-ada-002:**
- ~$0.0001 por 1,000 tokens
- Un resultado de partido típico: ~200 tokens
- Costo por partido: ~$0.00002 (prácticamente gratis)

**Estimación mensual:**
- 100 partidos/mes: $0.002 (menos de 1 centavo)
- 1,000 partidos/mes: $0.02 (2 centavos)

---

## Logs Importantes

Flutter enviará estos logs:
```
🔄 Generando embedding para partido: [UUID]
📝 Contenido encontrado (XXX caracteres)
✅ Embedding generado exitosamente
   Response: {...}
```

n8n debe loggear:
```
Generando embedding para match_id: [UUID]
Content length: XXX caracteres
✅ Embedding generado: 1536 dimensiones
```

---

## Próximos Pasos

1. ✅ Implementar este workflow en n8n
2. ✅ Configurar las credenciales (OpenAI y Postgres)
3. ✅ Testear con un partido real
4. ⏭️ Implementar workflow similar para jornadas (calendario)

---

## Notas de Seguridad

- ⚠️ El webhook no tiene autenticación actualmente
- Para producción, agregar Header Auth:
  ```
  X-API-Key: tu-secret-key-aqui
  ```
- Validar siempre los UUIDs para prevenir SQL injection
- Rate limiting recomendado: 100 requests/minuto
