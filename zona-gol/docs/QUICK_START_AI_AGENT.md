# 🚀 Guía de Inicio Rápido - Agente de IA para WhatsApp

## ⏱️ Tiempo estimado: 30-45 minutos

---

## Paso 1: Aplicar Migración de Base de Datos (5 min)

### 1.1 Abrir Supabase SQL Editor

1. Ve a tu proyecto en https://supabase.com
2. Click en "SQL Editor" en el menú lateral
3. Click en "New query"

### 1.2 Ejecutar la Migración

```sql
-- Pega TODO el contenido del archivo:
-- supabase/migrations/20251214000001_create_vector_knowledge_base.sql
```

Presiona **RUN** o **Ctrl+Enter**

### 1.3 Verificar Instalación

```sql
-- Debe retornar la tabla
SELECT * FROM league_knowledge_base LIMIT 1;

-- Debe retornar 'vector' extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

✅ **Listo:** Base de datos vectorial instalada

---

## Paso 2: Generar Contenido Inicial (5 min)

### 2.1 Obtener ID de tu Liga

```sql
-- Ver tus ligas
SELECT id, name, is_active FROM leagues;
```

Copia el `id` de la liga que quieres usar.

### 2.2 Generar Knowledge Base

```sql
-- Reemplaza 'TU-LEAGUE-ID' con el ID que copiaste
SELECT refresh_league_knowledge(
  'TU-LEAGUE-ID'::UUID,
  NULL
);
```

**Resultado esperado:** `4` (se crearon 4 elementos)

### 2.3 Verificar Contenido

```sql
SELECT
  content_type,
  LEFT(content_text, 100) as preview,
  LENGTH(content_text) as chars
FROM league_knowledge_base
WHERE league_id = 'TU-LEAGUE-ID'
ORDER BY content_type;
```

Debes ver:
- `jornada` - Partidos de la semana
- `resultados` - Últimos resultados
- `suspensiones` - Jugadores suspendidos
- `tabla_posiciones` - Tabla de posiciones

✅ **Listo:** Contenido generado

---

## Paso 3: Configurar OpenAI API (5 min)

### 3.1 Crear Cuenta OpenAI

1. Ve a https://platform.openai.com/signup
2. Crea una cuenta o inicia sesión
3. Ve a https://platform.openai.com/api-keys
4. Click en "Create new secret key"
5. Copia la API key (empieza con `sk-...`)

⚠️ **IMPORTANTE:** Guárdala en un lugar seguro, solo se muestra una vez.

### 3.2 Agregar Créditos

1. Ve a https://platform.openai.com/account/billing
2. Click en "Add payment method"
3. Agrega al menos $5 USD

**Costo estimado mensual:** $10-30 USD dependiendo del uso

✅ **Listo:** OpenAI API configurada

---

## Paso 4: Configurar Twilio WhatsApp (10 min)

### 4.1 Crear Cuenta Twilio

1. Ve a https://www.twilio.com/try-twilio
2. Crea una cuenta
3. Verifica tu número de teléfono
4. Ve al Dashboard

### 4.2 Configurar WhatsApp Sandbox

1. En el dashboard, ve a **Messaging → Try it out → Send a WhatsApp message**
2. Sigue las instrucciones para unir tu número al sandbox
3. Envía el mensaje de activación desde tu WhatsApp

Ejemplo:
```
Envía "join <tu-codigo>" al número +1 415 523 8886
```

### 4.3 Obtener Credenciales

1. Ve a **Account → API keys & tokens**
2. Copia:
   - **Account SID** (empieza con `AC...`)
   - **Auth Token** (click en "Show" para verlo)

✅ **Listo:** WhatsApp conectado a Twilio

---

## Paso 5: Configurar n8n (15 min)

### 5.1 Instalar n8n

**Opción A: Docker (Recomendado)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Opción B: npm**
```bash
npm install -g n8n
n8n start
```

**Opción C: n8n Cloud** (Más fácil)
- Ve a https://n8n.io/cloud
- Crea una cuenta

### 5.2 Acceder a n8n

Abre http://localhost:5678 (o tu URL de n8n Cloud)

### 5.3 Configurar Credenciales

#### Credential 1: OpenAI API

1. Click en **Settings → Credentials**
2. Click en **Add Credential**
3. Busca "OpenAI"
4. Pega tu API Key
5. Click en **Save**

#### Credential 2: Supabase (PostgreSQL)

1. Click en **Add Credential**
2. Busca "Postgres"
3. Llena los datos:
   ```
   Host: [tu-proyecto].supabase.co
   Database: postgres
   User: postgres
   Password: [tu-password-de-supabase]
   Port: 5432
   SSL: Enabled
   ```
4. Click en **Save**

**¿Dónde encuentro estos datos?**
- Ve a Supabase → Settings → Database
- Copia la "Connection string" y extrae los datos

#### Credential 3: Twilio

1. Click en **Add Credential**
2. Busca "Twilio"
3. Llena:
   ```
   Account SID: AC...
   Auth Token: ...
   ```
4. Click en **Save**

✅ **Listo:** n8n configurado

---

## Paso 6: Importar Workflows (5 min)

### 6.1 Importar Workflow de Embeddings

1. En n8n, click en **Workflows** en el menú superior
2. Click en **Import from File**
3. Selecciona: `docs/n8n_workflow_embedding_generator.json`
4. Click en **Import**

### 6.2 Configurar IDs de Ligas

1. Abre el workflow importado
2. Busca el nodo "List Active Leagues"
3. Edita el código y reemplaza los IDs de ejemplo con tus IDs reales:

```javascript
const leagues = [
  {
    id: 'TU-LEAGUE-ID-REAL',  // ← Reemplazar
    name: 'Liga Elite Soccer'
  }
];
```

4. Click en **Save**

### 6.3 Ejecutar Workflow Manualmente

1. Click en **Execute Workflow** (botón superior derecho)
2. Espera a que termine (puede tardar 1-2 minutos)
3. Verifica que todos los nodos estén en verde ✅

### 6.4 Verificar Embeddings Generados

```sql
-- En Supabase SQL Editor
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings
FROM league_knowledge_base
WHERE league_id = 'TU-LEAGUE-ID'
GROUP BY content_type;
```

Todos deben tener `with_embeddings > 0`

✅ **Listo:** Embeddings generados

---

## Paso 7: Activar Chatbot de WhatsApp (5 min)

### 7.1 Importar Workflow del Chatbot

1. Click en **Import from File**
2. Selecciona: `docs/n8n_workflow_whatsapp_agent.json`
3. Click en **Import**

### 7.2 Configurar el Webhook

1. Abre el workflow importado
2. Click en el nodo "Webhook - WhatsApp Message"
3. Copia la **Production URL** (algo como `https://tu-n8n.app/webhook/whatsapp-webhook`)
4. **Activa el workflow** (toggle en la esquina superior derecha)

### 7.3 Configurar Twilio Webhook

1. Ve a Twilio Console
2. Ve a **Messaging → Settings → WhatsApp sandbox settings**
3. En "WHEN A MESSAGE COMES IN", pega la URL del webhook de n8n
4. Click en **Save**

### 7.4 Configurar Mapeo de Números

1. En el workflow, busca el nodo "Detect League Context"
2. Edita el mapeo de números a ligas:

```javascript
const phoneToLeague = {
  '+521234567890': 'TU-LEAGUE-ID',  // ← Tu número de WhatsApp
};
```

3. **Save workflow**

✅ **Listo:** Chatbot activo

---

## Paso 8: Probar el Chatbot 🎉

### 8.1 Enviar Mensaje de Prueba

Desde tu WhatsApp, envía al número de Twilio:

```
partidos
```

**Respuesta esperada:**
```
📅 JORNADA SEMANAL
Liga: [Tu Liga]

PARTIDOS:
• Sábado, 16/12/2024 18:00: Equipo A vs Equipo B
...
```

### 8.2 Más Pruebas

```
tabla
```
```
🏆 TABLA DE POSICIONES
...
```

```
¿Quién está suspendido?
```
```
🚫 JUGADORES SUSPENDIDOS
...
```

```
menu
```
```
🤖 COMANDOS DISPONIBLES
...
```

---

## 🎉 ¡Felicidades!

Tu agente de IA está funcionando. Ahora puede responder preguntas sobre:
- ✅ Jornadas
- ✅ Tabla de posiciones
- ✅ Suspensiones
- ✅ Resultados
- ✅ Y más...

---

## Próximos Pasos

### 1. Automatizar Actualización de Contenido

En el workflow "Generate Embeddings", configura el Schedule Trigger:
- **Cada 6 horas:** Para ligas muy activas
- **Cada 12 horas:** Para ligas normales
- **Cada 24 horas:** Para ligas poco activas

### 2. Personalizar Respuestas

Edita el prompt del sistema en el nodo "Build GPT Context" para cambiar el tono de las respuestas.

### 3. Agregar Más Tipos de Contenido

Crea nuevas funciones en la base de datos para generar:
- Goleadores
- Asistencias
- Tarjetas
- Próximos partidos por equipo
- Historial de enfrentamientos

### 4. Monitorear Costos

- **OpenAI Dashboard:** https://platform.openai.com/usage
- **Twilio Console:** https://www.twilio.com/console/usage

### 5. Pasar a WhatsApp Business API (Producción)

Cuando estés listo para producción:
- Solicita acceso a WhatsApp Business API
- Obtén un número dedicado
- Elimina el sandbox de Twilio

---

## Troubleshooting

### Problema: "No tengo información disponible"

**Causa:** Embeddings no generados o búsqueda no encuentra resultados

**Solución:**
```sql
-- Verificar embeddings
SELECT COUNT(*) FROM league_knowledge_base WHERE embedding IS NOT NULL;

-- Si es 0, ejecutar workflow de embeddings manualmente
```

### Problema: Chatbot no responde

**Causa:** Webhook no configurado o workflow desactivado

**Solución:**
1. Verifica que el workflow esté ACTIVO (toggle verde)
2. Verifica la URL del webhook en Twilio
3. Revisa los logs de n8n (Executions)

### Problema: Respuestas lentas

**Causa:** GPT-4 es lento

**Solución:**
- Cambia el modelo a `gpt-3.5-turbo` en el nodo "OpenAI - Generate Response"
- Las respuestas serán más rápidas y económicas

### Problema: Costos muy altos

**Solución:**
1. Reduce la frecuencia del cron job de embeddings
2. Usa GPT-3.5-turbo en lugar de GPT-4
3. Implementa rate limiting (máximo N mensajes por usuario por hora)

---

## Recursos

- **Documentación Completa:** `docs/AI_AGENT_WHATSAPP_INTEGRATION.md`
- **Ejemplos SQL:** `docs/vector_db_examples.sql`
- **Migración:** `supabase/migrations/20251214000001_create_vector_knowledge_base.sql`

---

## Soporte

Si tienes problemas:

1. **Revisa los logs de n8n:**
   - Click en "Executions" en n8n
   - Busca errores en rojo

2. **Verifica la consola de Supabase:**
   - Logs → Postgres Logs

3. **Prueba las queries manualmente:**
   - Ejecuta los ejemplos de `vector_db_examples.sql`

---

**¡Éxito con tu agente de IA!** 🚀🤖⚽
