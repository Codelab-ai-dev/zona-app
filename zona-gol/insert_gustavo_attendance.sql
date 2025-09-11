-- Script to manually insert Gustavo González attendance record
-- Execute this AFTER creating the asistencias_qr table

-- Insert attendance record for Gustavo González
INSERT INTO asistencias_qr (
  player_id,
  match_id,
  recognition_mode,
  confidence_score,
  similarity_score,
  device_info,
  local_timestamp,
  sync_status
)
SELECT 
  p.id as player_id,
  m.id as match_id,
  'quick' as recognition_mode,
  1.0 as confidence_score,
  1.0 as similarity_score,
  '{"platform": "manual", "source": "migration", "scan_method": "qr_code"}' as device_info,
  NOW() as local_timestamp,
  'synced' as sync_status
FROM players p
CROSS JOIN LATERAL (
  SELECT m.id
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  JOIN teams ht ON m.home_team_id = ht.id
  JOIN teams at ON m.away_team_id = at.id
  WHERE (ht.id = p.team_id OR at.id = p.team_id)
  ORDER BY m.match_date DESC
  LIMIT 1
) m
WHERE LOWER(p.name) LIKE '%gustavo%gonzalez%' 
   OR LOWER(p.name) LIKE '%gustavo%gonzález%'
   OR LOWER(p.name) LIKE '%gustavo%'
ON CONFLICT (player_id, match_id) DO NOTHING;

-- Verify the insert worked
SELECT 
  p.name as player_name,
  aq.id as attendance_id,
  aq.match_id,
  aq.created_at
FROM asistencias_qr aq
JOIN players p ON aq.player_id = p.id
WHERE LOWER(p.name) LIKE '%gustavo%';