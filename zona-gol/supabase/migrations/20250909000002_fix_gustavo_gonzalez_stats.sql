-- Migration: Fix Gustavo González missing player_stats
-- Date: 2025-09-09
-- Description: Create player_stats record for Gustavo González based on his attendance

DO $$
DECLARE
    gustavo_player_id UUID;
    gustavo_match_id UUID;
    gustavo_assists INTEGER := 0;
BEGIN
    -- Find Gustavo González's player ID and match data from asistencias_qr
    SELECT DISTINCT aq.player_id, aq.match_id
    INTO gustavo_player_id, gustavo_match_id
    FROM asistencias_qr aq
    JOIN players p ON aq.player_id = p.id
    WHERE LOWER(p.name) LIKE '%gustavo%gonzalez%' 
       OR LOWER(p.name) LIKE '%gustavo%gonzález%'
       AND aq.match_id IS NOT NULL
    LIMIT 1;

    -- If found, check if he has assists recorded in asistencias_qr
    IF gustavo_player_id IS NOT NULL AND gustavo_match_id IS NOT NULL THEN
        -- Count assists from asistencias_qr (assuming 1 record = 1 assist)
        SELECT COUNT(*)
        INTO gustavo_assists
        FROM asistencias_qr aq
        WHERE aq.player_id = gustavo_player_id 
          AND aq.match_id = gustavo_match_id;

        -- Insert or update player_stats for Gustavo González
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
            gustavo_player_id,
            gustavo_match_id,
            0,  -- goals
            gustavo_assists,  -- assists from asistencias_qr
            0,  -- yellow_cards
            0,  -- red_cards
            90, -- minutes_played (assuming full match)
            NOW(),
            NOW()
        )
        ON CONFLICT (player_id, match_id) 
        DO UPDATE SET
            assists = GREATEST(player_stats.assists, gustavo_assists),
            minutes_played = GREATEST(player_stats.minutes_played, 90),
            updated_at = NOW();

        RAISE NOTICE 'Created/Updated player_stats for Gustavo González: player_id=%, match_id=%, assists=%', 
                     gustavo_player_id, gustavo_match_id, gustavo_assists;
    ELSE
        RAISE NOTICE 'Gustavo González not found in asistencias_qr or missing valid match_id';
        
        -- Alternative: Show all players with 'gustavo' in name for debugging
        RAISE NOTICE 'Players with Gustavo in name:';
        FOR gustavo_player_id IN 
            SELECT p.id FROM players p WHERE LOWER(p.name) LIKE '%gustavo%'
        LOOP
            DECLARE
                player_name TEXT;
            BEGIN
                SELECT name INTO player_name FROM players WHERE id = gustavo_player_id;
                RAISE NOTICE 'Found player: % (ID: %)', player_name, gustavo_player_id;
            END;
        END LOOP;
    END IF;
END $$;

-- Also update all other players with attendance but missing stats
INSERT INTO player_stats (player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
SELECT DISTINCT 
  aq.player_id, 
  aq.match_id, 
  0, -- goals
  COUNT(aq.id), -- assists (count of attendance records)
  0, -- yellow_cards
  0, -- red_cards
  90 -- minutes_played (default full match)
FROM asistencias_qr aq
WHERE aq.match_id IS NOT NULL 
  AND aq.player_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM player_stats ps 
    WHERE ps.player_id = aq.player_id 
    AND ps.match_id = aq.match_id
  )
GROUP BY aq.player_id, aq.match_id
ON CONFLICT (player_id, match_id) DO NOTHING;