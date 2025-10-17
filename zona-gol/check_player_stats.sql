-- Check player_stats table
SELECT
  ps.id,
  ps.player_id,
  p.name as player_name,
  p.cedula,
  ps.match_id,
  ps.goals,
  ps.assists,
  t.name as team_name,
  t.league_id
FROM player_stats ps
JOIN players p ON ps.player_id = p.id
JOIN teams t ON p.team_id = t.id
WHERE ps.goals > 0
ORDER BY ps.goals DESC
LIMIT 20;
