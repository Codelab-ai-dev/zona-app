-- Add group field to teams table for group_knockout tournaments
-- Migration: 20251201000010_add_group_to_teams.sql

-- Add group name field to teams table (e.g., 'A', 'B', 'C', 'D')
ALTER TABLE teams ADD COLUMN IF NOT EXISTS group_name VARCHAR(10) DEFAULT NULL;

-- Add check constraint to ensure valid group names
ALTER TABLE teams ADD CONSTRAINT teams_group_name_check
    CHECK (group_name IS NULL OR group_name ~ '^[A-Z]$');

-- Add comment for documentation
COMMENT ON COLUMN teams.group_name IS 'Group assignment for group_knockout tournaments (e.g., A, B, C, D)';

-- Create index for queries by group
CREATE INDEX IF NOT EXISTS idx_teams_group_name ON teams(group_name);
CREATE INDEX IF NOT EXISTS idx_teams_tournament_group ON teams(tournament_id, group_name);
