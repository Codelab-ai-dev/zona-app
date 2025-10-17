-- Add max_players column to tournaments table
-- This allows league admins to set a maximum number of players per team for each tournament

ALTER TABLE tournaments
ADD COLUMN max_players INTEGER DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.max_players IS 'Maximum number of players allowed per team in this tournament. NULL means no limit.';
