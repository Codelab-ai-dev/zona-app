# Integración Kapso + Agent Service

Guía para configurar Kapso para que llame directamente al Agent Service de Zona-Gol.

## 🏗️ Arquitectura

```
Usuario WhatsApp
    ↓
Kapso (Gestión WhatsApp)
    ↓
Kapso Webhook Adapter (/api/agent/kapso)
    ↓ (Transforma payload)
Agent Service (/api/agent/core)
    ↓ (Procesa con RAG + LLM)
Respuesta
    ↓
Kapso
    ↓
Usuario WhatsApp
```

**n8n se usa por separado para:**
- Generar embeddings de partidos
- Workflows automatizados
- Notificaciones programadas

## 📋 Requisitos Previos

1. **Kapso configurado con WhatsApp Business API**
2. **Agent Service funcionando:** `https://api.zona-gol.com/api/agent/kapso`
3. **Base de datos con vínculos de usuarios** en `whatsapp_user_links`

## ⚙️ Configuración en Kapso

### 1. Configurar Webhook en Kapso

En Kapso, configura el webhook para enviar mensajes al adapter:

**Endpoint URL:**
```
https://api.zona-gol.com/api/agent/kapso
```

**Método:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

### 2. Formato del Webhook de Kapso

**IMPORTANTE:** Kapso envía webhooks en su formato nativo (v2). El adapter `/api/agent/kapso` automáticamente transforma este payload al formato que espera el Agent Service.

**Payload que Kapso envía automáticamente:**
```json
{
  "event": "message.received",
  "data": {
    "id": "wamid.XXX",
    "from": "5215512345678",
    "to": "5219876543210",
    "type": "text",
    "text": {
      "body": "Hola, cuales son los proximos partidos?"
    },
    "timestamp": "1234567890",
    "contact": {
      "name": "Gustavo",
      "wa_id": "5215512345678"
    }
  }
}
```

**El adapter transforma automáticamente a:**
```json
{
  "channel": "whatsapp",
  "userIdentifier": "+5215512345678",
  "message": "Hola, cuales son los proximos partidos?",
  "metadata": {
    "kapso_message_id": "wamid.XXX",
    "kapso_timestamp": "1234567890",
    "contact_name": "Gustavo",
    "message_type": "text",
    "event": "message.received"
  }
}
```

**Tipos de mensaje soportados:**
- `text` - Mensajes de texto simples
- `interactive.button_reply` - Respuestas de botones
- `interactive.list_reply` - Respuestas de listas

### 3. Configurar Response Handling

El adapter responderá a Kapso con este formato simplificado:

```json
{
  "success": true,
  "message": "Los próximos partidos son...",
  "metadata": {
    "intent": "proximos_partidos",
    "confidence": 0.95
  },
  "actions": []
}
```

**En Kapso, configura:**
- `response.message` → Texto que Kapso debe enviar al usuario
- `response.metadata` → (Opcional) Para analytics/logging
- `response.actions` → (Opcional) Acciones sugeridas

### 4. ¿Cómo funciona Kapso con el Adapter?

El flujo es completamente automático:

1. **Usuario envía mensaje** → Kapso recibe el mensaje
2. **Kapso envía webhook** → POST a `https://api.zona-gol.com/api/agent/kapso` con su payload nativo
3. **Adapter transforma** → Convierte el formato de Kapso al formato del Agent Service
4. **Agent procesa** → Identifica usuario, busca información, genera respuesta
5. **Adapter responde** → Devuelve formato simple a Kapso
6. **Kapso envía mensaje** → Entrega la respuesta al usuario

**No necesitas configurar transformaciones manuales.** Solo apunta el webhook de Kapso al endpoint `/api/agent/kapso` y el adapter hace todo el trabajo.

## 🧪 Testing

### Test 1: Usuario Sin Vínculo

**Envía desde WhatsApp:**
```
Hola
```

**Request esperado a Agent Service:**
```json
{
  "channel": "whatsapp",
  "userIdentifier": "+5219999999999",
  "message": "Hola"
}
```

**Response esperado:**
```json
{
  "text": "¡Hola! 👋 Para usar este servicio, primero necesitas vincular tu WhatsApp desde la aplicación web...",
  "metadata": {
    "intent": "conversacion",
    "intentConfidence": 1
  },
  "delivery": {
    "withinWindow24h": false,
    "templateRequired": true,
    "templateName": "link_whatsapp"
  }
}
```

**Usuario recibe:**
```
¡Hola! 👋 Para usar este servicio, primero necesitas vincular tu WhatsApp desde la aplicación web en: https://zona-gol.com/dashboard

Una vez vinculado, podré ayudarte con información de tu liga.
```

### Test 2: Usuario Vinculado - Query Simple

**Pre-requisito:** Crear vínculo en Dashboard → WhatsApp

**Envía desde WhatsApp:**
```
Cuales son los proximos partidos?
```

**Request esperado:**
```json
{
  "channel": "whatsapp",
  "userIdentifier": "+5215512345678",
  "message": "Cuales son los proximos partidos?"
}
```

**Response esperado:**
```json
{
  "text": "📅 Próximos partidos de Liga MX:\n\n1. Atlas vs Tigres\n   Fecha: 22/12/2024 19:00\n   Estadio: Jalisco\n\n2. Cruz Azul vs América\n   Fecha: 23/12/2024 20:00\n   Estadio: Azteca",
  "metadata": {
    "intent": "proximos_partidos",
    "intentConfidence": 0.95,
    "userId": "uuid",
    "leagueId": "uuid"
  }
}
```

### Test 3: Query Compleja con RAG

**Envía:**
```
Quien es el maximo goleador?
```

**Response esperado:**
```json
{
  "text": "⚽ El máximo goleador de la temporada es:\n\nJuan Pérez (Tigres)\n15 goles en 12 partidos\n\nTop 3:\n1. Juan Pérez - 15 goles\n2. Carlos López - 12 goles\n3. Miguel Sánchez - 10 goles",
  "metadata": {
    "intent": "goleadores",
    "intentConfidence": 0.92,
    "sources": ["RAG"],
    "chunks_used": 3
  }
}
```

## 🔍 Debugging

### Verificar que Kapso está llamando correctamente:

1. **En Kapso, revisa logs de API calls**
2. **En tu servidor, monitorea logs:**

```bash
# Ver requests entrantes al Agent Service
tail -f /var/log/zona-gol/agent-service.log

# O si usas PM2/Docker
docker logs -f zona-gol-web
```

3. **Verifica el formato del teléfono:**
   - Debe incluir `+` y código de país
   - Ejemplo: `+5215512345678` ✅
   - Incorrecto: `5512345678` ❌

### Errores Comunes:

#### Error 1: "User not found"
```json
{
  "error": "User not found: +5219999999999"
}
```

**Causa:** Usuario no tiene vínculo en `whatsapp_user_links`

**Solución:**
- Esto es ESPERADO para usuarios nuevos
- El Agent responderá pidiendo vincular WhatsApp
- El admin debe crear el vínculo en Dashboard → WhatsApp

#### Error 2: "Invalid phone format"
```json
{
  "error": "Invalid user identifier format"
}
```

**Causa:** Número de teléfono sin formato correcto

**Solución:**
- Asegúrate que Kapso envía: `+5215512345678`
- No enviar: `5512345678` o `(55) 1234-5678`

#### Error 3: "OpenAI API error"
```json
{
  "error": "OpenAI API error: Insufficient quota"
}
```

**Causa:** Problemas con OpenAI API

**Solución:**
- Verifica `OPENAI_API_KEY` en `.env.local`
- Verifica quota en OpenAI dashboard

## 📊 Monitoreo

### Queries útiles en Supabase:

```sql
-- Ver conversaciones recientes
SELECT
  created_at,
  channel,
  user_identifier,
  user_message,
  agent_response,
  intent
FROM agent_conversations
WHERE channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 20;

-- Usuarios más activos
SELECT
  user_identifier,
  COUNT(*) as messages,
  MAX(created_at) as last_message
FROM agent_conversations
WHERE channel = 'whatsapp'
GROUP BY user_identifier
ORDER BY messages DESC;

-- Intents más comunes
SELECT
  intent,
  COUNT(*) as count
FROM agent_conversations
WHERE channel = 'whatsapp'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY intent
ORDER BY count DESC;
```

## 🚀 Puesta en Producción

### Checklist:

- [ ] Agent Service corriendo en producción (HTTPS)
- [ ] OpenAI API key configurada y con crédito
- [ ] Database migrations aplicadas
- [ ] Kapso configurado con URL de producción
- [ ] Al menos 1 vínculo de WhatsApp creado para testing
- [ ] Knowledge base poblada con datos de partidos
- [ ] Monitoreo configurado (logs + Supabase queries)
- [ ] Test end-to-end exitoso

### URLs de Producción:

**Kapso Webhook Adapter:**
```
https://api.zona-gol.com/api/agent/kapso
```

**Health Check del Adapter:**
```bash
curl https://api.zona-gol.com/api/agent/kapso
```

Debería responder:
```json
{
  "status": "ok",
  "adapter": "kapso",
  "version": "1.0.0",
  "message": "Kapso webhook adapter is ready"
}
```

## 🔄 Workflows Separados con n8n

n8n se usa para workflows automatizados (NO para la conversación):

### 1. Generar Embeddings de Partidos
- Webhook: Cuando se crea/actualiza un partido
- Genera embeddings con OpenAI
- Guarda en `league_knowledge_base`

### 2. Notificaciones Programadas
- Recordatorios de partidos
- Resúmenes semanales
- Alertas de resultados

Ver: `docs/n8n_workflow_whatsapp_agent_integration.json` para workflows automatizados.

## 📚 Recursos

- [Agent Service API Docs](./AGENT_SERVICE_IMPLEMENTATION.md)
- [WhatsApp Management UI](./WHATSAPP_MANAGEMENT_UI.md)
- [Kapso Documentation](https://kapso.io/docs)

---

**Última actualización:** Diciembre 2024
**Estado:** ✅ Listo para producción
