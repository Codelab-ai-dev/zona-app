-- Query to check Gustavo González data
-- Execute this directly in your database client to see the results

-- 1. Check if asistencias_qr table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'asistencias_qr'
    ) THEN 'EXISTS' 
    ELSE 'NOT EXISTS' 
  END as asistencias_qr_table_status;

-- 2. List all tables with 'asistencia' or 'attendance'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%asistencia%' OR table_name LIKE '%attendance%')
ORDER BY table_name;

-- 3. Find Gustavo González in players table
SELECT id, name, team_id, is_active, created_at
FROM players 
WHERE LOWER(name) LIKE '%gustavo%'
ORDER BY name;

-- 4. Check facial_attendance for Gustavo (if table exists)
SELECT 
  fa.id,
  p.name as player_name,
  p.id as player_id,
  fa.match_id,
  fa.server_timestamp,
  fa.confidence_score
FROM facial_attendance fa
JOIN players p ON fa.player_id = p.id
WHERE LOWER(p.name) LIKE '%gustavo%'
ORDER BY fa.server_timestamp DESC;

-- 5. Check player_stats for Gustavo
SELECT 
  ps.id,
  p.name as player_name,
  p.id as player_id,
  ps.match_id,
  ps.goals,
  ps.assists,
  ps.minutes_played,
  ps.created_at
FROM player_stats ps
JOIN players p ON ps.player_id = p.id
WHERE LOWER(p.name) LIKE '%gustavo%'
ORDER BY ps.created_at DESC;

-- 6. If asistencias_qr exists, check it
-- (Uncomment if the table exists)
/*
SELECT 
  aq.*,
  p.name as player_name
FROM asistencias_qr aq
LEFT JOIN players p ON aq.player_id = p.id
WHERE LOWER(p.name) LIKE '%gustavo%'
ORDER BY aq.created_at DESC;
*/