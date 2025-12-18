# Integración de Partidos Finalizados con Knowledge Base

## Resumen

Este documento explica la integración automática entre los partidos finalizados y la tabla `league_knowledge_base` que alimenta el agente de IA de WhatsApp.

## ¿Qué hace esta integración?

Cuando un partido se finaliza desde la app móvil **Zona-G**, automáticamente:

1. ✅ Se crea un registro en `league_knowledge_base` con el resultado del partido
2. ✅ Se actualiza el conocimiento general de la liga (tabla de posiciones, resultados recientes, etc.)
3. ✅ El agente de IA puede responder preguntas sobre el partido finalizado

## Arquitectura

### 1. Columna `match_id`

Se agregó la columna `match_id` a la tabla `league_knowledge_base`:

```sql
ALTER TABLE league_knowledge_base
ADD COLUMN match_id UUID REFERENCES matches(id) ON DELETE CASCADE;
```

Esto permite vincular entradas específicas de conocimiento con partidos individuales.

### 2. Nuevo tipo de contenido

Se agregó un nuevo tipo de contenido: `resultado_partido`

```sql
content_type IN (
  'jornada',           -- Weekly matches schedule
  'tabla_posiciones',  -- League standings/table
  'suspensiones',      -- Active suspensions
  'resultados',        -- Match results (multiple matches)
  'resultado_partido', -- Individual match result (NUEVO)
  'estadisticas',      -- Player/team statistics
  'proximo_partido'    -- Next match info
)
```

### 3. Función de generación de contenido

`generate_match_result_content(p_match_id UUID)` genera un texto detallado del resultado:

```
⚽ RESULTADO DEL PARTIDO

🏆 Liga Elite Soccer
🏅 Torneo Apertura 2024
📅 15/12/2024 20:00

RESULTADO FINAL:
Guadalajara  3 - 2  Atlas

Victoria Local: Guadalajara

📋 OBSERVACIONES DEL ÁRBITRO:
Partido intenso. Tarjeta amarilla a #10 de Atlas por falta en el minuto 45.
```

### 4. Trigger automático

Un trigger en la tabla `matches` se ejecuta cuando:
- El status del partido cambia a `'finished'`

El trigger:
1. Genera el contenido del resultado del partido
2. Inserta un registro en `league_knowledge_base` con:
   - `content_type`: `'resultado_partido'`
   - `match_id`: ID del partido finalizado
   - `content_text`: Descripción detallada del resultado
   - `metadata`: JSON con información estructurada
3. Refresca el conocimiento general de la liga

## Flujo de trabajo

### Desde la App Móvil (Zona-G)

1. Usuario abre el detalle de un partido
2. Presiona "Finalizar Partido"
3. Ingresa el marcador final y observaciones del árbitro
4. La app llama a `MatchService.finalizeMatch()`

```dart
final success = await MatchService.finalizeMatch(
  matchId,
  homeScore: 3,
  awayScore: 2,
  observations: "Partido intenso. Tarjeta amarilla a #10...",
);
```

5. En la base de datos:
   - Se actualiza `matches.status = 'finished'`
   - Se dispara el trigger `trigger_update_knowledge_on_match_finish`
   - Se crea automáticamente el registro en `league_knowledge_base`

### Desde la Base de Datos

```sql
-- Finalizar un partido manualmente
UPDATE matches
SET
  status = 'finished',
  home_score = 3,
  away_score = 2,
  updated_at = NOW()
WHERE id = 'match-id-aqui';

-- El trigger se ejecuta automáticamente
-- y crea el registro en league_knowledge_base
```

## Migraciones

### Migración 1: `20251215000001_add_match_id_to_knowledge_base.sql`

Agrega:
- Columna `match_id`
- Índice en `match_id`
- Nuevo content_type `resultado_partido`
- Función `generate_match_result_content()`
- Trigger automático `trigger_update_knowledge_on_match_finish`

**Aplicar migración:**

```bash
# Desde Supabase Dashboard
# SQL Editor -> Pegar contenido de la migración -> Run

# O desde CLI
supabase db push
```

### Migración 2: `20251215000002_populate_knowledge_base_finished_matches.sql`

Procesa todos los partidos ya finalizados (migración retroactiva):
- Recorre todos los partidos con `status = 'finished'`
- Crea registros en `league_knowledge_base` para cada uno
- Refresca el conocimiento general de todas las ligas activas

**Aplicar migración:**

```bash
# Solo ejecutar UNA VEZ después de aplicar la migración 1
supabase db push
```

## Queries útiles

### Verificar que los registros se crearon

```sql
-- Ver todos los resultados de partidos en knowledge base
SELECT
  kb.id,
  kb.match_id,
  kb.content_type,
  LEFT(kb.content_text, 100) as preview,
  (kb.metadata->>'home_score') || '-' || (kb.metadata->>'away_score') as marcador,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 10;
```

### Ver el contenido completo de un partido específico

```sql
SELECT
  content_text,
  metadata
FROM league_knowledge_base
WHERE match_id = 'tu-match-id-aqui';
```

### Verificar que el trigger funciona

```sql
-- 1. Obtener un partido en progreso o programado
SELECT id, home_team_id, away_team_id, status
FROM matches
WHERE status IN ('scheduled', 'in_progress')
LIMIT 1;

-- 2. Finalizarlo (reemplaza el ID)
UPDATE matches
SET
  status = 'finished',
  home_score = 2,
  away_score = 1,
  updated_at = NOW()
WHERE id = 'match-id-aqui';

-- 3. Verificar que se creó el registro automáticamente
SELECT *
FROM league_knowledge_base
WHERE match_id = 'match-id-aqui';
```

### Estadísticas del knowledge base

```sql
-- Ver cuántos partidos finalizados hay en el knowledge base
SELECT
  l.name as liga,
  COUNT(kb.id) as total_partidos_finalizados,
  COUNT(kb.embedding) as con_embeddings
FROM league_knowledge_base kb
JOIN leagues l ON kb.league_id = l.id
WHERE kb.content_type = 'resultado_partido'
GROUP BY l.name;
```

### Ver partidos finalizados sin entrada en knowledge base

```sql
-- Esto NO debería retornar resultados si el trigger funciona correctamente
SELECT
  m.id,
  ht.name as home_team,
  at.name as away_team,
  m.home_score,
  m.away_score,
  m.match_date
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE m.status = 'finished'
AND NOT EXISTS (
  SELECT 1
  FROM league_knowledge_base kb
  WHERE kb.match_id = m.id
  AND kb.content_type = 'resultado_partido'
);
```

### Refrescar conocimiento de una liga manualmente

```sql
-- Refrescar todo el conocimiento de una liga
SELECT refresh_league_knowledge(
  'league-id-aqui'::UUID,
  NULL  -- NULL = todos los torneos
);
```

## Metadata del partido

Cada registro en `league_knowledge_base` incluye metadata estructurada:

```json
{
  "match_id": "uuid-del-partido",
  "home_team_id": "uuid-equipo-local",
  "away_team_id": "uuid-equipo-visitante",
  "home_score": 3,
  "away_score": 2,
  "match_date": "2024-12-15T20:00:00Z",
  "finalized_at": "2024-12-15T22:30:00Z"
}
```

Esto permite al agente de IA:
- Filtrar partidos por equipo
- Ordenar por fecha
- Identificar victorias/empates/derrotas
- Contextualizar respuestas

## Preguntas que el agente de IA puede responder

Después de esta integración, el agente puede responder:

1. ✅ "¿Cuál fue el resultado del último partido de Guadalajara?"
2. ✅ "¿Cuándo jugó Atlas contra Chivas y cómo quedó?"
3. ✅ "¿Qué dijo el árbitro en el partido del viernes?"
4. ✅ "Dame los últimos 5 resultados del torneo"
5. ✅ "¿Cómo va la tabla de posiciones?" (se actualiza automáticamente)

## Mantenimiento

### Limpiar conocimiento antiguo

```sql
-- Eliminar entradas de partidos muy antiguos (opcional)
DELETE FROM league_knowledge_base
WHERE content_type = 'resultado_partido'
AND created_at < NOW() - INTERVAL '1 year';
```

### Regenerar entrada de un partido

```sql
-- Si necesitas regenerar la entrada de un partido específico
DELETE FROM league_knowledge_base
WHERE match_id = 'match-id-aqui';

-- Luego actualiza el partido para disparar el trigger
UPDATE matches
SET updated_at = NOW()
WHERE id = 'match-id-aqui'
AND status = 'finished';
```

## Notas importantes

1. **Embeddings**: Los registros se crean SIN embeddings. Los embeddings deben generarse desde n8n con OpenAI
2. **Trigger automático**: Solo se ejecuta para partidos que cambian a `status = 'finished'`
3. **Observaciones del árbitro**: Se incluyen automáticamente si existen en `match_referee_reports`
4. **Cascada de eliminación**: Si un partido se elimina, su entrada en knowledge base también se elimina

## Próximos pasos

1. ✅ Aplicar migración 1 (agregar match_id y trigger)
2. ✅ Aplicar migración 2 (poblar datos existentes)
3. 🔄 Configurar n8n workflow para generar embeddings de los nuevos registros
4. 🔄 Actualizar el agente de WhatsApp para usar la información de partidos

## Troubleshooting

### El trigger no se ejecuta

```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_knowledge_on_match_finish';

-- Verificar que la función existe
SELECT * FROM pg_proc WHERE proname = 'auto_update_knowledge_base_on_match_finish';
```

### No se genera contenido

```sql
-- Probar la función directamente
SELECT generate_match_result_content('match-id-aqui'::UUID);
```

### Error al aplicar migraciones

Si hay conflicto con el CHECK constraint:

```sql
-- Eliminar constraint antiguo
ALTER TABLE league_knowledge_base
DROP CONSTRAINT IF EXISTS league_knowledge_base_content_type_check;

-- Aplicar migración nuevamente
```

## Soporte

Para preguntas o problemas, consulta:
- `/zona-gol/docs/vector_db_examples.sql` - Ejemplos de queries
- `/zona-gol/supabase/migrations/20251214000001_create_vector_knowledge_base.sql` - Schema original
