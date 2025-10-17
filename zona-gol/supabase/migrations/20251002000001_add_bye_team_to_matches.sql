-- Add bye_team_id field to matches table for tracking which team rests in odd-number tournaments
-- Migration: 20251002000001_add_bye_team_to_matches.sql

-- Add bye_team_id column
ALTER TABLE matches
ADD COLUMN bye_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add comment to explain the field
COMMENT ON COLUMN matches.bye_team_id IS 'ID del equipo que descansa en esta jornada (solo para torneos con número impar de equipos)';

-- Create index for better performance when querying bye teams
CREATE INDEX idx_matches_bye_team_id ON matches(bye_team_id);

-- Add index for round + bye_team_id queries
CREATE INDEX idx_matches_round_bye_team ON matches(round, bye_team_id) WHERE bye_team_id IS NOT NULL;
