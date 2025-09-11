-- Create facial attendance table for Flutter app integration
-- Migration: 20250831000001_create_facial_attendance_table.sql

-- Enable vector extension for face embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Extend user_role enum to include operator (if needed in the future)
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operator';

-- Create enum for recognition mode
DO $$ BEGIN
  CREATE TYPE recognition_mode AS ENUM ('quick', 'verified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for sync status
DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Facial attendance table
CREATE TABLE IF NOT EXISTS facial_attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  recognition_mode recognition_mode NOT NULL DEFAULT 'quick',
  confidence_score DECIMAL(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  similarity_score DECIMAL(4,3) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  photo_path TEXT,
  device_info JSONB,
  location_data JSONB,
  face_quality_score DECIMAL(4,3),
  processing_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  operator_id TEXT,
  local_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status sync_status DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facial_attendance_player_id ON facial_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_match_id ON facial_attendance(match_id);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_server_timestamp ON facial_attendance(server_timestamp);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_local_timestamp ON facial_attendance(local_timestamp);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_recognition_mode ON facial_attendance(recognition_mode);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_sync_status ON facial_attendance(sync_status);
CREATE INDEX IF NOT EXISTS idx_facial_attendance_confidence_score ON facial_attendance(confidence_score);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_facial_attendance_match_timestamp ON facial_attendance(match_id, server_timestamp);

-- Enable RLS
ALTER TABLE facial_attendance ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view facial attendance for their league" ON facial_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = facial_attendance.match_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Team owners can view their team's attendance" ON facial_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams tm ON p.team_id = tm.id
      JOIN users u ON u.team_id = tm.id
      WHERE p.id = facial_attendance.player_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "League admins can insert attendance" ON facial_attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = facial_attendance.match_id
      AND u.id = auth.uid()
      AND u.role = 'league_admin'
    )
  );

-- Add fields to players table for face recognition
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS face_embedding VECTOR(512),
ADD COLUMN IF NOT EXISTS face_quality_score DECIMAL(4,3),
ADD COLUMN IF NOT EXISTS enrollment_status TEXT CHECK (enrollment_status IN ('enrolled', 'pending', 'failed')),
ADD COLUMN IF NOT EXISTS enrollment_metadata JSONB;

-- Create index for face embeddings (commented out until data is added)
-- CREATE INDEX IF NOT EXISTS idx_players_face_embedding ON players USING ivfflat (face_embedding vector_cosine_ops)
--   WHERE face_embedding IS NOT NULL;