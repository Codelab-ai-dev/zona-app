-- Create players table
-- Migration: 20241201000006_create_players_table.sql

-- Players table
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  jersey_number INTEGER NOT NULL,
  photo TEXT,
  birth_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique jersey number per team
  UNIQUE(team_id, jersey_number),
  -- Ensure jersey number is positive
  CONSTRAINT players_jersey_number_check CHECK (jersey_number > 0 AND jersey_number <= 99)
);

-- Create indexes for better performance
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_jersey_number ON players(team_id, jersey_number);
CREATE INDEX idx_players_is_active ON players(is_active);
CREATE INDEX idx_players_created_at ON players(created_at);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;