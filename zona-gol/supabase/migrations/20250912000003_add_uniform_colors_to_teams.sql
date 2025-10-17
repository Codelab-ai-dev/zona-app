-- Add uniform colors fields to teams table
-- Migration: 20250912000003_add_uniform_colors_to_teams.sql

-- Add uniform color fields to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_primary_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_secondary_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_accent_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS away_primary_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS away_secondary_color VARCHAR(7);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS away_accent_color VARCHAR(7);

-- Add check constraints to ensure valid hex color format
ALTER TABLE teams ADD CONSTRAINT teams_home_primary_color_check
    CHECK (home_primary_color IS NULL OR home_primary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_home_secondary_color_check
    CHECK (home_secondary_color IS NULL OR home_secondary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_home_accent_color_check
    CHECK (home_accent_color IS NULL OR home_accent_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_away_primary_color_check
    CHECK (away_primary_color IS NULL OR away_primary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_away_secondary_color_check
    CHECK (away_secondary_color IS NULL OR away_secondary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE teams ADD CONSTRAINT teams_away_accent_color_check
    CHECK (away_accent_color IS NULL OR away_accent_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add comments for documentation
COMMENT ON COLUMN teams.home_primary_color IS 'Primary color for home uniform (hex format, e.g. #3B82F6)';
COMMENT ON COLUMN teams.home_secondary_color IS 'Secondary color for home uniform (hex format, e.g. #FFFFFF)';
COMMENT ON COLUMN teams.home_accent_color IS 'Accent color for home uniform (hex format, e.g. #1D4ED8)';
COMMENT ON COLUMN teams.away_primary_color IS 'Primary color for away uniform (hex format, e.g. #EF4444)';
COMMENT ON COLUMN teams.away_secondary_color IS 'Secondary color for away uniform (hex format, e.g. #FFFFFF)';
COMMENT ON COLUMN teams.away_accent_color IS 'Accent color for away uniform (hex format, e.g. #DC2626)';

-- Create indexes for potential queries by uniform colors
CREATE INDEX IF NOT EXISTS idx_teams_home_primary_color ON teams(home_primary_color);
CREATE INDEX IF NOT EXISTS idx_teams_away_primary_color ON teams(away_primary_color);

-- Update existing teams with default colors (optional - can be done gradually by users)
-- This is commented out as teams may want to set their own colors
/*
UPDATE teams
SET
    home_primary_color = '#3B82F6',
    home_secondary_color = '#FFFFFF',
    home_accent_color = '#1D4ED8',
    away_primary_color = '#EF4444',
    away_secondary_color = '#FFFFFF',
    away_accent_color = '#DC2626'
WHERE home_primary_color IS NULL;
*/