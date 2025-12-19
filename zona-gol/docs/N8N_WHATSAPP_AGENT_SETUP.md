# Configuración de n8n: WhatsApp + Agent Service

Esta guía te muestra cómo configurar el workflow de n8n para integrar WhatsApp Business API con el Agent Service de Zona-Gol.

## 📋 Requisitos Previos

1. **WhatsApp Business API configurado:**
   - Phone Number ID
   - Access Token
   - Business Account ID
   - Webhook configurado en Meta

2. **Agent Service funcionando:**
   - Endpoint: `https://tu-dominio.com/api/agent` (o `http://localhost:3000/api/agent` para desarrollo)
   - OpenAI API key configurada
   - Database migrations aplicadas

3. **n8n instalado y configurado:**
   - Acceso a tu instancia de n8n
   - Supabase credentials configuradas (opcional, para logging)

## 🚀 Paso 1: Importar el Workflow

1. Ve a n8n
2. Click en **"Import from File"** o crea un nuevo workflow
3. Importa el archivo: `docs/n8n_workflow_whatsapp_agent_integration.json`

## ⚙️ Paso 2: Configurar Variables de Entorno en n8n

En tu n8n, configura estas variables de entorno:

```bash
# Agent Service URL
AGENT_SERVICE_URL=https://api.zona-gol.com/api/agent
# o para desarrollo local:
# AGENT_SERVICE_URL=http://localhost:3000/api/agent

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id
WHATSAPP_ACCESS_TOKEN=tu-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-business-account-id
```

## 📝 Paso 3: Configurar Cada Nodo

### 1. **Webhook WhatsApp** (Primer nodo)

- **Tipo:** Webhook
- **HTTP Method:** POST
- **Path:** `whatsapp-webhook`
- **Response Mode:** Response Node

**Configuración:**
```
Webhook URL: https://tu-n8n.com/webhook/whatsapp-webhook
```

> **Importante:** Copia esta URL y configúrala en Meta Business Manager como Webhook URL

### 2. **Filter Incoming Messages**

- **Tipo:** IF
- **Condición:** `{{ $json.entry[0].changes[0].value.messages }}` is not empty

No requiere configuración adicional.

### 3. **Process WhatsApp Message**

- **Tipo:** Code (JavaScript)
- **Código:** Ya incluido en el JSON

Este nodo:
- Extrae el mensaje de WhatsApp
- Formatea el número de teléfono
- Prepara el payload para el Agent Service

### 4. **Call Agent Service**

- **Tipo:** HTTP Request
- **Method:** POST
- **URL:** `={{ $env.AGENT_SERVICE_URL || 'http://localhost:3000/api/agent' }}`
- **Headers:**
  - `Content-Type`: `application/json`
- **Body:** `={{ JSON.stringify($json.agentPayload) }}`

**Ejemplo de Request que envía:**
```json
{
  "channel": "whatsapp",
  "userIdentifier": "+5215512345678",
  "message": "Hola, cuales son los proximos partidos?",
  "metadata": {
    "whatsapp_message_id": "wamid.XXX",
    "whatsapp_timestamp": "1234567890",
    "contact_name": "Gustavo",
    "phone_number_id": "123456789"
  }
}
```

### 5. **Prepare WhatsApp Response**

- **Tipo:** Code (JavaScript)
- **Código:** Ya incluido en el JSON

Este nodo:
- Extrae la respuesta del Agent
- Formatea el mensaje para WhatsApp
- Convierte acciones sugeridas en texto

### 6. **Send WhatsApp Message**

- **Tipo:** HTTP Request
- **Method:** POST
- **URL:** `https://graph.facebook.com/v18.0/{{ $env.WHATSAPP_PHONE_NUMBER_ID }}/messages`
- **Headers:**
  - `Authorization`: `Bearer {{ $env.WHATSAPP_ACCESS_TOKEN }}`
  - `Content-Type`: `application/json`
- **Body:** `={{ JSON.stringify($json.whatsappPayload) }}`

**Ejemplo de Request que envía:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5215512345678",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Los próximos partidos de tu liga son:\n1. Equipo A vs Equipo B - 20/12/2025\n2. Equipo C vs Equipo D - 21/12/2025"
  }
}
```

### 7. **Log Conversation** (Opcional)

- **Tipo:** Supabase
- **Operation:** Create
- **Table:** `agent_conversations`
- **Columns:**
  - `channel`: `whatsapp`
  - `user_identifier`: Número de teléfono
  - `user_message`: Mensaje del usuario
  - `agent_response`: Respuesta del Agent
  - `intent`: Intent detectado
  - `confidence`: Confianza del intent
  - `metadata`: Metadata completo

**Requiere:** Supabase credentials configuradas en n8n

### 8. **Respond to Webhook**

- **Tipo:** Respond to Webhook
- **Response:** `{{ JSON.stringify({ success: true, message_id: $json.messages[0].id }) }}`

Envía respuesta 200 OK a WhatsApp.

## 🔧 Paso 4: Configurar Webhook en Meta Business Manager

1. Ve a **Meta Business Manager** → **WhatsApp** → **Configuration**
2. En **Webhooks**, configura:
   - **Callback URL:** `https://tu-n8n.com/webhook/whatsapp-webhook`
   - **Verify Token:** Un token secreto de tu elección
   - **Webhook Fields:** Selecciona `messages`

3. **Verificación:**
   - Meta enviará una verificación GET
   - Asegúrate de que n8n responda correctamente

## 🧪 Paso 5: Probar el Flujo

### Test 1: Mensaje Simple

1. Envía un mensaje de WhatsApp al número configurado:
   ```
   Hola
   ```

2. Esperado:
   - n8n recibe el webhook
   - Llama al Agent Service
   - Agent responde con mensaje de bienvenida
   - Usuario recibe respuesta en WhatsApp

### Test 2: Query de Datos

1. Asegúrate de tener un vínculo creado en el dashboard
2. Envía:
   ```
   Cuales son los proximos partidos?
   ```

3. Esperado:
   - Agent identifica al usuario
   - Consulta la knowledge base
   - Responde con información de partidos

### Test 3: Sin Vínculo

1. Usa un número NO vinculado
2. Envía cualquier mensaje
3. Esperado:
   - Agent responde pidiendo vincular WhatsApp
   - Incluye instrucciones de cómo hacerlo

## 📊 Monitoreo

### En n8n:

1. **Execution List:** Ver todas las ejecuciones del workflow
2. **Error Workflow:** Configura un workflow para manejar errores
3. **Logs:** Revisa logs de cada nodo

### En Supabase (si configuraste logging):

```sql
-- Ver conversaciones recientes
SELECT
  created_at,
  user_identifier,
  user_message,
  agent_response,
  intent
FROM agent_conversations
WHERE channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 10;

-- Ver usuarios más activos
SELECT
  user_identifier,
  COUNT(*) as message_count,
  MAX(created_at) as last_message
FROM agent_conversations
WHERE channel = 'whatsapp'
GROUP BY user_identifier
ORDER BY message_count DESC;
```

## 🔍 Troubleshooting

### Error: "Agent Service not responding"

**Solución:**
- Verifica que `AGENT_SERVICE_URL` esté configurada
- Prueba el endpoint manualmente con curl:
  ```bash
  curl -X POST https://api.zona-gol.com/api/agent \
    -H "Content-Type: application/json" \
    -d '{
      "channel": "whatsapp",
      "userIdentifier": "+5215512345678",
      "message": "test"
    }'
  ```

### Error: "WhatsApp message not sent"

**Solución:**
- Verifica `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN`
- Revisa que el token no haya expirado
- Verifica permisos en Meta Business Manager

### Error: "User not found"

**Solución:**
- El usuario NO tiene vínculo en `whatsapp_user_links`
- Esto es esperado para usuarios nuevos
- El Agent responderá pidiendo vincular WhatsApp

### Webhook no recibe mensajes

**Solución:**
- Verifica URL del webhook en Meta
- Asegúrate que n8n esté accesible públicamente
- Revisa logs de Meta en Business Manager

## 🎯 Flujo Completo

```
Usuario envía mensaje en WhatsApp
  ↓
Meta envía webhook a n8n
  ↓
n8n extrae datos del mensaje
  ↓
n8n llama a Agent Service (/api/agent)
  ↓
Agent Service:
  - Identifica usuario (Identity Service)
  - Clasifica intent (Router Service)
  - Busca información (RAG/SQL Service)
  - Genera respuesta (LLM Service)
  ↓
Agent devuelve respuesta a n8n
  ↓
n8n formatea mensaje para WhatsApp
  ↓
n8n envía mensaje vía WhatsApp API
  ↓
n8n registra conversación en Supabase (opcional)
  ↓
Usuario recibe respuesta en WhatsApp
```

## 📚 Recursos Adicionales

- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [n8n Documentation](https://docs.n8n.io/)
- [Agent Service Implementation](./AGENT_SERVICE_IMPLEMENTATION.md)

## 🔐 Seguridad

1. **Nunca expongas tokens en el código**
   - Usa variables de entorno de n8n
   - Rotación periódica de tokens

2. **Valida webhooks de WhatsApp**
   - Verifica firma de Meta (implementar en webhook node)
   - Rate limiting en n8n

3. **HTTPS obligatorio**
   - n8n debe estar detrás de HTTPS
   - Certificado SSL válido

## ✅ Checklist Final

- [ ] Workflow importado en n8n
- [ ] Variables de entorno configuradas
- [ ] Webhook URL copiada y configurada en Meta
- [ ] Agent Service funcionando
- [ ] Test de mensaje simple exitoso
- [ ] Test con usuario vinculado exitoso
- [ ] Test con usuario no vinculado exitoso
- [ ] Logging configurado (opcional)
- [ ] Monitoreo activo en n8n

---

**Estado:** Listo para producción ✅

**Última actualización:** Diciembre 2024
