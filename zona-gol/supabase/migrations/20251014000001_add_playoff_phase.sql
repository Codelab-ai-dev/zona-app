-- Add phase and playoff metadata to matches table
-- This allows distinguishing between regular season matches and playoff matches

-- Add phase column to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'regular'
CHECK (phase IN ('regular', 'playoffs'));

-- Add playoff round information
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS playoff_round TEXT
CHECK (playoff_round IS NULL OR playoff_round IN ('quarterfinals', 'semifinals', 'final', 'third_place'));

-- Add playoff position (used for bracket positioning)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS playoff_position INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN matches.phase IS 'Phase of the tournament: regular (round-robin) or playoffs (knockout stage)';
COMMENT ON COLUMN matches.playoff_round IS 'Playoff round: quarterfinals, semifinals, final, or third_place';
COMMENT ON COLUMN matches.playoff_position IS 'Position in the playoff bracket (1-8 for quarterfinals, 1-4 for semifinals, etc.)';

-- Create index for efficient querying by phase
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_playoff_round ON matches(playoff_round) WHERE playoff_round IS NOT NULL;
