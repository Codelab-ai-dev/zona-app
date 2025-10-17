-- Script para revisar partidos existentes y encontrar Madrid vs Valladolid
-- Este script ayuda a verificar qué partidos existen en la base de datos

-- Mostrar todos los partidos finalizados con sus equipos
SELECT
    m.id,
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
WHERE m.status = 'finished'
ORDER BY m.match_date DESC;

-- Buscar específicamente partidos que involucren Madrid o Valladolid
SELECT
    m.id,
    m.match_date,
    home_team.name as home_team,
    m.home_score,
    m.away_score,
    away_team.name as away_team,
    m.status
FROM matches m
JOIN teams home_team ON m.home_team_id = home_team.id
JOIN teams away_team ON m.away_team_id = away_team.id
WHERE
    LOWER(home_team.name) LIKE '%madrid%'
    OR LOWER(away_team.name) LIKE '%madrid%'
    OR LOWER(home_team.name) LIKE '%valladolid%'
    OR LOWER(away_team.name) LIKE '%valladolid%'
ORDER BY m.match_date DESC;

-- Verificar si existen reportes de árbitro
SELECT
    m.id as match_id,
    home_team.name as home_team,
    away_team.name as away_team,
    m.home_score,
    m.away_score,
    CASE WHEN mrr.id IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_reporte_arbitro
FROM matches m
JOIN teams home_team ON m.home_team_id = home_team.id
JOIN teams away_team ON m.away_team_id = away_team.id
LEFT JOIN match_referee_reports mrr ON m.id = mrr.match_id
WHERE m.status = 'finished'
ORDER BY m.match_date DESC;