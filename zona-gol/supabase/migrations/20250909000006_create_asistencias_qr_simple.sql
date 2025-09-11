-- Migration: Create asistencias_qr table (simple version)
-- Date: 2025-09-09
-- Description: Create asistencias_qr table without migrating old data

-- Create asistencias_qr table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_player_id ON asistencias_qr(player_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_match_id ON asistencias_qr(match_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_qr_server_timestamp ON asistencias_qr(server_timestamp);

-- Enable RLS
ALTER TABLE asistencias_qr ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view QR attendance for their league" ON asistencias_qr
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = asistencias_qr.match_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "League admins can insert QR attendance" ON asistencias_qr
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      JOIN users u ON u.league_id = l.id
      WHERE m.id = asistencias_qr.match_id AND u.id = auth.uid() AND u.role = 'league_admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_asistencias_qr_updated_at 
  BEFORE UPDATE ON asistencias_qr 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to sync to player_stats
CREATE OR REPLACE FUNCTION sync_qr_attendance_to_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.player_id IS NOT NULL AND NEW.match_id IS NOT NULL THEN
    INSERT INTO player_stats (
      player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played
    )
    VALUES (
      NEW.player_id, NEW.match_id, 0, 0, 0, 0, 90
    )
    ON CONFLICT (player_id, match_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_qr_attendance_trigger
  AFTER INSERT ON asistencias_qr
  FOR EACH ROW
  EXECUTE FUNCTION sync_qr_attendance_to_stats();

-- Manual migration for Gustavo González (insert his record manually)
DO $$
DECLARE
    gustavo_player_id UUID;
    gustavo_match_id UUID;
    gustavo_team_id UUID;
BEGIN
    -- Find Gustavo González
    SELECT id, team_id INTO gustavo_player_id, gustavo_team_id
    FROM players 
    WHERE LOWER(name) LIKE '%gustavo%gonzalez%' 
       OR LOWER(name) LIKE '%gustavo%gonzález%'
    LIMIT 1;
    
    IF gustavo_player_id IS NOT NULL THEN
        -- Get a recent match for his team
        SELECT m.id INTO gustavo_match_id
        FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE (m.home_team_id = gustavo_team_id OR m.away_team_id = gustavo_team_id)
        ORDER BY m.match_date DESC
        LIMIT 1;
        
        IF gustavo_match_id IS NOT NULL THEN
            -- Insert attendance record
            INSERT INTO asistencias_qr (
                player_id, match_id, recognition_mode, confidence_score, 
                similarity_score, device_info, local_timestamp, server_timestamp
            )
            VALUES (
                gustavo_player_id, gustavo_match_id, 'quick', 1.0, 1.0,
                '{"platform": "manual", "migration": "true"}', NOW(), NOW()
            )
            ON CONFLICT (player_id, match_id) DO NOTHING;
            
            RAISE NOTICE 'Created asistencias_qr record for Gustavo González: player_id=%, match_id=%', 
                         gustavo_player_id, gustavo_match_id;
        ELSE
            RAISE NOTICE 'No matches found for Gustavo González team';
        END IF;
    ELSE
        RAISE NOTICE 'Gustavo González not found in players table';
    END IF;
END $$;