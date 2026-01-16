-- Add is_published column to matches table
-- This allows admins to control when match schedules become visible to the public

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_matches_is_published ON matches(is_published);

-- Comment for documentation
COMMENT ON COLUMN matches.is_published IS 'Controls visibility of matches to public. When false, matches are only visible to admins.';
