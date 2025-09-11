-- Create matches table
-- Migration: 20241201000007_create_matches_table.sql

-- Matches table
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status match_status DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure different teams
  CONSTRAINT matches_different_teams_check CHECK (home_team_id != away_team_id),
  -- Ensure non-negative scores
  CONSTRAINT matches_home_score_check CHECK (home_score >= 0),
  CONSTRAINT matches_away_score_check CHECK (away_score >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX idx_matches_away_team_id ON matches(away_team_id);
CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Create composite index for team matches
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;