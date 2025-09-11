-- Migration: Create asistencias_qr table
-- Date: 2025-09-09
-- Description: Create asistencias_qr table to replace facial_attendance for QR-based attendance

-- Create asistencias_qr table with same structure as facial_attendance but QR-focused
CREATE TABLE IF NOT EXISTS asistencias_qr (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  recognition_mode TEXT NOT NULL DEFAULT 'quick',
  confidence_score DECIMAL(4,3) DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  similarity_score DECIMAL(4,3) DEFAULT 1.0 CHECK (similarity_score >= 0 AND similarity_score <= 1),
  photo_path TEXT,
  device_info JSONB,
  location_data JSONB,
  face_quality_score DECIMAL(4,3),
  processing_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  operator_id TEXT,
  local_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, match_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_player_id ON asistencias_qr(player_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_match_id ON asistencias_qr(match_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_server_timestamp ON asistencias_qr(server_timestamp);
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_local_timestamp ON asistencias_qr(local_timestamp);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_match_timestamp ON asistencias_qr(match_id, server_timestamp);

-- Enable RLS
ALTER TABLE asistencias_qr ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (same as facial_attendance but for asistencias_qr)
CREATE POLICY "Users can view QR attendance for their league" ON asistencias_qr
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = asistencias_qr.match_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Team owners can view their team's QR attendance" ON asistencias_qr
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams tm ON p.team_id = tm.id
      JOIN users u ON u.team_id = tm.id
      WHERE p.id = asistencias_qr.player_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "League admins can insert QR attendance" ON asistencias_qr
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = asistencias_qr.match_id
      AND u.id = auth.uid()
      AND u.role = 'league_admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_asistencias_qr_updated_at 
  BEFORE UPDATE ON asistencias_qr 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data from facial_attendance to asistencias_qr (if table exists)
DO $$
DECLARE
    fa_exists BOOLEAN := FALSE;
BEGIN
    -- Check if facial_attendance table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'facial_attendance'
    ) INTO fa_exists;
    
    IF fa_exists THEN
        -- Check which columns exist and migrate accordingly
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facial_attendance' AND column_name = 'server_timestamp') THEN
            -- Full migration with server_timestamp
            INSERT INTO asistencias_qr (
              player_id, match_id, recognition_mode, confidence_score, similarity_score,
              photo_path, device_info, location_data, face_quality_score, processing_time_ms,
              cache_hit, operator_id, local_timestamp, server_timestamp, sync_status, created_at, updated_at
            )
            SELECT 
              player_id, match_id, COALESCE(recognition_mode::text, 'quick'),
              COALESCE(confidence_score, 1.0), COALESCE(similarity_score, 1.0),
              photo_path, device_info, location_data, face_quality_score, processing_time_ms,
              COALESCE(cache_hit, false), operator_id, 
              COALESCE(local_timestamp, created_at), 
              COALESCE(server_timestamp, created_at),
              COALESCE(sync_status::text, 'synced'), created_at, updated_at
            FROM facial_attendance
            WHERE player_id IS NOT NULL AND match_id IS NOT NULL
            ON CONFLICT (player_id, match_id) DO NOTHING;
        ELSE
            -- Migration without server_timestamp (use created_at instead)
            INSERT INTO asistencias_qr (
              player_id, match_id, recognition_mode, confidence_score, similarity_score,
              photo_path, device_info, location_data, face_quality_score, processing_time_ms,
              cache_hit, operator_id, local_timestamp, server_timestamp, sync_status, created_at, updated_at
            )
            SELECT 
              player_id, match_id, 'quick',
              COALESCE(confidence_score, 1.0), COALESCE(similarity_score, 1.0),
              photo_path, device_info, location_data, face_quality_score, processing_time_ms,
              COALESCE(cache_hit, false), operator_id,
              COALESCE(created_at, NOW()), COALESCE(created_at, NOW()),
              'synced', COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
            FROM facial_attendance
            WHERE player_id IS NOT NULL AND match_id IS NOT NULL
            ON CONFLICT (player_id, match_id) DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Migrated data from facial_attendance to asistencias_qr';
    ELSE
        RAISE NOTICE 'facial_attendance table does not exist, skipping migration';
    END IF;
END $$;

-- Create trigger to sync asistencias_qr to player_stats
CREATE OR REPLACE FUNCTION sync_qr_attendance_to_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create player_stats if both player_id and match_id are not NULL
  IF NEW.player_id IS NOT NULL AND NEW.match_id IS NOT NULL THEN
    INSERT INTO player_stats (
      player_id, 
      match_id, 
      goals, 
      assists, 
      yellow_cards, 
      red_cards, 
      minutes_played
    )
    VALUES (
      NEW.player_id, 
      NEW.match_id, 
      0, 0, 0, 0, 90
    )
    ON CONFLICT (player_id, match_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER sync_qr_attendance_trigger
  AFTER INSERT ON asistencias_qr
  FOR EACH ROW
  EXECUTE FUNCTION sync_qr_attendance_to_stats();