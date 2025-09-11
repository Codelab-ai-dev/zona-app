-- Migration: Sync asistencias_qr to player_stats
-- Date: 2025-09-09
-- Description: Automatically create player_stats when attendance is registered

-- Function to sync attendance to player stats
CREATE OR REPLACE FUNCTION sync_attendance_to_stats()
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
      0, 0, 0, 0, 0
    )
    ON CONFLICT (player_id, match_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if asistencias_qr table exists)
DO $$
BEGIN
  -- Check if asistencias_qr table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asistencias_qr') THEN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS sync_attendance_trigger ON asistencias_qr;
    
    -- Create trigger
    CREATE TRIGGER sync_attendance_trigger
      AFTER INSERT ON asistencias_qr
      FOR EACH ROW
      EXECUTE FUNCTION sync_attendance_to_stats();
      
    RAISE NOTICE 'Trigger created for asistencias_qr table';
  ELSE
    RAISE NOTICE 'Table asistencias_qr does not exist, skipping trigger creation';
  END IF;
END $$;

-- Also sync existing records (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asistencias_qr') THEN
    -- Insert missing player_stats for existing attendance records
    -- Only sync records with valid (non-NULL) match_id and player_id
    INSERT INTO player_stats (player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
    SELECT DISTINCT 
      aq.player_id, 
      aq.match_id, 
      0, 0, 0, 0, 0
    FROM asistencias_qr aq
    WHERE aq.match_id IS NOT NULL 
      AND aq.player_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM player_stats ps 
        WHERE ps.player_id = aq.player_id 
        AND ps.match_id = aq.match_id
      );
    
    RAISE NOTICE 'Synced existing attendance records to player_stats (skipped records with NULL values)';
  END IF;
END $$;