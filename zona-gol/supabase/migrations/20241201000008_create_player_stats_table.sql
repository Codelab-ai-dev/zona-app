-- Create player_stats table
-- Migration: 20241201000008_create_player_stats_table.sql

-- Player stats table
CREATE TABLE player_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique stats per player per match
  UNIQUE(player_id, match_id),
  -- Ensure non-negative values
  CONSTRAINT player_stats_goals_check CHECK (goals >= 0),
  CONSTRAINT player_stats_assists_check CHECK (assists >= 0),
  CONSTRAINT player_stats_yellow_cards_check CHECK (yellow_cards >= 0),
  CONSTRAINT player_stats_red_cards_check CHECK (red_cards >= 0),
  CONSTRAINT player_stats_minutes_played_check CHECK (minutes_played >= 0 AND minutes_played <= 120),
  -- Logical constraints
  CONSTRAINT player_stats_red_cards_max_check CHECK (red_cards <= 1),
  CONSTRAINT player_stats_yellow_cards_max_check CHECK (yellow_cards <= 2)
);

-- Create indexes for better performance
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX idx_player_stats_match_id ON player_stats(match_id);
CREATE INDEX idx_player_stats_goals ON player_stats(goals);
CREATE INDEX idx_player_stats_assists ON player_stats(assists);
CREATE INDEX idx_player_stats_created_at ON player_stats(created_at);

-- Create composite index for player match stats
CREATE INDEX idx_player_stats_player_match ON player_stats(player_id, match_id);

-- Enable RLS
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;