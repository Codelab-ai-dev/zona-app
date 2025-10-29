-- Add tournament format to tournaments table
-- This migration adds support for different tournament formats:
-- 1. league: Traditional round-robin league format
-- 2. knockout: Single/double elimination tournament
-- 3. group_knockout: Group stage followed by knockout rounds (World Cup style)

-- Add tournament_format column
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS tournament_format TEXT DEFAULT 'league'
CHECK (tournament_format IN ('league', 'knockout', 'group_knockout'));

-- Add number of groups for group_knockout format
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS number_of_groups INTEGER DEFAULT NULL
CHECK (number_of_groups IS NULL OR (number_of_groups >= 2 AND number_of_groups <= 8));

-- Add teams advancing from groups (e.g., top 2 from each group)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS teams_advancing_per_group INTEGER DEFAULT 2
CHECK (teams_advancing_per_group >= 1 AND teams_advancing_per_group <= 4);

-- Add round_robin setting (for league format)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS rounds_per_season INTEGER DEFAULT 1
CHECK (rounds_per_season >= 1 AND rounds_per_season <= 4);

-- Add third place match option (for knockout tournaments)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS has_third_place_match BOOLEAN DEFAULT false;

-- Create index for tournament_format
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournaments(tournament_format);

-- Add comments for documentation
COMMENT ON COLUMN tournaments.tournament_format IS 'Format of the tournament: league (round-robin), knockout (elimination), or group_knockout (groups + elimination)';
COMMENT ON COLUMN tournaments.number_of_groups IS 'Number of groups for group_knockout format (2-8)';
COMMENT ON COLUMN tournaments.teams_advancing_per_group IS 'How many teams advance from each group to knockout stage';
COMMENT ON COLUMN tournaments.rounds_per_season IS 'Number of times teams play each other in league format (1=single, 2=double round-robin)';
COMMENT ON COLUMN tournaments.has_third_place_match IS 'Whether to include a third place playoff match in knockout tournaments';

-- Update existing tournaments to have default format
UPDATE tournaments
SET tournament_format = 'league'
WHERE tournament_format IS NULL;
