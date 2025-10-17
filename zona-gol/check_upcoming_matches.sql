-- Ver partidos programados para el 6 de octubre de 2025
SELECT 
  m.id,
  m.match_date,
  m.status,
  ht.name as home_team,
  at.name as away_team,
  t.name as tournament,
  t.league_id,
  l.name as league_name
FROM matches m
LEFT JOIN teams ht ON m.home_team_id = ht.id
LEFT JOIN teams at ON m.away_team_id = at.id
LEFT JOIN tournaments t ON m.tournament_id = t.id
LEFT JOIN leagues l ON t.league_id = l.id
WHERE m.match_date >= '2025-10-06 00:00:00'
  AND m.match_date <= '2025-10-06 23:59:59'
  AND m.status IN ('scheduled', 'in_progress')
ORDER BY m.match_date;
