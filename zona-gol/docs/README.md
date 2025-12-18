# 📚 Documentación - Agente de IA para WhatsApp

## Índice General

Esta carpeta contiene toda la documentación necesaria para implementar y mantener el agente de IA con integración de WhatsApp para Zona GOL.

---

## 🚀 Guía de Inicio Rápido

**Empieza aquí si es tu primera vez:**

📄 **[QUICK_START_AI_AGENT.md](./QUICK_START_AI_AGENT.md)**
- Guía paso a paso (30-45 minutos)
- Desde cero hasta tener el chatbot funcionando
- Incluye configuración de todas las herramientas

---

## 📖 Documentación Completa

### 1. Arquitectura y Diseño

📄 **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)**
- Diagrama visual del sistema completo
- Flujo de datos paso a paso
- Explicación de componentes clave
- RAG (Retrieval Augmented Generation)
- Escalabilidad y costos

### 2. Integración Técnica

📄 **[AI_AGENT_WHATSAPP_INTEGRATION.md](./AI_AGENT_WHATSAPP_INTEGRATION.md)**
- Documentación técnica completa
- Configuración de n8n workflows
- Integración con OpenAI API
- Integración con Twilio WhatsApp
- Ejemplos de código
- Troubleshooting avanzado

### 3. Base de Datos

📄 **[vector_db_examples.sql](./vector_db_examples.sql)**
- Ejemplos de queries SQL
- Cómo generar contenido
- Cómo buscar en la base de datos vectorial
- Queries de mantenimiento y debugging
- Testing y performance

### 4. Workflows de n8n

📄 **[n8n_workflow_whatsapp_agent.json](./n8n_workflow_whatsapp_agent.json)**
- Workflow del chatbot (tiempo real)
- Listo para importar en n8n
- Incluye todos los nodos configurados

📄 **[n8n_workflow_embedding_generator.json](./n8n_workflow_embedding_generator.json)**
- Workflow de generación de embeddings (cron job)
- Se ejecuta cada 6 horas
- Listo para importar en n8n

---

## 🗂️ Migración de Base de Datos

📄 **[../supabase/migrations/20251214000001_create_vector_knowledge_base.sql](../supabase/migrations/20251214000001_create_vector_knowledge_base.sql)**
- Migración completa de base de datos vectorial
- Incluye:
  - Extensión pgvector
  - Tabla `league_knowledge_base`
  - Funciones de generación de contenido
  - Funciones de búsqueda vectorial
  - Índices HNSW para rendimiento
  - Políticas RLS

---

## 🎯 Por Dónde Empezar

### Opción 1: Implementación Rápida (Recomendado)
```
1. Lee: QUICK_START_AI_AGENT.md
2. Aplica: Migración SQL
3. Importa: Workflows de n8n
4. ¡Prueba el chatbot!
```

### Opción 2: Entender la Arquitectura Primero
```
1. Lee: ARCHITECTURE_DIAGRAM.md
2. Lee: AI_AGENT_WHATSAPP_INTEGRATION.md
3. Experimenta: vector_db_examples.sql
4. Implementa: QUICK_START_AI_AGENT.md
```

---

## 📋 Checklist de Implementación

### Fase 1: Base de Datos (5 min)
- [ ] Aplicar migración SQL en Supabase
- [ ] Verificar extensión pgvector instalada
- [ ] Generar contenido inicial con `refresh_league_knowledge()`
- [ ] Verificar que el contenido se creó correctamente

### Fase 2: APIs (10 min)
- [ ] Crear cuenta OpenAI
- [ ] Obtener API key de OpenAI
- [ ] Agregar créditos ($5 mínimo)
- [ ] Crear cuenta Twilio
- [ ] Configurar WhatsApp Sandbox
- [ ] Obtener credenciales de Twilio

### Fase 3: n8n (15 min)
- [ ] Instalar/acceder a n8n
- [ ] Configurar credenciales OpenAI
- [ ] Configurar credenciales Supabase (PostgreSQL)
- [ ] Configurar credenciales Twilio
- [ ] Importar workflow de embeddings
- [ ] Importar workflow de chatbot
- [ ] Configurar IDs de ligas

### Fase 4: Testing (10 min)
- [ ] Ejecutar workflow de embeddings manualmente
- [ ] Verificar embeddings en base de datos
- [ ] Activar workflow de chatbot
- [ ] Configurar webhook en Twilio
- [ ] Enviar mensaje de prueba por WhatsApp
- [ ] Verificar respuesta del chatbot

### Fase 5: Producción (Opcional)
- [ ] Configurar cron job de embeddings (cada 6h)
- [ ] Solicitar WhatsApp Business API (no sandbox)
- [ ] Configurar rate limiting
- [ ] Agregar monitoring/alertas
- [ ] Implementar logging

---

## 💡 Casos de Uso

### Lo que el agente puede responder:

✅ **Jornadas**
- "¿Qué partidos hay esta semana?"
- "¿Cuándo juega el Guadalajara?"
- "Partidos del sábado"

✅ **Tabla de Posiciones**
- "¿Cómo va la tabla?"
- "Posiciones del torneo"
- "¿En qué lugar está el Atlas?"

✅ **Suspensiones**
- "¿Quién está suspendido?"
- "Jugadores sancionados"
- "¿Puede jugar Juan Pérez?"

✅ **Resultados**
- "Últimos resultados"
- "¿Cuánto quedó el partido de ayer?"
- "Resultados recientes"

✅ **Comandos Rápidos**
- "menu" → Lista de comandos
- "ayuda" → Ayuda del bot

---

## 🔧 Mantenimiento

### Actualización de Contenido

El contenido se actualiza automáticamente cada 6 horas via cron job de n8n.

**Manual:**
```sql
-- En Supabase SQL Editor
SELECT refresh_league_knowledge('tu-league-id'::UUID, NULL);
```

### Limpiar Contenido Expirado

```sql
SELECT clean_expired_knowledge();
```

### Ver Estadísticas

```sql
SELECT * FROM get_knowledge_base_stats('tu-league-id'::UUID);
```

---

## 📊 Monitoreo

### Verificar Salud del Sistema

**1. n8n Executions**
- Ve a n8n → Executions
- Busca errores (nodos en rojo)

**2. Supabase Logs**
- Ve a Supabase → Logs → Postgres Logs
- Busca errores de queries

**3. OpenAI Usage**
- Ve a https://platform.openai.com/usage
- Revisa tokens consumidos y costos

**4. Twilio Console**
- Ve a https://www.twilio.com/console/usage
- Revisa mensajes enviados/recibidos

---

## 🆘 Troubleshooting

### Problema: Chatbot no responde

**Checklist:**
1. ¿El workflow de chatbot está ACTIVO en n8n?
2. ¿El webhook está configurado correctamente en Twilio?
3. ¿Hay errores en n8n Executions?
4. ¿Las credenciales están correctas?

**Solución rápida:**
```
1. Desactiva el workflow en n8n
2. Espera 5 segundos
3. Activa el workflow nuevamente
4. Prueba enviar "menu" por WhatsApp
```

### Problema: Respuestas genéricas

**Causa:** No hay embeddings o búsqueda no encuentra resultados

**Solución:**
```sql
-- Verificar embeddings
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(embedding) as con_embedding
FROM league_knowledge_base
WHERE league_id = 'tu-league-id'
GROUP BY content_type;

-- Si con_embedding = 0, ejecutar workflow de embeddings
```

### Problema: Costos muy altos

**Soluciones:**
1. Cambiar de GPT-4 a GPT-3.5-turbo (90% más barato)
2. Reducir frecuencia del cron job (de 6h a 12h)
3. Implementar rate limiting (máx 1 msg/3 segundos)
4. Reducir `max_tokens` en OpenAI (de 500 a 300)

---

## 📞 Soporte

### Recursos Oficiales

- **Supabase Docs:** https://supabase.com/docs
- **pgvector Docs:** https://github.com/pgvector/pgvector
- **n8n Docs:** https://docs.n8n.io/
- **OpenAI Docs:** https://platform.openai.com/docs
- **Twilio Docs:** https://www.twilio.com/docs/whatsapp

### Comunidad

- **Supabase Discord:** https://discord.supabase.com
- **n8n Forum:** https://community.n8n.io/

---

## 📝 Notas de Versión

### v1.0 (14 de Diciembre, 2025)

**Funcionalidades:**
- ✅ Base de datos vectorial con pgvector
- ✅ Generación automática de contenido
- ✅ Búsqueda semántica
- ✅ Integración con WhatsApp vía Twilio
- ✅ Workflows de n8n listos para usar
- ✅ Soporte para múltiples ligas
- ✅ Comandos rápidos (menu, ayuda)

**Tipos de Contenido:**
- ✅ Jornada (partidos de la semana)
- ✅ Tabla de posiciones
- ✅ Suspensiones activas
- ✅ Resultados recientes

**Por Implementar (Roadmap):**
- ⏳ Goleadores del torneo
- ⏳ Asistidores
- ⏳ Tabla de tarjetas
- ⏳ Historial de enfrentamientos
- ⏳ Notificaciones proactivas
- ⏳ Imágenes generadas (gráficas)
- ⏳ Multimodal (envío de imágenes)

---

## 🎓 Conceptos Clave

### RAG (Retrieval Augmented Generation)
Técnica que combina búsqueda en base de datos + generación de respuestas con LLM.

### Vector Embeddings
Representación numérica de texto que captura el significado semántico.

### Semantic Search
Búsqueda que entiende el significado, no solo palabras exactas.

### HNSW Index
Índice de alta performance para búsqueda de vectores (Hierarchical Navigable Small World).

### pgvector
Extensión de PostgreSQL para almacenar y buscar vectores de manera eficiente.

---

## 🔐 Seguridad

### Datos Sensibles

**NO se almacenan:**
- ❌ Mensajes completos de usuarios
- ❌ Contenido de conversaciones
- ❌ Información personal

**Sí se almacenan:**
- ✅ Números de teléfono → league_id (mapeo)
- ✅ Timestamps de mensajes
- ✅ Embeddings (anónimos, no reversibles)

### RLS (Row Level Security)

Todas las tablas tienen políticas RLS:
- Users solo ven data de su liga
- League admins ven su liga
- Super admins ven todo

---

## 📈 Métricas de Éxito

### KPIs a Monitorear

1. **Engagement**
   - Mensajes recibidos por día
   - Usuarios activos únicos
   - Promedio de mensajes por usuario

2. **Calidad**
   - Tasa de respuestas útiles vs "no tengo información"
   - Tiempo de respuesta promedio
   - Comandos más usados

3. **Costos**
   - Costo por mensaje (OpenAI + Twilio)
   - Costo total mensual
   - ROI vs soporte manual

---

**Documentación creada:** 14 de Diciembre, 2025
**Versión:** 1.0
**Autor:** Sistema de IA Zona GOL
**Licencia:** Privado
