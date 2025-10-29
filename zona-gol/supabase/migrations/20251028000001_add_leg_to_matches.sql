-- Add leg field to matches table for home and away matches
-- This allows distinguishing between first leg (ida) and second leg (vuelta) in playoff matches

-- Add leg column to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS leg TEXT
CHECK (leg IS NULL OR leg IN ('first', 'second'));

-- Add comment for documentation
COMMENT ON COLUMN matches.leg IS 'Match leg for home and away format: first (ida) or second (vuelta). NULL for single matches.';

-- Create index for efficient querying by leg
CREATE INDEX IF NOT EXISTS idx_matches_leg ON matches(leg) WHERE leg IS NOT NULL;
