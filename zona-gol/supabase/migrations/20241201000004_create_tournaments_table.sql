-- Create tournaments table
-- Migration: 20241201000004_create_tournaments_table.sql

-- Tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure start_date is before end_date
  CONSTRAINT tournaments_date_check CHECK (start_date <= end_date)
);

-- Create indexes for better performance
CREATE INDEX idx_tournaments_league_id ON tournaments(league_id);
CREATE INDEX idx_tournaments_is_active ON tournaments(is_active);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_end_date ON tournaments(end_date);
CREATE INDEX idx_tournaments_created_at ON tournaments(created_at);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;