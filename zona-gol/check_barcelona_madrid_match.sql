-- Buscar el partido Barcelona vs Madrid y verificar las estadísticas de Gustavo González
-- También verificar si hay datos que necesitamos migrar a las nuevas tablas

-- 1. Buscar el partido Barcelona vs Madrid
SELECT
    m.id as match_id,
    m.match_date,
    home_team.name as home_team,
    m.home_score,
    m.away_score,
    away_team.name as away_team,
    m.status,
    t.name as tournament
FROM matches m
JOIN teams home_team ON m.home_team_id = home_team.id
JOIN teams away_team ON m.away_team_id = away_team.id
JOIN tournaments t ON m.tournament_id = t.id
WHERE
    (LOWER(home_team.name) LIKE '%barcelona%' AND LOWER(away_team.name) LIKE '%madrid%')
    OR
    (LOWER(home_team.name) LIKE '%madrid%' AND LOWER(away_team.name) LIKE '%barcelona%')
ORDER BY m.match_date DESC;

-- 2. Buscar a Gustavo González y sus estadísticas
SELECT
    p.id as player_id,
    p.name,
    p.jersey_number,
    t.name as team_name,
    ps.goals,
    ps.assists,
    ps.yellow_cards,
    ps.red_cards,
    ps.minutes_played,
    m.id as match_id,
    home_team.name as home_team,
    away_team.name as away_team,
    m.home_score,
    m.away_score
FROM players p
JOIN teams t ON p.team_id = t.id
LEFT JOIN player_stats ps ON p.id = ps.player_id
LEFT JOIN matches m ON ps.match_id = m.id
LEFT JOIN teams home_team ON m.home_team_id = home_team.id
LEFT JOIN teams away_team ON m.away_team_id = away_team.id
WHERE LOWER(p.name) LIKE '%gustavo%' AND LOWER(p.name) LIKE '%gonzalez%'
   OR LOWER(p.name) LIKE '%gustavo gonzález%'
ORDER BY ps.created_at DESC;

-- 3. Ver todas las estadísticas del partido específico si lo encontramos
-- (Esta consulta se ajustará según el ID del partido que encontremos)

-- 4. Verificar si ya existe cédula arbitral para este partido
SELECT
    m.id as match_id,
    home_team.name as home_team,
    away_team.name as away_team,
    m.home_score,
    m.away_score,
    CASE WHEN mrr.id IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_reporte_arbitro,
    CASE WHEN EXISTS(SELECT 1 FROM match_goals mg WHERE mg.match_id = m.id) THEN 'Sí' ELSE 'No' END as tiene_goles_detallados,
    CASE WHEN EXISTS(SELECT 1 FROM match_cards mc WHERE mc.match_id = m.id) THEN 'Sí' ELSE 'No' END as tiene_tarjetas_detalladas
FROM matches m
JOIN teams home_team ON m.home_team_id = home_team.id
JOIN teams away_team ON m.away_team_id = away_team.id
LEFT JOIN match_referee_reports mrr ON m.id = mrr.match_id
WHERE
    (LOWER(home_team.name) LIKE '%barcelona%' AND LOWER(away_team.name) LIKE '%madrid%')
    OR
    (LOWER(home_team.name) LIKE '%madrid%' AND LOWER(away_team.name) LIKE '%barcelona%')
ORDER BY m.match_date DESC;