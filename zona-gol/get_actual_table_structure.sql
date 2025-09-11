-- Check what attendance tables actually exist and their structure

-- 1. List all tables with 'attendance' or similar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%attendance%' OR table_name LIKE '%asistencia%')
ORDER BY table_name;

-- 2. Check facial_attendance structure (if exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'facial_attendance'
ORDER BY ordinal_position;

-- 3. Check asistencias_qr structure (if exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'asistencias_qr'
ORDER BY ordinal_position;