-- ============================================================================
-- EJEMPLOS DE USO: BASE DE DATOS VECTORIAL PARA AGENTE DE IA
-- ============================================================================

-- ============================================================================
-- 1. GENERAR CONTENIDO INICIAL PARA UNA LIGA
-- ============================================================================

-- Obtener el ID de tu liga
SELECT id, name FROM leagues WHERE is_active = true;

-- Resultado ejemplo:
-- id: 12345678-1234-1234-1234-123456789012
-- name: Liga Elite Soccer

-- Generar todo el contenido para esa liga
SELECT refresh_league_knowledge(
  '12345678-1234-1234-1234-123456789012'::UUID,
  NULL  -- NULL = todos los torneos
);

-- Resultado: 4 (se crearon 4 elementos de conocimiento)

-- ============================================================================
-- 2. VER EL CONTENIDO GENERADO
-- ============================================================================

-- Ver todo el contenido de una liga
SELECT
  content_type,
  LEFT(content_text, 100) as preview,
  LENGTH(content_text) as text_length,
  embedding IS NOT NULL as has_embedding,
  created_at
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
ORDER BY content_type;

-- Ver el contenido completo de la jornada
SELECT content_text
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND content_type = 'jornada';

-- Ver la tabla de posiciones
SELECT content_text
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND content_type = 'tabla_posiciones';

-- ============================================================================
-- 3. GENERAR CONTENIDO PERSONALIZADO
-- ============================================================================

-- Generar jornada para un rango de fechas específico
SELECT generate_jornada_content(
  '12345678-1234-1234-1234-123456789012'::UUID,  -- league_id
  NULL,                                           -- tournament_id (NULL = todos)
  '2024-12-16'::DATE,                            -- start_date
  '2024-12-22'::DATE                             -- end_date
);

-- Generar tabla de posiciones para un torneo específico
SELECT generate_standings_content(
  '12345678-1234-1234-1234-123456789012'::UUID,  -- league_id
  'tournament-id-aqui'::UUID                      -- tournament_id específico
);

-- Generar lista de suspensiones
SELECT generate_suspensions_content(
  '12345678-1234-1234-1234-123456789012'::UUID,
  NULL
);

-- Generar últimos 5 resultados
SELECT generate_results_content(
  '12345678-1234-1234-1234-123456789012'::UUID,
  NULL,
  5  -- Límite de resultados
);

-- ============================================================================
-- 4. INSERTAR CONTENIDO MANUALMENTE
-- ============================================================================

-- Insertar un contenido personalizado (sin embedding aún)
INSERT INTO league_knowledge_base (
  league_id,
  tournament_id,
  content_type,
  content_text,
  metadata,
  is_auto_generated
) VALUES (
  '12345678-1234-1234-1234-123456789012'::UUID,
  NULL,
  'estadisticas',
  E'⚽ GOLEADORES DEL TORNEO\n\n1. Juan Pérez (Guadalajara) - 15 goles\n2. Carlos García (Atlas) - 12 goles\n3. Miguel Rodríguez (Chivas) - 10 goles',
  jsonb_build_object(
    'tipo', 'goleadores',
    'limite', 3,
    'generado_manualmente', true
  ),
  false  -- Contenido manual
);

-- ============================================================================
-- 5. ACTUALIZAR EMBEDDINGS (Ejemplo - normalmente desde n8n)
-- ============================================================================

-- NOTA: En producción, los embeddings se generan desde n8n con OpenAI
-- Este es solo un ejemplo de la estructura

-- Ver contenidos sin embedding
SELECT id, content_type, LEFT(content_text, 50)
FROM league_knowledge_base
WHERE embedding IS NULL
LIMIT 5;

-- Actualizar un embedding (el vector viene de OpenAI)
-- Este es solo un ejemplo de sintaxis, el vector real vendría de la API
UPDATE league_knowledge_base
SET embedding = '[0.1, 0.2, 0.3, ...]'::vector(1536)  -- Array de 1536 números
WHERE id = 'knowledge-item-id-aqui'::UUID;

-- ============================================================================
-- 6. BUSCAR POR SIMILITUD (Después de tener embeddings)
-- ============================================================================

-- NOTA: En producción, esto se llama desde n8n después de generar
-- el embedding de la pregunta del usuario

-- Ejemplo de búsqueda
SELECT * FROM search_league_knowledge(
  '[0.1, 0.2, ...]'::vector(1536),  -- Query embedding (de OpenAI)
  '12345678-1234-1234-1234-123456789012'::UUID,  -- league_id
  5,    -- Top 5 resultados
  0.7   -- Umbral de similitud (70%)
);

-- Resultado esperado:
-- id | content_type | content_text | metadata | similarity
-- ---+--------------+--------------+----------+-----------
-- ... | jornada     | "📅 JORN..." | {...}    | 0.92
-- ... | resultados  | "⚽ RESUL..." | {...}    | 0.85

-- ============================================================================
-- 7. ESTADÍSTICAS DEL KNOWLEDGE BASE
-- ============================================================================

-- Ver estadísticas por tipo de contenido
SELECT * FROM get_knowledge_base_stats(
  '12345678-1234-1234-1234-123456789012'::UUID
);

-- Ver distribución de contenido por liga
SELECT
  l.name as liga,
  kb.content_type,
  COUNT(*) as total,
  COUNT(kb.embedding) as con_embedding
FROM league_knowledge_base kb
JOIN leagues l ON kb.league_id = l.id
GROUP BY l.name, kb.content_type
ORDER BY l.name, kb.content_type;

-- Ver contenido próximo a expirar
SELECT
  content_type,
  LEFT(content_text, 50) as preview,
  valid_until,
  (valid_until - NOW()) as tiempo_restante
FROM league_knowledge_base
WHERE valid_until IS NOT NULL
AND valid_until > NOW()
ORDER BY valid_until;

-- ============================================================================
-- 8. MANTENIMIENTO Y LIMPIEZA
-- ============================================================================

-- Limpiar contenido expirado
SELECT clean_expired_knowledge();
-- Resultado: 3 (se eliminaron 3 registros expirados)

-- Regenerar todo el conocimiento para todas las ligas activas
SELECT * FROM refresh_all_leagues_knowledge();
-- Resultado:
-- league_id                              | items_created
-- ---------------------------------------+--------------
-- 12345678-1234-1234-1234-123456789012  | 4
-- 87654321-4321-4321-4321-210987654321  | 4

-- Eliminar todo el contenido de una liga (resetear)
DELETE FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012';

-- Eliminar solo contenido auto-generado
DELETE FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND is_auto_generated = true;

-- ============================================================================
-- 9. QUERIES ÚTILES PARA DEBUGGING
-- ============================================================================

-- Ver contenido duplicado por tipo
SELECT
  league_id,
  content_type,
  COUNT(*) as count
FROM league_knowledge_base
GROUP BY league_id, content_type
HAVING COUNT(*) > 1;

-- Ver el contenido más reciente por tipo
SELECT DISTINCT ON (content_type)
  content_type,
  LEFT(content_text, 100) as preview,
  created_at
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
ORDER BY content_type, created_at DESC;

-- Ver tamaño del knowledge base
SELECT
  COUNT(*) as total_items,
  SUM(LENGTH(content_text)) as total_chars,
  AVG(LENGTH(content_text))::INTEGER as avg_chars,
  COUNT(embedding) as items_with_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as embedding_percentage
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012';

-- ============================================================================
-- 10. QUERIES PARA TESTING
-- ============================================================================

-- Simular pregunta del usuario y ver qué contenido sería relevante
-- (sin embeddings, solo por tipo de contenido)

-- Usuario pregunta: "¿Qué partidos hay esta semana?"
SELECT content_type, LEFT(content_text, 200)
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND content_type = 'jornada';

-- Usuario pregunta: "¿Cómo va la tabla?"
SELECT content_type, content_text
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND content_type = 'tabla_posiciones';

-- Usuario pregunta: "¿Quién está suspendido?"
SELECT content_type, content_text
FROM league_knowledge_base
WHERE league_id = '12345678-1234-1234-1234-123456789012'
AND content_type = 'suspensiones';

-- ============================================================================
-- 11. PERFORMANCE TESTING
-- ============================================================================

-- Medir tiempo de generación de contenido
EXPLAIN ANALYZE
SELECT refresh_league_knowledge(
  '12345678-1234-1234-1234-123456789012'::UUID,
  NULL
);

-- Medir tiempo de búsqueda vectorial (con embeddings)
EXPLAIN ANALYZE
SELECT * FROM search_league_knowledge(
  '[0.1, 0.2, ...]'::vector(1536),
  '12345678-1234-1234-1234-123456789012'::UUID,
  5,
  0.7
);

-- Ver tamaño de la tabla
SELECT
  pg_size_pretty(pg_total_relation_size('league_knowledge_base')) as table_size,
  pg_size_pretty(pg_indexes_size('league_knowledge_base')) as indexes_size;

-- ============================================================================
-- 12. INTEGRACIÓN CON OTRAS TABLAS
-- ============================================================================

-- Ver cuántos partidos hay en la jornada actual vs en el knowledge base
WITH current_week_matches AS (
  SELECT COUNT(*) as db_count
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE t.league_id = '12345678-1234-1234-1234-123456789012'
  AND m.match_date::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
)
SELECT
  db_count,
  (SELECT COUNT(*) FROM league_knowledge_base
   WHERE content_type = 'jornada'
   AND league_id = '12345678-1234-1234-1234-123456789012') as kb_count
FROM current_week_matches;

-- Ver discrepancias en suspensiones
WITH active_suspensions AS (
  SELECT COUNT(*) as db_count
  FROM player_suspensions
  WHERE league_id = '12345678-1234-1234-1234-123456789012'
  AND status = 'active'
  AND matches_served < matches_to_serve
)
SELECT
  db_count,
  (SELECT COUNT(*) FROM league_knowledge_base
   WHERE content_type = 'suspensiones'
   AND league_id = '12345678-1234-1234-1234-123456789012') as kb_count
FROM active_suspensions;

-- ============================================================================
-- FIN DE EJEMPLOS
-- ============================================================================
