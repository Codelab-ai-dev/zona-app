-- ============================================================================
-- QUERIES DE VERIFICACIÓN: INTEGRACIÓN MATCH -> KNOWLEDGE BASE
-- ============================================================================
-- Archivo: verify_match_knowledge_base.sql
--
-- Queries para verificar que la integración entre matches y league_knowledge_base
-- funciona correctamente
-- ============================================================================

-- ============================================================================
-- 1. VERIFICACIONES BÁSICAS
-- ============================================================================

-- Verificar que la columna match_id existe
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'league_knowledge_base'
AND column_name = 'match_id';

-- Verificar que el índice existe
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'league_knowledge_base'
AND indexname = 'idx_knowledge_base_match_id';

-- Verificar que el trigger existe
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_knowledge_on_match_finish';

-- Verificar que las funciones existen
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
  'generate_match_result_content',
  'auto_update_knowledge_base_on_match_finish'
);

-- ============================================================================
-- 2. ESTADÍSTICAS DEL KNOWLEDGE BASE
-- ============================================================================

-- Ver distribución de contenido por tipo
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(match_id) as with_match_id,
  COUNT(embedding) as with_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as embedding_percentage
FROM league_knowledge_base
GROUP BY content_type
ORDER BY content_type;

-- Ver últimos 10 registros de partidos finalizados
SELECT
  kb.id,
  kb.match_id,
  kb.league_id,
  kb.tournament_id,
  LEFT(kb.content_text, 150) as preview,
  CONCAT(kb.metadata->>'home_score', '-', kb.metadata->>'away_score') as marcador,
  kb.created_at,
  kb.embedding IS NOT NULL as has_embedding
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. VERIFICAR INTEGRIDAD DE DATOS
-- ============================================================================

-- Verificar que todos los partidos finalizados tienen entrada en knowledge base
SELECT
  COUNT(*) as total_finished_matches,
  COUNT(kb.id) as matches_in_knowledge_base,
  COUNT(*) - COUNT(kb.id) as missing_entries
FROM matches m
LEFT JOIN league_knowledge_base kb ON kb.match_id = m.id AND kb.content_type = 'resultado_partido'
WHERE m.status = 'finished';

-- Listar partidos finalizados SIN entrada en knowledge base (NO debería haber)
SELECT
  m.id as match_id,
  m.match_date,
  ht.name as home_team,
  at.name as away_team,
  m.home_score,
  m.away_score,
  m.status,
  m.updated_at
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE m.status = 'finished'
AND NOT EXISTS (
  SELECT 1
  FROM league_knowledge_base kb
  WHERE kb.match_id = m.id
  AND kb.content_type = 'resultado_partido'
)
ORDER BY m.match_date DESC;

-- Verificar que no hay entradas huérfanas (match_id apuntando a partido inexistente)
SELECT
  kb.id,
  kb.match_id,
  kb.content_type,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.match_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM matches m WHERE m.id = kb.match_id
);

-- ============================================================================
-- 4. VER CONTENIDO COMPLETO DE PARTIDOS
-- ============================================================================

-- Ver el contenido completo del último partido finalizado
SELECT
  kb.content_text,
  kb.metadata,
  kb.created_at,
  kb.embedding IS NOT NULL as has_embedding
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 1;

-- Ver contenido de un partido específico (reemplaza el match_id)
-- SELECT
--   kb.content_text,
--   kb.metadata
-- FROM league_knowledge_base kb
-- WHERE kb.match_id = 'tu-match-id-aqui'::UUID;

-- ============================================================================
-- 5. ESTADÍSTICAS POR LIGA
-- ============================================================================

-- Ver cuántos partidos finalizados hay en knowledge base por liga
SELECT
  l.name as liga,
  l.id as league_id,
  COUNT(kb.id) as total_partidos_en_kb,
  COUNT(kb.embedding) as partidos_con_embedding,
  MAX(kb.created_at) as ultimo_partido_agregado
FROM leagues l
LEFT JOIN league_knowledge_base kb ON kb.league_id = l.id AND kb.content_type = 'resultado_partido'
GROUP BY l.id, l.name
ORDER BY total_partidos_en_kb DESC;

-- Ver estadísticas detalladas de una liga específica
-- (Reemplaza 'league-id-aqui' con el ID de tu liga)
/*
SELECT
  kb.content_type,
  COUNT(*) as total,
  COUNT(kb.embedding) as with_embeddings,
  AVG(LENGTH(kb.content_text))::INTEGER as avg_content_length,
  MIN(kb.created_at) as oldest_entry,
  MAX(kb.created_at) as newest_entry
FROM league_knowledge_base kb
WHERE kb.league_id = 'league-id-aqui'::UUID
GROUP BY kb.content_type
ORDER BY kb.content_type;
*/

-- ============================================================================
-- 6. PROBAR FUNCIÓN DE GENERACIÓN DE CONTENIDO
-- ============================================================================

-- Probar la función con un partido específico
-- (Reemplaza con un match_id real de un partido finalizado)
/*
SELECT generate_match_result_content('match-id-aqui'::UUID);
*/

-- Generar contenido para todos los partidos finalizados (primeros 5)
SELECT
  m.id as match_id,
  ht.name || ' vs ' || at.name as partido,
  LEFT(generate_match_result_content(m.id), 200) as content_preview
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE m.status = 'finished'
ORDER BY m.match_date DESC
LIMIT 5;

-- ============================================================================
-- 7. VERIFICAR METADATA
-- ============================================================================

-- Ver estructura de metadata de los partidos
SELECT
  jsonb_object_keys(metadata) as metadata_key,
  COUNT(*) as occurrences
FROM league_knowledge_base
WHERE content_type = 'resultado_partido'
GROUP BY metadata_key
ORDER BY metadata_key;

-- Ver ejemplos de metadata completo
SELECT
  kb.match_id,
  jsonb_pretty(kb.metadata) as metadata_formatted,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 3;

-- ============================================================================
-- 8. VERIFICAR OBSERVACIONES DEL ÁRBITRO
-- ============================================================================

-- Ver partidos que tienen observaciones del árbitro en knowledge base
SELECT
  kb.match_id,
  CONCAT(kb.metadata->>'home_score', '-', kb.metadata->>'away_score') as score,
  CASE
    WHEN kb.content_text LIKE '%📋 OBSERVACIONES DEL ÁRBITRO:%'
    THEN 'Tiene observaciones'
    ELSE 'Sin observaciones'
  END as tiene_observaciones,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 10;

-- Ver las observaciones completas de los últimos partidos
SELECT
  kb.match_id,
  SUBSTRING(
    kb.content_text
    FROM '📋 OBSERVACIONES DEL ÁRBITRO:\n(.+)'
  ) as observaciones,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
AND kb.content_text LIKE '%📋 OBSERVACIONES DEL ÁRBITRO:%'
ORDER BY kb.created_at DESC
LIMIT 5;

-- ============================================================================
-- 9. VERIFICAR RELACIÓN CON REFEREE REPORTS
-- ============================================================================

-- Ver cuántos partidos tienen referee reports vs entradas en knowledge base
SELECT
  COUNT(DISTINCT m.id) as total_finished_matches,
  COUNT(DISTINCT mrr.match_id) as matches_with_referee_report,
  COUNT(DISTINCT kb.match_id) as matches_in_knowledge_base,
  COUNT(DISTINCT CASE
    WHEN mrr.match_id IS NOT NULL AND kb.match_id IS NOT NULL
    THEN m.id
  END) as matches_with_both
FROM matches m
LEFT JOIN match_referee_reports mrr ON mrr.match_id = m.id
LEFT JOIN league_knowledge_base kb ON kb.match_id = m.id AND kb.content_type = 'resultado_partido'
WHERE m.status = 'finished';

-- ============================================================================
-- 10. TEST: PROBAR QUE EL TRIGGER FUNCIONA
-- ============================================================================

-- IMPORTANTE: Este test modificará datos reales. Úsalo solo en desarrollo.
--
-- Pasos para probar el trigger:
--
-- 1. Crear un partido de prueba
/*
INSERT INTO matches (
  tournament_id,
  home_team_id,
  away_team_id,
  match_date,
  status
) VALUES (
  'tournament-id-aqui'::UUID,  -- Reemplaza con un tournament_id real
  'home-team-id-aqui'::UUID,   -- Reemplaza con un team_id real
  'away-team-id-aqui'::UUID,   -- Reemplaza con otro team_id real
  NOW(),
  'scheduled'
)
RETURNING id;
*/

-- 2. Guardar el ID retornado y usarlo en el siguiente query
-- 3. Finalizar el partido (esto debe disparar el trigger)
/*
UPDATE matches
SET
  status = 'finished',
  home_score = 2,
  away_score = 1,
  updated_at = NOW()
WHERE id = 'match-id-del-paso-1'::UUID;
*/

-- 4. Verificar que se creó la entrada automáticamente
/*
SELECT
  kb.id,
  kb.match_id,
  kb.content_type,
  kb.content_text,
  kb.metadata,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.match_id = 'match-id-del-paso-1'::UUID;
*/

-- 5. Limpiar (opcional)
/*
DELETE FROM matches WHERE id = 'match-id-del-paso-1'::UUID;
-- La entrada en knowledge_base se eliminará automáticamente por CASCADE
*/

-- ============================================================================
-- 11. RESUMEN EJECUTIVO
-- ============================================================================

-- Query único que muestra el estado general del sistema
SELECT
  'Total Matches (Finished)' as metric,
  COUNT(*)::TEXT as value
FROM matches
WHERE status = 'finished'

UNION ALL

SELECT
  'Matches in Knowledge Base',
  COUNT(DISTINCT match_id)::TEXT
FROM league_knowledge_base
WHERE content_type = 'resultado_partido'

UNION ALL

SELECT
  'Matches with Embeddings',
  COUNT(*)::TEXT
FROM league_knowledge_base
WHERE content_type = 'resultado_partido'
AND embedding IS NOT NULL

UNION ALL

SELECT
  'Missing Entries',
  COUNT(*)::TEXT
FROM matches m
WHERE m.status = 'finished'
AND NOT EXISTS (
  SELECT 1 FROM league_knowledge_base kb
  WHERE kb.match_id = m.id AND kb.content_type = 'resultado_partido'
)

UNION ALL

SELECT
  'Total Knowledge Base Entries',
  COUNT(*)::TEXT
FROM league_knowledge_base

UNION ALL

SELECT
  'Trigger Exists',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_update_knowledge_on_match_finish'
    ) THEN 'YES ✅'
    ELSE 'NO ❌'
  END;

-- ============================================================================
-- FIN DE QUERIES DE VERIFICACIÓN
-- ============================================================================
