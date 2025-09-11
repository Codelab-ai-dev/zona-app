-- Migration: Fix assists counting from asistencias_qr
-- Date: 2025-09-09
-- Description: Update trigger to count assists correctly and fix existing records

-- Update the trigger function to count assists from asistencias_qr
CREATE OR REPLACE FUNCTION sync_qr_to_player_stats()
RETURNS TRIGGER AS $$
DECLARE
    total_assists INTEGER;
BEGIN
    -- Count total assists for this player in this match from asistencias_qr
    SELECT COUNT(*) INTO total_assists
    FROM asistencias_qr 
    WHERE player_id = NEW.player_id AND match_id = NEW.match_id;
    
    -- Insert or update player_stats with correct assist count
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
        total_assists, -- assists from asistencias_qr count
        0, -- yellow_cards
        0, -- red_cards
        90, -- minutes_played
        NOW(),
        NOW()
    )
    ON CONFLICT (player_id, match_id) 
    DO UPDATE SET
        assists = total_assists,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing player_stats records to have correct assist counts
UPDATE player_stats 
SET assists = (
    SELECT COUNT(*) 
    FROM asistencias_qr aq 
    WHERE aq.player_id = player_stats.player_id 
    AND aq.match_id = player_stats.match_id
),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM asistencias_qr aq 
    WHERE aq.player_id = player_stats.player_id 
    AND aq.match_id = player_stats.match_id
);

-- Verify the changes worked for Gustavo González
DO $$
DECLARE
    gustavo_assists INTEGER;
    gustavo_name TEXT;
BEGIN
    SELECT p.name, ps.assists 
    INTO gustavo_name, gustavo_assists
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE LOWER(p.name) LIKE '%gustavo%'
    LIMIT 1;
    
    IF gustavo_assists IS NOT NULL THEN
        RAISE NOTICE 'Gustavo González (%) now has % assists', gustavo_name, gustavo_assists;
    ELSE
        RAISE NOTICE 'Gustavo González not found in player_stats';
    END IF;
END $$;