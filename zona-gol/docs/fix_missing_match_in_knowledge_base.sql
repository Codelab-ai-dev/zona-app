-- ============================================================================
-- DIAGNÓSTICO Y SOLUCIÓN: PARTIDO FINALIZADO NO APARECE EN KNOWLEDGE BASE
-- ============================================================================
-- Este script diagnostica y soluciona el problema cuando un partido finalizado
-- no se agregó automáticamente a league_knowledge_base
-- ============================================================================

-- ============================================================================
-- PASO 1: DIAGNÓSTICO - Verificar el estado del sistema
-- ============================================================================

-- 1.1. Verificar si la columna match_id existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'league_knowledge_base'
      AND column_name = 'match_id'
    ) THEN '✅ Columna match_id existe'
    ELSE '❌ Columna match_id NO EXISTE - Debes aplicar la migración 20251215000001'
  END as status;

-- 1.2. Verificar si el trigger existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_update_knowledge_on_match_finish'
    ) THEN '✅ Trigger existe'
    ELSE '❌ Trigger NO EXISTE - Debes aplicar la migración 20251215000001'
  END as status;

-- 1.3. Verificar si la función existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'generate_match_result_content'
    ) THEN '✅ Función generate_match_result_content existe'
    ELSE '❌ Función NO EXISTE - Debes aplicar la migración 20251215000001'
  END as status;

-- 1.4. Verificar si hay partidos finalizados
SELECT
  COUNT(*) as total_partidos_finalizados
FROM matches
WHERE status = 'finished';

-- 1.5. Verificar cuántos están en knowledge base
SELECT
  COUNT(DISTINCT match_id) as partidos_en_knowledge_base
FROM league_knowledge_base
WHERE content_type = 'resultado_partido';

-- 1.6. Ver partidos finalizados que NO están en knowledge base
SELECT
  m.id as match_id,
  m.match_date,
  ht.name as equipo_local,
  at.name as equipo_visitante,
  CONCAT(m.home_score::TEXT, '-', m.away_score::TEXT) as marcador,
  m.updated_at as finalizado_en
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

-- ============================================================================
-- PASO 2: SOLUCIÓN RÁPIDA - Insertar el partido manualmente
-- ============================================================================

-- 2.1. Primero, copia el match_id del partido que falta
-- Usa el resultado de la query 1.6 arriba

-- 2.2. Prueba que la función genera contenido correctamente
-- REEMPLAZA 'match-id-aqui' con el ID real del partido
/*
SELECT generate_match_result_content('match-id-aqui'::UUID);
*/

-- 2.3. Si la función retorna contenido, inserta manualmente
-- REEMPLAZA 'match-id-aqui' con el ID real del partido
/*
DO $$
DECLARE
  v_match_id UUID := 'match-id-aqui'::UUID;  -- REEMPLAZA ESTO
  v_match_content TEXT;
  v_league_id UUID;
  v_tournament_id UUID;
  v_match RECORD;
BEGIN
  -- Obtener información del partido
  SELECT
    m.id,
    m.tournament_id,
    m.home_score,
    m.away_score,
    m.match_date,
    m.updated_at,
    m.home_team_id,
    m.away_team_id,
    t.league_id
  INTO v_match
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE m.id = v_match_id
  AND m.status = 'finished';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado o no está finalizado';
  END IF;

  v_league_id := v_match.league_id;
  v_tournament_id := v_match.tournament_id;

  -- Generar contenido
  v_match_content := generate_match_result_content(v_match_id);

  IF v_match_content IS NULL OR LENGTH(v_match_content) = 0 THEN
    RAISE EXCEPTION 'No se pudo generar contenido para el partido';
  END IF;

  -- Insertar en knowledge base
  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    match_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated,
    valid_from,
    created_at,
    updated_at
  ) VALUES (
    v_league_id,
    v_tournament_id,
    v_match_id,
    'resultado_partido',
    v_match_content,
    jsonb_build_object(
      'match_id', v_match.id,
      'home_team_id', v_match.home_team_id,
      'away_team_id', v_match.away_team_id,
      'home_score', v_match.home_score,
      'away_score', v_match.away_score,
      'match_date', v_match.match_date,
      'finalized_at', v_match.updated_at,
      'manual_insert', true
    ),
    true,
    v_match.match_date,
    v_match.updated_at,
    NOW()
  );

  RAISE NOTICE '✅ Partido insertado exitosamente en knowledge base';

  -- Refrescar conocimiento de la liga
  PERFORM refresh_league_knowledge(v_league_id, v_tournament_id);

  RAISE NOTICE '✅ Conocimiento de la liga refrescado';

END $$;
*/

-- ============================================================================
-- PASO 3: SOLUCIÓN MASIVA - Insertar TODOS los partidos faltantes
-- ============================================================================

-- 3.1. Esta función procesará todos los partidos finalizados que faltan
-- Solo ejecutar si ya aplicaste la migración 20251215000001
/*
SELECT * FROM populate_knowledge_base_with_finished_matches()
ORDER BY inserted DESC, error_message;
*/

-- ============================================================================
-- PASO 4: SOLUCIÓN DEFINITIVA - Aplicar migraciones
-- ============================================================================

-- Si las verificaciones del PASO 1 muestran que falta el trigger o la función,
-- debes aplicar la migración:
--
-- ARCHIVO: zona-gol/supabase/migrations/20251215000001_add_match_id_to_knowledge_base.sql
--
-- Copia todo el contenido de ese archivo y ejecútalo aquí

-- ============================================================================
-- PASO 5: VERIFICACIÓN - Confirmar que se solucionó
-- ============================================================================

-- 5.1. Verificar que el partido ahora está en knowledge base
SELECT
  kb.match_id,
  CONCAT(kb.metadata->>'home_score', '-', kb.metadata->>'away_score') as marcador,
  LEFT(kb.content_text, 150) as preview,
  kb.created_at
FROM league_knowledge_base kb
WHERE kb.content_type = 'resultado_partido'
ORDER BY kb.created_at DESC
LIMIT 5;

-- 5.2. Verificar que no quedan partidos faltantes
SELECT
  COUNT(*) as partidos_faltantes
FROM matches m
WHERE m.status = 'finished'
AND NOT EXISTS (
  SELECT 1
  FROM league_knowledge_base kb
  WHERE kb.match_id = m.id
  AND kb.content_type = 'resultado_partido'
);

-- ============================================================================
-- PASO 6: TRIGGER PARA FUTUROS PARTIDOS
-- ============================================================================

-- Si el trigger no existe, aplicar la migración completa 20251215000001
-- El trigger automáticamente procesará todos los partidos futuros cuando
-- se finalicen desde la app móvil

-- Verificar que el trigger está activo:
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname = 'trigger_update_knowledge_on_match_finish';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Si la migración NO está aplicada:
--    - Ejecuta el contenido de: 20251215000001_add_match_id_to_knowledge_base.sql
--    - Luego ejecuta: 20251215000002_populate_knowledge_base_finished_matches.sql

-- 2. Si la migración SÍ está aplicada pero el partido no se insertó:
--    - Usa el PASO 2 para insertar manualmente el partido específico
--    - O usa el PASO 3 para insertar todos los faltantes

-- 3. Para partidos futuros:
--    - El trigger se ejecutará automáticamente al finalizar desde la app
--    - No necesitas hacer nada manual

-- ============================================================================
-- FIN DEL SCRIPT DE DIAGNÓSTICO
-- ============================================================================
