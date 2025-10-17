-- Add alternate shorts colors to teams table
-- Migration: 20250913000001_add_alternate_shorts_colors.sql

-- Add fields for alternate shorts colors
ALTER TABLE teams ADD COLUMN IF NOT EXISTS alt1_shorts_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS alt2_shorts_color VARCHAR(7);

-- Add check constraints to ensure valid hex color format
ALTER TABLE teams ADD CONSTRAINT teams_alt1_shorts_color_check
    CHECK (alt1_shorts_color IS NULL OR alt1_shorts_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_alt2_shorts_color_check
    CHECK (alt2_shorts_color IS NULL OR alt2_shorts_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add comments for documentation
COMMENT ON COLUMN teams.alt1_shorts_color IS 'Shorts color for alternate uniform 1 (hex format, e.g. #1F2937)';
COMMENT ON COLUMN teams.alt2_shorts_color IS 'Shorts color for alternate uniform 2 (hex format, e.g. #1F2937)';

-- Create indexes for potential queries
CREATE INDEX IF NOT EXISTS idx_teams_alt1_shorts_color ON teams(alt1_shorts_color);
CREATE INDEX IF NOT EXISTS idx_teams_alt2_shorts_color ON teams(alt2_shorts_color);