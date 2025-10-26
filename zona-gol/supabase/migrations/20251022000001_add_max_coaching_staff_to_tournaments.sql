-- Add max_coaching_staff column to tournaments table
-- This allows league admins to set a maximum number of coaching staff per team for each tournament

ALTER TABLE tournaments
ADD COLUMN max_coaching_staff INTEGER DEFAULT 10;

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.max_coaching_staff IS 'Maximum number of coaching staff allowed per team in this tournament. Default is 10.';
