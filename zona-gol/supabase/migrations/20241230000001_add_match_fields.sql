-- Add match time, field number and round fields to matches table
-- Migration: 20241230000001_add_match_fields.sql

-- Add new columns to matches table
ALTER TABLE matches 
ADD COLUMN match_time TIME,
ADD COLUMN field_number INTEGER,
ADD COLUMN round INTEGER;

-- Create indexes for the new fields
CREATE INDEX idx_matches_match_time ON matches(match_time);
CREATE INDEX idx_matches_field_number ON matches(field_number);
CREATE INDEX idx_matches_round ON matches(round);

-- Add constraint for valid field numbers
ALTER TABLE matches 
ADD CONSTRAINT matches_field_number_check CHECK (field_number > 0);

-- Add constraint for valid round numbers
ALTER TABLE matches 
ADD CONSTRAINT matches_round_check CHECK (round > 0);