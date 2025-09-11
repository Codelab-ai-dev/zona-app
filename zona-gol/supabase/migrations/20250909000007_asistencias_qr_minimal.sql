-- Migration: Create asistencias_qr table (minimal version)
-- Date: 2025-09-09
-- Description: Create asistencias_qr table without any data migration

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS asistencias_qr CASCADE;

-- Create asistencias_qr table with minimal required columns
CREATE TABLE asistencias_qr (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  recognition_mode TEXT NOT NULL DEFAULT 'quick',
  confidence_score DECIMAL(4,3) DEFAULT 1.0,
  similarity_score DECIMAL(4,3) DEFAULT 1.0,
  photo_path TEXT,
  device_info JSONB,
  location_data JSONB,
  face_quality_score DECIMAL(4,3),
  processing_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  operator_id TEXT,
  local_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, match_id)
);

-- Create basic indexes
CREATE INDEX idx_asistencias_qr_player_id ON asistencias_qr(player_id);
CREATE INDEX idx_asistencias_qr_match_id ON asistencias_qr(match_id);
CREATE INDEX idx_asistencias_qr_created_at ON asistencias_qr(created_at);

-- Enable RLS
ALTER TABLE asistencias_qr ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (allow all for now, restrict later)
CREATE POLICY "Allow all operations on asistencias_qr" ON asistencias_qr
  FOR ALL USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_asistencias_qr_updated_at 
  BEFORE UPDATE ON asistencias_qr 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to sync to player_stats
CREATE OR REPLACE FUNCTION sync_qr_to_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Create player_stats record when attendance is registered
  INSERT INTO player_stats (
    player_id, 
    match_id, 
    goals, 
    assists, 
    yellow_cards, 
    red_cards, 
    minutes_played,
    created_at,
    updated_at
  )
  VALUES (
    NEW.player_id, 
    NEW.match_id, 
    0, -- goals
    0, -- assists  
    0, -- yellow_cards
    0, -- red_cards
    90, -- minutes_played (assume full match)
    NOW(),
    NOW()
  )
  ON CONFLICT (player_id, match_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_sync_qr_to_player_stats
  AFTER INSERT ON asistencias_qr
  FOR EACH ROW
  EXECUTE FUNCTION sync_qr_to_player_stats();