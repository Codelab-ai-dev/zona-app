-- Diagnóstico del trigger de team_stats
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si el trigger existe
SELECT
    tgname as trigger_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'trigger_update_team_stats_after_match';

-- 2. Verificar si la función existe
SELECT
    proname as function_name,
    prosrc as source_preview
FROM pg_proc
WHERE proname = 'update_team_stats_after_match';

-- 3. Ver partidos finalizados que NO tienen entrada en team_stats
SELECT
    m.id,
    m.match_date,
    ht.name as home_team,
    at.name as away_team,
    m.home_score,
    m.away_score,
    m.status,
    CASE WHEN ts_home.id IS NULL THEN '❌ FALTA' ELSE '✅ OK' END as home_stats,
    CASE WHEN ts_away.id IS NULL THEN '❌ FALTA' ELSE '✅ OK' END as away_stats
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
LEFT JOIN team_stats ts_home ON ts_home.team_id = m.home_team_id AND ts_home.tournament_id = m.tournament_id
LEFT JOIN team_stats ts_away ON ts_away.team_id = m.away_team_id AND ts_away.tournament_id = m.tournament_id
WHERE m.status = 'finished'
ORDER BY m.match_date DESC
LIMIT 20;

-- 4. Verificar políticas RLS en team_stats
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'team_stats';

-- 5. Contar partidos vs estadísticas
SELECT
    'Partidos finalizados' as tipo,
    COUNT(*) as cantidad
FROM matches WHERE status = 'finished'
UNION ALL
SELECT
    'Entradas en team_stats' as tipo,
    COUNT(*) as cantidad
FROM team_stats;
