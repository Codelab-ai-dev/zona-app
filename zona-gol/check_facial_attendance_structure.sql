-- Query to check facial_attendance table structure
-- Execute this to see the real column names

-- Check if facial_attendance table exists and show its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'facial_attendance'
ORDER BY ordinal_position;

-- Show sample data to understand the structure
SELECT * FROM facial_attendance LIMIT 3;